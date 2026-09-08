import { NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import connectDB from '@/lib/mongodb'
import { User, Subscription, Cut, ScanLog } from '@/lib/models'

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, error: 'No token provided' }, { status: 401 })
    }
    
    const token = authHeader.split(' ')[1]
    const payload = verifyToken(token)
    if (!payload || payload.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 })
    }

    const { userId, action, reason } = await request.json()
    if (!userId || !action) {
      return NextResponse.json({ success: false, error: 'User ID and action are required' }, { status: 400 })
    }

    await connectDB()
    const now = new Date()

    const subscription = await Subscription.findOne({ userId, status: 'active' })
    if (!subscription) {
      return NextResponse.json({ success: false, error: 'No active subscription found for this user' }, { status: 404 })
    }

    if (action === 'add') {
      // Add a manual cut
      const currentMonth = now.toISOString().slice(0, 7)
      
      // Find the highest cut number for this month to increment
      const lastCut = await Cut.findOne({ userId, monthYear: currentMonth }).sort({ cutNumber: -1 })
      const newCutNumber = lastCut ? lastCut.cutNumber + 1 : 1

      const newCut = await Cut.create({
        userId,
        monthYear: currentMonth,
        cutNumber: newCutNumber,
        status: 'available',
        createdAt: now
      })

      await Promise.all([
        Subscription.updateOne({ userId }, { $inc: { cutsRemaining: 1 } }),
        User.findByIdAndUpdate(userId, { $inc: { cuts: 1 } }),
        ScanLog.create({
          userId,
          barberId: payload.userId, // Admin who did the adjustment
          cutId: newCut._id,
          action: 'manual_add',
          timestamp: now,
          notes: reason || 'Manual cut addition by admin'
        })
      ])

      return NextResponse.json({ success: true, message: 'Cut added successfully' })

    } else if (action === 'deduct') {
      // Deduct (use) the oldest available cut
      const availableCut = await Cut.findOne({ userId, status: 'available' }).sort({ monthYear: 1, cutNumber: 1 })
      
      if (!availableCut) {
        return NextResponse.json({ success: false, error: 'No available cuts to deduct' }, { status: 400 })
      }

      await Cut.findByIdAndUpdate(availableCut._id, {
        status: 'used',
        usedAt: now,
        barberId: payload.userId // Admin who did the deduction
      })

      await Promise.all([
        Subscription.updateOne({ userId }, { $inc: { cutsRemaining: -1 } }),
        User.findByIdAndUpdate(userId, { $inc: { cuts: -1 } }),
        ScanLog.create({
          userId,
          barberId: payload.userId,
          cutId: availableCut._id,
          action: 'manual_deduct',
          timestamp: now,
          notes: reason || 'Manual cut deduction by admin'
        })
      ])

      return NextResponse.json({ success: true, message: 'Cut deducted successfully' })
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 })

  } catch (error: any) {
    console.error('Manual adjustment error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
