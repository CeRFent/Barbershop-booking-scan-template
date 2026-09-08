import { NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import { Booking } from '@/lib/models'
import { notifyBookingReminder } from '@/lib/onesignal'
import { ymdInShopTZ, addDaysToYMD } from '@/lib/timezone'

export const dynamic = 'force-dynamic'

// Runs once a day (see vercel.json) and pushes a reminder for every
// confirmed booking happening tomorrow. Daily + "tomorrow" rather than an
// hourly window checking exact lead time — simpler, doesn't depend on a
// Vercel plan tier that allows frequent cron invocations, and "day before"
// is the standard appointment-reminder UX anyway.
export async function GET(request: Request) {
  try {
    // Vercel signs its own cron requests with this header when CRON_SECRET
    // is set. Fail closed (not open) if CRON_SECRET is ever unset in some
    // environment — the old `process.env.CRON_SECRET && ...` check would
    // silently skip auth entirely in that case, making this a public,
    // unauthenticated way to spam every customer with tomorrow's reminder
    // on demand. Matches middleware.ts's fail-closed handling of a missing
    // JWT_SECRET.
    if (!process.env.CRON_SECRET) {
      console.error('[cron/booking-reminders] CRON_SECRET is not configured — refusing all requests')
      return NextResponse.json({ success: false, error: 'Server misconfigured' }, { status: 500 })
    }
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()

    const tomorrowYMD = addDaysToYMD(ymdInShopTZ(), 1)

    const bookings = await Booking.find({
      date: tomorrowYMD,
      status: 'confirmed',
      reminderSentAt: null,
    })

    let sent = 0
    let failed = 0

    for (const booking of bookings) {
      try {
        await notifyBookingReminder(booking.userId.toString(), booking.serviceName, booking.startTime)
        booking.reminderSentAt = new Date()
        await booking.save()
        sent++
      } catch (err) {
        // One customer's failed send (e.g. no active subscription) shouldn't
        // stop the rest of tomorrow's reminders from going out.
        console.error(`[cron/booking-reminders] Failed for booking ${booking._id}:`, err)
        failed++
      }
    }

    return NextResponse.json({ success: true, date: tomorrowYMD, total: bookings.length, sent, failed })
  } catch (error: any) {
    console.error('[cron/booking-reminders] Error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
