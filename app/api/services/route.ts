import { NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import { Service } from '@/lib/models'

// Next.js App Router caches GET route handlers by default when nothing in
// them reads a dynamic API — this one didn't, so an admin editing services
// wouldn't show up here until the next deploy. Force it fresh every time.
export const dynamic = 'force-dynamic'

// Public — powers the booking service picker. Only ever returns active
// services; retired ones stay visible on the admin side but never here.
export async function GET() {
  try {
    await connectDB()
    const services = await Service.find({ isActive: true }).sort({ category: 1, sortOrder: 1, name: 1 })
    return NextResponse.json({ success: true, services })
  } catch (error: any) {
    console.error('[services GET] Error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
