import { NextResponse } from 'next/server'
import { generateToken } from '@/lib/auth'
import connectDB from '@/lib/mongodb'
import { User } from '@/lib/models'
import { verifyCheckoutSession } from '@/lib/verify-checkout-session'

export async function POST(request: Request) {
  try {
    const { userId, sessionId } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    // This mints a live session token, so it must be backed by proof of a
    // real, completed checkout — never just the userId a client hands us.
    const verification = await verifyCheckoutSession(sessionId, userId)
    if (!verification.ok) {
      return NextResponse.json({ error: 'Unable to verify checkout session' }, { status: 403 })
    }

    // Connect to database
    await connectDB()

    // Find user by ID
    const user = await User.findById(userId)
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Update last login timestamp
    await User.findByIdAndUpdate(userId, {
      lastLoginAt: new Date(),
      updatedAt: new Date()
    })

    // Generate JWT token
    const token = generateToken(user)

    return NextResponse.json({
      success: true,
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    })
  } catch (error) {
    console.error('Error generating login token:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
