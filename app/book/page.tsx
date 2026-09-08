"use client"

import { useState, useEffect, useMemo, Suspense } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useRouter, useSearchParams } from "next/navigation"
import { GlassCard } from "@/components/ui/glass-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Navbar } from "@/components/navbar"
import { useToast } from "@/hooks/use-toast"
import { Skeleton } from "@/components/ui/skeleton"
import { getToken, parseJWT } from "@/lib/jwt-utils"
import { ymdInShopTZ } from "@/lib/timezone"
import { ChevronLeft, Clock, Calendar as CalendarIcon, Loader2, CheckCircle2, ListChecks, AlertCircle } from "lucide-react"

interface ServiceItem {
  _id: string
  name: string
  category: string
  description: string
  price: number | null
  priceVaries: boolean
  durationMinutes: number
  depositRequired: boolean
  depositAmount: number | null
}

type Step = "service" | "datetime" | "confirm" | "success"

const PENDING_KEY = "pendingBooking"

// Customers browsing from any timezone should still see the shop's own
// (Central) "today" as the default date, not their own local calendar
// day — matches the reasoning already established in lib/timezone.ts.
function todayStr() {
  return ymdInShopTZ()
}

function formatTime12h(time: string) {
  const [h, m] = time.split(":").map(Number)
  const period = h >= 12 ? "PM" : "AM"
  const hour12 = h % 12 === 0 ? 12 : h % 12
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`
}

function BookPageContent() {
  const [step, setStep] = useState<Step>("service")
  const [services, setServices] = useState<ServiceItem[]>([])
  const [loadingServices, setLoadingServices] = useState(true)
  const [selectedService, setSelectedService] = useState<ServiceItem | null>(null)
  const [date, setDate] = useState(todayStr())
  const [slots, setSlots] = useState<string[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [notes, setNotes] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [confirmedBooking, setConfirmedBooking] = useState<any>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()

  useEffect(() => {
    fetch("/api/services")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setServices(data.services || [])
      })
      .finally(() => setLoadingServices(false))
  }, [])

  // If we bounced through login/signup mid-booking, pick the flow back up.
  useEffect(() => {
    if (loadingServices) return
    const raw = sessionStorage.getItem(PENDING_KEY)
    if (!raw) return
    const token = getToken()
    if (!token) return

    try {
      const pending = JSON.parse(raw)
      const service = services.find((s) => s._id === pending.serviceId)
      if (service) {
        setSelectedService(service)
        setDate(pending.date)
        setSelectedTime(pending.startTime)
        setStep("confirm")
      }
    } catch {
      // ignore malformed sessionStorage
    } finally {
      sessionStorage.removeItem(PENDING_KEY)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingServices])

  // Lets a page like /akn link straight into a matching service
  // (?serviceName=AKN) instead of dumping the visitor into the full,
  // undifferentiated picker. Matches by substring against name/category
  // since we don't want to hardcode a specific service's database id —
  // this keeps working automatically whenever a matching service exists,
  // and degrades gracefully to the normal picker if none does yet.
  useEffect(() => {
    if (loadingServices || services.length === 0 || step !== "service") return
    const query = searchParams?.get("serviceName")
    if (!query) return
    const q = query.toLowerCase()
    const match = services.find((s) => s.name.toLowerCase().includes(q) || s.category.toLowerCase().includes(q))
    if (match) chooseService(match)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingServices, services])

  const grouped = useMemo(() => {
    const groups: Record<string, ServiceItem[]> = {}
    for (const s of services) {
      if (!groups[s.category]) groups[s.category] = []
      groups[s.category].push(s)
    }
    return groups
  }, [services])

  const fetchSlots = async (serviceId: string, forDate: string) => {
    setLoadingSlots(true)
    setSelectedTime(null)
    try {
      const res = await fetch(`/api/bookings/slots?serviceId=${serviceId}&date=${forDate}`)
      const data = await res.json()
      setSlots(data.success ? data.slots || [] : [])
    } catch {
      setSlots([])
    } finally {
      setLoadingSlots(false)
    }
  }

  const chooseService = (service: ServiceItem) => {
    setSelectedService(service)
    setStep("datetime")
    fetchSlots(service._id, date)
  }

  const changeDate = (newDate: string) => {
    setDate(newDate)
    if (selectedService) fetchSlots(selectedService._id, newDate)
  }

  const chooseTime = (time: string) => {
    setSelectedTime(time)
    const token = getToken()
    if (!token) {
      sessionStorage.setItem(
        PENDING_KEY,
        JSON.stringify({ serviceId: selectedService!._id, date, startTime: time })
      )
      sessionStorage.setItem("postAuthRedirect", "/book")
      toast({ title: "Almost there", description: "Sign in or create an account to finish booking." })
      router.push("/login")
      return
    }
    setStep("confirm")
  }

  const submitBooking = async () => {
    if (!selectedService || !selectedTime) return
    const token = getToken()
    if (!token) {
      router.push("/login")
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          serviceId: selectedService._id,
          date,
          startTime: selectedTime,
          notes,
        }),
      })
      const data = await res.json()
      if (!data.success) {
        if (res.status === 401 || res.status === 403) {
          // Same recovery path chooseTime() already uses for a logged-out
          // visitor — preserve the selection so it's restored automatically
          // once they're back, instead of losing their progress.
          sessionStorage.setItem(
            PENDING_KEY,
            JSON.stringify({ serviceId: selectedService._id, date, startTime: selectedTime })
          )
          sessionStorage.setItem("postAuthRedirect", "/book")
          toast({ title: "Session expired", description: "Please sign in again to finish booking." })
          router.push("/login")
          return
        }
        toast({ title: "Couldn't book that time", description: data.error, variant: "destructive" })
        if (res.status === 409) fetchSlots(selectedService._id, date)
        return
      }

      if (selectedService.depositRequired) {
        const checkoutRes = await fetch("/api/bookings/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ bookingId: data.booking._id }),
        })
        const checkoutData = await checkoutRes.json()
        if (checkoutData.success && checkoutData.url) {
          window.location.href = checkoutData.url
          return
        }
        toast({ title: "Booking held, but checkout failed", description: "Please try again from your dashboard.", variant: "destructive" })
        return
      }

      setConfirmedBooking(data.booking)
      setStep("success")
    } catch {
      toast({ title: "Error", description: "Something went wrong.", variant: "destructive" })
    } finally {
      setSubmitting(false)
    }
  }

  const priceLabel = (service: ServiceItem) => (service.priceVaries ? "Varies" : `$${service.price?.toFixed(2)}`)

  return (
    <div className="min-h-screen bg-background text-foreground pb-24">
      <Navbar />
      <div className="pt-24 px-4 max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Book an Appointment</h1>
          <p className="text-muted-foreground">Pick a service, find an open time, and you're set.</p>
        </div>

        <AnimatePresence mode="wait">
          {step === "service" && (
            <motion.div key="service" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              {loadingServices ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : services.length === 0 ? (
                <div className="text-center py-16 text-gray-500 border-2 border-dashed border-foreground/5 rounded-xl">
                  <ListChecks className="w-8 h-8 mx-auto mb-2 opacity-20" />
                  <p>No services are available to book right now.</p>
                </div>
              ) : (
                <div className="space-y-8">
                  {Object.entries(grouped).map(([category, items]) => (
                    <div key={category}>
                      <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground mb-3 ml-1 font-inter">{category}</h3>
                      <div className="space-y-2">
                        {items.map((service) => (
                          <button
                            key={service._id}
                            onClick={() => chooseService(service)}
                            className="w-full text-left bg-foreground/5 hover:bg-foreground/10 border border-foreground/5 hover:border-primary/30 transition-all rounded-xl p-4 flex items-center justify-between gap-4 font-inter"
                          >
                            <div>
                              <p className="font-medium">{service.name}</p>
                              {service.description && <p className="text-sm text-gray-300">{service.description}</p>}
                              <p className="text-sm text-muted-foreground mt-0.5">
                                {service.durationMinutes} min · {priceLabel(service)}
                                {service.depositRequired && (
                                  <span className="text-amber-400"> · ${service.depositAmount?.toFixed(2)} deposit required</span>
                                )}
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {step === "datetime" && selectedService && (
            <motion.div key="datetime" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <button
                onClick={() => setStep("service")}
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
              >
                <ChevronLeft className="w-4 h-4" /> Change service
              </button>

              <GlassCard className="mb-6 border-primary/10">
                <p className="font-medium">{selectedService.name}</p>
                <p className="text-sm text-muted-foreground">
                  {selectedService.durationMinutes} min · {priceLabel(selectedService)}
                  {selectedService.depositRequired && (
                    <span className="text-amber-400"> · ${selectedService.depositAmount?.toFixed(2)} deposit required</span>
                  )}
                </p>
              </GlassCard>

              <Label htmlFor="book-date">Date</Label>
              <Input
                id="book-date"
                type="date"
                min={todayStr()}
                value={date}
                onChange={(e) => changeDate(e.target.value)}
                className="bg-foreground/5 border-foreground/10 mb-6"
              />

              <Label>Available times</Label>
              {loadingSlots ? (
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : slots.length === 0 ? (
                <div className="text-center py-10 text-gray-500 border-2 border-dashed border-foreground/5 rounded-xl mt-2">
                  <CalendarIcon className="w-6 h-6 mx-auto mb-2 opacity-20" />
                  <p>No open times this day — try another date.</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {slots.map((time) => (
                    <Button
                      key={time}
                      variant="outline"
                      onClick={() => chooseTime(time)}
                      className={`border-foreground/10 hover:border-primary/40 hover:bg-primary/10 ${
                        selectedTime === time ? "border-primary bg-primary/10" : ""
                      }`}
                    >
                      {formatTime12h(time)}
                    </Button>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {step === "confirm" && selectedService && selectedTime && (
            <motion.div key="confirm" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <button
                onClick={() => setStep("datetime")}
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
              >
                <ChevronLeft className="w-4 h-4" /> Change time
              </button>

              <GlassCard className="mb-6 space-y-3 border-primary/10">
                <h2 className="text-lg font-bold">Confirm your appointment</h2>
                <div className="flex items-center gap-2 text-gray-300">
                  <ListChecks className="w-4 h-4 text-gray-500" /> {selectedService.name}
                </div>
                <div className="flex items-center gap-2 text-gray-300">
                  <CalendarIcon className="w-4 h-4 text-gray-500" />{" "}
                  {new Date(`${date}T00:00:00`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                </div>
                <div className="flex items-center gap-2 text-gray-300">
                  <Clock className="w-4 h-4 text-gray-500" /> {formatTime12h(selectedTime)} ({selectedService.durationMinutes} min)
                </div>
                <div className="text-gray-300">{priceLabel(selectedService)}</div>

                {selectedService.depositRequired && (
                  <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-sm text-amber-200">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <p>
                      This service requires a ${selectedService.depositAmount?.toFixed(2)} deposit to hold your spot. You'll be taken to
                      secure checkout after confirming.
                    </p>
                  </div>
                )}
              </GlassCard>

              <div className="mb-6">
                <Label htmlFor="book-notes">Notes for your barber (optional)</Label>
                <Textarea
                  id="book-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Anything we should know?"
                  className="bg-foreground/5 border-foreground/10"
                  rows={3}
                />
              </div>

              <Button
                onClick={submitBooking}
                disabled={submitting}
                className="w-full bg-primary hover:bg-primary text-foreground shadow-lg shadow-primary/20"
                size="lg"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                {selectedService.depositRequired ? "Confirm & Pay Deposit" : "Confirm Booking"}
              </Button>
            </motion.div>
          )}

          {step === "success" && confirmedBooking && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-12"
            >
              <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-green-400" />
              <h2 className="text-2xl font-bold mb-2">You're booked!</h2>
              <p className="text-muted-foreground mb-6">
                {confirmedBooking.serviceName} on{" "}
                {new Date(`${confirmedBooking.date}T00:00:00`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}{" "}
                at {formatTime12h(confirmedBooking.startTime)}.
              </p>
              <div className="flex gap-3 justify-center">
                <Button onClick={() => router.push("/dashboard")} className="bg-foreground text-background hover:bg-foreground/90">
                  Go to Dashboard
                </Button>
                <Button
                  variant="outline"
                  className="border-foreground/20"
                  onClick={() => {
                    setStep("service")
                    setSelectedService(null)
                    setSelectedTime(null)
                    setNotes("")
                    setConfirmedBooking(null)
                  }}
                >
                  Book Another
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

export default function BookPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      }
    >
      <BookPageContent />
    </Suspense>
  )
}
