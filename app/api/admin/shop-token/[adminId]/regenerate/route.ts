import { NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { verifyToken } from '@/lib/auth'
import connectDB from '@/lib/mongodb'
import { ShopToken } from '@/lib/models'

const TOKEN_LIFETIME_MS = 24 * 60 * 60 * 1000 // rotate daily

export async function POST(
  request: Request,
  { params }: { params: { adminId: string } }
) {
  try {
    // Verify admin token
    const authHeader = request.headers.get('Authorization')
    const token = authHeader?.split(' ')[1]
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload || payload.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Connect to database
    await connectDB()

    // Deactivate all existing tokens for this admin
    await ShopToken.updateMany(
      { barberId: params.adminId },
      { isActive: false }
    )

    // Create new token
    const newToken = `QC-${params.adminId.slice(0, 8).toUpperCase()}-${randomBytes(4).toString('hex').toUpperCase()}`
    const shopToken = await ShopToken.create({
      barberId: params.adminId,
      token: newToken,
      isActive: true,
      expiresAt: new Date(Date.now() + TOKEN_LIFETIME_MS)
    })

    return NextResponse.json({
      token: shopToken.token
    })
  } catch (error) {
    console.error('Error regenerating shop token:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
