import { type NextRequest, NextResponse } from "next/server"
import { getSubscriptionMonthlyPrice } from "@/lib/settings"
import { ymdInShopTZ, startOfNextMonthYMD, shopLocalMidnightUTC } from "@/lib/timezone"
import { CUTS_PER_MONTH, weekOfMonthFromYMD, cutsForFirstMonth, prorateAmountCents } from "@/lib/subscription-proration"
import { brand } from "@/lib/brand-config"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, fullName, phone, referralCode, userId } = body

    // Validate required fields
    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    // Check if Stripe keys are available
    const hasStripeKeys = process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PUBLISHABLE_KEY

    if (!hasStripeKeys) {
      // Create mock checkout session
      const mockSessionId = `mock_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

      // Build success URL with all parameters
      const host = request.headers.get('host') || 'localhost:3001'
      const protocol = request.headers.get('x-forwarded-proto') || 'http'
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || `${protocol}://${host}`
      const successUrl = new URL("/success", baseUrl)
      successUrl.searchParams.set("session_id", mockSessionId)
      successUrl.searchParams.set("email", email)
      successUrl.searchParams.set("mock", "true")

      if (userId) successUrl.searchParams.set("userId", userId)
      if (fullName) successUrl.searchParams.set("fullName", fullName)
      if (phone) successUrl.searchParams.set("phone", phone)
      if (referralCode) successUrl.searchParams.set("referralCode", referralCode)

      return NextResponse.json({
        sessionId: mockSessionId,
        url: successUrl.toString(),
        mock: true,
      })
    }

    // Build base URL for success/cancel URLs
    const host = request.headers.get('host') || 'localhost:3000'
    const protocol = request.headers.get('x-forwarded-proto') || 'http'
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || `${protocol}://${host}`

    // Dynamic import to avoid loading Stripe when not needed
    const { getStripe } = await import("@/lib/stripe")
    const stripe = getStripe()

    // New-signup proration: someone joining mid-month only gets to use the
    // cuts left in the current month, so they're only charged for those —
    // 4/3/2/1 cuts depending on which week of the month they sign up in
    // (see lib/subscription-proration.ts for the exact table). The full
    // subscription price always comes from Settings (admin-editable), not
    // a hardcoded number, so a future price change is reflected immediately
    // and the proration math scales with it automatically.
    const todayYMD = ymdInShopTZ()
    const weekOfMonth = weekOfMonthFromYMD(todayYMD)
    const cutsThisMonth = cutsForFirstMonth(weekOfMonth)
    const isProrated = cutsThisMonth < CUTS_PER_MONTH

    const monthlyPriceDollars = await getSubscriptionMonthlyPrice()
    const basePriceCents = Math.round(monthlyPriceDollars * 100)
    const firstChargeCents = prorateAmountCents(basePriceCents, cutsThisMonth)

    const lineItems: any[] = []

    if (isProrated) {
      // One-time item covering only the cuts still usable this month —
      // charged immediately as part of this same checkout.
      lineItems.push({
        price_data: {
          currency: "usd",
          product_data: {
            name: `${brand.name} VIP — first month (prorated)`,
            description: `${cutsThisMonth} cut${cutsThisMonth === 1 ? "" : "s"} for the rest of this month`,
          },
          unit_amount: firstChargeCents,
        },
        quantity: 1,
      })
    }

    lineItems.push({
      price_data: {
        currency: "usd",
        product_data: {
          name: `${brand.name} Monthly Subscription`,
          description: "4 premium haircuts per month",
        },
        unit_amount: basePriceCents,
        recurring: {
          interval: "month",
        },
      },
      quantity: 1,
    })

    // Only a prorated signup needs its recurring billing delayed — a
    // full-price week-1 signup keeps charging/renewing from today exactly
    // like before this change. A prorated signup's recurring line item
    // stays in trial (charging nothing extra) until the 1st of next month,
    // when Stripe automatically starts billing the full price from then on.
    const subscriptionData: any = {
      metadata: {
        cutsForFirstMonth: String(cutsThisMonth),
        weekOfMonth: String(weekOfMonth),
      },
    }
    if (isProrated) {
      const nextMonthStartYMD = startOfNextMonthYMD(todayYMD)
      const desiredTrialEnd = Math.floor(shopLocalMidnightUTC(nextMonthStartYMD).getTime() / 1000)

      // Stripe rejects a trial_end under ~2 days out — reachable for a
      // real signup late on the last day or two of the month, since
      // "midnight on the 1st" can then be under 48h away. Clamp to
      // Stripe's minimum (with a small buffer for request latency) rather
      // than fail the checkout outright; worst case the customer's next
      // full-price billing starts a day or two after the 1st instead of
      // exactly on it — the prorated charge and cut count today are
      // unaffected either way.
      const minTrialEnd = Math.floor(Date.now() / 1000) + 2 * 24 * 60 * 60 + 60 * 60
      subscriptionData.trial_end = Math.max(desiredTrialEnd, minTrialEnd)
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: lineItems,
      mode: "subscription",
      subscription_data: subscriptionData,
      success_url: `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}&email=${encodeURIComponent(email)}${userId ? `&userId=${userId}` : ""}${fullName ? `&fullName=${encodeURIComponent(fullName)}` : ""}${phone ? `&phone=${encodeURIComponent(phone)}` : ""}${referralCode ? `&referralCode=${referralCode}` : ""}`,
      // /pricing is the live, linked-to entry point for starting checkout
      // (dashboard "Go VIP" and onboarding both send customers there) — a
      // customer backing out of Stripe should land somewhere real, not on
      // the old /confirmation page's dead "verifiedUserData" localStorage
      // dependency, which nothing in the current signup flow ever sets.
      cancel_url: `${baseUrl}/pricing?checkout=cancelled`,
      customer_email: email,
      metadata: {
        email,
        fullName: fullName || "",
        phone: phone || "",
        referralCode: referralCode || "",
        userId: userId || "",
        cutsForFirstMonth: String(cutsThisMonth),
        weekOfMonth: String(weekOfMonth),
      },
    })

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
      mock: false,
    })
  } catch (error: any) {
    console.error("[create-checkout-session] Error:", error)
    return NextResponse.json({ error: error.message || "Failed to create checkout session" }, { status: 500 })
  }
}
