"use client"

import { useState, useEffect } from "react"
import { motion } from "@/lib/motion"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { CursiveLogo } from "@/components/ui/cursive-logo"
import { Menu, X, ImageIcon, User, LogOut, Calendar, Stethoscope } from "lucide-react"
import { parseJWT, getToken, logout } from "@/lib/jwt-utils"

interface UserData {
  id: string;
  email: string;
  name: string;
  role: string;
  permissions?: string[];
}

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const [user, setUser] = useState<UserData | null>(null)
  const [isScrolled, setIsScrolled] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  // Function to check auth status
  const checkAuth = () => {
    if (typeof window === 'undefined') return

    const token = getToken()
    if (token) {
      try {
        const userData = parseJWT(token)
        if (userData) {
          setUser({
            id: userData.userId,
            email: userData.email,
            name: userData.name || userData.email,
            role: userData.role,
            permissions: userData.permissions
          })
        } else {
          setUser(null)
        }
      } catch (error) {
        setUser(null)
      }
    } else {
      setUser(null)
    }
  }

  useEffect(() => {
    checkAuth()

    const handleScroll = () => {
      const scrollTop = window.scrollY
      setIsScrolled(scrollTop > 50)
    }

    window.addEventListener('scroll', handleScroll)
    window.addEventListener('storage', checkAuth)

    return () => {
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('storage', checkAuth)
    }
  }, [pathname])

  const handleSignOut = async () => {
    setIsOpen(false)
    await logout()
  }

  const navItems = [
    { href: "/gallery", label: "Gallery", icon: ImageIcon },
    { href: "/akn", label: "AKN", icon: Stethoscope },
    ...(!user || user.role !== "admin" ? [{ href: "/book", label: "Book", icon: Calendar }] : []),
    ...(user
      ? user.role === "admin"
        ? [{ href: "/admin", label: "Admin", icon: User }]
        : [{ href: "/dashboard", label: "Dashboard", icon: User }]
      : []),
  ]

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      isScrolled
        ? 'bg-gradient-to-b from-background/80 via-background/70 to-background/60 backdrop-blur-lg border-b border-foreground/20 shadow-lg'
        : 'bg-transparent backdrop-blur-sm'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex-shrink-0">
            <CursiveLogo size="sm" />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center space-x-2 text-sm font-medium transition-colors hover:text-foreground drop-shadow-sm ${
                  pathname === item.href ? "text-foreground" : "text-gray-300"
                }`}
              >
                <item.icon className="w-4 h-4" />
                <span>{item.label}</span>
              </Link>
            ))}

            {user ? (
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-300 drop-shadow-sm">Welcome, {user.name}</span>
                <Button onClick={handleSignOut} variant="ghost" size="sm" className="text-gray-300 hover:text-foreground">
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <Button asChild variant="ghost" size="sm" className="text-gray-300 hover:text-foreground">
                  <Link href="/login">Sign In</Link>
                </Button>
                <Button asChild size="sm" className="bg-foreground text-background hover:bg-foreground/90">
                  <Link href="/signup">Subscribe</Link>
                </Button>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(!isOpen)}
              className="text-foreground hover:text-gray-300"
            >
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className={`md:hidden backdrop-blur-md border-b border-foreground/10 ${
            isScrolled ? 'bg-background/95' : 'bg-background/70'
          }`}
        >
          <div className="px-4 py-4 space-y-4">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={`flex items-center space-x-3 text-base font-medium transition-colors hover:text-foreground ${
                  pathname === item.href ? "text-foreground" : "text-gray-300"
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
              </Link>
            ))}

            {user ? (
              <div className="pt-4 border-t border-foreground/10 space-y-4">
                <div className="text-sm text-gray-300">Welcome, {user.name}</div>
                <Button
                  onClick={handleSignOut}
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-gray-300 hover:text-foreground"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            ) : (
              <div className="pt-4 border-t border-foreground/10 space-y-3">
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-gray-300 hover:text-foreground"
                  onClick={() => setIsOpen(false)}
                >
                  <Link href="/login">Sign In</Link>
                </Button>
                <Button
                  asChild
                  size="sm"
                  className="w-full bg-foreground text-background hover:bg-foreground/90"
                  onClick={() => setIsOpen(false)}
                >
                  <Link href="/signup">Subscribe</Link>
                </Button>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </nav>
  )
}
