import { NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import connectDB from '@/lib/mongodb'
import { Booking } from '@/lib/models'

// Creates a real Stripe Checkout session (mode: payment, not subscription)
// for a single booking's deposit. Per the locked design in
// COORDINATION.md section C: the booking already exists as pending_payment
// and is already occupying the slot — this route only sends the customer
// to pay for it.
export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, error: 'No token provided' }, { status: 401 })
    }

    const payload = verifyToken(authHeader.split(' ')[1])
    if (!payload) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { bookingId } = await request.json()
    if (!bookingId || typeof bookingId !== 'string') {
      return NextResponse.json({ success: false, error: 'bookingId is required' }, { status: 400 })
    }

    await connectDB()

    const booking = await Booking.findOne({ _id: bookingId, userId: payload.userId })
    if (!booking) {
      return NextResponse.json({ success: false, error: 'Booking not found' }, { status: 404 })
    }
    if (booking.status !== 'pending_payment' || !booking.depositRequired || !booking.depositAmount) {
      return NextResponse.json({ success: false, error: 'This booking does not have a deposit awaiting payment' }, { status: 400 })
    }

    const host = request.headers.get('host') || 'localhost:3000'
    const protocol = request.headers.get('x-forwarded-proto') || 'http'
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || `${protocol}://${host}`

    const { getStripe } = await import('@/lib/stripe')
    const stripe = getStripe()

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Deposit — ${booking.serviceName}`,
              description: `Booking deposit for ${booking.date} at ${booking.startTime}`,
            },
            unit_amount: Math.round(booking.depositAmount * 100),
          },
          quantity: 1,
        },
      ],
      customer_email: booking.customerEmail,
      success_url: `${baseUrl}/book/confirmation?bookingId=${booking._id}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/book/cancelled?bookingId=${booking._id}`,
      metadata: {
        type: 'booking_deposit',
        bookingId: booking._id.toString(),
        userId: payload.userId,
      },
    })

    booking.stripeCheckoutSessionId = session.id
    await booking.save()

    return NextResponse.json({ success: true, url: session.url })
  } catch (error: any) {
    console.error('[bookings/checkout POST] Error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
