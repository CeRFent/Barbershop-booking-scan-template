import { NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import connectDB from '@/lib/mongodb'
import { User } from '@/lib/models'

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  { params }: { params: { adminId: string } }
) {
  try {
    // Verify admin token
    const token = request.headers.get('Authorization')?.split(' ')[1]
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload || payload.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Admins may only view their own profile, not another admin's
    if (payload.userId !== params.adminId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Connect to database
    await connectDB()

    // Admin accounts are stored as User documents (role: 'admin')
    const admin = await User.findOne({ _id: params.adminId, role: 'admin' })
      .select('-password')
      .lean() as any

    if (!admin) {
      return NextResponse.json(
        { error: 'Admin not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      id: admin._id.toString(),
      name: admin.name,
      email: admin.email,
      phone: admin.phone,
      role: admin.role,
      referralCode: admin.referralCode,
      createdAt: admin.createdAt.toISOString()
    })
  } catch (error) {
    console.error('Error fetching admin profile:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { adminId: string } }
) {
  try {
    // Verify admin token
    const token = request.headers.get('Authorization')?.split(' ')[1]
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload || payload.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Admins may only edit their own profile, not another admin's
    if (payload.userId !== params.adminId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get update data
    const data = await request.json()

    // Validate required fields
    if (!data.name || data.name.trim() === '') {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      )
    }

    // Connect to database
    await connectDB()

    // Prepare update object
    const updateData: any = {
      name: data.name.trim(),
    }

    // Only update phone if provided
    if (data.phone !== undefined) {
      updateData.phone = data.phone.trim()
    }

    // Update admin profile (admin accounts are stored as User documents)
    const admin = await User.findOneAndUpdate(
      { _id: params.adminId, role: 'admin' },
      { $set: updateData },
      {
        new: true,
        select: '-password'
      }
    ).lean() as any

    if (!admin) {
      return NextResponse.json(
        { error: 'Admin not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      id: admin._id.toString(),
      name: admin.name,
      email: admin.email,
      phone: admin.phone,
      role: admin.role,
      referralCode: admin.referralCode,
      createdAt: admin.createdAt.toISOString()
    })
  } catch (error) {
    console.error('Error updating admin profile:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
