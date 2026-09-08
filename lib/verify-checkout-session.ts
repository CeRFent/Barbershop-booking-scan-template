// Proves that a client-supplied userId is backed by a real, completed Stripe
// checkout session before we do anything security- or billing-sensitive with
// it (issuing a login token, activating a subscription). Never trust userId
// alone — Mongo _ids aren't secret and are easy to guess/enumerate.

export interface CheckoutSessionVerification {
  ok: boolean
  reason?: string
  // Only set for a real (non-mock) verified session — callers that need
  // the real Stripe customer/subscription IDs or checkout metadata (e.g.
  // activate-subscription's proration-aware cut count) use this instead
  // of re-fetching or falling back to placeholder values.
  session?: { customer: string; subscription: string; metadata: Record<string, string> }
}

export async function verifyCheckoutSession(
  sessionId: unknown,
  userId: unknown
): Promise<CheckoutSessionVerification> {
  if (typeof sessionId !== 'string' || !sessionId || typeof userId !== 'string' || !userId) {
    return { ok: false, reason: 'sessionId and userId are required' }
  }

  // Mock/dev checkout (no Stripe keys configured) — only trust it when the
  // app itself is actually running in that mode, never in a real deployment.
  if (sessionId.startsWith('mock_session_')) {
    if (process.env.STRIPE_SECRET_KEY) {
      return { ok: false, reason: 'Mock session used against a live Stripe deployment' }
    }
    if (userId.length !== 24) {
      return { ok: false, reason: 'Invalid userId' }
    }
    return { ok: true }
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return { ok: false, reason: 'Stripe is not configured' }
  }

  try {
    const { getStripe } = await import('@/lib/stripe')
    const stripe = getStripe()
    const session = await stripe.checkout.sessions.retrieve(sessionId)

    if (session.status !== 'complete') {
      return { ok: false, reason: 'Checkout session is not complete' }
    }
    if (!session.metadata || session.metadata.userId !== userId) {
      return { ok: false, reason: 'Session does not belong to this user' }
    }
    return {
      ok: true,
      session: {
        customer: String(session.customer),
        subscription: String(session.subscription),
        metadata: session.metadata as Record<string, string>,
      },
    }
  } catch (error) {
    return { ok: false, reason: 'Unable to verify checkout session' }
  }
}
