import { NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import connectDB from '@/lib/mongodb'
import { User } from '@/lib/models'
import { checkRateLimitByKey } from '@/lib/security'
import bcrypt from 'bcryptjs'

export async function POST(
  request: Request,
  { params }: { params: { userId: string } }
) {
  try {
    const token = request.headers.get('Authorization')?.split(' ')[1]
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Customers may only change their own password, not another account's.
    if (payload.userId !== params.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (!checkRateLimitByKey(`change-password:${payload.userId}`, 5, 15 * 60 * 1000)) {
      return NextResponse.json({ error: 'Too many attempts. Please try again later.' }, { status: 429 })
    }

    const { currentPassword, newPassword } = await request.json()
    if (!currentPassword || typeof currentPassword !== 'string') {
      return NextResponse.json({ error: 'Current password is required' }, { status: 400 })
    }
    if (!newPassword || newPassword.length < 8) {
      return NextResponse.json({ error: 'New password must be at least 8 characters long' }, { status: 400 })
    }

    await connectDB()

    const user = await User.findById(params.userId)
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Require the current password, unlike a token-based reset — this is
    // a logged-in self-service change, so it should confirm the person at
    // the keyboard actually knows the existing password, not just that
    // they hold a still-valid session token.
    const isMatch = await bcrypt.compare(currentPassword, user.password)
    if (!isMatch) {
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 401 })
    }

    const salt = await bcrypt.genSalt(12)
    const hashedPassword = await bcrypt.hash(newPassword, salt)

    // A targeted update, not a full-document .save() — this only touches
    // the password field, so it can't be blocked by unrelated invalid
    // state elsewhere on the document (mirrors the admin equivalent).
    await User.updateOne({ _id: params.userId }, { $set: { password: hashedPassword } })

    return NextResponse.json({ message: 'Password updated successfully' })
  } catch (error) {
    console.error('Error updating password:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
