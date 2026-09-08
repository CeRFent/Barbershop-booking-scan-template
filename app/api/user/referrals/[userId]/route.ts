import { type NextRequest, NextResponse } from "next/server"
import { verifyToken } from "@/lib/auth"
import { Referral, User } from "@/lib/models"
import connectDB from "@/lib/mongodb"

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const authHeader = request.headers.get("Authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.split(" ")[1]
    const payload = verifyToken(token)

    if (!payload || payload.userId !== params.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    await connectDB()

    const referrals = await Referral.find({ referrerId: params.userId })
      .populate("referredUserId", "name email createdAt")
      .sort({ createdAt: -1 })

    // Map to a cleaner format for the UI
    const formattedReferrals = referrals.map(ref => ({
      id: ref._id,
      referred: {
        name: (ref.referredUserId as any)?.name || "Unknown User",
        email: (ref.referredUserId as any)?.email || "N/A",
      },
      createdAt: ref.createdAt,
      rewardAmount: ref.rewardAmount,
      rewardStatus: ref.rewardStatus,
    }))

    return NextResponse.json({
      success: true,
      referrals: formattedReferrals
    })

  } catch (error: any) {
    console.error("[api/user/referrals] Error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
