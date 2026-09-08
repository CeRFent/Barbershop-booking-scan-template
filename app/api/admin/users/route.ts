import { NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import connectDB from '@/lib/mongodb'
import { User, Cut, Subscription } from '@/lib/models'

export const dynamic = 'force-dynamic'

// Helper to calculate age
function calculateAge(dob: Date | null): number | null {
  if (!dob) return null
  const today = new Date()
  const birthDate = new Date(dob)
  let age = today.getFullYear() - birthDate.getFullYear()
  const m = today.getMonth() - birthDate.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }
  return age
}

export async function GET(request: Request) {
  try {
    // 1. Verify admin token
    const token = request.headers.get('Authorization')?.split(' ')[1]
    if (!token) {
      return NextResponse.json({ success: false, error: 'No token provided' }, { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload || payload.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 })
    }

    await connectDB()

    // 2. Get all customers
    const users = await User.find({ role: 'customer' }).sort({ totalVisits: -1 })

    // 3. Enrich user data for Admin Dashboard
    const transformedUsers = await Promise.all(users.map(async (user) => {
      const currentMonth = new Date().toISOString().slice(0, 7)
      
      // Get subscription for status
      const subscription = await Subscription.findOne({
        userId: user._id,
        status: 'active'
      })

      // Standard remaining cuts (current month only) - for "All Users" page
      const currentMonthCuts = await Cut.countDocuments({
        userId: user._id,
        monthYear: currentMonth,
        status: 'available'
      })

      // Total available cuts (including rollover) - for "VIP Manager" page
      const totalAvailableCuts = await Cut.countDocuments({
        userId: user._id,
        status: 'available'
      })

      return {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        phone: user.phone || '',
        age: calculateAge(user.dateOfBirth),
        dob: user.dateOfBirth,
        totalVisits: user.totalVisits || 0,
        lastVisit: user.lastVisit,
        preferences: user.preferences || { favoriteDrink: '', favoriteSnack: '' },
        role: user.role,
        subscriptionStatus: subscription ? 'active' : 'inactive',
        subscription_status: subscription ? 'active' : 'inactive',
        remainingCuts: subscription ? currentMonthCuts : 0, // Restore old behavior: 0 if not active
        remaining_cuts: subscription ? totalAvailableCuts : 0, // 0 if not active
        cuts: 4, 
        used_cuts: 4 - totalAvailableCuts,
        joinedAt: user.createdAt,
        createdAt: user.createdAt,
        isVerified: user.emailVerified,
        isActive: user.isActive || true
      }
    }))

    return NextResponse.json({ success: true, users: transformedUsers })

  } catch (error: any) {
    console.error('Error fetching admin users:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
