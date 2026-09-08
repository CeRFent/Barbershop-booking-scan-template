import { NextResponse } from 'next/server'
import { getSubscriptionMonthlyPrice } from '@/lib/settings'

export const dynamic = 'force-dynamic'

// Public and unauthenticated on purpose — the price needs to be readable
// by anyone browsing /pricing or the homepage before they've signed up,
// same as the (formerly hardcoded) "$150" text it replaces.
export async function GET() {
  try {
    const price = await getSubscriptionMonthlyPrice()
    return NextResponse.json({ success: true, price })
  } catch (error) {
    console.error('[settings/subscription-price GET] Error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
