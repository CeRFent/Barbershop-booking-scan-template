import { NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import connectDB from '@/lib/mongodb'
import { Service } from '@/lib/models'

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
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
    const updateData: Record<string, any> = {}

    if (body.name !== undefined) updateData.name = String(body.name).trim()
    if (body.category !== undefined) updateData.category = String(body.category).trim()
    if (body.description !== undefined) updateData.description = String(body.description).trim()
    if (body.sortOrder !== undefined) updateData.sortOrder = Number(body.sortOrder) || 0
    if (body.isActive !== undefined) updateData.isActive = Boolean(body.isActive)

    if (body.durationMinutes !== undefined) {
      const duration = Number(body.durationMinutes)
      if (!duration || duration < 5) {
        return NextResponse.json({ success: false, error: 'Duration must be at least 5 minutes' }, { status: 400 })
      }
      updateData.durationMinutes = duration
    }

    if (body.priceVaries !== undefined) {
      updateData.priceVaries = Boolean(body.priceVaries)
      updateData.price = updateData.priceVaries ? null : (Number(body.price) || 0)
    } else if (body.price !== undefined) {
      const numericPrice = Number(body.price)
      if (Number.isNaN(numericPrice) || numericPrice < 0) {
        return NextResponse.json({ success: false, error: 'Price must be a non-negative number' }, { status: 400 })
      }
      updateData.price = numericPrice
    }

    if (body.depositRequired !== undefined) {
      updateData.depositRequired = Boolean(body.depositRequired)
      if (updateData.depositRequired) {
        const numericDeposit = Number(body.depositAmount)
        if (!numericDeposit || numericDeposit <= 0) {
          return NextResponse.json({ success: false, error: 'Deposit amount must be a positive number' }, { status: 400 })
        }
        updateData.depositAmount = numericDeposit
      } else {
        updateData.depositAmount = null
      }
    } else if (body.depositAmount !== undefined) {
      const numericDeposit = Number(body.depositAmount)
      if (!numericDeposit || numericDeposit <= 0) {
        return NextResponse.json({ success: false, error: 'Deposit amount must be a positive number' }, { status: 400 })
      }
      updateData.depositAmount = numericDeposit
    }

    await connectDB()
    const service = await Service.findByIdAndUpdate(params.id, { $set: updateData }, { new: true })

    if (!service) {
      return NextResponse.json({ success: false, error: 'Service not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, service })
  } catch (error: any) {
    console.error('[admin/services PATCH] Error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
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
    const service = await Service.findByIdAndDelete(params.id)

    if (!service) {
      return NextResponse.json({ success: false, error: 'Service not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, message: 'Service deleted' })
  } catch (error: any) {
    console.error('[admin/services DELETE] Error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
