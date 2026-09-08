import { NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { verifyToken } from '@/lib/auth'
import connectDB from '@/lib/mongodb'
import { ShopToken } from '@/lib/models'

export const dynamic = 'force-dynamic'

const TOKEN_LIFETIME_MS = 24 * 60 * 60 * 1000 // rotate daily

export async function GET(
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

    const now = new Date()

    // Get active, unexpired token for admin
    let shopToken = await ShopToken.findOne({
      barberId: params.adminId,
      isActive: true,
      $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }]
    })

    // If no active token exists (or the last one expired), create one
    if (!shopToken) {
      await ShopToken.updateMany({ barberId: params.adminId, isActive: true }, { isActive: false })
      const newToken = `QC-${params.adminId.slice(0, 8).toUpperCase()}-${randomBytes(4).toString('hex').toUpperCase()}`
      shopToken = await ShopToken.create({
        barberId: params.adminId,
        token: newToken,
        isActive: true,
        expiresAt: new Date(now.getTime() + TOKEN_LIFETIME_MS)
      })
    }

    return NextResponse.json({
      token: shopToken.token
    })
  } catch (error) {
    console.error('Error handling shop token request:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
