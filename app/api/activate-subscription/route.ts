import { NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import connectDB from '@/lib/mongodb'
import { User, Subscription } from '@/lib/models'
import { verifyCheckoutSession } from '@/lib/verify-checkout-session'
import { initializeMonthlyCuts } from '@/lib/cuts'

export async function POST(request: Request) {
  try {
    const { userId, email, sessionId } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    // This grants a paid subscription's worth of cuts, so it must be backed
    // by proof of a real, completed checkout — the webhook is still the
    // source of truth, but this endpoint gives immediate optimistic UI
    // feedback and must not be callable for an arbitrary userId.
    const verification = await verifyCheckoutSession(sessionId, userId)
    if (!verification.ok) {
      return NextResponse.json({ error: 'Unable to verify checkout session' }, { status: 403 })
    }

    // Connect to database
    await connectDB()

    // Verify user exists
    const user = await User.findById(userId)
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if subscription is already active
    const existingSubscription = await Subscription.findOne({ userId, status: 'active' })
    if (existingSubscription) {
      console.log(`[activate-subscription] Subscription already active for user: ${userId}. Skipping activation.`)
      return NextResponse.json({ 
        success: true, 
        message: 'Subscription already active',
        subscription: {
          id: existingSubscription._id,
          status: existingSubscription.status,
          currentPeriodEnd: existingSubscription.currentPeriodEnd
        }
      })
    }

    console.log(`[activate-subscription] Activating subscription for user: ${userId}`)

    // verification.session is only set for a real (non-mock) checkout — a
    // mock session (Stripe not configured at all) has no real IDs or
    // metadata to read, so it keeps the placeholder mock_ IDs and the
    // full 4 cuts a mock signup always represents.
    const isMock = sessionId.startsWith('mock_session_')
    const stripeCustomerId = isMock ? `mock_customer_${userId}` : verification.session!.customer
    const stripeSubscriptionId = isMock ? `mock_sub_${userId}` : verification.session!.subscription

    // A mid-month signup only gets the cuts still usable this month (see
    // create-checkout-session's proration) — read the same metadata the
    // webhook reads, so this optimistic pre-webhook activation grants
    // exactly what was actually charged for, not always a full 4.
    const rawCuts = isMock ? undefined : verification.session!.metadata?.cutsForFirstMonth
    const parsedCuts = Number(rawCuts)
    const cutsThisMonth = Number.isFinite(parsedCuts) && parsedCuts >= 1 && parsedCuts <= 4 ? parsedCuts : 4

    // Create or update subscription
    const subscription = await Subscription.findOneAndUpdate(
      { userId },
      {
        userId,
        stripeCustomerId,
        stripeSubscriptionId,
        status: 'active',
        plan: 'monthly',
        cutsRemaining: cutsThisMonth,
        cutsTotal: cutsThisMonth,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        updatedAt: new Date()
      },
      { upsert: true, new: true }
    )

    // Every Stripe subscription webhook handler looks the user up by
    // `User.findOne({ stripeCustomerId: ... })` — without this, that lookup
    // always misses for a customer who only ever went through this
    // optimistic-activation path (e.g. no webhook delivered yet).
    if (!isMock) {
      await User.updateOne({ _id: userId }, { stripeCustomerId })
    }

    // Initialize monthly cuts
    await initializeMonthlyCuts(userId, cutsThisMonth)

    console.log(`[activate-subscription] Subscription activated for user: ${userId}`)

    return NextResponse.json({ 
      success: true, 
      message: 'Subscription activated successfully',
      subscription: {
        id: subscription._id,
        status: subscription.status,
        currentPeriodEnd: subscription.currentPeriodEnd
      }
    })
  } catch (error) {
    console.error('Error activating subscription:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
