import { render, screen, fireEvent } from '@testing-library/react'
import Navbar from './navbar'
import { mockRouter, mockPathname, mockLocalStorage } from '@/test/test-utils'
import Cookies from 'js-cookie'
import { brand } from '@/lib/brand-config'

jest.mock('js-cookie', () => ({
  get: jest.fn(),
  set: jest.fn(),
  remove: jest.fn(),
}))

describe('Navbar', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRouter.push.mockClear()
    mockPathname.mockReturnValue('/')
    Object.defineProperty(window, 'localStorage', { value: mockLocalStorage() })
  })

  it('renders logo and navigation items', () => {
    render(<Navbar />)
    expect(screen.getByText(new RegExp(brand.name, 'i'))).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /home/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /gallery/i })).toBeInTheDocument()
  })

  it('shows sign in and subscribe buttons when not logged in', () => {
    render(<Navbar />)
    expect(screen.getByRole('link', { name: /sign in/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /subscribe/i })).toBeInTheDocument()
  })

  it('shows user menu when logged in as regular user', () => {
    localStorage.setItem('token', 'mock.jwt.token')
    Cookies.get.mockReturnValue('mock.jwt.token')

    render(<Navbar />)
    expect(screen.getByRole('button', { name: /user menu/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /dashboard/i })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /admin/i })).not.toBeInTheDocument()
  })

  it('shows admin menu when logged in as admin', () => {
    localStorage.setItem('token', 'mock.jwt.token')
    Cookies.get.mockReturnValue('mock.jwt.token')

    render(<Navbar />)
    expect(screen.getByRole('button', { name: /admin menu/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /admin dashboard/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /users/i })).toBeInTheDocument()
  })

  it('handles sign out', () => {
    localStorage.setItem('token', 'mock.jwt.token')
    Cookies.get.mockReturnValue('mock.jwt.token')

    render(<Navbar />)
    fireEvent.click(screen.getByRole('button', { name: /sign out/i }))

    expect(localStorage.removeItem).toHaveBeenCalledWith('token')
    expect(Cookies.remove).toHaveBeenCalledWith('token')
    expect(mockRouter.push).toHaveBeenCalledWith('/login')
  })

  it('handles mobile menu toggle', () => {
    render(<Navbar />)
    const menuButton = screen.getByRole('button', { name: /toggle menu/i })

    fireEvent.click(menuButton)
    expect(screen.getByRole('navigation')).toHaveClass('block')

    fireEvent.click(menuButton)
    expect(screen.getByRole('navigation')).toHaveClass('hidden')
  })

  it('closes mobile menu when clicking a link', () => {
    render(<Navbar />)
    const menuButton = screen.getByRole('button', { name: /toggle menu/i })

    fireEvent.click(menuButton)
    expect(screen.getByRole('navigation')).toHaveClass('block')

    fireEvent.click(screen.getByRole('link', { name: /home/i }))
    expect(screen.getByRole('navigation')).toHaveClass('hidden')
  })

  it('handles invalid token', () => {
    localStorage.setItem('token', 'invalid.token')
    Cookies.get.mockReturnValue('invalid.token')

    render(<Navbar />)
    expect(localStorage.removeItem).toHaveBeenCalledWith('token')
    expect(Cookies.remove).toHaveBeenCalledWith('token')
  })

  it('highlights current page in navigation', () => {
    mockPathname.mockReturnValue('/gallery')
    render(<Navbar />)

    const homeLink = screen.getByRole('link', { name: /home/i })
    const galleryLink = screen.getByRole('link', { name: /gallery/i })

    expect(homeLink).not.toHaveClass('text-primary')
    expect(galleryLink).toHaveClass('text-primary')
  })
})
