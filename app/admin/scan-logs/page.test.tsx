import { render, screen, waitFor } from '@/test/test-utils'
import AdminScanLogsPage from './page'
import { useRouter } from 'next/navigation'

// Mock the components that use Next.js hooks
jest.mock('@/components/navbar', () => ({
  Navbar: () => <div data-testid="mock-navbar">Navbar</div>,
}))

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

describe('Admin Scan Logs Page', () => {
  const mockRouter = {
    push: jest.fn(),
  }

  const mockLogs = [
    {
      id: '1',
      userId: 'user1',
      userName: 'User 1',
      cutId: 'cut1',
      action: 'used',
      shopTokenUsed: 'token1',
      createdAt: '2024-03-20T12:00:00Z',
    },
    {
      id: '2',
      userId: 'user2',
      userName: 'User 2',
      cutId: 'cut2',
      action: 'scanned',
      shopTokenUsed: 'token2',
      createdAt: '2024-03-20T13:00:00Z',
    },
  ]

  beforeEach(() => {
    ;(useRouter as jest.Mock).mockReturnValue(mockRouter)
    global.fetch = jest.fn()
    localStorage.clear()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should render scan logs', async () => {
    const token =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjMiLCJlbWFpbCI6ImFkbWluQGV4YW1wbGUuY29tIiwicm9sZSI6ImFkbWluIn0.token'
    localStorage.setItem('token', token)

    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockLogs),
    })

    render(<AdminScanLogsPage />)

    await waitFor(() => {
      expect(screen.getByText('User 1')).toBeInTheDocument()
      expect(screen.getByText('User 2')).toBeInTheDocument()
      expect(screen.getByText('used')).toBeInTheDocument()
      expect(screen.getByText('scanned')).toBeInTheDocument()
    })
  })

  it('should redirect to login if no token', () => {
    render(<AdminScanLogsPage />)
    expect(mockRouter.push).toHaveBeenCalledWith('/login')
  })

  it('should redirect to login if invalid token', () => {
    localStorage.setItem('token', 'invalid.token')
    render(<AdminScanLogsPage />)
    expect(mockRouter.push).toHaveBeenCalledWith('/login')
  })

  it('should redirect to home if user is not admin', () => {
    const token =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjMiLCJlbWFpbCI6InVzZXJAZXhhbXBsZS5jb20iLCJyb2xlIjoidXNlciJ9.token'
    localStorage.setItem('token', token)
    render(<AdminScanLogsPage />)
    expect(mockRouter.push).toHaveBeenCalledWith('/')
  })

  it('should handle API errors', async () => {
    const token =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjMiLCJlbWFpbCI6ImFkbWluQGV4YW1wbGUuY29tIiwicm9sZSI6ImFkbWluIn0.token'
    localStorage.setItem('token', token)

    ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('API error'))

    render(<AdminScanLogsPage />)

    await waitFor(() => {
      expect(screen.getByText('Error loading scan logs')).toBeInTheDocument()
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

    render(<AdminScanLogsPage />)

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

    render(<AdminScanLogsPage />)

    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith('/')
    })
  })

  it('should format dates correctly', async () => {
    const token =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjMiLCJlbWFpbCI6ImFkbWluQGV4YW1wbGUuY29tIiwicm9sZSI6ImFkbWluIn0.token'
    localStorage.setItem('token', token)

    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockLogs),
    })

    render(<AdminScanLogsPage />)

    await waitFor(() => {
      expect(screen.getByText('March 20, 2024')).toBeInTheDocument()
      expect(screen.getByText('12:00 PM')).toBeInTheDocument()
      expect(screen.getByText('1:00 PM')).toBeInTheDocument()
    })
  })
})
