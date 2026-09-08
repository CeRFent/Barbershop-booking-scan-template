import { NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import connectDB from '@/lib/mongodb'
import { Booking } from '@/lib/models'
import { getOpenSlots, addMinutesToTime } from '@/lib/booking-slots'
import { notifyReviewRequest } from '@/lib/onesignal'
import { sendReviewRequestEmail } from '@/lib/email'
import { brand } from '@/lib/brand-config'

const STATUS_VALUES = ['pending_payment', 'confirmed', 'cancelled', 'completed', 'no_show']

// From Google Business Profile: Reviews -> "Get more reviews" -> share link.
// A stable public URL, not a secret, so it lives in brand-config.ts rather
// than as an env var. Set to "" there to disable the review-request feature
// entirely for a shop that doesn't want it (guarded below).
const GOOGLE_REVIEW_URL = brand.googleReviewUrl

export const dynamic = 'force-dynamic'

// Open slots for rescheduling this specific booking. Deliberately separate
// from the public /api/bookings/slots route (which requires an *active*
// service) — an admin should still be able to reschedule a booking even if
// its service was hidden from the catalog afterward.
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.headers.get('Authorization')?.split(' ')[1]
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload || payload.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ success: false, error: 'A valid date (YYYY-MM-DD) is required' }, { status: 400 })
    }

    await connectDB()

    const booking = await Booking.findById(params.id)
    if (!booking) {
      return NextResponse.json({ success: false, error: 'Booking not found' }, { status: 404 })
    }

    const slots = await getOpenSlots(date, booking.durationMinutes, booking._id.toString())
    return NextResponse.json({ success: true, slots })
  } catch (error: any) {
    console.error('[admin/bookings/[id] GET] Error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

// Admin reschedule/status-change — same slot rules as the customer-facing
// route, but without the ownership check (any booking, not just the
// caller's own) since this is how the shop manages every appointment.
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.headers.get('Authorization')?.split(' ')[1]
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload || payload.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()

    await connectDB()

    const booking = await Booking.findById(params.id)
    if (!booking) {
      return NextResponse.json({ success: false, error: 'Booking not found' }, { status: 404 })
    }

    if (body.date !== undefined || body.startTime !== undefined) {
      const date = body.date
      const startTime = body.startTime
      if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return NextResponse.json({ success: false, error: 'A valid date is required' }, { status: 400 })
      }
      if (!startTime || !/^([01]\d|2[0-3]):[0-5]\d$/.test(startTime)) {
        return NextResponse.json({ success: false, error: 'A valid start time is required' }, { status: 400 })
      }

      const openSlots = await getOpenSlots(date, booking.durationMinutes, booking._id.toString())
      if (!openSlots.includes(startTime)) {
        return NextResponse.json({ success: false, error: 'That time is no longer available. Please pick another.' }, { status: 409 })
      }

      booking.date = date
      booking.startTime = startTime
      booking.endTime = addMinutesToTime(startTime, booking.durationMinutes)
    }

    const wasCompleted = booking.status === 'completed'

    if (body.status !== undefined) {
      if (!STATUS_VALUES.includes(body.status)) {
        return NextResponse.json({ success: false, error: 'Invalid status' }, { status: 400 })
      }
      booking.status = body.status
      booking.cancelledAt = body.status === 'cancelled' ? new Date() : null
    }

    await booking.save()

    // Only on the transition into "completed" — not every save on an
    // already-completed booking (e.g. an unrelated field edit), which
    // would otherwise re-ask for a review every time.
    if (booking.status === 'completed' && !wasCompleted && GOOGLE_REVIEW_URL) {
      // Awaited, not fire-and-forget: a Vercel serverless function can be
      // frozen/torn down as soon as the response is sent, which can cut
      // off an unawaited promise's actual network call before it
      // completes -- confirmed live (the request logged as started but
      // the customer never got the email). Promise.allSettled so one
      // channel failing doesn't stop the other from being attempted.
      const [pushResult, emailResult] = await Promise.allSettled([
        notifyReviewRequest(booking.userId.toString(), GOOGLE_REVIEW_URL),
        sendReviewRequestEmail({ to: booking.customerEmail, reviewUrl: GOOGLE_REVIEW_URL, fullName: booking.customerName }),
      ])
      if (pushResult.status === 'rejected') {
        console.error('[admin/bookings/[id] PATCH] Review push failed:', pushResult.reason)
      }
      if (emailResult.status === 'rejected') {
        console.error('[admin/bookings/[id] PATCH] Review email failed:', emailResult.reason)
      }
    }

    return NextResponse.json({ success: true, booking })
  } catch (error: any) {
    console.error('[admin/bookings/[id] PATCH] Error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.headers.get('Authorization')?.split(' ')[1]
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload || payload.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    await connectDB()

    const booking = await Booking.findByIdAndDelete(params.id)
    if (!booking) {
      return NextResponse.json({ success: false, error: 'Booking not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[admin/bookings/[id] DELETE] Error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
