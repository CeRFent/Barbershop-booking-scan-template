import { NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import connectDB from '@/lib/mongodb'
import { ScanLog } from '@/lib/models'

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  { params }: { params: { userId: string } }
) {
  try {
    const authHeader = request.headers.get('Authorization')
    const token = authHeader?.split(' ')[1]
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload || (payload.userId !== params.userId && payload.role !== 'admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    await connectDB()

    // Get scan logs for this specific user
    const logs = await ScanLog.find({ userId: params.userId })
      .populate('barberId', 'name')
      .populate('cutId', 'cutNumber monthYear')
      .sort({ createdAt: -1 })
      .limit(20)
      .lean()

    const transformedLogs = logs.map((log: any) => ({
      id: log._id.toString(),
      action: log.action,
      createdAt: log.createdAt.toISOString(),
      barberName: log.barberId?.name || 'Unknown Barber',
      cutDetails: log.cutId ? {
        cutNumber: log.cutId.cutNumber,
        monthYear: log.cutId.monthYear
      } : null,
      notes: log.notes
    }))

    return NextResponse.json({ success: true, visits: transformedLogs })
  } catch (error: any) {
    console.error('Error fetching user visits:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
