import { type NextRequest, NextResponse } from 'next/server'
import { generateToken } from '@/lib/auth'
import { User, VerificationCode } from '@/lib/models'
import connectDB from '@/lib/mongodb'
import { sendVerificationEmail } from "@/lib/email"
import { registerExternalId } from "@/lib/onesignal"

function generateReferralCode(name: string): string {
  const prefix = (name || 'USR').slice(0, 3).toUpperCase()
  const random = Math.random().toString(36).substring(2, 8).toUpperCase()
  return prefix + random
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, fullName, phone, referralCode, dateOfBirth, preferences } = body

    if (!email || !password || !fullName) {
      return NextResponse.json({ success: false, error: 'Email, password, and full name are required' }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ success: false, error: 'Password must be at least 6 characters long' }, { status: 400 })
    }

    await connectDB()

    const existingUser = await User.findOne({ email: email.toLowerCase() })
    if (existingUser) {
      return NextResponse.json({ success: false, error: 'An account with this email already exists.', code: 'USER_ALREADY_EXISTS' }, { status: 400 })
    }

    // Generate unique referral code
    let userReferralCode = referralCode || generateReferralCode(fullName)
    let codeAttempts = 0
    let isUnique = false

    while (codeAttempts < 10 && !isUnique) {
      const existingCode = await User.findOne({ referralCode: userReferralCode })
      if (!existingCode) {
        isUnique = true
      } else {
        userReferralCode = generateReferralCode(fullName)
        codeAttempts++
      }
    }

    const newUser = await User.create({
      email: email.toLowerCase(),
      password: password,
      name: fullName,
      phone: phone || '',
      role: 'customer',
      emailVerified: false,
      referralCode: userReferralCode,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
      preferences: {
        favoriteDrink: preferences?.favoriteDrink || '',
        favoriteSnack: preferences?.favoriteSnack || ''
      },
      totalVisits: 0,
      lastVisit: null
    })

    try {
      await registerExternalId(newUser._id.toString(), newUser.email)
    } catch (oneSignalError: any) {
      // Never fail account creation over a notifications-provider hiccup.
      console.error('[signup] OneSignal registration failed:', oneSignalError)
    }

    let token = null
    try {
      token = generateToken(newUser)
    } catch (tokenErr: any) {
      console.error('[signup] Token generation failed:', tokenErr)
      throw new Error(`Token generation failed: ${tokenErr.message}`)
    }

    // Generate and send verification code immediately
    const verifyCode = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

    await VerificationCode.create({
      email: email.toLowerCase(),
      code: verifyCode,
      expiresAt: expiresAt,
      used: false,
      metadata: { createdVia: "signup_flow", timestamp: new Date() }
    })

    let emailWarning = null
    try {
      await sendVerificationEmail({
        to: email,
        code: verifyCode,
        fullName: fullName,
      })
    } catch (emailError: any) {
      console.error('[signup] Email sending failed:', emailError)
      emailWarning = emailError.message || "Failed to send verification email, but your account was created. You can try resending the code later."
    }

    return NextResponse.json({
      success: true,
      message: 'Account created successfully!',
      user: {
        id: newUser._id.toString(),
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
        referralCode: newUser.referralCode,
      },
      token,
      emailWarning,
      needsEmailVerification: true
    })

  } catch (error: any) {
    console.error('[signup] Unexpected error:', error)

    // Check for Mongoose duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0]
      return NextResponse.json({
        success: false,
        error: `This ${field} is already in use.`
      }, { status: 400 })
    }

    return NextResponse.json({ 
      success: false, 
      error: error.message || "An unexpected error occurred during signup.",
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined 
    }, { status: 500 })
  }
}
