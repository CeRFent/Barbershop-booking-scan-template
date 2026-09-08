import connectDB from '@/lib/mongodb'
import { Cut } from '@/lib/models'

// Shared by the webhook and the optimistic /api/activate-subscription path
// so both provision the same way — previously each had its own copy, and
// activate-subscription's drifted to always granting a full 4 regardless of
// what a prorated signup actually paid for.
//
// count defaults to a full 4 — only a brand-new mid-month signup passes a
// smaller number, for exactly that first partial month; every renewal
// (called with no count) gets the normal full 4.
export async function initializeMonthlyCuts(userId: string, count: number = 4) {
  const currentMonth = new Date().toISOString().slice(0, 7)
  try {
    await connectDB()

    const existingCutsCount = await Cut.countDocuments({ userId, monthYear: currentMonth })
    if (existingCutsCount > 0) {
      console.log(`Cuts already initialized for user ${userId} in ${currentMonth}`)
      return
    }

    await Cut.updateMany(
      { userId, status: 'available', monthYear: { $ne: currentMonth } },
      { status: 'expired' }
    )

    const cuts = Array.from({ length: count }, (_, i) => ({
      userId,
      monthYear: currentMonth,
      cutNumber: i + 1,
      status: 'available',
    }))
    await Cut.insertMany(cuts)
  } catch (error) {
    console.error('Error initializing cuts:', error)
    throw error
  }
}
