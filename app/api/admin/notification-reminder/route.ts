import { NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import connectDB from '@/lib/mongodb'
import { User, Subscription } from '@/lib/models'
import { sendNotificationReminderEmails } from '@/lib/email'

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
    const { audience } = body as { audience?: Audience }
    if (audience !== 'all' && audience !== 'vip' && audience !== 'regular') {
      return NextResponse.json({ success: false, error: 'Audience must be "all", "vip", or "regular"' }, { status: 400 })
    }

    await connectDB()

    const vipUserIds = await Subscription.find({ status: 'active' }).distinct('userId')

    let users
    if (audience === 'all') {
      users = await User.find({ role: 'customer' }, { name: 1, email: 1 })
    } else if (audience === 'vip') {
      users = await User.find({ role: 'customer', _id: { $in: vipUserIds } }, { name: 1, email: 1 })
    } else {
      users = await User.find({ role: 'customer', _id: { $nin: vipUserIds } }, { name: 1, email: 1 })
    }

    const recipients = users.filter((u) => u.email).map((u) => ({ email: u.email, name: u.name }))

    let sent = 0
    if (recipients.length > 0) {
      const result = await sendNotificationReminderEmails(recipients)
      sent = result.sent
    }

    return NextResponse.json({ success: true, recipientCount: sent })
  } catch (error: any) {
    console.error('[admin/notification-reminder POST] Error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
