import connectDB from '@/lib/mongodb'
import { Settings } from '@/lib/models'

const SETTINGS_KEY = 'app'

// Returns the current VIP subscription price in whole dollars. Falls back
// to the schema default (150) if no Settings document exists yet — every
// deployment starts with the real current price, not an empty DB error.
export async function getSubscriptionMonthlyPrice(): Promise<number> {
  await connectDB()
  const settings = await Settings.findOne({ key: SETTINGS_KEY }).lean() as any
  return settings?.subscriptionMonthlyPrice ?? 150
}

export async function setSubscriptionMonthlyPrice(price: number): Promise<number> {
  await connectDB()
  const settings = await Settings.findOneAndUpdate(
    { key: SETTINGS_KEY },
    { $set: { subscriptionMonthlyPrice: price } },
    { upsert: true, new: true }
  )
  return settings.subscriptionMonthlyPrice
}
