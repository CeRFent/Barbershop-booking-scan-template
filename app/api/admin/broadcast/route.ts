import { NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import connectDB from '@/lib/mongodb'
import { User, Subscription } from '@/lib/models'
import { notifyBatch } from '@/lib/onesignal'
import { brand } from '@/lib/brand-config'

type Audience = 'all' | 'vip' | 'regular'

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
    const { message, subject, audience } = body as { message?: string; subject?: string; audience?: Audience }

    if (!message || typeof message !== 'string' || !message.trim()) {
      return NextResponse.json({ success: false, error: 'Message is required' }, { status: 400 })
    }
    if (audience !== 'all' && audience !== 'vip' && audience !== 'regular') {
      return NextResponse.json({ success: false, error: 'Audience must be "all", "vip", or "regular"' }, { status: 400 })
    }

    await connectDB()

    const vipUserIds = await Subscription.find({ status: 'active' }).distinct('userId')

    let users
    if (audience === 'all') {
      users = await User.find({ role: 'customer' }, { _id: 1 })
    } else if (audience === 'vip') {
      users = await User.find({ role: 'customer', _id: { $in: vipUserIds } }, { _id: 1 })
    } else {
      users = await User.find({ role: 'customer', _id: { $nin: vipUserIds } }, { _id: 1 })
    }

    const externalIds = users.map((u) => u._id.toString())

    if (externalIds.length > 0) {
      await notifyBatch(externalIds, {
        push: { title: brand.name, message: message.trim() },
        ...(subject && subject.trim() ? { email: { subject: subject.trim(), body: message.trim() } } : {}),
      })
    }

    return NextResponse.json({ success: true, recipientCount: externalIds.length })
  } catch (error: any) {
    console.error('[admin/broadcast POST] Error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
