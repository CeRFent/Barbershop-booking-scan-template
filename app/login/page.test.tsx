import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LoginPage from './page'
import Cookies from 'js-cookie'
import { useToast } from '@/hooks/use-toast'
import { useRouter } from 'next/navigation'
import { mockFetch, mockLocalStorage } from '@/test/test-utils'

jest.mock('js-cookie', () => ({
  get: jest.fn(),
  set: jest.fn(),
  remove: jest.fn(),
}))

describe('LoginPage', () => {
  const mockToast = { toast: jest.fn() }
  const mockRouter = { push: jest.fn(), refresh: jest.fn(), replace: jest.fn() }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue(mockRouter)
    ;(useToast as jest.Mock).mockReturnValue(mockToast)
    Object.defineProperty(window, 'localStorage', { value: mockLocalStorage() })
    global.fetch = jest.fn()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  afterAll(() => {
    jest.restoreAllMocks()
  })

  it('renders login form', async () => {
    render(<LoginPage />)
    expect(screen.getByPlaceholderText(/email/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })

  it('handles successful admin login', async () => {
    const user = userEvent.setup()
    const mockPayload = {
      role: 'admin',
      exp: Math.floor(Date.now() / 1000) + 3600,
    }
    const mockBase64Payload = Buffer.from(JSON.stringify(mockPayload)).toString('base64')
    const mockJWT = `header.${mockBase64Payload}.signature`

    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ token: mockJWT, role: 'admin' }),
    })

    render(<LoginPage />)

    await user.type(screen.getByLabelText(/email/i), 'admin@example.com')
    await user.type(screen.getByLabelText(/password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(localStorage.setItem).toHaveBeenCalledWith('token', mockJWT)
      expect(Cookies.set).toHaveBeenCalledWith('token', mockJWT, { expires: 7 })
      expect(mockRouter.push).toHaveBeenCalledWith('/admin')
    })
  })

  it('handles successful user login', async () => {
    const user = userEvent.setup()
    const mockPayload = {
      role: 'user',
      exp: Math.floor(Date.now() / 1000) + 3600,
    }
    const mockBase64Payload = Buffer.from(JSON.stringify(mockPayload)).toString('base64')
    const mockJWT = `header.${mockBase64Payload}.signature`

    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ token: mockJWT, role: 'user' }),
    })

    render(<LoginPage />)

    await user.type(screen.getByLabelText(/email/i), 'user@example.com')
    await user.type(screen.getByLabelText(/password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(localStorage.setItem).toHaveBeenCalledWith('token', mockJWT)
      expect(Cookies.set).toHaveBeenCalledWith('token', mockJWT, { expires: 7 })
      expect(mockRouter.push).toHaveBeenCalledWith('/')
    })
  })

  it('handles login failure', async () => {
    const user = userEvent.setup()
    mockFetch({ error: 'Invalid credentials' }, 401)

    render(<LoginPage />)

    await user.type(screen.getByLabelText(/email/i), 'invalid@example.com')
    await user.type(screen.getByLabelText(/password/i), 'wrongpassword')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(screen.getByText('Invalid email or password. Please try again.')).toBeInTheDocument()
      expect(localStorage.setItem).not.toHaveBeenCalled()
      expect(Cookies.set).not.toHaveBeenCalled()
      expect(mockRouter.push).not.toHaveBeenCalled()
    })
  })

  it('handles network error', async () => {
    const user = userEvent.setup()
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error'))

    render(<LoginPage />)

    await user.type(screen.getByLabelText(/email/i), 'user@example.com')
    await user.type(screen.getByLabelText(/password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(screen.getByText('An unexpected error occurred. Please try again.')).toBeInTheDocument()
      expect(localStorage.setItem).not.toHaveBeenCalled()
      expect(Cookies.set).not.toHaveBeenCalled()
      expect(mockRouter.push).not.toHaveBeenCalled()
    })
  })

  it('toggles password reset form', async () => {
    const user = userEvent.setup()
    render(<LoginPage />)

    await user.click(screen.getByRole('button', { name: /forgot your password/i }))

    expect(screen.getByPlaceholderText(/enter your email/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /send reset link/i })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /back to login/i }))

    expect(screen.getByPlaceholderText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })

  it('handles password reset request', async () => {
    const user = userEvent.setup()
    mockFetch({ message: 'Password reset email sent' })

    render(<LoginPage />)

    await user.click(screen.getByRole('button', { name: /forgot your password/i }))

    await user.type(screen.getByPlaceholderText(/enter your email/i), 'user@example.com')
    await user.click(screen.getByRole('button', { name: /send reset link/i }))

    await waitFor(() => {
      expect(mockToast.toast).toHaveBeenCalledWith({
        title: 'Password Reset Email Sent',
        description: 'Check your email (user@example.com) for the password reset link.',
      })
    })
  })

  it('handles password reset failure', async () => {
    const user = userEvent.setup()
    mockFetch({ error: 'Email not found' }, 404)

    render(<LoginPage />)

    await user.click(screen.getByRole('button', { name: /forgot your password/i }))

    await user.type(screen.getByPlaceholderText(/enter your email/i), 'nonexistent@example.com')
    await user.click(screen.getByRole('button', { name: /send reset link/i }))

    await waitFor(() => {
      expect(mockToast.toast).toHaveBeenCalledWith({
        title: 'Error',
        description: 'Failed to send reset email',
        variant: 'destructive',
      })
    })
  })

  it('checks for existing token on mount', () => {
    const mockPayload = {
      role: 'user',
      exp: Math.floor(Date.now() / 1000) + 3600,
    }
    const mockBase64Payload = Buffer.from(JSON.stringify(mockPayload)).toString('base64')
    const mockJWT = `header.${mockBase64Payload}.signature`

    localStorage.setItem('token', mockJWT)
    ;(Cookies.get as jest.Mock).mockReturnValue(mockJWT)

    render(<LoginPage />)

    expect(mockRouter.push).toHaveBeenCalledWith('/')
  })

  it('handles invalid token on mount', () => {
    localStorage.setItem('token', 'invalid.token')
    ;(Cookies.get as jest.Mock).mockReturnValue('invalid.token')

    render(<LoginPage />)

    expect(localStorage.removeItem).toHaveBeenCalledWith('token')
    expect(Cookies.remove).toHaveBeenCalledWith('token')
  })
})
