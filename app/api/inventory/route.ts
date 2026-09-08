import { type NextRequest, NextResponse } from 'next/server'
import { Inventory } from '@/lib/models'
import connectDB from '@/lib/mongodb'
import { verifyToken } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// GET all inventory items
export async function GET(request: NextRequest) {
  try {
    await connectDB()
    const inventory = await Inventory.find({ isActive: true }).sort({ name: 1 })
    
    const snacks = inventory.filter(item => item.type === 'snack').map(item => item.name)
    const drinks = inventory.filter(item => item.type === 'drink').map(item => item.name)
    
    return NextResponse.json({
      success: true,
      snacks,
      drinks
    })
  } catch (error: any) {
    console.error('[inventory-get] Error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

// POST new inventory item (Admin only)
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('Authorization')?.split(' ')[1] || 
                  request.cookies.get('token')?.value
    
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
    
    const payload = verifyToken(token)
    if (!payload || payload.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const { type, name } = await request.json()
    if (!type || !name) {
      return NextResponse.json({ success: false, error: 'Type and name are required' }, { status: 400 })
    }

    await connectDB()
    
    const newItem = await Inventory.create({
      type,
      name: name.trim()
    })

    return NextResponse.json({
      success: true,
      item: newItem
    })
  } catch (error: any) {
    console.error('[inventory-post] Error:', error)
    if (error.code === 11000) {
      return NextResponse.json({ success: false, error: 'Item already exists' }, { status: 400 })
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

// DELETE/Update inventory item (Admin only)
export async function DELETE(request: NextRequest) {
  try {
    const token = request.headers.get('Authorization')?.split(' ')[1] || 
                  request.cookies.get('token')?.value
    
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
    
    const payload = verifyToken(token)
    if (!payload || payload.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const { name, type } = await request.json()
    await connectDB()
    
    await Inventory.findOneAndDelete({ name, type })

    return NextResponse.json({
      success: true,
      message: 'Item removed successfully'
    })
  } catch (error: any) {
    console.error('[inventory-delete] Error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
