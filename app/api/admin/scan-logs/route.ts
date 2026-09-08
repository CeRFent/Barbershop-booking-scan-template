import { NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import connectDB from '@/lib/mongodb'
import { ScanLog, User, Subscription, Cut } from '@/lib/models'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    // Verify admin token
    const authHeader = request.headers.get('Authorization')
    const token = authHeader?.split(' ')[1]
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload || payload.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Connect to database
    await connectDB()

    // Get all scan logs with populated user data
    const logs = await ScanLog.find()
      .populate('userId', 'name email')
      .populate('barberId', 'name email')
      .populate('cutId', 'cutNumber monthYear status')
      .sort({ createdAt: -1 })
      .limit(100)
      .lean()



    // Transform logs to include proper structure with null checks
    const transformedLogs = logs.map((log: any) => {
      // Handle null/undefined populated fields
      const userId = log.userId ? (log.userId._id?.toString() || log.userId.toString()) : 'Unknown'
      const barberId = log.barberId ? (log.barberId._id?.toString() || log.barberId.toString()) : 'Unknown'
      const cutId = log.cutId ? (log.cutId._id?.toString() || log.cutId.toString()) : 'Unknown'
      
      return {
        id: log._id.toString(),
        userId: userId,
        barberId: barberId,
        cutId: cutId,
        action: log.action,
        shopToken: log.shopToken || '',
        createdAt: log.createdAt.toISOString(),
        user: {
          name: log.userId?.name || 'Unknown',
          email: log.userId?.email || 'N/A'
        },
        barber: {
          name: log.barberId?.name || 'Unknown',
          email: log.barberId?.email || 'N/A'
        },
        cut: log.cutId ? {
          cutNumber: log.cutId.cutNumber,
          monthYear: log.cutId.monthYear,
          status: log.cutId.status
        } : null
      }
    })

    return NextResponse.json({ logs: transformedLogs })
  } catch (error) {
    console.error('Error fetching scan logs:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
