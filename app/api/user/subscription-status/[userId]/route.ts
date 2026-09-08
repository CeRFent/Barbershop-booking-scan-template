import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import { verifyToken } from "@/lib/auth"
import { Subscription, Cut } from "@/lib/models"

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    // Verify token
    const token = request.headers.get('Authorization')?.split(' ')[1]
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload || (payload.userId !== params.userId && payload.role !== 'admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { userId } = params
    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    // Connect to database
    await connectDB()

    // Find the user's subscription
    const subscription = await Subscription.findOne({
      userId: userId
    })

    if (!subscription) {
      return NextResponse.json({ 
        subscriptionStatus: {
          status: 'inactive'
        },
        message: "No subscription found" 
      })
    }

    // Determine status based on subscription data. past_due is kept distinct
    // from inactive — that's a customer who already paid and just had a
    // renewal charge fail, not someone who never subscribed, and the
    // dashboard needs to tell those two apart.
    let status: 'active' | 'inactive' | 'cancelled' | 'past_due' = 'inactive'
    const now = new Date()

    if (subscription.status === 'active') {
      status = subscription.currentPeriodEnd > now ? 'active' : 'inactive'
    } else if (subscription.status === 'cancelled') {
      status = subscription.currentPeriodEnd > now ? 'cancelled' : 'inactive'
    } else if (subscription.status === 'past_due') {
      status = 'past_due'
    } else {
      status = 'inactive'
    }

    // Compute live from the Cut collection rather than trusting the cached
    // subscription.cutsRemaining counter, which can drift from it (e.g. if a
    // manual adjustment or redemption updates one but not the other).
    const cutsRemaining = await Cut.countDocuments({ userId, status: 'available' })

    const subscriptionStatus = {
      status,
      cutsRemaining,
      nextRenewal: subscription.currentPeriodEnd ? new Date(subscription.currentPeriodEnd).toISOString() : undefined
    }

    return NextResponse.json({ 
      subscriptionStatus,
      message: "Subscription status found" 
    })

  } catch (error) {
    console.error("Error fetching subscription status:", error)
    return NextResponse.json({ 
      error: "Failed to fetch subscription status" 
    }, { status: 500 })
  }
}
