import { NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import connectDB from '@/lib/mongodb'
import { Availability } from '@/lib/models'

export const dynamic = 'force-dynamic'

const DAY_NUMBERS = [0, 1, 2, 3, 4, 5, 6]

function isValidTime(value: unknown): value is string {
  return typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value)
}

// Singleton — there's only ever one weekly schedule (single barber).
// Creates it with everything closed on first read if it doesn't exist yet.
async function getOrCreateAvailability() {
  let availability = await Availability.findOne()
  if (!availability) {
    availability = await Availability.create({})
  }
  return availability
}

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

    await connectDB()
    const availability = await getOrCreateAvailability()

    return NextResponse.json({ success: true, weeklyHours: availability.weeklyHours })
  } catch (error: any) {
    console.error('[admin/availability GET] Error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
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
    const incoming = body.weeklyHours

    if (!Array.isArray(incoming) || incoming.length !== 7) {
      return NextResponse.json({ success: false, error: 'weeklyHours must have exactly 7 entries' }, { status: 400 })
    }

    const seenDays = new Set<number>()
    const weeklyHours = []

    for (const entry of incoming) {
      const dayOfWeek = Number(entry?.dayOfWeek)
      if (!DAY_NUMBERS.includes(dayOfWeek) || seenDays.has(dayOfWeek)) {
        return NextResponse.json({ success: false, error: 'weeklyHours must cover each day of the week exactly once' }, { status: 400 })
      }
      seenDays.add(dayOfWeek)

      const isOpen = Boolean(entry?.isOpen)
      let openTime = null
      let closeTime = null

      if (isOpen) {
        if (!isValidTime(entry?.openTime) || !isValidTime(entry?.closeTime)) {
          return NextResponse.json({ success: false, error: 'Open days need a valid open and close time' }, { status: 400 })
        }
        if (entry.openTime >= entry.closeTime) {
          return NextResponse.json({ success: false, error: 'Close time must be after open time' }, { status: 400 })
        }
        openTime = entry.openTime
        closeTime = entry.closeTime
      }

      weeklyHours.push({ dayOfWeek, isOpen, openTime, closeTime })
    }

    weeklyHours.sort((a, b) => a.dayOfWeek - b.dayOfWeek)

    await connectDB()
    const availability = await getOrCreateAvailability()
    availability.weeklyHours = weeklyHours
    await availability.save()

    return NextResponse.json({ success: true, weeklyHours: availability.weeklyHours })
  } catch (error: any) {
    console.error('[admin/availability PUT] Error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
