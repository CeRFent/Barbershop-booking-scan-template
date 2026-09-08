import { render, screen, fireEvent, waitFor } from '@/test/test-utils'
import AdminUsersPage from './page'
import { useRouter } from 'next/navigation'
import { useToast } from '@/hooks/use-toast'

// Mock the components that use Next.js hooks
jest.mock('@/components/navbar', () => ({
  Navbar: () => <div data-testid="mock-navbar">Navbar</div>,
}))

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

jest.mock('@/hooks/use-toast', () => ({
  useToast: jest.fn(),
}))

describe('Admin Users Page', () => {
  const mockRouter = {
    push: jest.fn(),
  }

  const mockToast = {
    toast: jest.fn(),
  }

  const mockUsers = [
    { id: '1', email: 'user1@example.com', name: 'User 1', role: 'user' },
    { id: '2', email: 'user2@example.com', name: 'User 2', role: 'user' },
    { id: '3', email: 'admin1@example.com', name: 'Admin 1', role: 'admin' },
  ]

  beforeEach(() => {
    ;(useRouter as jest.Mock).mockReturnValue(mockRouter)
    ;(useToast as jest.Mock).mockReturnValue(mockToast)
    global.fetch = jest.fn()
    localStorage.clear()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should render users list', async () => {
    const token =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjMiLCJlbWFpbCI6ImFkbWluQGV4YW1wbGUuY29tIiwicm9sZSI6ImFkbWluIn0.token'
    localStorage.setItem('token', token)

    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockUsers),
    })

    render(<AdminUsersPage />)

    await waitFor(() => {
      expect(screen.getByText('User 1')).toBeInTheDocument()
      expect(screen.getByText('User 2')).toBeInTheDocument()
      expect(screen.getByText('Admin 1')).toBeInTheDocument()
    })
  })

  it('should handle user deletion', async () => {
    const token =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjMiLCJlbWFpbCI6ImFkbWluQGV4YW1wbGUuY29tIiwicm9sZSI6ImFkbWluIn0.token'
    localStorage.setItem('token', token)

    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockUsers),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ message: 'User deleted successfully' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockUsers.slice(1)), // Users list without the deleted user
      })

    render(<AdminUsersPage />)

    await waitFor(() => {
      expect(screen.getByText('User 1')).toBeInTheDocument()
    })

    const deleteButtons = await screen.findAllByRole('button', { name: /delete/i })
    fireEvent.click(deleteButtons[0])

    await waitFor(() => {
      expect(mockToast.toast).toHaveBeenCalledWith({
        title: 'Success',
        description: 'User deleted successfully',
      })
    })
  })

  it('should redirect to login if no token', () => {
    render(<AdminUsersPage />)
    expect(mockRouter.push).toHaveBeenCalledWith('/login')
  })

  it('should redirect to login if invalid token', () => {
    localStorage.setItem('token', 'invalid.token')
    render(<AdminUsersPage />)
    expect(mockRouter.push).toHaveBeenCalledWith('/login')
  })

  it('should redirect to home if user is not admin', () => {
    const token =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjMiLCJlbWFpbCI6InVzZXJAZXhhbXBsZS5jb20iLCJyb2xlIjoidXNlciJ9.token'
    localStorage.setItem('token', token)
    render(<AdminUsersPage />)
    expect(mockRouter.push).toHaveBeenCalledWith('/')
  })

  it('should handle API errors', async () => {
    const token =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjMiLCJlbWFpbCI6ImFkbWluQGV4YW1wbGUuY29tIiwicm9sZSI6ImFkbWluIn0.token'
    localStorage.setItem('token', token)

    ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('API error'))

    render(<AdminUsersPage />)

    await waitFor(() => {
      expect(screen.getByText('Error loading users')).toBeInTheDocument()
    })
  })

  it('should handle unauthorized API response', async () => {
    const token =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjMiLCJlbWFpbCI6ImFkbWluQGV4YW1wbGUuY29tIiwicm9sZSI6ImFkbWluIn0.token'
    localStorage.setItem('token', token)

    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 401,
    })

    render(<AdminUsersPage />)

    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith('/login')
    })
  })

  it('should handle forbidden API response', async () => {
    const token =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjMiLCJlbWFpbCI6ImFkbWluQGV4YW1wbGUuY29tIiwicm9sZSI6ImFkbWluIn0.token'
    localStorage.setItem('token', token)

    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 403,
    })

    render(<AdminUsersPage />)

    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith('/')
    })
  })

  it('should handle user deletion error', async () => {
    const token =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjMiLCJlbWFpbCI6ImFkbWluQGV4YW1wbGUuY29tIiwicm9sZSI6ImFkbWluIn0.token'
    localStorage.setItem('token', token)

    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockUsers),
      })
      .mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ message: 'Failed to delete user' }),
      })

    render(<AdminUsersPage />)

    await waitFor(() => {
      expect(screen.getByText('User 1')).toBeInTheDocument()
    })

    const deleteButtons = await screen.findAllByRole('button', { name: /delete/i })
    fireEvent.click(deleteButtons[0])

    await waitFor(() => {
      expect(mockToast.toast).toHaveBeenCalledWith({
        title: 'Error',
        description: 'Failed to delete user',
        variant: 'destructive',
      })
    })
  })
})
