import { NextRequest } from 'next/server'
import { GET } from './route'
import { User } from '@/lib/models/user'
import { CutHistory } from '@/lib/models/cut-history'
import { Subscription } from '@/lib/models/subscription'
import { verifyToken } from '@/lib/auth/jwt'

jest.mock('@/lib/models/user', () => ({
  countDocuments: jest.fn(),
}))

jest.mock('@/lib/models/cut-history', () => ({
  countDocuments: jest.fn(),
}))

jest.mock('@/lib/models/subscription', () => ({
  countDocuments: jest.fn(),
}))

jest.mock('@/lib/auth/jwt', () => ({
  verifyToken: jest.fn(),
}))

describe('Admin Stats API Route', () => {
  const mockToken = 'Bearer mock.jwt.token'

  beforeEach(() => {
    jest.clearAllMocks()
    ;(verifyToken as jest.Mock).mockReturnValue({
      userId: '123',
      email: 'admin@example.com',
      role: 'admin',
    })
  })

  it('should return dashboard statistics', async () => {
    const mockStats = {
      totalClients: 100,
      scansThisWeek: 50,
      cutsUsedToday: 25,
      activeSubscriptions: 75,
    }

    ;(User.countDocuments as jest.Mock).mockResolvedValueOnce(mockStats.totalClients)
    ;(CutHistory.countDocuments as jest.Mock)
      .mockResolvedValueOnce(mockStats.scansThisWeek)
      .mockResolvedValueOnce(mockStats.cutsUsedToday)
    ;(Subscription.countDocuments as jest.Mock).mockResolvedValueOnce(mockStats.activeSubscriptions)

    const request = new NextRequest('http://localhost:3000/api/admin/stats', {
      method: 'GET',
      headers: {
        authorization: mockToken,
      },
    })

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual(mockStats)
  })

  it('should reject unauthorized access', async () => {
    const request = new NextRequest('http://localhost:3000/api/admin/stats', {
      method: 'GET',
    })

    const response = await GET(request)
    expect(response.status).toBe(401)
    expect(await response.text()).toBe('Unauthorized')
  })

  it('should reject non-admin users', async () => {
    ;(verifyToken as jest.Mock).mockReturnValue({
      userId: '123',
      email: 'user@example.com',
      role: 'user',
    })

    const request = new NextRequest('http://localhost:3000/api/admin/stats', {
      method: 'GET',
      headers: {
        authorization: mockToken,
      },
    })

    const response = await GET(request)
    expect(response.status).toBe(403)
    expect(await response.text()).toBe('Forbidden')
  })

  it('should handle invalid tokens', async () => {
    ;(verifyToken as jest.Mock).mockImplementation(() => {
      throw new Error('Invalid token')
    })

    const request = new NextRequest('http://localhost:3000/api/admin/stats', {
      method: 'GET',
      headers: {
        authorization: mockToken,
      },
    })

    const response = await GET(request)
    expect(response.status).toBe(401)
    expect(await response.text()).toBe('Unauthorized')
  })

  it('should handle database errors', async () => {
    ;(User.countDocuments as jest.Mock).mockRejectedValueOnce(new Error('Database error'))

    const request = new NextRequest('http://localhost:3000/api/admin/stats', {
      method: 'GET',
      headers: {
        authorization: mockToken,
      },
    })

    const response = await GET(request)
    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({ message: 'Internal server error' })
  })
})
