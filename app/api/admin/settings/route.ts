import { NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { getSubscriptionMonthlyPrice, setSubscriptionMonthlyPrice } from '@/lib/settings'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const token = request.headers.get('Authorization')?.split(' ')[1]
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
    const payload = verifyToken(token)
    if (!payload || payload.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const subscriptionMonthlyPrice = await getSubscriptionMonthlyPrice()
    return NextResponse.json({ success: true, subscriptionMonthlyPrice })
  } catch (error) {
    console.error('[admin/settings GET] Error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const token = request.headers.get('Authorization')?.split(' ')[1]
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
    const payload = verifyToken(token)
    if (!payload || payload.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const { subscriptionMonthlyPrice } = await request.json()
    const price = Number(subscriptionMonthlyPrice)

    // Sanity-bound the price rather than trusting any positive number — a
    // typo here (e.g. an extra zero) would misprice every new signup and
    // every future proration until caught.
    if (!Number.isFinite(price) || price < 1 || price > 2000) {
      return NextResponse.json(
        { success: false, error: 'Price must be a number between $1 and $2000' },
        { status: 400 }
      )
    }

    const saved = await setSubscriptionMonthlyPrice(Math.round(price * 100) / 100)
    return NextResponse.json({ success: true, subscriptionMonthlyPrice: saved })
  } catch (error) {
    console.error('[admin/settings PATCH] Error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
