import { render, screen, fireEvent, waitFor } from '@/test/test-utils'
import AdminQRCodePage from './page'
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

// Mock QRCode library
jest.mock('qrcode', () => ({
  toDataURL: jest.fn().mockResolvedValue('data:image/png;base64,mockQRCode'),
}))

describe('Admin QR Code Page', () => {
  const mockRouter = {
    push: jest.fn(),
  }

  const mockToast = {
    toast: jest.fn(),
  }

  const mockShopToken = {
    token: 'shop-token-123',
    adminId: 'admin123',
    isActive: true,
  }

  beforeEach(() => {
    ;(useRouter as jest.Mock).mockReturnValue(mockRouter)
    ;(useToast as jest.Mock).mockReturnValue(mockToast)
    global.fetch = jest.fn()
    localStorage.clear()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should render QR code', async () => {
    const token =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjMiLCJlbWFpbCI6ImFkbWluQGV4YW1wbGUuY29tIiwicm9sZSI6ImFkbWluIn0.token'
    localStorage.setItem('token', token)

    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockShopToken),
    })

    render(<AdminQRCodePage />)

    await waitFor(() => {
      expect(screen.getByAltText('QR Code')).toBeInTheDocument()
      expect(screen.getByText(mockShopToken.token)).toBeInTheDocument()
    })
  })

  it('should handle QR code regeneration', async () => {
    const token =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjMiLCJlbWFpbCI6ImFkbWluQGV4YW1wbGUuY29tIiwicm9sZSI6ImFkbWluIn0.token'
    localStorage.setItem('token', token)

    const newShopToken = {
      ...mockShopToken,
      token: 'new-shop-token-456',
    }

    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockShopToken),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(newShopToken),
      })

    render(<AdminQRCodePage />)

    await waitFor(() => {
      expect(screen.getByText(mockShopToken.token)).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /regenerate/i }))

    await waitFor(() => {
      expect(screen.getByText(newShopToken.token)).toBeInTheDocument()
      expect(mockToast.toast).toHaveBeenCalledWith({
        title: 'Success',
        description: 'QR code regenerated successfully',
      })
    })
  })

  it('should redirect to login if no token', () => {
    render(<AdminQRCodePage />)
    expect(mockRouter.push).toHaveBeenCalledWith('/login')
  })

  it('should redirect to login if invalid token', () => {
    localStorage.setItem('token', 'invalid.token')
    render(<AdminQRCodePage />)
    expect(mockRouter.push).toHaveBeenCalledWith('/login')
  })

  it('should redirect to home if user is not admin', () => {
    const token =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjMiLCJlbWFpbCI6InVzZXJAZXhhbXBsZS5jb20iLCJyb2xlIjoidXNlciJ9.token'
    localStorage.setItem('token', token)
    render(<AdminQRCodePage />)
    expect(mockRouter.push).toHaveBeenCalledWith('/')
  })

  it('should handle API errors', async () => {
    const token =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjMiLCJlbWFpbCI6ImFkbWluQGV4YW1wbGUuY29tIiwicm9sZSI6ImFkbWluIn0.token'
    localStorage.setItem('token', token)

    ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('API error'))

    render(<AdminQRCodePage />)

    await waitFor(() => {
      expect(screen.getByText('Error loading QR code')).toBeInTheDocument()
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

    render(<AdminQRCodePage />)

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

    render(<AdminQRCodePage />)

    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith('/')
    })
  })

  it('should handle QR code regeneration error', async () => {
    const token =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjMiLCJlbWFpbCI6ImFkbWluQGV4YW1wbGUuY29tIiwicm9sZSI6ImFkbWluIn0.token'
    localStorage.setItem('token', token)

    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockShopToken),
      })
      .mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ message: 'Failed to regenerate QR code' }),
      })

    render(<AdminQRCodePage />)

    await waitFor(() => {
      expect(screen.getByText(mockShopToken.token)).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /regenerate/i }))

    await waitFor(() => {
      expect(mockToast.toast).toHaveBeenCalledWith({
        title: 'Error',
        description: 'Failed to regenerate QR code',
        variant: 'destructive',
      })
    })
  })
})
