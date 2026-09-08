import { NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import { Service } from '@/lib/models'
import { getOpenSlots } from '@/lib/booking-slots'

export const dynamic = 'force-dynamic'

// Public — customers browse open times before creating an account,
// matching the existing Booksy flow (service -> date/time -> auth -> confirm).
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const serviceId = searchParams.get('serviceId')
    const date = searchParams.get('date')

    if (!serviceId || !date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ success: false, error: 'serviceId and date (YYYY-MM-DD) are required' }, { status: 400 })
    }

    await connectDB()
    const service = await Service.findOne({ _id: serviceId, isActive: true })
    if (!service) {
      return NextResponse.json({ success: false, error: 'Service not found' }, { status: 404 })
    }

    const slots = await getOpenSlots(date, service.durationMinutes)
    return NextResponse.json({ success: true, slots })
  } catch (error: any) {
    console.error('[bookings/slots GET] Error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
