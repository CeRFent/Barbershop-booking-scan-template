import { render, screen, fireEvent, waitFor } from '@/test/test-utils'
import ScanPage from './page'
import { useRouter } from 'next/navigation'
import { useToast } from '@/hooks/use-toast'
import jsQR from 'jsqr'

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

jest.mock('jsqr', () => ({
  __esModule: true,
  default: jest.fn(),
}))

describe('Scan Page', () => {
  const mockRouter = {
    push: jest.fn(),
  }

  const mockToast = {
    toast: jest.fn(),
  }

  beforeEach(() => {
    ;(useRouter as jest.Mock).mockReturnValue(mockRouter)
    ;(useToast as jest.Mock).mockReturnValue(mockToast)
    global.fetch = jest.fn()
    localStorage.clear()

    // Mock canvas and video elements
    HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
      drawImage: jest.fn(),
      getImageData: jest.fn(() => ({
        data: new Uint8ClampedArray(400),
        width: 100,
        height: 100,
      })),
    }))

    window.HTMLVideoElement.prototype.play = jest.fn()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should render scan interface', () => {
    const token =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjMiLCJlbWFpbCI6InVzZXJAZXhhbXBsZS5jb20iLCJyb2xlIjoidXNlciJ9.token'
    localStorage.setItem('token', token)

    render(<ScanPage />)

    expect(screen.getByText(/scan qr code/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /start scanning/i })).toBeInTheDocument()
  })

  it('should handle successful QR code scan', async () => {
    const token =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjMiLCJlbWFpbCI6InVzZXJAZXhhbXBsZS5jb20iLCJyb2xlIjoidXNlciJ9.token'
    localStorage.setItem('token', token)

    ;(jsQR as jest.Mock).mockReturnValue({
      data: 'shop-token-123',
    })

    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ message: 'Cut used successfully', remainingCuts: 5 }),
    })

    render(<ScanPage />)

    fireEvent.click(screen.getByRole('button', { name: /start scanning/i }))

    await waitFor(() => {
      expect(mockToast.toast).toHaveBeenCalledWith({
        title: 'Success',
        description: 'Cut used successfully. Remaining cuts: 5',
      })
    })
  })

  it('should redirect to login if no token', () => {
    render(<ScanPage />)
    expect(mockRouter.push).toHaveBeenCalledWith('/login')
  })

  it('should redirect to login if invalid token', () => {
    localStorage.setItem('token', 'invalid.token')
    render(<ScanPage />)
    expect(mockRouter.push).toHaveBeenCalledWith('/login')
  })

  it('should handle camera access error', async () => {
    const token =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjMiLCJlbWFpbCI6InVzZXJAZXhhbXBsZS5jb20iLCJyb2xlIjoidXNlciJ9.token'
    localStorage.setItem('token', token)

    // Mock getUserMedia to reject
    ;(global.navigator.mediaDevices as any) = {
      getUserMedia: jest.fn().mockRejectedValue(new Error('Camera access denied')),
    }

    render(<ScanPage />)

    fireEvent.click(screen.getByRole('button', { name: /start scanning/i }))

    await waitFor(() => {
      expect(mockToast.toast).toHaveBeenCalledWith({
        title: 'Error',
        description: 'Failed to access camera',
        variant: 'destructive',
      })
    })
  })

  it('should handle invalid QR code', async () => {
    const token =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjMiLCJlbWFpbCI6InVzZXJAZXhhbXBsZS5jb20iLCJyb2xlIjoidXNlciJ9.token'
    localStorage.setItem('token', token)

    ;(jsQR as jest.Mock).mockReturnValue(null)

    render(<ScanPage />)

    fireEvent.click(screen.getByRole('button', { name: /start scanning/i }))

    await waitFor(() => {
      expect(screen.getByText(/scanning.../i)).toBeInTheDocument()
    })
  })

  it('should handle API errors', async () => {
    const token =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjMiLCJlbWFpbCI6InVzZXJAZXhhbXBsZS5jb20iLCJyb2xlIjoidXNlciJ9.token'
    localStorage.setItem('token', token)

    ;(jsQR as jest.Mock).mockReturnValue({
      data: 'shop-token-123',
    })

    ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('API error'))

    render(<ScanPage />)

    fireEvent.click(screen.getByRole('button', { name: /start scanning/i }))

    await waitFor(() => {
      expect(mockToast.toast).toHaveBeenCalledWith({
        title: 'Error',
        description: 'Failed to process QR code',
        variant: 'destructive',
      })
    })
  })

  it('should handle invalid shop token response', async () => {
    const token =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjMiLCJlbWFpbCI6InVzZXJAZXhhbXBsZS5jb20iLCJyb2xlIjoidXNlciJ9.token'
    localStorage.setItem('token', token)

    ;(jsQR as jest.Mock).mockReturnValue({
      data: 'invalid-token',
    })

    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ message: 'Invalid shop token' }),
    })

    render(<ScanPage />)

    fireEvent.click(screen.getByRole('button', { name: /start scanning/i }))

    await waitFor(() => {
      expect(mockToast.toast).toHaveBeenCalledWith({
        title: 'Error',
        description: 'Invalid shop token',
        variant: 'destructive',
      })
    })
  })

  it('should handle no cuts remaining response', async () => {
    const token =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjMiLCJlbWFpbCI6InVzZXJAZXhhbXBsZS5jb20iLCJyb2xlIjoidXNlciJ9.token'
    localStorage.setItem('token', token)

    ;(jsQR as jest.Mock).mockReturnValue({
      data: 'shop-token-123',
    })

    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ message: 'No cuts remaining for this month' }),
    })

    render(<ScanPage />)

    fireEvent.click(screen.getByRole('button', { name: /start scanning/i }))

    await waitFor(() => {
      expect(mockToast.toast).toHaveBeenCalledWith({
        title: 'Error',
        description: 'No cuts remaining for this month',
        variant: 'destructive',
      })
    })
  })
})
