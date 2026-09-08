"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { GlassCard } from "@/components/ui/glass-card"
import { Button } from "@/components/ui/button"
import { Navbar } from "@/components/navbar"
import { useToast } from "@/hooks/use-toast"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  Scissors, QrCode, Calendar, AlertTriangle, Loader2, Sparkles,
  TrendingUp, History, Star, ArrowRight, Check, CreditCard, Clock, User,
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { parseJWT } from "@/lib/jwt-utils"
import { ymdInShopTZ } from "@/lib/timezone"
import { brand } from "@/lib/brand-config"

function formatTime12h(time: string) {
  const [h, m] = time.split(":").map(Number)
  const period = h >= 12 ? "PM" : "AM"
  const hour12 = h % 12 === 0 ? 12 : h % 12
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`
}

export default function DashboardPage() {
  const [profile, setProfile] = useState<any>(null)
  const [cuts, setCuts] = useState<any[]>([])
  const [visits, setVisits] = useState<any[]>([])
  const [bookings, setBookings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [subscription, setSubscription] = useState<any>(null)
  const [portalLoading, setPortalLoading] = useState(false)
  const [monthlyPrice, setMonthlyPrice] = useState<number | null>(null)

  // Cancel-booking confirmation
  const [cancelTarget, setCancelTarget] = useState<any>(null)
  const [cancelling, setCancelling] = useState(false)

  // Reschedule dialog
  const [rescheduleTarget, setRescheduleTarget] = useState<any>(null)
  const [rescheduleDate, setRescheduleDate] = useState(ymdInShopTZ())
  const [rescheduleSlots, setRescheduleSlots] = useState<string[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [rescheduling, setRescheduling] = useState(false)

  const { toast } = useToast()
  const router = useRouter()

  const expireSession = useCallback((message?: string) => {
    localStorage.removeItem("token")
    if (message) {
      toast({ title: "Session expired", description: message, variant: "destructive" })
    }
    router.push("/login")
  }, [router, toast])

  const loadDashboard = useCallback(async () => {
    const token = localStorage.getItem("token")
    if (!token) { router.push("/login"); return }

    try {
      const payload = parseJWT(token)
      if (!payload) { expireSession(); return }
      if (payload.role === "admin") { router.push("/admin"); return }
      setProfile(payload)

      const [cutsRes, subRes, visitsRes, bookingsRes] = await Promise.all([
        fetch(`/api/user/cuts/${payload.userId}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/user/subscription-status/${payload.userId}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/user/visits/${payload.userId}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/bookings`, { headers: { Authorization: `Bearer ${token}` } }),
      ])

      // A 401 from an authenticated endpoint means the token itself is no
      // longer valid (expired/rotated secret) — not just missing data.
      if (cutsRes.status === 401 || subRes.status === 401 || visitsRes.status === 401 || bookingsRes.status === 401) {
        expireSession("Please sign in again to continue.")
        return
      }

      if (cutsRes.ok) setCuts((await cutsRes.json()).cuts)
      if (subRes.ok) setSubscription((await subRes.json()).subscriptionStatus)
      if (visitsRes.ok) {
        const visitsData = await visitsRes.json()
        setVisits(visitsData.visits || [])
      }
      if (bookingsRes.ok) {
        const bookingsData = await bookingsRes.json()
        setBookings(bookingsData.bookings || [])
      }
    } catch (e) {
      expireSession()
    } finally {
      setLoading(false)
    }
  }, [router, expireSession])

  useEffect(() => {
    loadDashboard()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    fetch("/api/settings/subscription-price")
      .then((r) => r.json())
      .then((data) => { if (data.success) setMonthlyPrice(data.price) })
      .catch(() => {})
  }, [])

  const isVIP = subscription?.status === "active"
  const isPastDue = subscription?.status === "past_due"
  const availableCuts = cuts.filter(c => c.status === "available").length

  const upcomingBookings = bookings
    .filter(b => b.status === "confirmed" || b.status === "pending_payment")
    .sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime))

  const onboardingSteps = [
    { id: 1, title: "Create Account", completed: true, desc: "Welcome to the family!" },
    { id: 2, title: "Subscribe to VIP", completed: isVIP, desc: "Get 4 cuts/mo & exclusive perks", link: "/pricing" },
    { id: 3, title: "Make your first scan", completed: (profile?.totalVisits || 0) > 0, desc: "Scan at the shop to check-in", link: "/scan" },
  ]

  const openBillingPortal = async () => {
    const token = localStorage.getItem("token")
    if (!token) { expireSession(); return }
    setPortalLoading(true)
    try {
      const res = await fetch("/api/billing-portal", { method: "POST", headers: { Authorization: `Bearer ${token}` } })
      const data = await res.json()
      if (res.status === 401) { expireSession("Please sign in again to continue."); return }
      if (!data.success || !data.url) {
        toast({ title: "Couldn't open billing", description: data.error || "Please try again shortly.", variant: "destructive" })
        return
      }
      window.location.href = data.url
    } catch {
      toast({ title: "Error", description: "Something went wrong opening billing.", variant: "destructive" })
    } finally {
      setPortalLoading(false)
    }
  }

  const confirmCancelBooking = async () => {
    if (!cancelTarget) return
    const token = localStorage.getItem("token")
    if (!token) { expireSession(); return }
    setCancelling(true)
    try {
      const res = await fetch(`/api/bookings/${cancelTarget._id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } })
      const data = await res.json()
      if (res.status === 401) { expireSession("Please sign in again to continue."); return }
      if (!data.success) {
        toast({ title: "Couldn't cancel", description: data.error || "Please try again.", variant: "destructive" })
        return
      }
      toast({ title: "Appointment cancelled" })
      setCancelTarget(null)
      loadDashboard()
    } catch {
      toast({ title: "Error", description: "Something went wrong.", variant: "destructive" })
    } finally {
      setCancelling(false)
    }
  }

  const openReschedule = (booking: any) => {
    setRescheduleTarget(booking)
    setRescheduleDate(booking.date)
    fetchRescheduleSlots(booking._id, booking.date)
  }

  const fetchRescheduleSlots = async (bookingId: string, date: string) => {
    setLoadingSlots(true)
    const token = localStorage.getItem("token")
    try {
      const res = await fetch(`/api/bookings/${bookingId}?date=${date}`, { headers: { Authorization: `Bearer ${token}` } })
      const data = await res.json()
      if (res.status === 401) { expireSession("Please sign in again to continue."); return }
      setRescheduleSlots(data.success ? data.slots || [] : [])
    } catch {
      setRescheduleSlots([])
    } finally {
      setLoadingSlots(false)
    }
  }

  const changeRescheduleDate = (date: string) => {
    setRescheduleDate(date)
    if (rescheduleTarget) fetchRescheduleSlots(rescheduleTarget._id, date)
  }

  const commitReschedule = async (time: string) => {
    if (!rescheduleTarget) return
    const token = localStorage.getItem("token")
    if (!token) { expireSession(); return }
    setRescheduling(true)
    try {
      const res = await fetch(`/api/bookings/${rescheduleTarget._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ date: rescheduleDate, startTime: time }),
      })
      const data = await res.json()
      if (res.status === 401) { expireSession("Please sign in again to continue."); return }
      if (!data.success) {
        toast({ title: "That time didn't work", description: data.error || "Please pick another.", variant: "destructive" })
        fetchRescheduleSlots(rescheduleTarget._id, rescheduleDate)
        return
      }
      toast({ title: "Appointment rescheduled" })
      setRescheduleTarget(null)
      loadDashboard()
    } catch {
      toast({ title: "Error", description: "Something went wrong.", variant: "destructive" })
    } finally {
      setRescheduling(false)
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground pb-24">
      <Navbar />
      <div className="pt-24 px-4 max-w-6xl mx-auto">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-12">
          <div className="flex items-center gap-3 mb-2">
            {loading ? (
              <Skeleton className="h-12 w-64" />
            ) : (
              <>
                <h1 className="text-4xl md:text-5xl font-bold">Hello, {profile?.name?.split(" ")[0]}!</h1>
                {isVIP && (
                  <div className="bg-primary text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tighter flex items-center gap-1">
                    <Star className="w-2 h-2 fill-foreground" /> VIP
                  </div>
                )}
              </>
            )}
          </div>
          <p className="text-muted-foreground">Welcome to your {brand.name} dashboard</p>
        </motion.div>

        {/* Past-due warning — a customer who already pays, not a free user */}
        {!loading && isPastDue && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <GlassCard className="border-amber-500/40 bg-amber-500/5">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="p-3 bg-amber-500/20 rounded-xl shrink-0">
                  <AlertTriangle className="w-6 h-6 text-amber-400" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-amber-300">Your last payment didn't go through</p>
                  <p className="text-sm text-gray-300">
                    Your VIP membership is on hold until this is fixed. Update your payment method to keep your cuts active.
                  </p>
                </div>
                <Button
                  onClick={openBillingPortal}
                  disabled={portalLoading}
                  className="bg-amber-500 hover:bg-amber-600 text-background font-bold shrink-0"
                >
                  {portalLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                  Update Payment Method
                </Button>
              </div>
            </GlassCard>
          </motion.div>
        )}

        {/* Stats Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {loading ? (
            [1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full" />)
          ) : (
            <>
              <GlassCard className={isVIP ? "border-primary/20" : "border-foreground/10 opacity-60"}>
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl ${isVIP ? "bg-primary/20" : "bg-foreground/5"}`}><Scissors className={`w-6 h-6 ${isVIP ? "text-primary" : "text-muted-foreground"}`} /></div>
                  <div>
                    <p className="text-2xl font-bold">{isVIP ? availableCuts : "0"}</p>
                    <p className="text-sm text-muted-foreground font-medium">Available Cuts</p>
                  </div>
                </div>
              </GlassCard>

              <GlassCard className={isVIP ? "border-green-500/20" : isPastDue ? "border-amber-500/30" : "border-foreground/10"}>
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl ${isVIP ? "bg-green-500/20" : isPastDue ? "bg-amber-500/20" : "bg-foreground/5"}`}>
                    {isPastDue ? <AlertTriangle className="w-6 h-6 text-amber-400" /> : <TrendingUp className={`w-6 h-6 ${isVIP ? "text-green-400" : "text-muted-foreground"}`} />}
                  </div>
                  <div>
                    <p className={`text-2xl font-bold ${isVIP ? "text-green-400" : isPastDue ? "text-amber-400" : "text-foreground"}`}>
                      {isVIP ? "VIP Active" : isPastDue ? "Payment Due" : "Regular Client"}
                    </p>
                    <p className="text-sm text-muted-foreground font-medium">Membership Status</p>
                  </div>
                </div>
              </GlassCard>

              <Link href="/scan" className="block">
                <GlassCard className="border-purple-500/20 group cursor-pointer hover:border-purple-500/40 transition-colors h-full">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-purple-500/20 rounded-xl group-hover:scale-110 transition-transform"><QrCode className="w-6 h-6 text-purple-400" /></div>
                    <div className="flex-1">
                      <p className="text-xl font-bold text-foreground flex items-center justify-between">Scan Now <ArrowRight className="w-4 h-4" /></p>
                      <p className="text-sm text-muted-foreground font-medium">Quick Check-in</p>
                    </div>
                  </div>
                </GlassCard>
              </Link>
            </>
          )}
        </div>

        {/* Getting Started Guide for non-VIP or new users (not past-due —
            that gets the banner + billing button above instead, same
            reasoning as the VIP upsell CTA below) */}
        {!isVIP && !isPastDue && !loading && (
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }} className="mb-12">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">Getting Started</h2>
            <div className="grid md:grid-cols-3 gap-4">
              {onboardingSteps.map((step) => (
                <GlassCard key={step.id} className={`relative border-foreground/5 ${step.completed ? "opacity-50" : "hover:border-primary/30 transition-colors"}`}>
                  <div className="flex items-start gap-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${step.completed ? "bg-green-500/20 text-green-400" : "bg-foreground/10 text-foreground"}`}>
                      {step.completed ? <Check className="w-4 h-4" /> : step.id}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-lg mb-1">{step.title}</h3>
                      <p className="text-sm text-muted-foreground mb-4">{step.desc}</p>
                      {!step.completed && step.link && (
                        <Button asChild size="sm" variant="outline" className="w-full border-primary/30 hover:bg-primary/10 text-primary">
                          <Link href={step.link}>Go to {step.title.split(" ").pop()}</Link>
                        </Button>
                      )}
                    </div>
                  </div>
                </GlassCard>
              ))}
            </div>
          </motion.div>
        )}

        {/* Cuts Section */}
        {isVIP && !loading && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2"><Sparkles className="w-5 h-5 text-primary" /> Your Monthly Cuts</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {cuts.map((cut, i) => (
                <motion.div key={cut.id || i} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.1 }}>
                  <GlassCard className={`text-center py-8 ${cut.status === "used" ? "opacity-30 grayscale" : "border-primary/20 shadow-[0_0_15px_rgba(37,99,235,0.1)]"}`}>
                    <Scissors className={`w-12 h-12 mx-auto mb-4 ${cut.status === "available" ? "text-primary" : "text-gray-500"}`} />
                    <p className="font-bold text-lg mb-2">Cut #{cut.cutNumber}</p>
                    <p className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full inline-block ${cut.status === "available" ? "bg-primary/20 text-primary" : "bg-foreground/5 text-gray-500"}`}>{cut.status}</p>
                  </GlassCard>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Call to Action for non-VIP (not past-due — that gets the banner + billing button above instead) */}
        {!isVIP && !isPastDue && !loading && (
          <GlassCard className="relative overflow-hidden border-primary/30 bg-gradient-to-br from-blue-900/10 to-transparent py-12 mb-12">
            <div className="absolute top-0 right-0 p-8 opacity-10"><Star className="w-40 h-40 text-primary rotate-12" /></div>
            <div className="relative z-10 text-center px-4">
              <Sparkles className="w-16 h-16 mx-auto mb-6 text-primary animate-pulse" />
              <h2 className="text-3xl font-bold mb-4">Go VIP for ${monthlyPrice ?? 150}/mo</h2>
              <p className="text-muted-foreground mb-8 max-w-lg mx-auto text-lg">Unlock 4 premium haircuts per month, priority booking, and exclusive shop benefits.</p>
              <Button asChild size="lg" className="bg-primary hover:bg-primary text-foreground px-12 py-8 text-xl font-bold rounded-2xl shadow-[0_0_20px_rgba(37,99,235,0.3)] transition-all hover:scale-[1.05]">
                <Link href="/pricing">Upgrade to VIP Now</Link>
              </Button>
            </div>
          </GlassCard>
        )}

        {/* My Bookings */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2"><Calendar className="w-5 h-5 text-primary" /> My Bookings</h2>
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : upcomingBookings.length === 0 ? (
            <GlassCard className="text-center py-10 border-foreground/5">
              <Calendar className="w-8 h-8 mx-auto mb-2 text-gray-600" />
              <p className="text-gray-500">No upcoming appointments.</p>
              <Button asChild size="sm" variant="outline" className="mt-4 border-primary/30 text-primary hover:bg-primary/10">
                <Link href="/book">Book an Appointment</Link>
              </Button>
            </GlassCard>
          ) : (
            <div className="space-y-3">
              {upcomingBookings.map((booking) => (
                <GlassCard key={booking._id} className="border-foreground/10">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <p className="font-bold">{booking.serviceName}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(`${booking.date}T00:00:00`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                        {" · "}{formatTime12h(booking.startTime)}
                      </p>
                      {booking.status === "pending_payment" && (
                        <p className="text-xs text-amber-400 mt-1">Awaiting deposit — this hold expires if payment isn't completed.</p>
                      )}
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button size="sm" variant="outline" className="border-foreground/10 hover:bg-foreground/5" onClick={() => openReschedule(booking)}>
                        Reschedule
                      </Button>
                      <Button size="sm" variant="outline" className="border-red-500/30 text-red-400 hover:bg-red-500/10" onClick={() => setCancelTarget(booking)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                </GlassCard>
              ))}
            </div>
          )}
        </div>

        {/* Bottom Section */}
        <div className="grid md:grid-cols-2 gap-6">
          <GlassCard>
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2"><Calendar className="w-5 h-5 text-primary" /> Quick Links</h3>
            <div className="space-y-3">
              <Button asChild variant="outline" className="w-full py-6 border-foreground/10 hover:bg-foreground/5 justify-start px-6 rounded-xl"><Link href="/book">Book an Appointment</Link></Button>
              <Button asChild variant="outline" className="w-full py-6 border-foreground/10 hover:bg-foreground/5 justify-start px-6 rounded-xl"><Link href="/referral">Refer a Friend</Link></Button>
              <Button asChild variant="outline" className="w-full py-6 border-foreground/10 hover:bg-foreground/5 justify-start px-6 rounded-xl">
                <Link href="/account"><User className="w-4 h-4 mr-2" /> Account Settings</Link>
              </Button>
              {(isVIP || isPastDue) && (
                <Button
                  variant="outline"
                  onClick={openBillingPortal}
                  disabled={portalLoading}
                  className="w-full py-6 border-foreground/10 hover:bg-foreground/5 justify-start px-6 rounded-xl"
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  {portalLoading ? "Opening..." : "Manage Billing"}
                </Button>
              )}
            </div>
          </GlassCard>

          <GlassCard>
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2"><History className="w-5 h-5 text-purple-400" /> Visit History</h3>
            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : visits.length > 0 ? (
              <div className="space-y-4">
                {visits.map((visit) => (
                  <div key={visit.id} className="flex items-center justify-between py-2 border-b border-foreground/5 last:border-0">
                    <div>
                      <p className="font-bold text-sm">
                        {visit.action === 'used' ? 'Haircut Redeemed' : 'Shop Check-in'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(visit.createdAt).toLocaleDateString()} at {new Date(visit.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-medium text-primary">{visit.barberName}</p>
                      {visit.cutDetails && (
                        <p className="text-[10px] text-gray-500 uppercase font-bold">Cut #{visit.cutDetails.cutNumber}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 italic text-sm">Your recent visits will appear here after your next scan.</p>
            )}
          </GlassCard>
        </div>
      </div>

      {/* Cancel confirmation */}
      <Dialog open={!!cancelTarget} onOpenChange={(open) => !open && setCancelTarget(null)}>
        <DialogContent className="bg-background border-foreground/10 text-foreground">
          <DialogHeader>
            <DialogTitle className="text-foreground">Cancel this appointment?</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {cancelTarget && (
                <>
                  {cancelTarget.serviceName} on{" "}
                  {new Date(`${cancelTarget.date}T00:00:00`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                  {" at "}{formatTime12h(cancelTarget.startTime)}. This can't be undone.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" className="border-foreground/10" onClick={() => setCancelTarget(null)} disabled={cancelling}>
              Keep Appointment
            </Button>
            <Button className="bg-red-600 hover:bg-red-700 text-foreground" onClick={confirmCancelBooking} disabled={cancelling}>
              {cancelling ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Cancel Appointment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reschedule */}
      <Dialog open={!!rescheduleTarget} onOpenChange={(open) => !open && setRescheduleTarget(null)}>
        <DialogContent className="bg-background border-foreground/10 text-foreground">
          <DialogHeader>
            <DialogTitle className="text-foreground">Reschedule Appointment</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {rescheduleTarget?.serviceName}
            </DialogDescription>
          </DialogHeader>

          <div>
            <Label htmlFor="reschedule-date">New date</Label>
            <Input
              id="reschedule-date"
              type="date"
              min={ymdInShopTZ()}
              value={rescheduleDate}
              onChange={(e) => changeRescheduleDate(e.target.value)}
              className="bg-foreground/5 border-foreground/10 mb-4"
            />

            <Label>Available times</Label>
            {loadingSlots ? (
              <div className="grid grid-cols-3 gap-2 mt-2">
                {[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : rescheduleSlots.length === 0 ? (
              <div className="text-center py-8 text-gray-500 border-2 border-dashed border-foreground/5 rounded-xl mt-2">
                <Clock className="w-5 h-5 mx-auto mb-2 opacity-20" />
                <p className="text-sm">No open times this day — try another date.</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2 mt-2">
                {rescheduleSlots.map((time) => (
                  <Button
                    key={time}
                    variant="outline"
                    disabled={rescheduling}
                    onClick={() => commitReschedule(time)}
                    className="border-foreground/10 hover:border-primary/40 hover:bg-primary/10"
                  >
                    {formatTime12h(time)}
                  </Button>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
