import { type NextRequest, NextResponse } from "next/server"
import { verifyToken } from "@/lib/auth"
import { User, Cut, CutHistory } from "@/lib/models"
import mongoose from "mongoose"
import connectDB from "@/lib/mongodb"

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: "No authorization header" }, { status: 401 })
    }
    
    const token = authHeader.substring(7)
    if (!token) {
      return NextResponse.json({ error: "No token provided" }, { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload || !["admin", "barber"].includes(payload.role)) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
    }

    const { userId, numberOfCuts, reason } = await request.json()

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json({ error: "Invalid user ID format" }, { status: 400 })
    }

    // Validate input
    if (!userId || !numberOfCuts || numberOfCuts < 1 || numberOfCuts > 10) {
      return NextResponse.json({ error: "Invalid input parameters" }, { status: 400 })
    }

    // Connect to database
    await connectDB()

    // Check if target user exists and is a customer
    const targetUser = await User.findById(userId)

    if (!targetUser || targetUser.role !== "customer") {
      return NextResponse.json({ error: "Target user not found or not a customer" }, { status: 404 })
    }

    // Get all cuts for this user first
    const allCuts = await Cut.find({ userId: userId })
    const availableCuts = allCuts.filter(cut => cut.status === 'available')
    const totalCuts = allCuts.length

    // Find the most recently used cuts for this user
    const usedCuts = await Cut.find({
      userId: userId,
      status: 'used'
    }).sort({ usedAt: -1 }).limit(numberOfCuts)

    if (usedCuts.length === 0) {
      if (totalCuts === 0) {
        return NextResponse.json({ 
          error: "This user has no cuts assigned yet. Please add cuts first." 
        }, { status: 400 })
      } else if (availableCuts.length === totalCuts) {
        return NextResponse.json({ 
          error: "All cuts are already available. No cuts need to be renewed." 
        }, { status: 400 })
      } else {
        return NextResponse.json({ 
          error: "No used cuts found to renew. All cuts are already available." 
        }, { status: 400 })
      }
    }

    if (usedCuts.length < numberOfCuts) {
      return NextResponse.json({
        error: `Only ${usedCuts.length} used cuts found. Cannot renew ${numberOfCuts} cuts.` 
      }, { status: 400 })
    }

    // Update the used cuts back to available status
    const cutIds = usedCuts.map(cut => cut._id)
    const updateResult = await Cut.updateMany(
      { _id: { $in: cutIds } },
      { 
        status: 'available',
        usedAt: null,
        barberId: null,
        shopTokenUsed: null,
        notes: reason ? `Renewed by admin: ${reason}` : 'Renewed by admin'
      }
    )

    if (updateResult.modifiedCount !== numberOfCuts) {
      return NextResponse.json({ error: "Failed to renew cuts" }, { status: 500 })
    }

    // Log the cut renewal in history (optional - don't fail if this fails)
    try {
      await CutHistory.create({
        userId: userId,
        adminId: payload.userId,
        action: 'reset',
        cutsAffected: numberOfCuts,
        previousCount: targetUser.cuts - numberOfCuts,
        newCount: targetUser.cuts,
        notes: reason || `Renewed ${numberOfCuts} cut${numberOfCuts > 1 ? 's' : ''}`
      })
    } catch (historyError) {
      console.warn("Failed to log cut history:", historyError)
      // Don't fail the entire operation if history logging fails
    }

    return NextResponse.json({
      success: true,
      message: `Successfully renewed ${numberOfCuts} cut${numberOfCuts > 1 ? "s" : ""} for ${targetUser.name || targetUser.email}`,
      cutsRenewed: numberOfCuts,
      renewedCutIds: cutIds
    })
  } catch (error: any) {
    console.error("Error adding cuts:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
