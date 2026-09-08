"use client"

import type React from "react"

import { useState, useEffect, Suspense } from "react"
import { Loader2 } from "lucide-react"
import { motion } from "framer-motion"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { GlassCard } from "@/components/ui/glass-card"
import { CursiveLogo } from "@/components/ui/cursive-logo"
import { Navbar } from "@/components/navbar"
import { useToast } from "@/hooks/use-toast"
import { AlertCircle } from "lucide-react"
import Cookies from 'js-cookie'
import { brand } from "@/lib/brand-config"

function LoginPageContent() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  })
  const [loading, setLoading] = useState(false)
  const [loginError, setLoginError] = useState<string | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()

  // A few flows send an unauthenticated visitor here with ?redirect=<path>
  // (subscribing from /pricing, scanning a QR code while logged out) —
  // stash it the same way the /book flow already does via sessionStorage,
  // so one redirect mechanism covers both paths instead of two competing
  // ones landing everyone back on the homepage.
  useEffect(() => {
    const redirect = searchParams?.get("redirect")
    if (redirect) sessionStorage.setItem("postAuthRedirect", redirect)
  }, [searchParams])

  useEffect(() => {
    // Check if we're in the browser
    if (typeof window === 'undefined') return

    // Check if user is already logged in by looking for the token
    const token = localStorage.getItem('token')
    if (!token) return

    // This used to just decode the JWT payload client-side and trust it —
    // but decoding never verifies the signature, so an expired or
    // tampered/invalid token (payload still valid JSON) looked exactly like
    // a real logged-in session and bounced the visitor straight back out,
    // never letting them see the login form at all. That's precisely the
    // token an expired/invalid-session redirect (see app/book/page.tsx)
    // sends here on purpose, so it must actually verify with the server —
    // matching /api/auth/me's real verifyToken() check — before deciding
    // whether to skip the form.
    ;(async () => {
      try {
        const res = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) {
          localStorage.removeItem('token')
          Cookies.remove('token')
          return
        }
        const userData = await res.json()

        // Redirect based on user role
        if (userData.role === 'admin') {
          router.push("/admin")
        } else {
          const postAuthRedirect = sessionStorage.getItem('postAuthRedirect')
          if (postAuthRedirect) {
            sessionStorage.removeItem('postAuthRedirect')
            router.push(postAuthRedirect)
          } else {
            router.push("/")
          }
        }
      } catch (error) {
        console.error('Error verifying existing session:', error)
      }
    })()
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setLoginError(null)

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          setLoginError("Invalid email or password. Please try again.");
        } else {
          setLoginError(data.message || "An error occurred during login.");
        }
        return;
      }

      // Save token to localStorage for client-side use
      localStorage.setItem('token', data.token);
      
      // Note: Cookie is set by the API with httpOnly: true for middleware security
      // We don't set it again here with js-cookie to avoid conflicts

      toast({
        title: "Welcome back!",
        description: `Successfully signed in to ${brand.name}.`,
      });

      // Parse the JWT token to get user role
      const base64Url = data.token.split('.')[1]
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
      }).join(''))

      const userData = JSON.parse(jsonPayload)

      // Tie this browser to the account for push notifications, same moment
      // the JWT gets stored above. init() alone never shows the browser's
      // permission prompt — it has to be requested explicitly, so do that
      // here too. Admins get this now too — the shop tablet/phone needs to
      // be allowed to receive "new booking" notifications.
      if (typeof window !== 'undefined' && (window as any).OneSignalDeferred) {
        ;(window as any).OneSignalDeferred.push(async function (OneSignal: any) {
          await OneSignal.login(userData.userId)
          OneSignal.Notifications.requestPermission()
        })
      }

      // Redirect based on user role
      if (userData.role === 'admin') {
        // Force a full page reload for admin to ensure middleware and navbar state are fresh
        window.location.href = "/admin"
      } else {
        // If we got sent here mid-booking (e.g. from /book), go back to
        // finish that instead of dropping the customer on the homepage.
        const postAuthRedirect = sessionStorage.getItem('postAuthRedirect')
        if (postAuthRedirect) {
          sessionStorage.removeItem('postAuthRedirect')
          router.push(postAuthRedirect)
        } else {
          router.push("/")
        }
        router.refresh();
      }
    } catch (error: any) {
      setLoginError("An unexpected error occurred. Please try again.")
      console.error("Unexpected login error:", error)
    } finally {
      setLoading(false)
    }
  }


  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      <div className="pt-24 pb-12 px-4">
        <div className="max-w-md mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-8"
          >
            <CursiveLogo size="lg" className="mb-4" />
            <h1 className="text-3xl font-bold mb-2">Welcome Back</h1>
            <p className="text-muted-foreground">Sign in to your {brand.name} account</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <GlassCard>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => {
                      setFormData((prev) => ({ ...prev, email: e.target.value }))
                      setLoginError(null)
                    }}
                    className="bg-foreground/10 border-foreground/20 text-foreground placeholder:text-muted-foreground"
                    placeholder="Enter your email"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    <Link href="/auth/forgot-password" className="text-xs text-muted-foreground hover:text-foreground underline">
                      Forgot password?
                    </Link>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    required
                    value={formData.password}
                    onChange={(e) => {
                      setFormData((prev) => ({ ...prev, password: e.target.value }))
                      setLoginError(null)
                    }}
                    className="bg-foreground/10 border-foreground/20 text-foreground placeholder:text-muted-foreground"
                    placeholder="Enter your password"
                  />
                  {loginError && (
                    <p className="text-red-400 text-sm mt-2 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {loginError}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-foreground text-background hover:bg-foreground/90"
                  size="lg"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Signing In...
                    </>
                  ) : (
                    "Sign In"
                  )}
                </Button>

                <div className="text-center text-sm">
                  <span className="text-muted-foreground">Don't have an account? </span>
                  <Link
                    href="/signup"
                    className="text-foreground hover:text-gray-300 underline"
                  >
                    Create account
                  </Link>
                </div>
              </form>
            </GlassCard>
          </motion.div>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      }
    >
      <LoginPageContent />
    </Suspense>
  )
}
