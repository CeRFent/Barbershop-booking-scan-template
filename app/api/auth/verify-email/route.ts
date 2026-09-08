import { type NextRequest, NextResponse } from "next/server"
import { User, VerificationCode } from '@/lib/models'
import connectDB from '@/lib/mongodb'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, code } = body

    if (!email || !code) {
      return NextResponse.json({ error: "Email and code are required" }, { status: 400 })
    }

    await connectDB()

    // Find the verification code
    const verificationData = await VerificationCode.findOne({
      email: email.toLowerCase(),
      code: code,
      used: false
    })

    if (!verificationData) {
      return NextResponse.json({ error: "Invalid or expired verification code" }, { status: 400 })
    }

    // Check if code is expired
    const now = new Date()
    if (now > verificationData.expiresAt) {
      return NextResponse.json({ error: "Verification code has expired" }, { status: 400 })
    }

    // Find the user
    const user = await User.findOne({ email: email.toLowerCase() })
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Mark user as email verified
    await User.findByIdAndUpdate(user._id, {
      emailVerified: true,
      updatedAt: new Date()
    })

    // Mark verification code as used
    await VerificationCode.findByIdAndUpdate(
      verificationData._id,
      {
        used: true,
        updatedAt: new Date()
      }
    )

    return NextResponse.json({
      success: true,
      message: "Email verified successfully! You can now proceed to payment.",
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        emailVerified: true,
        referralCode: user.referralCode,
        createdAt: user.createdAt,
      },
    })

  } catch (error: any) {
    console.error("[verify-email] Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
