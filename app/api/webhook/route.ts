import { type NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import { User, Subscription, Booking } from "@/lib/models"
import { initializeMonthlyCuts } from "@/lib/cuts"
import { headers } from "next/headers"
import { notifyPaymentIssue, notifyAdminsOfNewBooking } from "@/lib/onesignal"

export async function POST(request: NextRequest) {
  console.log("Webhook received at:", new Date().toISOString())

  try {
    const rawBody = await request.text()

    // Mock/dev webhook path — only reachable when Stripe isn't configured at
    // all (local or mock-mode development, mirroring create-checkout-session's
    // own mock fallback). In any real deployment STRIPE_SECRET_KEY is set, so
    // this branch never runs and every request must carry a valid Stripe
    // signature instead. Do NOT branch on the parsed body before that check —
    // that previously let anyone POST a fake event with no authentication.
    if (!process.env.STRIPE_SECRET_KEY) {
      let body: any
      try {
        body = JSON.parse(rawBody)
      } catch (e) {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
      }
      if (body.type === 'test_subscription_create' ||
          (body.session_id && typeof body.session_id === 'string' && body.session_id.startsWith('mock_session_'))) {
        return handleMockWebhook(body)
      }
      return NextResponse.json({ received: true })
    }

    // Real Stripe webhook — signature is verified before we look at the body at all.
    return handleStripeWebhook(request, rawBody)

  } catch (error: any) {
    console.error("Webhook handler error:", error)
    return NextResponse.json({ error: "Webhook handler failed", details: error.message }, { status: 500 })
  }
}

// Handle mock webhook for testing
async function handleMockWebhook(body: any) {
  console.log("Handling mock webhook:", body.type || "mock_checkout")

  if (body.type === 'test_subscription_create' || (body.session_id && body.session_id.startsWith('mock_session_'))) {
    const userId = body.userId
    
    if (!userId || typeof userId !== 'string' || userId.length !== 24) {
      return NextResponse.json({ success: false, message: "Invalid userId" }, { status: 400 })
    }

    try {
      await connectDB()
      await Subscription.findOneAndUpdate(
        { userId },
        {
          userId,
          stripeCustomerId: `mock_customer_${userId}`,
          stripeSubscriptionId: `mock_sub_${userId}`,
          status: 'active',
          plan: 'monthly',
          cutsRemaining: 4,
          cutsTotal: 4,
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          updatedAt: new Date()
        },
        { upsert: true, new: true }
      )
      await initializeMonthlyCuts(userId)
      return NextResponse.json({ success: true, message: "Mock subscription processed" })
    } catch (error: any) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
  }
  return NextResponse.json({ received: true })
}

// Handle real Stripe webhook
async function handleStripeWebhook(request: NextRequest, rawBody: string) {
  try {
    const headersList = headers()
    const signature = headersList.get('stripe-signature')

    if (!signature) {
      console.error("No Stripe signature found")
      return NextResponse.json({ error: "No signature" }, { status: 400 })
    }

    const { getStripe } = await import("@/lib/stripe")
    const stripe = getStripe()

    let event
    try {
      event = stripe.webhooks.constructEvent(
        rawBody,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET || ''
      )
    } catch (err: any) {
      console.error("Webhook signature verification failed:", err.message)
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
    }

    await connectDB()

    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object)
        break
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object)
        break
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object)
        break
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object)
        break
      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object)
        break
      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object)
        break
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error("Stripe webhook error:", error)
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 })
  }
}

async function handleCheckoutSessionCompleted(session: any) {
  const { type, bookingId, userId, cutsForFirstMonth } = session.metadata || {}

  if (type === 'booking_deposit' && bookingId) {
    // findOneAndUpdate (not updateOne) so the filter also guards against a
    // duplicate webhook delivery re-notifying the admin — it only matches
    // (and returns a doc) the first time this booking is still
    // pending_payment; a replay finds nothing left to update.
    const booking = await Booking.findOneAndUpdate(
      { _id: bookingId, status: 'pending_payment' },
      { status: 'confirmed', depositPaid: true },
      { new: true }
    )
    if (booking) {
      notifyAdminsOfNewBooking(booking.customerName, booking.serviceName, booking.date, booking.startTime).catch((err) =>
        console.error('[webhook] Admin notify failed:', err)
      )
    }
    return
  }

  if (userId) {
    // A mid-month signup only gets the cuts still usable this month (see
    // create-checkout-session's proration) — falls back to a full 4 if the
    // metadata is missing (e.g. an older session, or the dev mock path).
    const parsedCuts = Number(cutsForFirstMonth)
    const cutsThisMonth = Number.isFinite(parsedCuts) && parsedCuts >= 1 && parsedCuts <= 4 ? parsedCuts : 4

    await Subscription.findOneAndUpdate(
      { userId },
      {
        userId,
        stripeCustomerId: session.customer,
        stripeSubscriptionId: session.subscription,
        status: 'active',
        plan: 'monthly',
        cutsRemaining: cutsThisMonth,
        cutsTotal: cutsThisMonth,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        updatedAt: new Date()
      },
      { upsert: true }
    )
    // Every other webhook handler below (subscription created/updated/deleted,
    // invoice payment failed/succeeded) looks the user up by
    // `User.findOne({ stripeCustomerId: subscription.customer })` — without
    // this, that lookup always misses and those handlers silently no-op for
    // every real customer (renewals never reset cuts, cancellations never
    // mark the subscription expired, etc).
    await User.updateOne({ _id: userId }, { stripeCustomerId: session.customer })
    await initializeMonthlyCuts(userId, cutsThisMonth)
  }
}

