import Stripe from "stripe"

// singleton – created only the first time it’s needed *at run-time*
let _stripe: Stripe | null = null

export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY
    if (!key) {
      throw new Error("STRIPE_SECRET_KEY is not set in the environment – Stripe calls cannot be made.")
    }
    // Pinned to the API version this integration was written against. The
    // installed Stripe SDK's types only know about newer versions, but the
    // string itself is still accepted by Stripe's API — don't bump this
    // without deliberately reviewing the integration against the new version.
    _stripe = new Stripe(key, { apiVersion: "2025-08-27.basil" as Stripe.LatestApiVersion })
  }
  return _stripe
}

// handy constants (these don’t require the secret key)
export const STRIPE_PRICE_ID = process.env.STRIPE_PRICE_ID!
export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET!
