"use client"

import { motion } from "framer-motion"
import { GlassCard } from "@/components/ui/glass-card"
import { Button } from "@/components/ui/button"
import { Navbar } from "@/components/navbar"
import { useToast } from "@/hooks/use-toast"
import { Check, Sparkles, Scissors, Coffee, Star, ShieldCheck, Loader2 } from "lucide-react"
import Link from "next/link"
import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { parseJWT } from "@/lib/jwt-utils"
import { ymdInShopTZ } from "@/lib/timezone"
import { CUTS_PER_MONTH, weekOfMonthFromYMD, cutsForFirstMonth, prorateAmountCents } from "@/lib/subscription-proration"
import { brand } from "@/lib/brand-config"

function PricingPageContent() {
  const [loading, setLoading] = useState(true)
  const [checkingOut, setCheckingOut] = useState(false)
  const [profile, setProfile] = useState<any>(null)
  const [monthlyPrice, setMonthlyPrice] = useState<number | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()

  useEffect(() => {
    fetch("/api/settings/subscription-price")
      .then((r) => r.json())
      .then((data) => { if (data.success) setMonthlyPrice(data.price) })
      .catch(() => {})
  }, [])

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (!token) {
      router.push("/login?redirect=/pricing")
      return
    }

    try {
      const payload = parseJWT(token)
      if (!payload) throw new Error("Invalid token")
      setProfile(payload)
    } catch (e) {
      localStorage.removeItem("token")
      router.push("/login?redirect=/pricing")
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    if (searchParams?.get("checkout") === "cancelled") {
      toast({ title: "Checkout cancelled", description: "No charge was made. You can subscribe anytime." })
      router.replace("/pricing")
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  const handleSubscribe = async () => {
    if (!profile) return
    
    setCheckingOut(true)
    try {
      const token = localStorage.getItem("token")
      
      const res = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ 
          email: profile.email,
          fullName: profile.name,
          userId: profile.userId,
          // phone and referralCode can be added if available in profile/JWT
        })
      })

      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        throw new Error(data.error || "Failed to start checkout")
      }
    } catch (err: any) {
      console.error(err)
      toast({ title: "Checkout failed", description: err.message || "Please try again.", variant: "destructive" })
    } finally {
      setCheckingOut(false)
    }
  }

  const perks = [
    { icon: <Scissors className="w-5 h-5 text-primary" />, text: "4 Premium Haircuts per month" },
    { icon: <Star className="w-5 h-5 text-yellow-400" />, text: "Priority Booking & VIP scheduling" },
    { icon: <Coffee className="w-5 h-5 text-green-400" />, text: "Complementary premium snacks & drinks" },
    { icon: <ShieldCheck className="w-5 h-5 text-purple-400" />, text: "Exclusive member-only events" },
    { icon: <Sparkles className="w-5 h-5 text-orange-400" />, text: "50% off all other services" },
  ]

  // Joining mid-month only gets charged for the cuts still usable before
  // the month resets — same math the checkout session actually charges,
  // shown up front so it isn't a surprise at checkout.
  const weekOfMonth = weekOfMonthFromYMD(ymdInShopTZ())
  const cutsThisMonth = cutsForFirstMonth(weekOfMonth)
  const isProrated = cutsThisMonth < CUTS_PER_MONTH
  const firstMonthPrice = monthlyPrice !== null ? prorateAmountCents(Math.round(monthlyPrice * 100), cutsThisMonth) / 100 : null

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="w-12 h-12 animate-spin text-foreground" />
    </div>
  )

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <div className="pt-32 pb-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-12"
          >
            <h1 className="text-5xl md:text-6xl font-bold mb-6">Upgrade to VIP</h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Join the elite circle of {brand.name} clients and enjoy premium benefits every month.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-1 max-w-2xl mx-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
            >
              <GlassCard className="border-primary/30 relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-primary text-foreground px-4 py-1 text-xs font-bold uppercase tracking-widest rounded-bl-lg">
                  Most Popular
                </div>
                
                <div className="mb-8">
                  <h2 className="text-3xl font-bold mb-2 text-foreground">VIP Membership</h2>
                  {isProrated && firstMonthPrice !== null ? (
                    <>
                      <div className="flex items-baseline justify-center gap-1">
                        <span className="text-5xl font-extrabold">${firstMonthPrice % 1 === 0 ? firstMonthPrice : firstMonthPrice.toFixed(2)}</span>
                        <span className="text-muted-foreground">first month</span>
                      </div>
                      <p className="text-sm text-primary mt-2">
                        Prorated for {cutsThisMonth} cut{cutsThisMonth === 1 ? "" : "s"} left this month — then ${monthlyPrice}/month from the 1st
                      </p>
                    </>
                  ) : (
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-5xl font-extrabold">${monthlyPrice ?? 150}</span>
                      <span className="text-muted-foreground">/month</span>
                    </div>
                  )}
                </div>

                <div className="space-y-4 mb-10 text-left max-w-sm mx-auto">
                  {perks.map((perk, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="shrink-0">{perk.icon}</div>
                      <span className="text-gray-300">{perk.text}</span>
                    </div>
                  ))}
                </div>

                <Button 
                  onClick={handleSubscribe}
                  disabled={checkingOut}
                  className="w-full bg-primary hover:bg-primary text-foreground py-8 text-xl font-bold rounded-xl shadow-[0_0_20px_hsl(var(--primary)/0.3)] transition-all hover:scale-[1.02]"
                >
                  {checkingOut ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : "Subscribe Now"}
                </Button>
                
                <p className="mt-4 text-xs text-gray-500">
                  Cancel anytime. Monthly auto-renewal applies.
                </p>
              </GlassCard>
            </motion.div>
          </div>

          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-12"
          >
            <Link href="/dashboard" className="text-gray-500 hover:text-foreground transition-colors">
              Continue as Regular Client
            </Link>
          </motion.div>
        </div>
      </div>
    </div>
  )
}

export default function PricingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <Loader2 className="w-12 h-12 animate-spin text-foreground" />
        </div>
      }
    >
      <PricingPageContent />
    </Suspense>
  )
}

