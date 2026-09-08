import { NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import connectDB from '@/lib/mongodb'
import { User, Subscription, Cut, ScanLog, ShopToken, Booking } from '@/lib/models'
import { checkRateLimitByKey } from '@/lib/security'
import { notifyCutRedeemed } from '@/lib/onesignal'
import { ymdInShopTZ } from '@/lib/timezone'

const REPEAT_SCAN_AUTO_BLOCK_MINUTES = 5

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, error: 'No token provided' }, { status: 401 })
    }

    const token = authHeader.split(' ')[1]
    const payload = verifyToken(token)
    if (!payload || payload.role !== 'customer') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 })
    }

    // Bound how many redemption attempts one account can make in a window —
    // the 4-character manual fallback has a small enough space that it needs
    // this to resist brute-forcing, not just a valid session.
    if (!checkRateLimitByKey(`use-cut:${payload.userId}`, 20, 15 * 60 * 1000)) {
      return NextResponse.json({ success: false, error: 'Too many attempts. Please try again later.' }, { status: 429 })
    }

    const { shopToken, confirmed } = await request.json()
    if (!shopToken || typeof shopToken !== 'string') {
      return NextResponse.json({ success: false, error: 'Shop token is required' }, { status: 400 })
    }

    await connectDB()

    const now = new Date()
    const notExpired = { $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }] }

    // Enhanced token lookup: Full match OR last 4 characters match
    let validToken = await ShopToken.findOne({ token: shopToken, isActive: true, ...notExpired })

    if (!validToken && shopToken.length === 4) {
      // If it's 4 characters, try to find a token that ends with these characters
      // We use a regex for this: ends with ( $ ) the shopToken string
      validToken = await ShopToken.findOne({
        token: { $regex: new RegExp(shopToken + '$', 'i') },
        isActive: true,
        ...notExpired
      })
    }

    if (!validToken) {
      return NextResponse.json({ success: false, error: 'Invalid or expired shop token' }, { status: 400 })
    }

    // Guard against accidental repeat scans (e.g. a subscribed member
    // double-tapping and burning two cuts for one visit). Only same-day
    // prior scans count — a customer's actual next visit weeks later
    // should behave normally, not trigger this.
    const lastScan = await ScanLog.findOne({
      userId: payload.userId,
      action: { $in: ['used', 'scanned'] },
    }).sort({ createdAt: -1 })

    if (lastScan && ymdInShopTZ(lastScan.createdAt) === ymdInShopTZ(now)) {
      const minutesSince = (now.getTime() - lastScan.createdAt.getTime()) / 60000
      const minutesAgo = Math.max(0, Math.round(minutesSince))

      if (minutesSince <= REPEAT_SCAN_AUTO_BLOCK_MINUTES) {
        return NextResponse.json({
          success: false,
          alreadyCheckedIn: true,
          minutesAgo,
          error: `Already checked in ${minutesAgo} minute${minutesAgo === 1 ? '' : 's'} ago.`,
        }, { status: 409 })
      }

      if (!confirmed) {
        return NextResponse.json({
          success: false,
          needsConfirmation: true,
          minutesAgo,
          lastAction: lastScan.action,
        }, { status: 409 })
      }
    }

    // Update user's visit info. new: true so totalVisits reflects this
    // scan, used below to snapshot "was this their first visit ever" onto
    // the ScanLog for the admin tablet check-in feed.
    const updatedUser = await User.findByIdAndUpdate(
      payload.userId,
      { $inc: { totalVisits: 1 }, lastVisit: now },
      { new: true }
    )
    const isNewCustomer = updatedUser?.totalVisits === 1

    const todayYMD = ymdInShopTZ(now)
    const hasBookingToday = await Booking.exists({
      userId: payload.userId,
      date: todayYMD,
      status: 'confirmed',
    }).then(Boolean)

    // Look up the subscription regardless of status — a past_due member's
    // check-in needs to explain *why* no cut was redeemed (their card
    // failed), not look identical to a walk-in who never subscribed.
    const subscription = await Subscription.findOne({ userId: payload.userId })
    const subscriptionIsActive = subscription?.status === 'active'

    let cutUsed = false
    let remainingCuts = 0
    let usedCutId = null

    if (subscriptionIsActive) {
      // Find oldest available cut regardless of monthYear
      const availableCut = await Cut.findOne({
        userId: payload.userId,
        status: 'available'
      }).sort({ monthYear: 1, cutNumber: 1 })

      if (availableCut) {
        await Cut.findByIdAndUpdate(availableCut._id, {
          status: 'used',
          usedAt: now,
          barberId: validToken.barberId,
          shopTokenUsed: validToken.token // Use the actual full token
        })

        // Decrement subscription and user cut counts for consistency
        await Promise.all([
          Subscription.updateOne(
            { _id: subscription._id },
            { $inc: { cutsRemaining: -1 } }
          ),
          User.findByIdAndUpdate(payload.userId, {
            $inc: { cuts: -1 }
          })
        ])

        cutUsed = true
        usedCutId = availableCut._id
      }
    }

    // Log the scan (cutId is now optional in schema)
    await ScanLog.create({
      userId: payload.userId,
      barberId: validToken.barberId,
      cutId: usedCutId || undefined,
      action: cutUsed ? 'used' : 'scanned',
      shopToken: validToken.token,
      notes: cutUsed ? 'Haircut redeemed' : 'Client check-in (No subscription/cuts)',
      isNewCustomer,
      hasBookingToday,
    })

    // Count ALL available cuts across all months
    remainingCuts = await Cut.countDocuments({
      userId: payload.userId,
      status: 'available'
    })

    if (cutUsed) {
      // Fire-and-forget — never block the check-in response on a
      // notification succeeding.
      notifyCutRedeemed(payload.userId, remainingCuts).catch((err) =>
        console.error('[use-cut] OneSignal notify failed:', err)
      )
    }

    // Distinguish *why* this was a plain check-in instead of a redeemed
    // cut — a past-due member who already pays needs different messaging
    // (and a path to fix billing) than someone who never subscribed.
    let message = 'Check-in successful!'
    let membershipIssue: 'past_due' | 'no_cuts_left' | null = null
    if (cutUsed) {
      message = 'Haircut redeemed successfully!'
    } else if (subscription?.status === 'past_due') {
      message = "Checked in — your membership payment is past due, so no cut was used. Update your payment method to resume VIP benefits."
      membershipIssue = 'past_due'
    } else if (subscriptionIsActive) {
      message = 'Checked in — no cuts remaining this month.'
      membershipIssue = 'no_cuts_left'
    }

    return NextResponse.json({
      success: true,
      message,
      type: cutUsed ? 'HAIRCUT' : 'VISIT',
      cutsRemaining: remainingCuts,
      membershipIssue,
    })

  } catch (error: any) {
    console.error('Error processing scan:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
