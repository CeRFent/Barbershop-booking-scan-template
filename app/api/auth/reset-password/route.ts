import { NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import { User } from '@/lib/models'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

export async function POST(request: Request) {
  try {
    const { token, newPassword } = await request.json()

    if (!token || !newPassword) {
      return NextResponse.json(
        { error: 'Token and new password are required' },
        { status: 400 }
      )
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      )
    }

    const jwtSecret = process.env.JWT_SECRET
    if (!jwtSecret) {
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
    }

    // Verify reset token. Requiring purpose === 'password_reset' stops a
    // regular 7-day login session token (same secret, same JWT shape) from
    // also being usable to change the account's password.
    let payload: any
    try {
      payload = jwt.verify(token, jwtSecret)
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid or expired reset token' },
        { status: 401 }
      )
    }
    if (payload.purpose !== 'password_reset') {
      return NextResponse.json(
        { error: 'Invalid or expired reset token' },
        { status: 401 }
      )
    }

    // Connect to database
    await connectDB()

    // Hash new password
    const salt = await bcrypt.genSalt(12) // Use 12 salt rounds to match lib/auth.ts
    const hashedPassword = await bcrypt.hash(newPassword, salt)

    // Admins and customers are both stored as User documents (role: 'admin' | 'customer').
    const user = await User.findByIdAndUpdate(
      payload.userId,
      { password: hashedPassword },
      { new: true }
    )

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      message: 'Password updated successfully'
    })
  } catch (error) {
    console.error('Error resetting password:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
