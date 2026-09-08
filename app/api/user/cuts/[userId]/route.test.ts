import { NextRequest } from 'next/server'
import { GET } from './route'
import { CutHistory } from '@/lib/models/cut-history'
import { verifyToken } from '@/lib/auth/jwt'

jest.mock('@/lib/models/cut-history', () => ({
  countDocuments: jest.fn(),
}))

jest.mock('@/lib/auth/jwt', () => ({
  verifyToken: jest.fn(),
}))

describe('User Cuts API Route', () => {
  const mockToken = 'Bearer mock.jwt.token'
  const userId = '123'

  beforeEach(() => {
    jest.clearAllMocks()
    ;(verifyToken as jest.Mock).mockReturnValue({
      userId,
      email: 'user@example.com',
      role: 'user',
    })
  })

  it('should return monthly cut statistics', async () => {
    const mockCounts = {
      totalCuts: 10,
      usedCuts: 5,
      remainingCuts: 5,
    }

    ;(CutHistory.countDocuments as jest.Mock)
      .mockResolvedValueOnce(mockCounts.totalCuts)
      .mockResolvedValueOnce(mockCounts.usedCuts)

    const request = new NextRequest(`http://localhost:3000/api/user/cuts/${userId}`, {
      method: 'GET',
      headers: {
        authorization: mockToken,
      },
    })

    const response = await GET(request, { params: { userId } })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual(mockCounts)
  })

  it('should reject unauthorized access', async () => {
    const request = new NextRequest(`http://localhost:3000/api/user/cuts/${userId}`, {
      method: 'GET',
    })

    const response = await GET(request, { params: { userId } })
    expect(response.status).toBe(401)
    expect(await response.text()).toBe('Unauthorized')
  })

  it('should reject access to other user data', async () => {
    const otherUserId = '456'
    const request = new NextRequest(`http://localhost:3000/api/user/cuts/${otherUserId}`, {
      method: 'GET',
      headers: {
        authorization: mockToken,
      },
    })

    const response = await GET(request, { params: { userId: otherUserId } })
    expect(response.status).toBe(403)
    expect(await response.text()).toBe('Forbidden')
  })

  it('should allow admin access to any user data', async () => {
    ;(verifyToken as jest.Mock).mockReturnValue({
      userId: 'admin123',
      email: 'admin@example.com',
      role: 'admin',
    })

    const otherUserId = '456'
    const mockCounts = {
      totalCuts: 10,
      usedCuts: 5,
      remainingCuts: 5,
    }

    ;(CutHistory.countDocuments as jest.Mock)
      .mockResolvedValueOnce(mockCounts.totalCuts)
      .mockResolvedValueOnce(mockCounts.usedCuts)

    const request = new NextRequest(`http://localhost:3000/api/user/cuts/${otherUserId}`, {
      method: 'GET',
      headers: {
        authorization: mockToken,
      },
    })

    const response = await GET(request, { params: { userId: otherUserId } })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual(mockCounts)
  })

  it('should handle invalid tokens', async () => {
    ;(verifyToken as jest.Mock).mockImplementation(() => {
      throw new Error('Invalid token')
    })

    const request = new NextRequest(`http://localhost:3000/api/user/cuts/${userId}`, {
      method: 'GET',
      headers: {
        authorization: mockToken,
      },
    })

    const response = await GET(request, { params: { userId } })
    expect(response.status).toBe(401)
    expect(await response.text()).toBe('Unauthorized')
  })

  it('should handle database errors', async () => {
    ;(CutHistory.countDocuments as jest.Mock).mockRejectedValueOnce(new Error('Database error'))

    const request = new NextRequest(`http://localhost:3000/api/user/cuts/${userId}`, {
      method: 'GET',
      headers: {
        authorization: mockToken,
      },
    })

    const response = await GET(request, { params: { userId } })
    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({ message: 'Internal server error' })
  })
})
