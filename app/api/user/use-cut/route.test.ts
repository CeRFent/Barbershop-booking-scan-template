import { NextRequest } from 'next/server'
import { POST } from './route'
import { CutHistory } from '@/lib/models/cut-history'
import { ShopToken } from '@/lib/models/shop-token'
import { verifyToken } from '@/lib/auth/jwt'

jest.mock('@/lib/models/cut-history', () => ({
  create: jest.fn(),
  countDocuments: jest.fn(),
}))

jest.mock('@/lib/models/shop-token', () => ({
  findOne: jest.fn(),
}))

jest.mock('@/lib/auth/jwt', () => ({
  verifyToken: jest.fn(),
}))

describe('Use Cut API Route', () => {
  const mockToken = 'Bearer mock.jwt.token'
  const userId = '123'
  const shopToken = 'valid-shop-token'

  beforeEach(() => {
    jest.clearAllMocks()
    ;(verifyToken as jest.Mock).mockReturnValue({
      userId,
      email: 'user@example.com',
      role: 'user',
    })
  })

  it('should process a valid cut request', async () => {
    const mockShopToken = {
      id: 'shop1',
      token: shopToken,
      adminId: 'admin1',
      isActive: true,
    }

    ;(ShopToken.findOne as jest.Mock).mockResolvedValueOnce(mockShopToken)
    ;(CutHistory.countDocuments as jest.Mock).mockResolvedValueOnce(5) // Used cuts this month
    ;(CutHistory.create as jest.Mock).mockResolvedValueOnce({
      id: 'cut1',
      userId,
      shopTokenUsed: shopToken,
      action: 'used',
    })

    const request = new NextRequest('http://localhost:3000/api/user/use-cut', {
      method: 'POST',
      headers: {
        authorization: mockToken,
      },
      body: JSON.stringify({ shopToken }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual({
      message: 'Cut used successfully',
      remainingCuts: 5, // 10 - 5 used cuts
    })
  })

  it('should reject unauthorized access', async () => {
    const request = new NextRequest('http://localhost:3000/api/user/use-cut', {
      method: 'POST',
      body: JSON.stringify({ shopToken }),
    })

    const response = await POST(request)
    expect(response.status).toBe(401)
    expect(await response.text()).toBe('Unauthorized')
  })

  it('should reject invalid shop tokens', async () => {
    ;(ShopToken.findOne as jest.Mock).mockResolvedValueOnce(null)

    const request = new NextRequest('http://localhost:3000/api/user/use-cut', {
      method: 'POST',
      headers: {
        authorization: mockToken,
      },
      body: JSON.stringify({ shopToken: 'invalid-token' }),
    })

    const response = await POST(request)
    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ message: 'Invalid shop token' })
  })

  it('should reject inactive shop tokens', async () => {
    const mockShopToken = {
      id: 'shop1',
      token: shopToken,
      adminId: 'admin1',
      isActive: false,
    }

    ;(ShopToken.findOne as jest.Mock).mockResolvedValueOnce(mockShopToken)

    const request = new NextRequest('http://localhost:3000/api/user/use-cut', {
      method: 'POST',
      headers: {
        authorization: mockToken,
      },
      body: JSON.stringify({ shopToken }),
    })

    const response = await POST(request)
    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ message: 'Invalid shop token' })
  })

  it('should reject when monthly cuts are exhausted', async () => {
    const mockShopToken = {
      id: 'shop1',
      token: shopToken,
      adminId: 'admin1',
      isActive: true,
    }

    ;(ShopToken.findOne as jest.Mock).mockResolvedValueOnce(mockShopToken)
    ;(CutHistory.countDocuments as jest.Mock).mockResolvedValueOnce(10) // All cuts used

    const request = new NextRequest('http://localhost:3000/api/user/use-cut', {
      method: 'POST',
      headers: {
        authorization: mockToken,
      },
      body: JSON.stringify({ shopToken }),
    })

    const response = await POST(request)
    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ message: 'No cuts remaining for this month' })
  })

  it('should handle invalid tokens', async () => {
    ;(verifyToken as jest.Mock).mockImplementation(() => {
      throw new Error('Invalid token')
    })

    const request = new NextRequest('http://localhost:3000/api/user/use-cut', {
      method: 'POST',
      headers: {
        authorization: mockToken,
      },
      body: JSON.stringify({ shopToken }),
    })

    const response = await POST(request)
    expect(response.status).toBe(401)
    expect(await response.text()).toBe('Unauthorized')
  })

  it('should handle missing shop token', async () => {
    const request = new NextRequest('http://localhost:3000/api/user/use-cut', {
      method: 'POST',
      headers: {
        authorization: mockToken,
      },
      body: JSON.stringify({}),
    })

    const response = await POST(request)
    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ message: 'Shop token is required' })
  })

  it('should handle database errors', async () => {
    ;(ShopToken.findOne as jest.Mock).mockRejectedValueOnce(new Error('Database error'))

    const request = new NextRequest('http://localhost:3000/api/user/use-cut', {
      method: 'POST',
      headers: {
        authorization: mockToken,
      },
      body: JSON.stringify({ shopToken }),
    })

    const response = await POST(request)
    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({ message: 'Internal server error' })
  })
})
