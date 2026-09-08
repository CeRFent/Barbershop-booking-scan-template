"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { GlassCard } from "@/components/ui/glass-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Navbar } from "@/components/navbar"
import { useToast } from "@/hooks/use-toast"
import { Skeleton } from "@/components/ui/skeleton"
import { ymdInShopTZ } from "@/lib/timezone"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  ChevronLeft,
  ChevronRight,
  Star,
  Calendar as CalendarIcon,
  List,
  Loader2,
  X,
  Check,
  UserX,
  RotateCcw,
  AlertCircle,
  Plus,
  Clock,
  Search,
} from "lucide-react"

interface BookingItem {
  _id: string
  userId: string
  serviceId: string
  serviceName: string
  durationMinutes: number
  depositRequired: boolean
  depositAmount: number | null
  depositPaid: boolean
  date: string
  startTime: string
  endTime: string
  status: "pending_payment" | "confirmed" | "cancelled" | "completed" | "no_show"
  customerName: string
  customerEmail: string
  customerPhone: string
  notes: string
  isVip: boolean
}

interface ServiceItem {
  _id: string
  name: string
  durationMinutes: number
  isActive: boolean
}

interface CustomerUser {
  id: string
  name: string
  email: string
  phone?: string
}

interface WeeklyHour {
  dayOfWeek: number
  isOpen: boolean
  openTime: string | null
  closeTime: string | null
}

const STATUS_STYLES: Record<BookingItem["status"], { label: string; className: string }> = {
  pending_payment: { label: "Awaiting Deposit", className: "border-amber-500/30 text-amber-400" },
  confirmed: { label: "Confirmed", className: "border-blue-500/30 text-blue-400" },
  cancelled: { label: "Cancelled", className: "border-gray-500/30 text-gray-500" },
  completed: { label: "Completed", className: "border-green-500/30 text-green-400" },
  no_show: { label: "No-Show", className: "border-red-500/30 text-red-400" },
}

const SERVICE_COLORS = ["#60a5fa", "#f472b6", "#34d399", "#fbbf24", "#a78bfa", "#fb923c", "#22d3ee"]

function serviceColor(serviceId: string) {
  let hash = 0
  for (let i = 0; i < serviceId.length; i++) hash = (hash * 31 + serviceId.charCodeAt(i)) >>> 0
  return SERVICE_COLORS[hash % SERVICE_COLORS.length]
}

// Every date this page formats/compares should reflect the shop's own
// (Central) calendar day, not the admin's browser's local timezone —
// matches the reasoning already established in lib/timezone.ts.
function toYMD(date: Date) {
  return ymdInShopTZ(date)
}

function startOfWeek(date: Date) {
  const d = new Date(date)
  d.setDate(d.getDate() - d.getDay())
  d.setHours(0, 0, 0, 0)
  return d
}

