import { NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import connectDB from '@/lib/mongodb'
import { Subscription } from '@/lib/models'

export const dynamic = 'force-dynamic'

// Hands a subscribed customer off to Stripe's hosted Customer Portal so
// they can cancel or update their payment method themselves, without any
// custom billing UI on our end. Requires the Stripe Dashboard's Customer
// Portal to be configured (Settings > Billing > Customer portal) with
// "Cancel subscriptions" enabled — that's a one-time manual setup step.
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

    await connectDB()

    const subscription = await Subscription.findOne({ userId: payload.userId })
    if (!subscription || !subscription.stripeCustomerId || subscription.stripeCustomerId.startsWith('mock_')) {
      return NextResponse.json({ success: false, error: 'No billing account found for this membership' }, { status: 400 })
    }

    const { getStripe } = await import('@/lib/stripe')
    const stripe = getStripe()

    const origin = request.headers.get('origin') || new URL(request.url).origin
    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: `${origin}/dashboard`,
    })

    return NextResponse.json({ success: true, url: session.url })
  } catch (error: any) {
    console.error('[billing-portal POST] Error:', error)
    return NextResponse.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 })
  }
}
