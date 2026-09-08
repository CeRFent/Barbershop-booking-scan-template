import { NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import connectDB from '@/lib/mongodb'
import { User } from '@/lib/models'

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  { params }: { params: { userId: string } }
) {
  try {
    const token = request.headers.get('Authorization')?.split(' ')[1]
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Customers may only view their own profile, not another account's.
    if (payload.userId !== params.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await connectDB()

    const user = await User.findById(params.userId).select('-password').lean() as any
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      phone: user.phone,
    })
  } catch (error) {
    console.error('Error fetching profile:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { userId: string } }
) {
  try {
    const token = request.headers.get('Authorization')?.split(' ')[1]
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Customers may only edit their own profile, not another account's.
    if (payload.userId !== params.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const data = await request.json()
    if (!data.name || typeof data.name !== 'string' || data.name.trim() === '') {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    // Email is deliberately not editable here — it's the login identifier
    // and verification target; changing it needs its own re-verification
    // flow, not a quiet field update.
    const updateData: any = { name: data.name.trim() }
    if (data.phone !== undefined) {
      updateData.phone = String(data.phone).trim()
    }

    await connectDB()

    const user = await User.findByIdAndUpdate(
      params.userId,
      { $set: updateData },
      { new: true, select: '-password' }
    ).lean() as any

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      phone: user.phone,
    })
  } catch (error) {
    console.error('Error updating profile:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
