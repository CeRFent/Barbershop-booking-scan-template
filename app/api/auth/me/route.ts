import { NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import connectDB from '@/lib/mongodb'
import { User } from '@/lib/models'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    // Get token from Authorization header or cookies
    const authHeader = request.headers.get('Authorization')
    const token = authHeader?.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : request.headers.get('cookie')?.split('token=')[1]?.split(';')[0]

    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    // Verify token
    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Connect to database
    await connectDB()

    // Get user from database
    const user = await User.findById(payload.userId)
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Return user data (excluding password)
    return NextResponse.json({
      id: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
      phone: user.phone,
      emailVerified: user.emailVerified,
      referralCode: user.referralCode,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
      isActive: user.isActive
    })

  } catch (error) {
    console.error('Error in /api/auth/me:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
