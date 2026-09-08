// Pure math — no DB/server-only imports — so both the checkout API route
// and a client-side "here's what your first month costs" preview on
// /pricing can share the exact same logic instead of two copies drifting
// apart.
//
// A new VIP signup gets prorated based on how many of the month's 4 cuts
// are still usable from the day they join, in flat weekly buckets rather
// than exact-day proration:
//   days 1-7   (week 1) -> all 4 cuts, full price
//   days 8-14  (week 2) -> 3 cuts, 3/4 price
//   days 15-21 (week 3) -> 2 cuts, 2/4 price
//   days 22-end(week 4) -> 1 cut,  1/4 price
// Billing then reverts to the normal full-price, 4-cuts cycle starting
// the 1st of the next month (see lib/timezone.ts's startOfNextMonthYMD /
// shopLocalMidnightUTC, used to set the Stripe subscription's trial_end).

export const CUTS_PER_MONTH = 4

export function weekOfMonthFromYMD(ymd: string): number {
  const day = Number(ymd.slice(8, 10))
  if (day <= 7) return 1
  if (day <= 14) return 2
  if (day <= 21) return 3
  return 4
}

export function cutsForFirstMonth(weekOfMonth: number): number {
  return Math.max(1, CUTS_PER_MONTH - (weekOfMonth - 1))
}

// Rounds to the nearest cent — cutsForFirstMonth/CUTS_PER_MONTH isn't
// always exact (e.g. 3/4 of an odd number of cents), and a Stripe amount
// has to be a whole number of cents.
export function prorateAmountCents(basePriceCents: number, cuts: number): number {
  return Math.round((basePriceCents * cuts) / CUTS_PER_MONTH)
}
