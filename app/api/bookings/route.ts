import { NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import connectDB from '@/lib/mongodb'
import { Booking, Service, User } from '@/lib/models'
import { getOpenSlots, addMinutesToTime } from '@/lib/booking-slots'
import { checkRateLimitByKey } from '@/lib/security'
import { notifyAdminsOfNewBooking } from '@/lib/onesignal'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, error: 'No token provided' }, { status: 401 })
    }

    const payload = verifyToken(authHeader.split(' ')[1])
    if (!payload) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()
    const bookings = await Booking.find({ userId: payload.userId, status: { $ne: 'cancelled' } })
      .sort({ date: 1, startTime: 1 })

    return NextResponse.json({ success: true, bookings })
  } catch (error: any) {
    console.error('[bookings GET] Error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, error: 'No token provided' }, { status: 401 })
    }

    const payload = verifyToken(authHeader.split(' ')[1])
    if (!payload || payload.role !== 'customer') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 })
    }

    if (!checkRateLimitByKey(`create-booking:${payload.userId}`, 10, 15 * 60 * 1000)) {
      return NextResponse.json({ success: false, error: 'Too many booking attempts. Please try again later.' }, { status: 429 })
    }

    const { serviceId, date, startTime, notes } = await request.json()

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

    const service = await Service.findOne({ _id: serviceId, isActive: true })
    if (!service) {
      return NextResponse.json({ success: false, error: 'Service not found' }, { status: 404 })
    }

    const user = await User.findById(payload.userId)
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 })
    }

    // Re-check the slot is actually still open at creation time — the
    // client's earlier /slots read can be stale by the time this posts.
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
      status: service.depositRequired ? 'pending_payment' : 'confirmed',
      customerName: user.name,
      customerEmail: user.email,
      customerPhone: user.phone || '',
      notes: typeof notes === 'string' ? notes.trim().slice(0, 500) : '',
    })

    // No deposit required means this booking is confirmed immediately —
    // a deposit-required one starts pending_payment and gets notified
    // separately once the webhook confirms payment (see handleCheckoutSessionCompleted).
    if (booking.status === 'confirmed') {
      notifyAdminsOfNewBooking(user.name, service.name, date, startTime).catch((err) =>
        console.error('[bookings POST] Admin notify failed:', err)
      )
    }

    return NextResponse.json({ success: true, booking })
  } catch (error: any) {
    console.error('[bookings POST] Error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
