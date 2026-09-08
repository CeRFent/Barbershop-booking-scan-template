// The shop operates in one timezone (Central). Vercel's serverless
// functions default to UTC, so any "what day is it" comparison done via
// Date.prototype.getFullYear()/getMonth()/getDate() silently drifts by a
// day for part of the evening — e.g. a booking made "today" in Central
// time can compare as "tomorrow" server-side. This formats explicitly in
// the shop's timezone instead of relying on the runtime's local timezone.
const SHOP_TIMEZONE = 'America/Chicago'

const ymdFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: SHOP_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

export function ymdInShopTZ(date: Date = new Date()): string {
  return ymdFormatter.format(date)
}

const hmFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: SHOP_TIMEZONE,
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

// Minutes since local midnight in the shop's timezone — for comparing
// against the same HH:MM-grid minutes used by Availability/slot generation.
export function minutesSinceMidnightInShopTZ(date: Date = new Date()): number {
  const parts = hmFormatter.formatToParts(date)
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? 0)
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? 0)
  return hour * 60 + minute
}

// Pure calendar-string arithmetic via UTC methods, which are unaffected by
// the runtime's local timezone — avoids reintroducing the same drift by
// round-tripping through a Date object's local getters/setters.
export function addDaysToYMD(ymd: string, days: number): string {
  const [y, m, d] = ymd.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  dt.setUTCDate(dt.getUTCDate() + days)
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`
}

// The 1st of the month following the given calendar date — pure string/
// integer month math, same UTC-methods-as-calculator approach as
// addDaysToYMD (no local-timezone Date getters involved).
export function startOfNextMonthYMD(ymd: string): string {
  const [y, m] = ymd.split('-').map(Number)
  const nextMonth = m === 12 ? 1 : m + 1
  const nextYear = m === 12 ? y + 1 : y
  return `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`
}

// The real UTC instant at which the shop's local clock reads midnight on
// the given calendar date — for building a Stripe `trial_end` timestamp
// that actually lands at local midnight, not UTC midnight (which is 6-7pm
// the previous day in Central time). Standard offset-probe technique:
// guess UTC midnight on that date, read what the shop's wall clock says
// at that instant, then shift by the difference — correct across DST
// since it reads the real offset in effect on that specific date rather
// than assuming a fixed one.
const shopWallClockFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: SHOP_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
})

export function shopLocalMidnightUTC(ymd: string): Date {
  const [y, m, d] = ymd.split('-').map(Number)
  const guess = new Date(Date.UTC(y, m - 1, d, 0, 0, 0))
  const parts = shopWallClockFormatter.formatToParts(guess)
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0)
  const shopWallTimeAsUTC = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'))
  const offsetMs = shopWallTimeAsUTC - guess.getTime()
  return new Date(guess.getTime() - offsetMs)
}
