import { NextRequest } from 'next/server'
import { DELETE } from './route'
import { User } from '@/lib/models/user'
import { Admin } from '@/lib/models/admin'
import { verifyToken } from '@/lib/auth/jwt'

jest.mock('@/lib/models/user', () => ({
  findByIdAndDelete: jest.fn(),
}))

jest.mock('@/lib/models/admin', () => ({
  findByIdAndDelete: jest.fn(),
}))

jest.mock('@/lib/auth/jwt', () => ({
  verifyToken: jest.fn(),
}))

describe('Admin Delete User API Route', () => {
  const mockToken = 'Bearer mock.jwt.token'
  const userId = '123'

  beforeEach(() => {
    jest.clearAllMocks()
    ;(verifyToken as jest.Mock).mockReturnValue({
      userId: 'admin123',
      email: 'admin@example.com',
      role: 'admin',
    })
  })

  it('should delete a user', async () => {
    ;(User.findByIdAndDelete as jest.Mock).mockResolvedValueOnce({ id: userId })

    const request = new NextRequest(`http://localhost:3000/api/admin/delete-user?userId=${userId}`, {
      method: 'DELETE',
      headers: {
        authorization: mockToken,
      },
    })

    const response = await DELETE(request)
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ message: 'User deleted successfully' })
  })

  it('should delete an admin', async () => {
    ;(User.findByIdAndDelete as jest.Mock).mockResolvedValueOnce(null)
    ;(Admin.findByIdAndDelete as jest.Mock).mockResolvedValueOnce({ id: userId })

    const request = new NextRequest(`http://localhost:3000/api/admin/delete-user?userId=${userId}`, {
      method: 'DELETE',
      headers: {
        authorization: mockToken,
      },
    })

    const response = await DELETE(request)
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ message: 'User deleted successfully' })
  })

  it('should return error if user not found', async () => {
    ;(User.findByIdAndDelete as jest.Mock).mockResolvedValueOnce(null)
    ;(Admin.findByIdAndDelete as jest.Mock).mockResolvedValueOnce(null)

    const request = new NextRequest(`http://localhost:3000/api/admin/delete-user?userId=${userId}`, {
      method: 'DELETE',
      headers: {
        authorization: mockToken,
      },
    })

    const response = await DELETE(request)
    expect(response.status).toBe(404)
    expect(await response.json()).toEqual({ message: 'User not found' })
  })

  it('should reject unauthorized access', async () => {
    const request = new NextRequest(`http://localhost:3000/api/admin/delete-user?userId=${userId}`, {
      method: 'DELETE',
    })

    const response = await DELETE(request)
    expect(response.status).toBe(401)
    expect(await response.text()).toBe('Unauthorized')
  })

  it('should reject non-admin users', async () => {
    ;(verifyToken as jest.Mock).mockReturnValue({
      userId: '123',
      email: 'user@example.com',
      role: 'user',
    })

    const request = new NextRequest(`http://localhost:3000/api/admin/delete-user?userId=${userId}`, {
      method: 'DELETE',
      headers: {
        authorization: mockToken,
      },
    })

    const response = await DELETE(request)
    expect(response.status).toBe(403)
    expect(await response.text()).toBe('Forbidden')
  })

  it('should handle invalid tokens', async () => {
    ;(verifyToken as jest.Mock).mockImplementation(() => {
      throw new Error('Invalid token')
    })

    const request = new NextRequest(`http://localhost:3000/api/admin/delete-user?userId=${userId}`, {
      method: 'DELETE',
      headers: {
        authorization: mockToken,
      },
    })

    const response = await DELETE(request)
    expect(response.status).toBe(401)
    expect(await response.text()).toBe('Unauthorized')
  })

  it('should handle missing userId', async () => {
    const request = new NextRequest('http://localhost:3000/api/admin/delete-user', {
      method: 'DELETE',
      headers: {
        authorization: mockToken,
      },
    })

    const response = await DELETE(request)
    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ message: 'User ID is required' })
  })

  it('should handle database errors', async () => {
    ;(User.findByIdAndDelete as jest.Mock).mockRejectedValueOnce(new Error('Database error'))

    const request = new NextRequest(`http://localhost:3000/api/admin/delete-user?userId=${userId}`, {
      method: 'DELETE',
      headers: {
        authorization: mockToken,
      },
    })

    const response = await DELETE(request)
    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({ message: 'Internal server error' })
  })
})
