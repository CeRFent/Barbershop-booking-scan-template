import { Availability, AvailabilityOverride, Booking } from '@/lib/models'
import { ymdInShopTZ, minutesSinceMidnightInShopTZ } from '@/lib/timezone'

// How long a pending_payment booking is allowed to hold its slot before
// it's treated as abandoned. No cron needed — this is a lazy check applied
// at read time, matching the design locked in COORDINATION.md section C.
const PENDING_PAYMENT_HOLD_MINUTES = 30

const SLOT_GRID_MINUTES = 15

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

// date is "YYYY-MM-DD". Parsed via explicit Y/M/D components (not
// `new Date(dateStr)`) for the same reason the rest of Availability does
// this — these are wall-clock dates for a single-timezone shop, and
// `new Date("YYYY-MM-DD")` parses as UTC midnight, which shifts the day
// under non-UTC server clocks.
function dayOfWeekFor(date: string): number {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(y, m - 1, d).getDay()
}

interface OpenHours {
  isOpen: boolean
  openTime: string | null
  closeTime: string | null
}

async function getOpenHoursForDate(date: string): Promise<OpenHours> {
  const override = await AvailabilityOverride.findOne({ date })
  if (override) {
    return { isOpen: override.isOpen, openTime: override.openTime, closeTime: override.closeTime }
  }

  const availability = await Availability.findOne()
  if (!availability) return { isOpen: false, openTime: null, closeTime: null }

  const dayOfWeek = dayOfWeekFor(date)
  const day = availability.weeklyHours.find((d: any) => d.dayOfWeek === dayOfWeek)
  if (!day) return { isOpen: false, openTime: null, closeTime: null }

  return { isOpen: day.isOpen, openTime: day.openTime, closeTime: day.closeTime }
}

// Returns "HH:MM" start times on a 15-minute grid where a booking of
// `durationMinutes` would fit entirely inside open hours and not overlap
// any booking that currently occupies the slot. Pass `excludeBookingId`
// when checking availability for a reschedule — otherwise a booking being
// moved to a nearby, overlapping time gets rejected against its own
// current (not-yet-updated) slot.
export async function getOpenSlots(date: string, durationMinutes: number, excludeBookingId?: string): Promise<string[]> {
  const hours = await getOpenHoursForDate(date)
  if (!hours.isOpen || !hours.openTime || !hours.closeTime) return []

  const openMinutes = timeToMinutes(hours.openTime)
  const closeMinutes = timeToMinutes(hours.closeTime)

  const holdCutoff = new Date(Date.now() - PENDING_PAYMENT_HOLD_MINUTES * 60 * 1000)
  const occupying = await Booking.find({
    date,
    ...(excludeBookingId ? { _id: { $ne: excludeBookingId } } : {}),
    $or: [
      { status: 'confirmed' },
      { status: 'pending_payment', createdAt: { $gt: holdCutoff } },
    ],
  }).select('startTime endTime')

  const occupiedRanges = occupying.map((b: any) => ({
    start: timeToMinutes(b.startTime),
    end: timeToMinutes(b.endTime),
  }))

  const now = new Date()
  const isToday = date === ymdInShopTZ(now)
  const nowMinutes = minutesSinceMidnightInShopTZ(now)

  const slots: string[] = []
  for (let start = openMinutes; start + durationMinutes <= closeMinutes; start += SLOT_GRID_MINUTES) {
    const end = start + durationMinutes
    if (isToday && start <= nowMinutes) continue

    const overlaps = occupiedRanges.some((r) => start < r.end && end > r.start)
    if (overlaps) continue

    slots.push(minutesToTime(start))
  }

  return slots
}

export function addMinutesToTime(time: string, minutes: number): string {
  return minutesToTime(timeToMinutes(time) + minutes)
}
