import { NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import connectDB from '@/lib/mongodb'
import { User, Subscription, Cut, ScanLog } from '@/lib/models'

export async function DELETE(request: Request) {
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

    // Get user ID from request body
    const { userId } = await request.json()
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    // Connect to database
    await connectDB()

    // Check if user exists and is not an admin
    const user = await User.findById(userId)
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }
    
    if (user.role === 'admin') {
      return NextResponse.json(
        { error: 'Cannot delete admin users' },
        { status: 403 }
      )
    }

    // Delete all related data
    await Promise.all([
      // Delete user's cuts
      Cut.deleteMany({ userId }),
      // Delete user's scan logs
      ScanLog.deleteMany({ userId }),
      // Delete user's subscriptions
      Subscription.deleteMany({ userId }),
      // Delete the user
      User.findByIdAndDelete(userId)
    ])

    return NextResponse.json({ message: 'User deleted successfully' })
  } catch (error) {
    console.error('Error deleting user:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
