"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { GlassCard } from "@/components/ui/glass-card"
import { Navbar } from "@/components/navbar"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { parseJWT } from "@/lib/jwt-utils"
import { Loader2, Settings as SettingsIcon, DollarSign } from "lucide-react"
import { prorateAmountCents } from "@/lib/subscription-proration"

// Cents-precise, matching exactly what checkout charges — same shared
// function used server-side and on /pricing, not a separate whole-dollar
// approximation that could drift from the real charge (e.g. rounding
// $150/4 = $37.50 up to "$38" would be misleading here).
function formatProrated(basePriceDollars: number, cuts: number) {
  const cents = prorateAmountCents(Math.round(basePriceDollars * 100), cuts)
  return (cents / 100).toFixed(2)
}

export default function AdminSettingsPage() {
  const [authLoading, setAuthLoading] = useState(true)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [currentPrice, setCurrentPrice] = useState<number | null>(null)
  const [priceInput, setPriceInput] = useState("")
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (!token) { router.push("/login"); return }

    try {
      const userData = parseJWT(token)
      if (!userData || userData.role !== "admin") {
        toast({ title: "Access Denied", description: "You don't have permission to access this page.", variant: "destructive" })
        router.push("/dashboard")
        return
      }
      setAuthLoading(false)
    } catch {
      localStorage.removeItem("token")
      router.push("/login")
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (authLoading) return
    const token = localStorage.getItem("token")
    fetch("/api/admin/settings", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setCurrentPrice(data.subscriptionMonthlyPrice)
          setPriceInput(String(data.subscriptionMonthlyPrice))
        } else {
          toast({ title: "Couldn't load settings", description: data.error, variant: "destructive" })
        }
      })
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading])

  const previewPrice = Number(priceInput) || 0

  const savePrice = async (e: React.FormEvent) => {
    e.preventDefault()
    const price = Number(priceInput)
    if (!Number.isFinite(price) || price < 1 || price > 2000) {
      toast({ title: "Invalid price", description: "Enter a number between $1 and $2000.", variant: "destructive" })
      return
    }

    if (
      !window.confirm(
        `Change the VIP subscription price to $${price}/month?\n\nThis takes effect immediately for new signups and their first-month proration. Existing subscribers already paying $${currentPrice}/month keep their current price until they cancel and resubscribe.`
      )
    ) {
      return
    }

    setSaving(true)
    try {
      const token = localStorage.getItem("token")
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ subscriptionMonthlyPrice: price }),
      })
      const data = await res.json()
      if (!data.success) {
        toast({ title: "Couldn't save", description: data.error, variant: "destructive" })
        return
      }
      setCurrentPrice(data.subscriptionMonthlyPrice)
      toast({ title: "Price updated", description: `New signups are now charged $${data.subscriptionMonthlyPrice}/month.` })
    } catch {
      toast({ title: "Error", description: "Something went wrong.", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      <Navbar />
      <div className="pt-24 px-4 max-w-xl mx-auto">
        <div className="mb-8 text-center">
          <SettingsIcon className="w-12 h-12 mx-auto mb-4 text-white" />
          <h1 className="text-3xl font-bold mb-2">Subscription Settings</h1>
          <p className="text-gray-400">Controls what new VIP signups are charged, and their first-month proration.</p>
        </div>

        <GlassCard>
          <form onSubmit={savePrice} className="space-y-4">
            <div>
              <Label htmlFor="price" className="text-gray-400 mb-1 block">Monthly Price</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input
                  id="price"
                  type="number"
                  min="1"
                  max="2000"
                  step="1"
                  value={priceInput}
                  onChange={(e) => setPriceInput(e.target.value)}
                  className="bg-white/5 border-white/10 pl-9"
                />
              </div>
              <p className="text-sm text-gray-500 mt-2">
                4 cuts per month at this price. A customer joining mid-month is automatically prorated —
                3 cuts for ${formatProrated(previewPrice, 3)} in week 2, 2 cuts for ${formatProrated(previewPrice, 2)} in
                week 3, 1 cut for ${formatProrated(previewPrice, 1)} in week 4 — then the full price from the 1st of the
                next month.
              </p>
            </div>

            <Button type="submit" disabled={saving || priceInput === String(currentPrice)} className="w-full bg-white text-black hover:bg-gray-200">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Price"}
            </Button>
          </form>
        </GlassCard>

        <p className="text-xs text-gray-600 mt-6 text-center">
          This does not change existing subscribers' price — Stripe subscriptions already in progress keep billing at whatever they signed up at.
        </p>
      </div>
    </div>
  )
}
