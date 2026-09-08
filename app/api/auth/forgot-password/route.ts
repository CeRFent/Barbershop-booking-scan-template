import { NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import { User } from '@/lib/models'
import { checkRateLimitByKey } from '@/lib/security'
import jwt from 'jsonwebtoken'

const GENERIC_MESSAGE = "If an account exists for that email, we've sent password reset instructions."

export async function POST(request: Request) {
  try {
    const { email } = await request.json()
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const normalizedEmail = email.toLowerCase().trim()

    // Rate limit by email so this can't be used to hammer a single inbox
    // or as a free-form user-enumeration oracle via timing.
    if (!checkRateLimitByKey(`forgot-password:${normalizedEmail}`, 3, 15 * 60 * 1000)) {
      return NextResponse.json({ message: GENERIC_MESSAGE })
    }

    const jwtSecret = process.env.JWT_SECRET
    if (!jwtSecret) {
      console.error('[forgot-password] JWT_SECRET not set')
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
    }

    await connectDB()
    const user = await User.findOne({ email: normalizedEmail })

    // Always return the same generic response whether or not the account
    // exists — a distinguishable response here would let anyone probe
    // which emails are registered customers.
    if (!user) {
      return NextResponse.json({ message: GENERIC_MESSAGE })
    }

    const resetToken = jwt.sign(
      { userId: user._id.toString(), purpose: 'password_reset' },
      jwtSecret,
      { expiresIn: '30m' }
    )

    const origin = request.headers.get('origin') || new URL(request.url).origin
    const resetUrl = `${origin}/auth/reset-password?token=${resetToken}`

    try {
      const { sendPasswordResetEmail } = await import('@/lib/email')
      await sendPasswordResetEmail({ to: user.email, resetUrl, fullName: user.name })
    } catch (emailError) {
      // Don't leak email-delivery failures to the client — that would
      // reveal server configuration state to whoever's calling this.
      console.error('[forgot-password] Failed to send reset email:', emailError)
    }

    return NextResponse.json({ message: GENERIC_MESSAGE })
  } catch (error) {
    console.error('[forgot-password] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
