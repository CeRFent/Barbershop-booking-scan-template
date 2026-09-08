import { NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import connectDB from '@/lib/mongodb'
import { Cut, Subscription } from '@/lib/models'

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  { params }: { params: { userId: string } }
) {
  try {
    // Verify token
    const token = request.headers.get('Authorization')?.split(' ')[1]
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload || (payload.userId !== params.userId && payload.role !== 'admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Connect to database
    await connectDB()

    // Get user's subscription (active or cancelled but not expired)
    const subscription = await Subscription.findOne({
      userId: params.userId,
      status: { $in: ['active', 'cancelled'] }
    })

    // Get actual cuts for this user
    const cuts = await Cut.find({
      userId: params.userId
    }).sort({ monthYear: -1, cutNumber: 1 })

    if (cuts.length === 0 && !subscription) {
      return NextResponse.json({ cuts: [] })
    }

    // Transform cuts to match expected format
    const formattedCuts = cuts.map(cut => ({
      id: cut._id.toString(),
      userId: cut.userId.toString(),
      subscriptionId: subscription?._id.toString() || null,
      cutNumber: cut.cutNumber,
      status: cut.status,
      usedAt: cut.usedAt?.toISOString(),
      createdAt: cut.createdAt.toISOString(),
      monthYear: cut.monthYear
    }))

    return NextResponse.json({ cuts: formattedCuts })
  } catch (error) {
    console.error('Error fetching user cuts:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
