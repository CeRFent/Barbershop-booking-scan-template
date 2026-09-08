import { NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import connectDB from '@/lib/mongodb'
import { Booking } from '@/lib/models'
import { getOpenSlots, addMinutesToTime } from '@/lib/booking-slots'

export const dynamic = 'force-dynamic'

// Lets the post-deposit confirmation page poll for the real booking status
// instead of just assuming the Stripe webhook already landed. Also doubles
// as the reschedule slot-preview: pass ?date=YYYY-MM-DD to get open slots
// for this booking's duration on that date, excluding its own current slot.
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, error: 'No token provided' }, { status: 401 })
    }

    const payload = verifyToken(authHeader.split(' ')[1])
    if (!payload) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()

    const booking = await Booking.findOne({ _id: params.id, userId: payload.userId })
    if (!booking) {
      return NextResponse.json({ success: false, error: 'Booking not found' }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')
    if (date) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return NextResponse.json({ success: false, error: 'A valid date (YYYY-MM-DD) is required' }, { status: 400 })
      }
      const slots = await getOpenSlots(date, booking.durationMinutes, booking._id.toString())
      return NextResponse.json({ success: true, slots })
    }

    return NextResponse.json({ success: true, booking })
  } catch (error: any) {
    console.error('[bookings/[id] GET] Error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

// Self-service reschedule — a customer moving their own booking to a
// different open date/time. Deposit-required bookings keep whatever
// deposit/payment state they already have; only the date/time changes.
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, error: 'No token provided' }, { status: 401 })
    }

    const payload = verifyToken(authHeader.split(' ')[1])
    if (!payload) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { date, startTime } = await request.json()
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ success: false, error: 'A valid date is required' }, { status: 400 })
    }
    if (!startTime || !/^([01]\d|2[0-3]):[0-5]\d$/.test(startTime)) {
      return NextResponse.json({ success: false, error: 'A valid start time is required' }, { status: 400 })
    }

    await connectDB()

    const booking = await Booking.findOne({ _id: params.id, userId: payload.userId })
    if (!booking) {
      return NextResponse.json({ success: false, error: 'Booking not found' }, { status: 404 })
    }
    if (booking.status !== 'confirmed' && booking.status !== 'pending_payment') {
      return NextResponse.json({ success: false, error: 'This booking can no longer be rescheduled' }, { status: 400 })
    }

    const openSlots = await getOpenSlots(date, booking.durationMinutes, booking._id.toString())
    if (!openSlots.includes(startTime)) {
      return NextResponse.json({ success: false, error: 'That time is no longer available. Please pick another.' }, { status: 409 })
    }

    booking.date = date
    booking.startTime = startTime
    booking.endTime = addMinutesToTime(startTime, booking.durationMinutes)
    await booking.save()

    return NextResponse.json({ success: true, booking })
  } catch (error: any) {
    console.error('[bookings/[id] PATCH] Error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, error: 'No token provided' }, { status: 401 })
    }

    const payload = verifyToken(authHeader.split(' ')[1])
    if (!payload) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()

    const booking = await Booking.findOne({ _id: params.id, userId: payload.userId })
    if (!booking) {
      return NextResponse.json({ success: false, error: 'Booking not found' }, { status: 404 })
    }

    // A pending_payment booking that never completed checkout never became
    // a real appointment — delete it outright rather than leaving a
    // cancelled record behind. Anything that reached confirmed (deposit
    // paid, or no deposit needed) keeps a cancelled record for the shop's
    // history; refunds on a paid deposit are handled manually, case by
    // case, not automated here.
    if (booking.status === 'pending_payment' && !booking.depositPaid) {
      await Booking.deleteOne({ _id: booking._id })
    } else {
      booking.status = 'cancelled'
      booking.cancelledAt = new Date()
      await booking.save()
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[bookings/[id] DELETE] Error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
