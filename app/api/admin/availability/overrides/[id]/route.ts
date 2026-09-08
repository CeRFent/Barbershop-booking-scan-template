import { NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import connectDB from '@/lib/mongodb'
import { AvailabilityOverride } from '@/lib/models'

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
    const override = await AvailabilityOverride.findByIdAndDelete(params.id)

    if (!override) {
      return NextResponse.json({ success: false, error: 'Override not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, message: 'Override removed' })
  } catch (error: any) {
    console.error('[admin/availability/overrides DELETE] Error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
