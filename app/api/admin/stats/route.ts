import { NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import connectDB from '@/lib/mongodb'
import { User, Subscription, Cut, ScanLog } from '@/lib/models'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    // Verify admin token
    const token = request.headers.get('Authorization')?.split(' ')[1]
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload || payload.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Connect to database
    await connectDB()

    // Get today's date at midnight
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Get date 7 days ago
    const weekAgo = new Date(today)
    weekAgo.setDate(weekAgo.getDate() - 7)

    // Get all stats in parallel
    const [
      totalClients,
      activeSubscriptions,
      scansThisWeek,
      cutsUsedToday
    ] = await Promise.all([
      User.countDocuments({ role: 'customer' }),
      Subscription.countDocuments({ status: 'active' }),
      ScanLog.countDocuments({
        action: { $in: ['used', 'scanned'] },
        createdAt: { $gte: weekAgo }
      }),
      ScanLog.countDocuments({
        action: 'used',
        createdAt: { $gte: today }
      })
    ])

    return NextResponse.json({
      totalClients,
      activeSubscriptions,
      scansThisWeek,
      cutsUsedToday
    })
  } catch (error) {
    console.error('Error fetching admin stats:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