function addDays(date: Date, n: number) {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

function formatTime12h(time: string) {
  const [h, m] = time.split(":").map(Number)
  const period = h >= 12 ? "PM" : "AM"
  const hour12 = h % 12 === 0 ? 12 : h % 12
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`
}

function timeToMinutes(time: string) {
  const [h, m] = time.split(":").map(Number)
  return h * 60 + m
}

function minutesToTime(minutes: number) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
}

const DAY_LABELS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
const DAY_LABELS_SHORT = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"]
const PX_PER_MIN = 1.2

export default function AdminCalendarPage() {
  const [selectedDate, setSelectedDate] = useState(() => new Date())
  const weekStart = useMemo(() => startOfWeek(selectedDate), [selectedDate])
  const [bookings, setBookings] = useState<BookingItem[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<"day" | "list">("day")
  const [weeklyHours, setWeeklyHours] = useState<WeeklyHour[] | null>(null)

  const [rescheduleTarget, setRescheduleTarget] = useState<BookingItem | null>(null)
  const [rescheduleDate, setRescheduleDate] = useState("")
  const [rescheduleSlots, setRescheduleSlots] = useState<string[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [savingReschedule, setSavingReschedule] = useState(false)

  const [detailTarget, setDetailTarget] = useState<BookingItem | null>(null)

  const [newBookingOpen, setNewBookingOpen] = useState(false)
  const [services, setServices] = useState<ServiceItem[] | null>(null)
  const [customers, setCustomers] = useState<CustomerUser[] | null>(null)
  const [newServiceId, setNewServiceId] = useState("")
  const [newDate, setNewDate] = useState("")
  const [newSlots, setNewSlots] = useState<string[]>([])
  const [loadingNewSlots, setLoadingNewSlots] = useState(false)
  const [newTime, setNewTime] = useState("")
  const [customerQuery, setCustomerQuery] = useState("")
  const [newCustomerId, setNewCustomerId] = useState("")
  const [savingNewBooking, setSavingNewBooking] = useState(false)

  const dateInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const fetchBookings = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem("token")
      const start = toYMD(weekStart)
      const end = toYMD(addDays(weekStart, 6))
      const res = await fetch(`/api/admin/bookings?start=${start}&end=${end}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (data.success) setBookings(data.bookings || [])
      else toast({ title: "Error", description: data.error, variant: "destructive" })
    } catch {
      toast({ title: "Error", description: "Failed to load bookings.", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBookings()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStart])

  useEffect(() => {
    const fetchHours = async () => {
      try {
        const token = localStorage.getItem("token")
        const res = await fetch("/api/admin/availability", { headers: { Authorization: `Bearer ${token}` } })
        const data = await res.json()
        if (data.success) setWeeklyHours(data.weeklyHours)
      } catch {
        // Timeline falls back to a default 9am–7pm bound if this fails.
      }
    }
    fetchHours()
  }, [])

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart])

  const byDay = useMemo(() => {
    const map: Record<string, BookingItem[]> = {}
    for (const day of days) map[toYMD(day)] = []
    for (const b of bookings) {
      if (map[b.date]) map[b.date].push(b)
    }
    return map
  }, [days, bookings])

  const todayYMD = toYMD(new Date())
  const selectedYMD = toYMD(selectedDate)
  const dayBookings = useMemo(
    () => (byDay[selectedYMD] || []).slice().sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [byDay, selectedYMD]
  )

  const todaysHours = weeklyHours?.find((d) => d.dayOfWeek === selectedDate.getDay())
  const isOpenToday = todaysHours?.isOpen ?? false
  const openMin = isOpenToday && todaysHours?.openTime ? timeToMinutes(todaysHours.openTime) : 9 * 60
  const closeMin = isOpenToday && todaysHours?.closeTime ? timeToMinutes(todaysHours.closeTime) : 19 * 60
  const boundStart = Math.max(0, openMin - 60)
  const boundEnd = Math.min(24 * 60, closeMin + 60)
  const timelineHeight = (boundEnd - boundStart) * PX_PER_MIN

  const hourMarks = useMemo(() => {
    const marks: number[] = []
    for (let t = Math.ceil(boundStart / 60) * 60; t <= boundEnd; t += 60) marks.push(t)
    return marks
  }, [boundStart, boundEnd])

  const updateStatus = async (booking: BookingItem, status: BookingItem["status"]) => {
    try {
      const token = localStorage.getItem("token")
      const res = await fetch(`/api/admin/bookings/${booking._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status }),
      })
      const data = await res.json()
      if (data.success) {
        setBookings((prev) => prev.map((b) => (b._id === booking._id ? { ...b, status } : b)))
        toast({ title: STATUS_STYLES[status].label })
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" })
      }
    } catch {
      toast({ title: "Error", description: "Something went wrong.", variant: "destructive" })
    }
  }

  const openReschedule = (booking: BookingItem) => {
    setDetailTarget(null)
    setRescheduleTarget(booking)
    setRescheduleDate(booking.date)
    fetchRescheduleSlots(booking._id, booking.date)
  }

  const fetchRescheduleSlots = async (bookingId: string, date: string) => {
    setLoadingSlots(true)
    setRescheduleSlots([])
    try {
      const token = localStorage.getItem("token")
      const res = await fetch(`/api/admin/bookings/${bookingId}?date=${date}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (data.success) setRescheduleSlots(data.slots || [])
    } finally {
      setLoadingSlots(false)
    }
  }

  const confirmReschedule = async (time: string) => {
    if (!rescheduleTarget) return
    setSavingReschedule(true)
    try {
      const token = localStorage.getItem("token")
      const res = await fetch(`/api/admin/bookings/${rescheduleTarget._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ date: rescheduleDate, startTime: time }),
      })
      const data = await res.json()
      if (data.success) {
        toast({ title: "Rescheduled" })
        setRescheduleTarget(null)
        fetchBookings()
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" })
      }
    } catch {
      toast({ title: "Error", description: "Something went wrong.", variant: "destructive" })
    } finally {
      setSavingReschedule(false)
    }
  }

  const openNewBooking = async () => {
    setNewDate(selectedYMD)
    setNewServiceId("")
    setNewTime("")
    setNewSlots([])
    setCustomerQuery("")
    setNewCustomerId("")
    setNewBookingOpen(true)

    if (!services) {
      try {
        const token = localStorage.getItem("token")
        const res = await fetch("/api/admin/services", { headers: { Authorization: `Bearer ${token}` } })
        const data = await res.json()
        if (data.success) setServices(data.services || [])
      } catch {
        toast({ title: "Error", description: "Failed to load services.", variant: "destructive" })
      }
    }
    if (!customers) {
      try {
        const token = localStorage.getItem("token")
        const res = await fetch("/api/admin/users", { headers: { Authorization: `Bearer ${token}` } })
        const data = await res.json()
        if (data.success) setCustomers(data.users || [])
      } catch {
        toast({ title: "Error", description: "Failed to load customers.", variant: "destructive" })
      }
    }
  }

  const fetchNewSlots = async (serviceId: string, date: string) => {
    if (!serviceId || !date) return
    setLoadingNewSlots(true)
    setNewSlots([])
    setNewTime("")
    try {
      const token = localStorage.getItem("token")
      const res = await fetch(`/api/bookings/slots?serviceId=${serviceId}&date=${date}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (data.success) setNewSlots(data.slots || [])
    } finally {
      setLoadingNewSlots(false)
    }
  }

  const filteredCustomers = useMemo(() => {
    if (!customers) return []
    const q = customerQuery.trim().toLowerCase()
    if (!q) return customers.slice(0, 25)
    return customers
      .filter(
        (c) =>
          c.name?.toLowerCase().includes(q) ||
          c.email?.toLowerCase().includes(q) ||
          c.phone?.toLowerCase().includes(q)
      )
      .slice(0, 25)
  }, [customers, customerQuery])

  const submitNewBooking = async () => {
    if (!newServiceId || !newDate || !newTime || !newCustomerId) return
    setSavingNewBooking(true)
    try {
      const token = localStorage.getItem("token")
      const res = await fetch("/api/admin/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId: newCustomerId, serviceId: newServiceId, date: newDate, startTime: newTime }),
      })
      const data = await res.json()
      if (data.success) {
        toast({ title: "Booking added" })
        setNewBookingOpen(false)
        fetchBookings()
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" })
      }
    } catch {
      toast({ title: "Error", description: "Something went wrong.", variant: "destructive" })
    } finally {
      setSavingNewBooking(false)
    }
  }

  const renderBooking = (b: BookingItem) => (
    <motion.div
      key={b._id}
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-wrap items-center gap-3 bg-white/5 p-3 rounded-lg border border-white/5"
      style={{ borderLeftColor: serviceColor(b.serviceId), borderLeftWidth: 3 }}
    >
      <div className="min-w-[110px]">
        <p className="font-medium text-sm">
          {formatTime12h(b.startTime)} – {formatTime12h(b.endTime)}
        </p>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium">{b.customerName}</span>
          {b.isVip && (
            <span className="bg-blue-600 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tighter flex items-center gap-1">
              <Star className="w-2 h-2 fill-white" /> VIP
            </span>
          )}
          <span className={`text-xs rounded-full px-2 py-0.5 border ${STATUS_STYLES[b.status].className}`}>
            {STATUS_STYLES[b.status].label}
          </span>
        </div>
        <p className="text-sm text-gray-400">
          {b.serviceName}
          {b.depositRequired && <span className="text-amber-400"> · ${b.depositAmount?.toFixed(2)} deposit{b.depositPaid ? " paid" : ""}</span>}
        </p>
        {b.notes && <p className="text-sm text-gray-500 mt-0.5">"{b.notes}"</p>}
      </div>

      <div className="flex items-center gap-1 shrink-0">
        {(b.status === "confirmed" || b.status === "pending_payment") && (
          <button
            onClick={() => openReschedule(b)}
            title="Reschedule"
            className="text-gray-500 hover:text-blue-400 transition-all p-2 hover:bg-blue-500/10 rounded-lg"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        )}
        {b.status === "confirmed" && (
          <>
            <button
              onClick={() => updateStatus(b, "completed")}
              title="Mark completed"
              className="text-gray-500 hover:text-green-400 transition-all p-2 hover:bg-green-500/10 rounded-lg"
            >
              <Check className="w-4 h-4" />
            </button>
            <button
              onClick={() => updateStatus(b, "no_show")}
              title="Mark no-show"
              className="text-gray-500 hover:text-red-400 transition-all p-2 hover:bg-red-500/10 rounded-lg"
            >
              <UserX className="w-4 h-4" />
            </button>
          </>
        )}
        {(b.status === "confirmed" || b.status === "pending_payment") && (
          <button
            onClick={() => {
              if (confirm(`Cancel ${b.customerName}'s ${b.serviceName} appointment?`)) updateStatus(b, "cancelled")
            }}
            title="Cancel"
            className="text-gray-500 hover:text-red-400 transition-all p-2 hover:bg-red-500/10 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </motion.div>
  )

  return (
    <div className="min-h-screen bg-black text-white pb-32">
      <Navbar />
      <div className="pt-24 px-4 max-w-4xl mx-auto">
        <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold">
                {DAY_LABELS[selectedDate.getDay()].slice(0, 3)}, {selectedDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </h1>
              <button
                onClick={() => dateInputRef.current?.showPicker?.() ?? dateInputRef.current?.click()}
                className="text-gray-500 hover:text-white transition-colors"
                title="Jump to date"
              >
                <ChevronRight className="w-4 h-4 rotate-90" />
              </button>
              <input
                ref={dateInputRef}
                type="date"
                value={selectedYMD}
                onChange={(e) => e.target.value && setSelectedDate(new Date(e.target.value + "T00:00:00"))}
                className="absolute opacity-0 pointer-events-none w-0 h-0"
              />
            </div>
            <p className="text-gray-400 text-sm">
              {isOpenToday && todaysHours?.openTime && todaysHours?.closeTime
                ? `${formatTime12h(todaysHours.openTime)} - ${formatTime12h(todaysHours.closeTime)}`
                : "Closed"}
            </p>
          </div>
          <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1 border border-white/10">
            <button
              onClick={() => setView("day")}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm transition-all ${
                view === "day" ? "bg-white text-black" : "text-gray-400 hover:text-white"
              }`}
            >
              <CalendarIcon className="w-4 h-4" /> Day
            </button>
            <button
              onClick={() => setView("list")}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm transition-all ${
                view === "list" ? "bg-white text-black" : "text-gray-400 hover:text-white"
              }`}
            >
              <List className="w-4 h-4" /> List
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-6">
          <Button variant="outline" size="sm" className="border-white/10 shrink-0" onClick={() => setSelectedDate((d) => addDays(d, -7))}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="grid grid-cols-7 gap-1 flex-1">
            {days.map((day) => {
              const ymd = toYMD(day)
              const isSelected = ymd === selectedYMD
              const isToday = ymd === todayYMD
              return (
                <button
                  key={ymd}
                  onClick={() => setSelectedDate(day)}
                  className="flex flex-col items-center gap-1 py-1 rounded-lg hover:bg-white/5 transition-colors"
                >
                  <span className="text-[10px] font-bold tracking-wide text-gray-500">{DAY_LABELS_SHORT[day.getDay()]}</span>
                  <span
                    className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold transition-colors ${
                      isSelected ? "bg-white text-black" : isToday ? "text-red-400" : "text-gray-300"
                    }`}
                  >
                    {day.getDate()}
                  </span>
                </button>
              )
            })}
          </div>
          <Button variant="outline" size="sm" className="border-white/10 shrink-0" onClick={() => setSelectedDate((d) => addDays(d, 7))}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : view === "day" ? (
          <GlassCard className="p-0 overflow-hidden">
            <div className="relative overflow-x-auto">
              <div className="relative flex" style={{ height: timelineHeight }}>
                {/* Hour label column */}
                <div className="w-14 shrink-0 relative border-r border-white/5">
                  {hourMarks.map((t) => (
                    <div
                      key={t}
                      className="absolute left-0 right-0 text-[11px] font-bold text-gray-500 text-right pr-2"
                      style={{ top: (t - boundStart) * PX_PER_MIN - 7 }}
                    >
                      {formatTime12h(minutesToTime(t)).replace(":00", "")}
                    </div>
                  ))}
                </div>

                {/* Timeline area */}
                <div className="relative flex-1">
                  {/* 15-min gridlines */}
                  {Array.from({ length: Math.floor((boundEnd - boundStart) / 15) + 1 }, (_, i) => boundStart + i * 15).map((t) => (
                    <div
                      key={t}
                      className={`absolute left-0 right-0 border-t ${t % 60 === 0 ? "border-white/10" : "border-white/5 border-dashed"}`}
                      style={{ top: (t - boundStart) * PX_PER_MIN }}
                    />
                  ))}

                  {/* Closed / outside-hours stripe zones */}
                  {!isOpenToday ? (
                    <div
                      className="absolute inset-0 flex items-center justify-center"
                      style={{
                        backgroundImage:
                          "repeating-linear-gradient(45deg, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 6px, transparent 6px, transparent 16px)",
                      }}
                    >
                      <span className="text-gray-500 text-sm font-medium bg-black/60 px-3 py-1 rounded-full">Closed today</span>
                    </div>
                  ) : (
                    <>
                      <div
                        className="absolute left-0 right-0 top-0"
                        style={{
                          height: Math.max(0, openMin - boundStart) * PX_PER_MIN,
                          backgroundImage:
                            "repeating-linear-gradient(45deg, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 6px, transparent 6px, transparent 16px)",
                        }}
                      />
                      <div
                        className="absolute left-0 right-0"
                        style={{
                          top: Math.max(0, closeMin - boundStart) * PX_PER_MIN,
                          height: Math.max(0, boundEnd - closeMin) * PX_PER_MIN,
                          backgroundImage:
                            "repeating-linear-gradient(45deg, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 6px, transparent 6px, transparent 16px)",
                        }}
                      />
                    </>
                  )}

                  {/* Appointment blocks */}
                  {dayBookings.map((b) => {
                    const top = (timeToMinutes(b.startTime) - boundStart) * PX_PER_MIN
                    const height = Math.max(30, b.durationMinutes * PX_PER_MIN)
                    const isVoided = b.status === "cancelled" || b.status === "no_show"
                    return (
                      <button
                        key={b._id}
                        onClick={() => setDetailTarget(b)}
                        className={`absolute left-1 right-1 rounded-lg px-2.5 py-1.5 text-left overflow-hidden transition-opacity hover:opacity-90 ${isVoided ? "opacity-40" : ""}`}
                        style={{ top, height, backgroundColor: serviceColor(b.serviceId) }}
                      >
                        <p className={`text-black text-xs font-bold leading-tight ${isVoided ? "line-through" : ""}`}>
                          {formatTime12h(b.startTime)} - {formatTime12h(b.endTime)}
                        </p>
                        <p className={`text-black/80 text-xs leading-tight truncate ${isVoided ? "line-through" : ""}`}>
                          {b.customerName} • {b.serviceName}
                        </p>
                        <div className="absolute top-1 right-1 flex flex-col gap-0.5">
                          {b.isVip && <Star className="w-3 h-3 text-black/70 fill-black/70" />}
                          {b.depositRequired && !b.depositPaid && b.status === "pending_payment" && (
                            <Clock className="w-3 h-3 text-black/70" />
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </GlassCard>
        ) : (
          <div className="space-y-2">
            {bookings.length === 0 ? (
              <div className="text-center py-16 text-gray-500 border-2 border-dashed border-white/5 rounded-xl">
                <CalendarIcon className="w-8 h-8 mx-auto mb-2 opacity-20" />
                <p>No bookings this week.</p>
              </div>
            ) : (
              <AnimatePresence initial={false}>{bookings.map(renderBooking)}</AnimatePresence>
            )}
          </div>
        )}
      </div>

      {/* Floating action row: today jump + add booking */}
      <div className="fixed bottom-6 left-0 right-0 px-6 flex items-center justify-between max-w-4xl mx-auto pointer-events-none">
        <div className="pointer-events-auto">
          <Button
            variant="outline"
            onClick={() => setSelectedDate(new Date())}
            className="border-white/10 bg-black/80 backdrop-blur-md rounded-full px-5"
          >
            Today
          </Button>
        </div>
        <button
          onClick={openNewBooking}
          className="pointer-events-auto w-14 h-14 rounded-full bg-white text-black flex items-center justify-center shadow-lg hover:bg-gray-200 transition-colors"
          title="Add booking"
        >
          <Plus className="w-6 h-6" />
        </button>
      </div>

      {/* Booking detail sheet — tapping a timeline block */}
      <Dialog open={!!detailTarget} onOpenChange={(open) => !open && setDetailTarget(null)}>
        <DialogContent className="bg-black border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 flex-wrap">
              {detailTarget?.customerName}
              {detailTarget?.isVip && (
                <span className="bg-blue-600 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tighter flex items-center gap-1">
                  <Star className="w-2 h-2 fill-white" /> VIP
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          {detailTarget && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-xs rounded-full px-2 py-0.5 border ${STATUS_STYLES[detailTarget.status].className}`}>
                  {STATUS_STYLES[detailTarget.status].label}
                </span>
              </div>
              <div>
                <p className="font-medium">{detailTarget.serviceName}</p>
                <p className="text-sm text-gray-400">
                  {formatTime12h(detailTarget.startTime)} – {formatTime12h(detailTarget.endTime)}
                </p>
                {detailTarget.depositRequired && (
                  <p className="text-sm text-amber-400">
                    ${detailTarget.depositAmount?.toFixed(2)} deposit{detailTarget.depositPaid ? " paid" : " not paid"}
                  </p>
                )}
              </div>
              {(detailTarget.customerEmail || detailTarget.customerPhone) && (
                <p className="text-sm text-gray-400">
                  {detailTarget.customerEmail}
                  {detailTarget.customerEmail && detailTarget.customerPhone ? " · " : ""}
                  {detailTarget.customerPhone}
                </p>
              )}
              {detailTarget.notes && <p className="text-sm text-gray-500">"{detailTarget.notes}"</p>}

              <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-white/10">
                {(detailTarget.status === "confirmed" || detailTarget.status === "pending_payment") && (
                  <Button variant="outline" size="sm" className="border-white/10" onClick={() => openReschedule(detailTarget)}>
                    <RotateCcw className="w-4 h-4 mr-1" /> Reschedule
                  </Button>
                )}
                {detailTarget.status === "confirmed" && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-white/10 hover:border-green-500/40 hover:text-green-400"
                      onClick={() => {
                        updateStatus(detailTarget, "completed")
                        setDetailTarget(null)
                      }}
                    >
                      <Check className="w-4 h-4 mr-1" /> Completed
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-white/10 hover:border-red-500/40 hover:text-red-400"
                      onClick={() => {
                        updateStatus(detailTarget, "no_show")
                        setDetailTarget(null)
                      }}
                    >
                      <UserX className="w-4 h-4 mr-1" /> No-Show
                    </Button>
                  </>
                )}
                {(detailTarget.status === "confirmed" || detailTarget.status === "pending_payment") && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-white/10 hover:border-red-500/40 hover:text-red-400"
                    onClick={() => {
                      if (confirm(`Cancel ${detailTarget.customerName}'s ${detailTarget.serviceName} appointment?`)) {
                        updateStatus(detailTarget, "cancelled")
                        setDetailTarget(null)
                      }
                    }}
                  >
                    <X className="w-4 h-4 mr-1" /> Cancel
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!rescheduleTarget} onOpenChange={(open) => !open && setRescheduleTarget(null)}>
        <DialogContent className="bg-black border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Reschedule {rescheduleTarget?.customerName}</DialogTitle>
          </DialogHeader>
          {rescheduleTarget && (
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Date</label>
                <Input
                  type="date"
                  value={rescheduleDate}
                  onChange={(e) => {
                    setRescheduleDate(e.target.value)
                    fetchRescheduleSlots(rescheduleTarget._id, e.target.value)
                  }}
                  className="bg-white/5 border-white/10"
                />
              </div>

              <div>
                <label className="text-sm text-gray-400 mb-1 block">Available times</label>
                {loadingSlots ? (
                  <div className="grid grid-cols-3 gap-2">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-9 w-full" />
                    ))}
                  </div>
                ) : rescheduleSlots.length === 0 ? (
                  <div className="flex items-center gap-2 text-sm text-gray-500 py-4">
                    <AlertCircle className="w-4 h-4" /> No open times this day.
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto">
                    {rescheduleSlots.map((time) => (
                      <Button
                        key={time}
                        variant="outline"
                        disabled={savingReschedule}
                        onClick={() => confirmReschedule(time)}
                        className="border-white/10 hover:border-blue-500/40 hover:bg-blue-500/10"
                      >
                        {savingReschedule ? <Loader2 className="w-4 h-4 animate-spin" /> : formatTime12h(time)}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* New booking — the "+" button. Existing customers only; a true
          walk-in-right-now is already served by the QR check-in flow
          without needing a Booking record at all. */}
      <Dialog open={newBookingOpen} onOpenChange={setNewBookingOpen}>
        <DialogContent className="bg-black border-white/10 text-white max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Booking</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Customer</label>
              {newCustomerId && customers ? (
                <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-lg px-3 py-2">
                  <span>{customers.find((c) => c.id === newCustomerId)?.name}</span>
                  <button onClick={() => setNewCustomerId("")} className="text-gray-500 hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <>
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <Input
                      value={customerQuery}
                      onChange={(e) => setCustomerQuery(e.target.value)}
                      placeholder="Search by name, email, or phone"
                      className="bg-white/5 border-white/10 pl-9"
                    />
                  </div>
                  {!customers ? (
                    <Skeleton className="h-9 w-full mt-2" />
                  ) : (
                    <div className="max-h-40 overflow-y-auto mt-2 space-y-1">
                      {filteredCustomers.length === 0 ? (
                        <p className="text-sm text-gray-500 py-2">No matching customers.</p>
                      ) : (
                        filteredCustomers.map((c) => (
                          <button
                            key={c.id}
                            onClick={() => setNewCustomerId(c.id)}
                            className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/5 transition-colors"
                          >
                            <p className="text-sm font-medium">{c.name}</p>
                            <p className="text-xs text-gray-500">{c.email}{c.phone ? ` · ${c.phone}` : ""}</p>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            <div>
              <label className="text-sm text-gray-400 mb-1 block">Service</label>
              {!services ? (
                <Skeleton className="h-9 w-full" />
              ) : (
                <select
                  value={newServiceId}
                  onChange={(e) => {
                    setNewServiceId(e.target.value)
                    fetchNewSlots(e.target.value, newDate)
                  }}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">Select a service</option>
                  {services.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.name} ({s.durationMinutes} min){!s.isActive ? " — hidden" : ""}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="text-sm text-gray-400 mb-1 block">Date</label>
              <Input
                type="date"
                value={newDate}
                onChange={(e) => {
                  setNewDate(e.target.value)
                  if (newServiceId) fetchNewSlots(newServiceId, e.target.value)
                }}
                className="bg-white/5 border-white/10"
              />
            </div>

            <div>
              <label className="text-sm text-gray-400 mb-1 block">Time</label>
              {!newServiceId ? (
                <p className="text-sm text-gray-500 py-2">Pick a service first.</p>
              ) : loadingNewSlots ? (
                <div className="grid grid-cols-3 gap-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-9 w-full" />
                  ))}
                </div>
              ) : newSlots.length === 0 ? (
                <div className="flex items-center gap-2 text-sm text-gray-500 py-2">
                  <AlertCircle className="w-4 h-4" /> No open times this day.
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                  {newSlots.map((time) => (
                    <Button
                      key={time}
                      type="button"
                      variant="outline"
                      onClick={() => setNewTime(time)}
                      className={`border-white/10 hover:border-blue-500/40 hover:bg-blue-500/10 ${
                        newTime === time ? "border-blue-500 bg-blue-500/10" : ""
                      }`}
                    >
                      {formatTime12h(time)}
                    </Button>
                  ))}
                </div>
              )}
            </div>

            <Button
              onClick={submitNewBooking}
              disabled={!newCustomerId || !newServiceId || !newTime || savingNewBooking}
              className="w-full bg-white text-black hover:bg-gray-200"
            >
              {savingNewBooking ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add Booking"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
