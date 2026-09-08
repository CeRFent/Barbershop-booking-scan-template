import { NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import connectDB from '@/lib/mongodb'
import { Booking, Subscription, Service, User } from '@/lib/models'
import { getOpenSlots, addMinutesToTime } from '@/lib/booking-slots'

export const dynamic = 'force-dynamic'

// Powers the admin calendar. Returns every booking in [start, end]
// (inclusive, "YYYY-MM-DD") regardless of status — the calendar shows
// cancellations and abandoned pending_payment rows too, not just what's
// currently occupying a slot.
export async function GET(request: Request) {
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
    const start = searchParams.get('start')
    const end = searchParams.get('end')
    if (!start || !end || !/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end)) {
      return NextResponse.json({ success: false, error: 'start and end (YYYY-MM-DD) are required' }, { status: 400 })
    }

    await connectDB()

    const bookings = await Booking.find({ date: { $gte: start, $lte: end } }).sort({ date: 1, startTime: 1 })

    const userIds = Array.from(new Set(bookings.map((b: any) => b.userId.toString())))
    const vipUserIds = new Set(
      (await Subscription.find({ userId: { $in: userIds }, status: 'active' }).distinct('userId')).map((id: any) =>
        id.toString()
      )
    )

    const enriched = bookings.map((b: any) => ({ ...b.toObject(), isVip: vipUserIds.has(b.userId.toString()) }))

    return NextResponse.json({ success: true, bookings: enriched })
  } catch (error: any) {
    console.error('[admin/bookings GET] Error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

// Lets the admin add a booking directly onto the calendar — a phone call
// or in-person walk-in scheduling a future visit, the "+" button on the
// day view. Deliberately scoped to an existing customer account (picked
// from the admin's own customer list) rather than a name-only entry with
// no account: a true walk-in-right-now is already served by the QR
// check-in flow without needing a Booking record at all, so this is
// specifically for scheduling ahead. Always created as 'confirmed' —
// no online deposit collection dance, since the admin is vouching for it
// directly (over the phone or in person), same reasoning a real barber
// wouldn't make someone pay a deposit for a booking they took by hand.
export async function POST(request: Request) {
  try {
    const token = request.headers.get('Authorization')?.split(' ')[1]
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload || payload.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const { userId, serviceId, date, startTime, notes } = await request.json()

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json({ success: false, error: 'userId is required' }, { status: 400 })
    }
    if (!serviceId || typeof serviceId !== 'string') {
      return NextResponse.json({ success: false, error: 'serviceId is required' }, { status: 400 })
    }
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ success: false, error: 'A valid date is required' }, { status: 400 })
    }
    if (!startTime || !/^([01]\d|2[0-3]):[0-5]\d$/.test(startTime)) {
      return NextResponse.json({ success: false, error: 'A valid start time is required' }, { status: 400 })
    }

    await connectDB()

    const [service, user] = await Promise.all([
      Service.findById(serviceId),
      User.findOne({ _id: userId, role: 'customer' }),
    ])
    if (!service) {
      return NextResponse.json({ success: false, error: 'Service not found' }, { status: 404 })
    }
    if (!user) {
      return NextResponse.json({ success: false, error: 'Customer not found' }, { status: 404 })
    }

    // Admin can book a hidden/retired service too (mirrors the reschedule
    // route's same reasoning) — only re-check the slot is actually open.
    const openSlots = await getOpenSlots(date, service.durationMinutes)
    if (!openSlots.includes(startTime)) {
      return NextResponse.json({ success: false, error: 'That time is no longer available. Please pick another.' }, { status: 409 })
    }

    const booking = await Booking.create({
      userId: user._id,
      serviceId: service._id,
      serviceName: service.name,
      durationMinutes: service.durationMinutes,
      depositRequired: service.depositRequired,
      depositAmount: service.depositAmount,
      date,
      startTime,
      endTime: addMinutesToTime(startTime, service.durationMinutes),
      status: 'confirmed',
      customerName: user.name,
      customerEmail: user.email,
      customerPhone: user.phone || '',
      notes: typeof notes === 'string' ? notes.trim().slice(0, 500) : '',
    })

    return NextResponse.json({ success: true, booking })
  } catch (error: any) {
    console.error('[admin/bookings POST] Error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
