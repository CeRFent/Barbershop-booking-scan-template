"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { GlassCard } from "@/components/ui/glass-card"
import { CursiveLogo } from "@/components/ui/cursive-logo"
import { Navbar } from "@/components/navbar"
import { useToast } from "@/hooks/use-toast"
import { Loader2, AlertCircle, CheckCircle } from "lucide-react"

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()

  useEffect(() => {
    // Check if we have the reset token from the URL
    const resetToken = searchParams?.get("token")

    if (!resetToken) {
      toast({
        title: "Invalid Reset Link",
        description: "This password reset link is invalid or has expired.",
        variant: "destructive",
      })
      router.push("/login")
    }
  }, [searchParams, router, toast])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      setLoading(false)
      return
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long")
      setLoading(false)
      return
    }

    try {
      const resetToken = searchParams?.get("token")
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: resetToken,
          newPassword: password
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to reset password')
      }

      setSuccess(true)
      toast({
        title: "Password Updated",
        description: "Your password has been successfully updated.",
      })

      // Redirect to login after 2 seconds
      setTimeout(() => {
        router.push("/login")
      }, 2000)
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-black text-white">
        <Navbar />
        <div className="pt-24 pb-12 px-4">
          <div className="max-w-md mx-auto">
            <GlassCard>
              <div className="text-center space-y-6">
                <CheckCircle className="w-14 h-14 mx-auto text-green-400" />
                <h2 className="text-xl font-semibold">Password Updated</h2>
                <p className="text-gray-300">
                  Your password has been successfully updated. You will be redirected to the login page.
                </p>
              </div>
            </GlassCard>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />
      <div className="pt-24 pb-12 px-4">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-8">
            <CursiveLogo size="lg" className="mb-4" />
            <h1 className="text-3xl font-bold mb-2">Reset Password</h1>
            <p className="text-gray-400">Enter your new password</p>
          </div>

          <GlassCard>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="password">New Password</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    setError(null)
                  }}
                  className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                  placeholder="Enter new password"
                  minLength={8}
                />
              </div>

              <div>
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value)
                    setError(null)
                  }}
                  className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                  placeholder="Confirm new password"
                  minLength={8}
                />
                {error && (
                  <p className="text-red-400 text-sm mt-2 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {error}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-white text-black hover:bg-gray-200"
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Updating Password...
                  </>
                ) : (
                  "Update Password"
                )}
              </Button>
            </form>
          </GlassCard>
        </div>
      </div>
    </div>
  )
}
