import { NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import connectDB from '@/lib/mongodb'
import { User } from '@/lib/models'
import bcrypt from 'bcryptjs'

export async function POST(
  request: Request,
  { params }: { params: { adminId: string } }
) {
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

    // Admins may only change their own password, not another admin's
    if (payload.userId !== params.adminId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get new password
    const { newPassword } = await request.json()
    if (!newPassword || newPassword.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      )
    }

    // Connect to database
    await connectDB()

    // Hash new password
    const salt = await bcrypt.genSalt(12) // Use 12 salt rounds to match lib/auth.ts
    const hashedPassword = await bcrypt.hash(newPassword, salt)

    // Update admin password (admin accounts are stored as User documents)
    const admin = await User.findOneAndUpdate(
      { _id: params.adminId, role: 'admin' },
      {
        $set: {
          password: hashedPassword
        }
      },
      { new: true }
    ).select('-password')

    if (!admin) {
      return NextResponse.json(
        { error: 'Admin not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      message: 'Password updated successfully'
    })
  } catch (error) {
    console.error('Error updating admin password:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
