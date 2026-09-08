import { NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import connectDB from '@/lib/mongodb'
import { Service } from '@/lib/models'

export const dynamic = 'force-dynamic'

// List every service, active or not — the admin catalog page needs to show
// and manage retired services too, not just what customers currently see.
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
    const services = await Service.find().sort({ category: 1, sortOrder: 1, name: 1 })

    return NextResponse.json({ success: true, services })
  } catch (error: any) {
    console.error('[admin/services GET] Error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
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
    const { name, category, description, price, priceVaries, durationMinutes, sortOrder, depositRequired, depositAmount } = body

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ success: false, error: 'Service name is required' }, { status: 400 })
    }
    if (!category || typeof category !== 'string' || !category.trim()) {
      return NextResponse.json({ success: false, error: 'Category is required' }, { status: 400 })
    }
    const duration = Number(durationMinutes)
    if (!duration || duration < 5) {
      return NextResponse.json({ success: false, error: 'Duration must be at least 5 minutes' }, { status: 400 })
    }
    const varies = Boolean(priceVaries)
    let numericPrice: number | null = null
    if (!varies) {
      numericPrice = Number(price)
      if (Number.isNaN(numericPrice) || numericPrice < 0) {
        return NextResponse.json({ success: false, error: 'Price must be a non-negative number' }, { status: 400 })
      }
    }

    const requiresDeposit = Boolean(depositRequired)
    let numericDeposit: number | null = null
    if (requiresDeposit) {
      numericDeposit = Number(depositAmount)
      if (!numericDeposit || numericDeposit <= 0) {
        return NextResponse.json({ success: false, error: 'Deposit amount must be a positive number' }, { status: 400 })
      }
    }

    await connectDB()
    const service = await Service.create({
      name: name.trim(),
      category: category.trim(),
      description: description?.trim() || '',
      price: numericPrice,
      priceVaries: varies,
      durationMinutes: duration,
      sortOrder: Number(sortOrder) || 0,
      depositRequired: requiresDeposit,
      depositAmount: numericDeposit,
    })

    return NextResponse.json({ success: true, service })
  } catch (error: any) {
    console.error('[admin/services POST] Error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
