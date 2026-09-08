import { NextRequest } from 'next/server'
import { GET } from './route'
import { User } from '@/lib/models/user'
import { Admin } from '@/lib/models/admin'
import { verifyToken } from '@/lib/auth/jwt'

jest.mock('@/lib/models/user', () => ({
  find: jest.fn(),
}))

jest.mock('@/lib/models/admin', () => ({
  find: jest.fn(),
}))

jest.mock('@/lib/auth/jwt', () => ({
  verifyToken: jest.fn(),
}))

describe('Admin Users API Route', () => {
  const mockToken = 'Bearer mock.jwt.token'

  const mockUsers = [
    { id: '1', email: 'user1@example.com', name: 'User 1', role: 'user' },
    { id: '2', email: 'user2@example.com', name: 'User 2', role: 'user' },
  ]

  const mockAdmins = [
    { id: '3', email: 'admin1@example.com', name: 'Admin 1', role: 'admin' },
    { id: '4', email: 'admin2@example.com', name: 'Admin 2', role: 'admin' },
  ]

  beforeEach(() => {
    jest.clearAllMocks()
    ;(verifyToken as jest.Mock).mockReturnValue({
      userId: '123',
      email: 'admin@example.com',
      role: 'admin',
    })
  })

  it('should return all users and admins', async () => {
    ;(User.find as jest.Mock).mockResolvedValueOnce(mockUsers)
    ;(Admin.find as jest.Mock).mockResolvedValueOnce(mockAdmins)

    const request = new NextRequest('http://localhost:3000/api/admin/users', {
      method: 'GET',
      headers: {
        authorization: mockToken,
      },
    })

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual([...mockUsers, ...mockAdmins])
  })

  it('should reject unauthorized access', async () => {
    const request = new NextRequest('http://localhost:3000/api/admin/users', {
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

    const request = new NextRequest('http://localhost:3000/api/admin/users', {
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

    const request = new NextRequest('http://localhost:3000/api/admin/users', {
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
    ;(User.find as jest.Mock).mockRejectedValueOnce(new Error('Database error'))

    const request = new NextRequest('http://localhost:3000/api/admin/users', {
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
