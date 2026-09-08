import { render, screen, waitFor } from '@/test/test-utils'
import AdminDashboard from './page'
import { useRouter } from 'next/navigation'

// Mock the components that use Next.js hooks
jest.mock('@/components/navbar', () => ({
  Navbar: () => <div data-testid="mock-navbar">Navbar</div>,
}))

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

describe('Admin Dashboard', () => {
  const mockRouter = {
    push: jest.fn(),
  }

  beforeEach(() => {
    ;(useRouter as jest.Mock).mockReturnValue(mockRouter)
    global.fetch = jest.fn()
    localStorage.clear()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should render dashboard with stats', async () => {
    const mockStats = {
      totalClients: 100,
      scansThisWeek: 50,
      cutsUsedToday: 25,
      activeSubscriptions: 75,
    }

    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockStats),
    })

    const token =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjMiLCJlbWFpbCI6ImFkbWluQGV4YW1wbGUuY29tIiwicm9sZSI6ImFkbWluIn0.token'
    localStorage.setItem('token', token)

    render(<AdminDashboard />)

    await waitFor(() => {
      expect(screen.getByText('Total Clients')).toBeInTheDocument()
      expect(screen.getByText('100')).toBeInTheDocument()
      expect(screen.getByText('Scans This Week')).toBeInTheDocument()
      expect(screen.getByText('50')).toBeInTheDocument()
      expect(screen.getByText('Cuts Used Today')).toBeInTheDocument()
      expect(screen.getByText('25')).toBeInTheDocument()
      expect(screen.getByText('Active Subscriptions')).toBeInTheDocument()
      expect(screen.getByText('75')).toBeInTheDocument()
    })
  })

  it('should redirect to login if no token', () => {
    render(<AdminDashboard />)
    expect(mockRouter.push).toHaveBeenCalledWith('/login')
  })

  it('should redirect to login if invalid token', () => {
    localStorage.setItem('token', 'invalid.token')
    render(<AdminDashboard />)
    expect(mockRouter.push).toHaveBeenCalledWith('/login')
  })

  it('should redirect to home if user is not admin', () => {
    const token =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjMiLCJlbWFpbCI6InVzZXJAZXhhbXBsZS5jb20iLCJyb2xlIjoidXNlciJ9.token'
    localStorage.setItem('token', token)
    render(<AdminDashboard />)
    expect(mockRouter.push).toHaveBeenCalledWith('/')
  })

  it('should handle API errors', async () => {
    const token =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjMiLCJlbWFpbCI6ImFkbWluQGV4YW1wbGUuY29tIiwicm9sZSI6ImFkbWluIn0.token'
    localStorage.setItem('token', token)

    ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('API error'))

    render(<AdminDashboard />)

    await waitFor(() => {
      expect(screen.getByText('Error loading stats')).toBeInTheDocument()
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

    render(<AdminDashboard />)

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

    render(<AdminDashboard />)

    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith('/')
    })
  })
})
