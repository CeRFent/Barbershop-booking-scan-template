import { NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import connectDB from '@/lib/mongodb'
import { User, Subscription } from '@/lib/models'

export async function POST(request: Request) {
  try {
    const token = request.headers.get('Authorization')?.split(' ')[1]
    if (!token) {
      return NextResponse.json({ success: false, message: 'No token provided' }, { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload || payload.role !== 'admin') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 403 })
    }

    const { email, action, newPriceId } = await request.json()
    if (!email || !action) {
      return NextResponse.json({ success: false, message: 'Email and action are required' }, { status: 400 })
    }

    await connectDB()

    const user = await User.findOne({ email: String(email).toLowerCase() })
    if (!user) {
      return NextResponse.json({ success: false, message: 'No user found with that email' }, { status: 404 })
    }

    const subscription = await Subscription.findOne({ userId: user._id })
    if (!subscription) {
      return NextResponse.json({ success: false, message: 'No subscription found for this user' }, { status: 404 })
    }

    if (action === 'get_info') {
      return NextResponse.json({
        success: true,
        message: 'Subscription info retrieved',
        subscription: {
          status: subscription.status,
          plan: subscription.plan,
          cutsRemaining: subscription.cutsRemaining,
          currentPeriodStart: subscription.currentPeriodStart,
          currentPeriodEnd: subscription.currentPeriodEnd,
          stripeSubscriptionId: subscription.stripeSubscriptionId,
        },
      })
    }

    if (action === 'update_price') {
      // Checkout uses inline price_data rather than a stored Stripe Price,
      // so there's no price to swap on an existing subscription yet. Rather
      // than pretend this works, say so plainly.
      return NextResponse.json({
        success: false,
        message: 'update_price is not supported — this plan uses a fixed inline price, not a Stripe Price ID.',
      }, { status: 400 })
    }

    if (!subscription.stripeSubscriptionId || subscription.stripeSubscriptionId.startsWith('mock_')) {
      return NextResponse.json({ success: false, message: 'This subscription has no real Stripe subscription to manage' }, { status: 400 })
    }

    const { getStripe } = await import('@/lib/stripe')
    const stripe = getStripe()

    switch (action) {
      case 'pause':
        await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
          pause_collection: { behavior: 'void' },
        })
        return NextResponse.json({ success: true, message: 'Subscription paused' })

      case 'resume':
        await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
          pause_collection: null,
        })
        return NextResponse.json({ success: true, message: 'Subscription resumed' })

      case 'cancel':
        await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
          cancel_at_period_end: true,
        })
        await Subscription.updateOne({ _id: subscription._id }, { status: 'cancelled' })
        return NextResponse.json({ success: true, message: 'Subscription set to cancel at period end' })

      case 'cancel_immediately':
        await stripe.subscriptions.cancel(subscription.stripeSubscriptionId)
        await Subscription.updateOne({ _id: subscription._id }, { status: 'expired' })
        return NextResponse.json({ success: true, message: 'Subscription cancelled immediately' })

      default:
        return NextResponse.json({ success: false, message: 'Unknown action' }, { status: 400 })
    }
  } catch (error: any) {
    console.error('Error managing subscription:', error)
    return NextResponse.json({ success: false, message: error.message || 'Internal server error' }, { status: 500 })
  }
}