// Stripe's subscription.status can be 'trialing' (a prorated first-month
// signup sits here until its recurring line item's trial_end) or 'unpaid' —
// neither is in this app's Subscription.status enum, and 'trialing'
// specifically needs to read as VIP-active: that customer already paid
// the prorated charge and has real cuts to use, they just aren't being
// billed the recurring amount yet.
function mapStripeSubscriptionStatus(stripeStatus: string): 'active' | 'inactive' | 'cancelled' | 'past_due' | 'expired' {
  if (stripeStatus === 'trialing' || stripeStatus === 'active') return 'active'
  if (stripeStatus === 'past_due') return 'past_due'
  if (stripeStatus === 'canceled' || stripeStatus === 'unpaid') return 'expired'
  return 'inactive'
}

// The pinned API version ("2025-08-27.basil") no longer returns
// current_period_start/current_period_end on the Subscription object itself —
// Stripe moved them to each subscription item. This checkout flow always
// creates exactly one recurring item per subscription, so the first item's
// period is the subscription's period. Falls back to the top-level fields in
// case a differently-configured event ever has them.
function getSubscriptionPeriod(subscription: any): { start: number; end: number } {
  const item = subscription.items?.data?.[0]
  return {
    start: subscription.current_period_start ?? item?.current_period_start,
    end: subscription.current_period_end ?? item?.current_period_end,
  }
}

async function handleSubscriptionCreated(subscription: any) {
  const user = await User.findOne({ stripeCustomerId: subscription.customer })
  if (user) {
    const period = getSubscriptionPeriod(subscription)
    await Subscription.findOneAndUpdate(
      { userId: user._id },
      {
        status: mapStripeSubscriptionStatus(subscription.status),
        stripeSubscriptionId: subscription.id,
        currentPeriodStart: new Date(period.start * 1000),
        currentPeriodEnd: new Date(period.end * 1000),
      },
      { upsert: true }
    )
  }
}

async function handleSubscriptionUpdated(subscription: any) {
  const user = await User.findOne({ stripeCustomerId: subscription.customer })
  if (user) {
    const sub = await Subscription.findOne({ userId: user._id })
    const period = getSubscriptionPeriod(subscription)
    const newPeriodEnd = new Date(period.end * 1000)

    // Check for renewal
    if (sub && newPeriodEnd > sub.currentPeriodEnd && subscription.status === 'active') {
      await initializeMonthlyCuts(user._id.toString())
      await Subscription.updateOne({ userId: user._id }, { cutsRemaining: 4, cutsTotal: 4 })
    }

    // Stripe doesn't flip its own subscription.status to "canceled" until the
    // period actually ends — a customer-initiated cancellation only sets
    // cancel_at_period_end. Without this, this sync would silently overwrite
    // the local "cancelled" marker back to "active" on the very next webhook.
    const resolvedStatus = subscription.cancel_at_period_end ? 'cancelled' : mapStripeSubscriptionStatus(subscription.status)

    await Subscription.updateOne(
      { userId: user._id },
      {
        status: resolvedStatus,
        currentPeriodStart: new Date(period.start * 1000),
        currentPeriodEnd: newPeriodEnd,
      }
    )
  }
}

async function handleSubscriptionDeleted(subscription: any) {
  const user = await User.findOne({ stripeCustomerId: subscription.customer })
  if (user) {
    await Subscription.updateOne({ userId: user._id }, { status: 'expired' })

    // Fire-and-forget — a webhook must still return 200 even if the
    // notifications provider is down.
    notifyPaymentIssue(user._id.toString(), 'subscription_cancelled').catch((err) =>
      console.error('[webhook] OneSignal notify failed:', err)
    )
  }
}

async function handleInvoicePaymentFailed(invoice: any) {
  const user = await User.findOne({ stripeCustomerId: invoice.customer })
  if (user) {
    // Don't resurrect a subscription the customer already cancelled.
    await Subscription.updateOne(
      { userId: user._id, status: { $ne: 'cancelled' } },
      { status: 'past_due' }
    )

    // Fire-and-forget — a webhook must still return 200 even if the
    // notifications provider is down.
    notifyPaymentIssue(user._id.toString(), 'payment_failed').catch((err) =>
      console.error('[webhook] OneSignal notify failed:', err)
    )
  }
}

async function handleInvoicePaymentSucceeded(invoice: any) {
  const user = await User.findOne({ stripeCustomerId: invoice.customer })
  if (user) {
    // Only recovers from a past_due state (e.g. a dunning retry that
    // succeeded) — checkout.session.completed and subscription.updated
    // already cover normal activation/renewal.
    await Subscription.updateOne(
      { userId: user._id, status: 'past_due' },
      { status: 'active' }
    )
  }
}
