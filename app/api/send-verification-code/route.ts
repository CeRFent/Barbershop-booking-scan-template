import { type NextRequest, NextResponse } from "next/server"
import { sendVerificationEmail, testEmailConnection } from "@/lib/email"
import { User, VerificationCode } from '@/lib/models'
import connectDB from '@/lib/mongodb'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, fullName, phone, referralCode } = body

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    // Password is only required for new signups, not for resending codes
    if (password && password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters long" }, { status: 400 })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 })
    }

    // Test email configuration first
    const emailTest = await testEmailConnection()
    if (!emailTest.success) {
      console.error("[send-verification-code] Email configuration error:", emailTest.error)
      return NextResponse.json(
        {
          error: "Email service not configured properly",
          details: emailTest.error,
          suggestion: "Please check RESEND_API_KEY and FROM_EMAIL environment variables",
        },
        { status: 500 },
      )
    }

    try {
      await connectDB()
    } catch (dbError: any) {
      console.error("[send-verification-code] MongoDB connection error:", dbError)
      return NextResponse.json(
        {
          error: "Database connection failed",
          details: dbError.message,
        },
        { status: 500 },
      )
    }

    // Check if user exists and is not verified
    const existingUser = await User.findOne({ email: email.toLowerCase() })
    if (!existingUser) {
      return NextResponse.json(
        {
          error: "No account found with this email. Please sign up first.",
          code: "USER_NOT_FOUND",
        },
        { status: 400 },
      )
    }

    if (existingUser.emailVerified) {
      return NextResponse.json(
        {
          error: "Email is already verified. You can proceed to login.",
          code: "EMAIL_ALREADY_VERIFIED",
        },
        { status: 400 },
      )
    }

    // Generate 6-digit verification code
    const code = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes from now

    // Clean up any existing verification codes for this email first
    await VerificationCode.deleteMany({ email: email.toLowerCase() })

    // Insert new verification code in MongoDB
    const metadata = {
      createdVia: "api",
      timestamp: new Date(),
    }

    const verificationRecord = await VerificationCode.create({
      email: email.toLowerCase(),
      code: code,
      expiresAt: expiresAt,
      used: false,
      metadata: metadata,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    // Send verification email
    try {
      const emailResult = await sendVerificationEmail({
        to: email,
        code: code,
        fullName: fullName,
      })

      return NextResponse.json({
        success: true,
        message: `Verification code sent to ${email}. Please check your email inbox and spam folder.`,
        debug: {
          email,
          codeLength: code.length,
          expiresAt: expiresAt.toISOString(),
          existingUserCheck: "passed",
          database: "mongodb",
          verificationId: verificationRecord._id,
          emailSent: true,
          messageId: emailResult.messageId,
        },
      })
    } catch (emailError: any) {
      console.error("[send-verification-code] Error sending email:", emailError)

      // Delete the verification code since email failed
      await VerificationCode.findByIdAndDelete(verificationRecord._id)

      return NextResponse.json(
        {
          error: `Failed to send verification email: ${emailError.message}`,
          suggestion: "Please check your email configuration (RESEND_API_KEY and FROM_EMAIL)",
        },
        { status: 500 },
      )
    }
  } catch (error: any) {
    console.error("[send-verification-code] Unexpected error:", error)
    console.error("[send-verification-code] Error message:", error.message)
    console.error("[send-verification-code] Error stack:", error.stack)

    return NextResponse.json(
      {
        error: `Unexpected error: ${error.message}`,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 },
    )
  }
}
