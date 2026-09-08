import { NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import connectDB from '@/lib/mongodb'
import { ScanLog } from '@/lib/models'

export const dynamic = 'force-dynamic'

// Polled every few seconds by the admin QR/check-in tablet page — not a
// live push (no WebSocket infra in this app), but a few seconds of lag is
// invisible for someone standing at the counter, and this avoids adding
// always-on server infrastructure for a single in-shop screen.
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

    const { searchParams } = new URL(request.url)
    const since = searchParams.get('since')
    if (!since) {
      return NextResponse.json({ success: false, error: 'since is required' }, { status: 400 })
    }
    const sinceDate = new Date(since)
    if (isNaN(sinceDate.getTime())) {
      return NextResponse.json({ success: false, error: 'since must be a valid date' }, { status: 400 })
    }

    await connectDB()

    const scans = await ScanLog.find({
      action: { $in: ['scanned', 'used'] },
      createdAt: { $gt: sinceDate },
    })
      .sort({ createdAt: 1 })
      .limit(20)
      .populate('userId', 'name')

    const events = scans.map((s: any) => ({
      _id: s._id,
      customerName: s.userId?.name || 'Unknown',
      cutRedeemed: s.action === 'used',
      isNewCustomer: s.isNewCustomer,
      hasBookingToday: s.hasBookingToday,
      createdAt: s.createdAt,
    }))

    return NextResponse.json({ success: true, events, serverTime: new Date().toISOString() })
  } catch (error: any) {
    console.error('[admin/recent-scans GET] Error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
