"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { GlassCard } from "@/components/ui/glass-card"
import { CursiveLogo } from "@/components/ui/cursive-logo"
import { Navbar } from "@/components/navbar"
import { Loader2, MailCheck } from "lucide-react"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
    } catch {
      // Show the same confirmation either way — this page never reveals
      // whether the email is a registered account.
    } finally {
      setLoading(false)
      setSubmitted(true)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-black text-white">
        <Navbar />
        <div className="pt-24 pb-12 px-4">
          <div className="max-w-md mx-auto">
            <GlassCard>
              <div className="text-center space-y-6">
                <MailCheck className="w-14 h-14 mx-auto text-green-400" />
                <h2 className="text-xl font-semibold">Check your email</h2>
                <p className="text-gray-300">
                  If an account exists for <span className="text-white">{email}</span>, we've sent instructions to
                  reset your password. The link expires in 30 minutes.
                </p>
                <Link href="/login" className="text-sm text-gray-400 hover:text-white underline block">
                  Back to sign in
                </Link>
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
            <h1 className="text-3xl font-bold mb-2">Forgot Password</h1>
            <p className="text-gray-400">Enter your email and we'll send you a reset link</p>
          </div>

          <GlassCard>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                  placeholder="Enter your email"
                />
              </div>

              <Button type="submit" disabled={loading} className="w-full bg-white text-black hover:bg-gray-200" size="lg">
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Send Reset Link"
                )}
              </Button>

              <div className="text-center text-sm">
                <Link href="/login" className="text-gray-400 hover:text-white underline">
                  Back to sign in
                </Link>
              </div>
            </form>
          </GlassCard>
        </div>
      </div>
    </div>
  )
}
