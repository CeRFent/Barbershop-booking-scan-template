import { NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import connectDB from '@/lib/mongodb'
import { AvailabilityOverride } from '@/lib/models'
import { ymdInShopTZ } from '@/lib/timezone'

export const dynamic = 'force-dynamic'

function isValidDate(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
}

function isValidTime(value: unknown): value is string {
  return typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value)
}

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

    await connectDB()
    // Only ever show today-forward — a past override is no longer useful to
    // manage. Uses the shop's own timezone, not server-local UTC (a Vercel
    // function computing "today" via toISOString() drifts a day off from
    // Central time for part of the evening — the same bug class already
    // fixed elsewhere, see lib/timezone.ts).
    const today = ymdInShopTZ()
    const overrides = await AvailabilityOverride.find({ date: { $gte: today } }).sort({ date: 1 })

    return NextResponse.json({ success: true, overrides })
  } catch (error: any) {
    console.error('[admin/availability/overrides GET] Error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const token = request.headers.get('Authorization')?.split(' ')[1]
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload || payload.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { date, note } = body
    const isOpen = Boolean(body.isOpen)

    if (!isValidDate(date)) {
      return NextResponse.json({ success: false, error: 'Date must be in YYYY-MM-DD format' }, { status: 400 })
    }

    let openTime = null
    let closeTime = null
    if (isOpen) {
      if (!isValidTime(body.openTime) || !isValidTime(body.closeTime)) {
        return NextResponse.json({ success: false, error: 'Open days need a valid open and close time' }, { status: 400 })
      }
      if (body.openTime >= body.closeTime) {
        return NextResponse.json({ success: false, error: 'Close time must be after open time' }, { status: 400 })
      }
      openTime = body.openTime
      closeTime = body.closeTime
    }

    await connectDB()
    const override = await AvailabilityOverride.findOneAndUpdate(
      { date },
      { date, isOpen, openTime, closeTime, note: note?.trim() || '' },
      { new: true, upsert: true }
    )

    return NextResponse.json({ success: true, override })
  } catch (error: any) {
    console.error('[admin/availability/overrides POST] Error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
