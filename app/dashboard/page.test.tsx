import { render, screen, waitFor } from '@/test/test-utils'
import DashboardPage from './page'
import { useRouter } from 'next/navigation'

// Mock the components that use Next.js hooks
jest.mock('@/components/navbar', () => ({
  Navbar: () => <div data-testid="mock-navbar">Navbar</div>,
}))

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

describe('Dashboard Page', () => {
  const mockRouter = {
    push: jest.fn(),
  }

  const mockCuts = {
    totalCuts: 10,
    usedCuts: 5,
    remainingCuts: 5,
  }

  beforeEach(() => {
    ;(useRouter as jest.Mock).mockReturnValue(mockRouter)
    global.fetch = jest.fn()
    localStorage.clear()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should render dashboard with cut statistics', async () => {
    const token =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjMiLCJlbWFpbCI6InVzZXJAZXhhbXBsZS5jb20iLCJyb2xlIjoidXNlciJ9.token'
    localStorage.setItem('token', token)

    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockCuts),
    })

    render(<DashboardPage />)

    await waitFor(() => {
      expect(screen.getByText('Total Cuts')).toBeInTheDocument()
      expect(screen.getByText('10')).toBeInTheDocument()
      expect(screen.getByText('Used Cuts')).toBeInTheDocument()
      expect(screen.getByText('5')).toBeInTheDocument()
      expect(screen.getByText('Remaining Cuts')).toBeInTheDocument()
      expect(screen.getByText('5')).toBeInTheDocument()
    })
  })

  it('should redirect to login if no token', () => {
    render(<DashboardPage />)
    expect(mockRouter.push).toHaveBeenCalledWith('/login')
  })

  it('should redirect to login if invalid token', () => {
    localStorage.setItem('token', 'invalid.token')
    render(<DashboardPage />)
    expect(mockRouter.push).toHaveBeenCalledWith('/login')
  })

  it('should handle API errors', async () => {
    const token =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjMiLCJlbWFpbCI6InVzZXJAZXhhbXBsZS5jb20iLCJyb2xlIjoidXNlciJ9.token'
    localStorage.setItem('token', token)

    ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('API error'))

    render(<DashboardPage />)

    await waitFor(() => {
      expect(screen.getByText('Error loading cut statistics')).toBeInTheDocument()
    })
  })

  it('should handle unauthorized API response', async () => {
    const token =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjMiLCJlbWFpbCI6InVzZXJAZXhhbXBsZS5jb20iLCJyb2xlIjoidXNlciJ9.token'
    localStorage.setItem('token', token)

    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 401,
    })

    render(<DashboardPage />)

    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith('/login')
    })
  })

  it('should handle forbidden API response', async () => {
    const token =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjMiLCJlbWFpbCI6InVzZXJAZXhhbXBsZS5jb20iLCJyb2xlIjoidXNlciJ9.token'
    localStorage.setItem('token', token)

    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 403,
    })

    render(<DashboardPage />)

    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith('/')
    })
  })

  it('should display subscription status', async () => {
    const token =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjMiLCJlbWFpbCI6InVzZXJAZXhhbXBsZS5jb20iLCJyb2xlIjoidXNlciJ9.token'
    localStorage.setItem('token', token)

    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ ...mockCuts, isSubscribed: true }),
    })

    render(<DashboardPage />)

    await waitFor(() => {
      expect(screen.getByText(/active subscription/i)).toBeInTheDocument()
    })
  })

  it('should display subscription prompt for non-subscribers', async () => {
    const token =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjMiLCJlbWFpbCI6InVzZXJAZXhhbXBsZS5jb20iLCJyb2xlIjoidXNlciJ9.token'
    localStorage.setItem('token', token)

    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ ...mockCuts, isSubscribed: false }),
    })

    render(<DashboardPage />)

    await waitFor(() => {
      expect(screen.getByText(/subscribe now/i)).toBeInTheDocument()
    })
  })
})
