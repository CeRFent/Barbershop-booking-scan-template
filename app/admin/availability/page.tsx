"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { GlassCard } from "@/components/ui/glass-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Navbar } from "@/components/navbar"
import { useToast } from "@/hooks/use-toast"
import { Skeleton } from "@/components/ui/skeleton"
import { Save, Trash2, Plus, Loader2, Info, CalendarClock, AlertCircle } from "lucide-react"

interface DayHours {
  dayOfWeek: number
  isOpen: boolean
  openTime: string | null
  closeTime: string | null
}

interface OverrideItem {
  _id: string
  date: string
  isOpen: boolean
  openTime: string | null
  closeTime: string | null
  note: string
}

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

const emptyOverrideForm = { date: "", isOpen: false, openTime: "09:00", closeTime: "17:00", note: "" }

export default function AvailabilityPage() {
  const [weeklyHours, setWeeklyHours] = useState<DayHours[]>([])
  const [overrides, setOverrides] = useState<OverrideItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [savingHours, setSavingHours] = useState(false)
  const [overrideForm, setOverrideForm] = useState(emptyOverrideForm)
  const [savingOverride, setSavingOverride] = useState(false)
  const { toast } = useToast()

  const fetchAll = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const token = localStorage.getItem("token")
      const headers = { Authorization: `Bearer ${token}` }

      const [hoursRes, overridesRes] = await Promise.all([
        fetch("/api/admin/availability", { headers }),
        fetch("/api/admin/availability/overrides", { headers }),
      ])
      const hoursData = await hoursRes.json()
      const overridesData = await overridesRes.json()

      if (hoursData.success) setWeeklyHours(hoursData.weeklyHours)
      else throw new Error(hoursData.error || "Failed to load hours")

      if (overridesData.success) setOverrides(overridesData.overrides || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchAll()
  }, [])

  const updateDay = (dayOfWeek: number, updates: Partial<DayHours>) => {
    setWeeklyHours((prev) => prev.map((d) => (d.dayOfWeek === dayOfWeek ? { ...d, ...updates } : d)))
  }

  const saveHours = async () => {
    setSavingHours(true)
    try {
      const token = localStorage.getItem("token")
      const res = await fetch("/api/admin/availability", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ weeklyHours }),
      })
      const data = await res.json()
      if (data.success) {
        setWeeklyHours(data.weeklyHours)
        toast({ title: "Hours saved" })
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" })
      }
    } catch (err) {
      toast({ title: "Error", description: "Something went wrong.", variant: "destructive" })
    } finally {
      setSavingHours(false)
    }
  }

  const addOverride = async () => {
    if (!overrideForm.date) {
      toast({ title: "Pick a date first", variant: "destructive" })
      return
    }
    setSavingOverride(true)
    try {
      const token = localStorage.getItem("token")
      const res = await fetch("/api/admin/availability/overrides", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(overrideForm),
      })
      const data = await res.json()
      if (data.success) {
        toast({ title: "Exception saved" })
        setOverrideForm(emptyOverrideForm)
        fetchAll()
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" })
      }
    } catch (err) {
      toast({ title: "Error", description: "Something went wrong.", variant: "destructive" })
    } finally {
      setSavingOverride(false)
    }
  }

  const deleteOverride = async (override: OverrideItem) => {
    if (!window.confirm(`Remove the ${formatDate(override.date)} exception? Hours for that date will go back to the normal weekly schedule.`)) {
      return
    }
    try {
      const token = localStorage.getItem("token")
      const res = await fetch(`/api/admin/availability/overrides/${override._id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (data.success) {
        setOverrides((prev) => prev.filter((o) => o._id !== override._id))
        toast({ title: "Exception removed" })
      }
    } catch (err) {
      toast({ title: "Error", description: "Failed to remove.", variant: "destructive" })
    }
  }

  const formatDate = (dateStr: string) => {
    const [y, m, d] = dateStr.split("-").map(Number)
    return new Date(y, m - 1, d).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
  }

  return (
    <div className="min-h-screen bg-black text-white pb-20">
      <Navbar />
      <div className="pt-24 px-4 max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Hours</h1>
          <p className="text-gray-400">Your working hours and any one-off exceptions — this is what the booking calendar reads from.</p>
        </div>

        {error && (
          <div className="mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3 text-red-400">
              <AlertCircle className="w-5 h-5" />
              <p>{error}</p>
            </div>
            <Button onClick={fetchAll} size="sm" variant="outline" className="border-red-500/30 text-red-400 hover:bg-red-500/10">
              Try Again
            </Button>
          </div>
        )}

        {isLoading ? (
          <div className="space-y-2 mb-10">
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : (
          <GlassCard className="mb-10 border-blue-500/10">
            <h2 className="text-lg font-bold mb-4">Weekly Hours</h2>
            <div className="space-y-2">
              {weeklyHours.map((day) => (
                <div
                  key={day.dayOfWeek}
                  className="flex flex-wrap items-center gap-3 bg-white/5 p-3 rounded-lg border border-white/5"
                >
                  <label className="flex items-center gap-2 w-32 shrink-0 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={day.isOpen}
                      onChange={(e) =>
                        updateDay(day.dayOfWeek, {
                          isOpen: e.target.checked,
                          openTime: e.target.checked ? day.openTime || "09:00" : day.openTime,
                          closeTime: e.target.checked ? day.closeTime || "17:00" : day.closeTime,
                        })
                      }
                      className="rounded border-white/20 bg-white/5"
                    />
                    <span className="font-medium">{DAY_NAMES[day.dayOfWeek]}</span>
                  </label>

                  {day.isOpen ? (
                    <div className="flex items-center gap-2 flex-1 min-w-[220px]">
                      <Input
                        type="time"
                        value={day.openTime || "09:00"}
                        onChange={(e) => updateDay(day.dayOfWeek, { openTime: e.target.value })}
                        className="bg-white/5 border-white/10 w-32"
                      />
                      <span className="text-gray-500">to</span>
                      <Input
                        type="time"
                        value={day.closeTime || "17:00"}
                        onChange={(e) => updateDay(day.dayOfWeek, { closeTime: e.target.value })}
                        className="bg-white/5 border-white/10 w-32"
                      />
                    </div>
                  ) : (
                    <span className="text-gray-500 text-sm">Closed</span>
                  )}
                </div>
              ))}
            </div>
            <Button
              onClick={saveHours}
              disabled={savingHours}
              className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-900/20"
            >
              {savingHours ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
              Save Hours
            </Button>
          </GlassCard>
        )}

        <GlassCard className="mb-10 space-y-4 border-white/5">
          <h2 className="text-lg font-bold">Add an Exception</h2>
          <p className="text-sm text-gray-500 -mt-2">A holiday, a short day, or an extra open day — overrides your normal weekly hours for one specific date.</p>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="ov-date">Date</Label>
              <Input
                id="ov-date"
                type="date"
                value={overrideForm.date}
                onChange={(e) => setOverrideForm({ ...overrideForm, date: e.target.value })}
                className="bg-white/5 border-white/10"
              />
            </div>
            <div>
              <Label htmlFor="ov-note">Note (optional)</Label>
              <Input
                id="ov-note"
                value={overrideForm.note}
                onChange={(e) => setOverrideForm({ ...overrideForm, note: e.target.value })}
                placeholder="e.g., Christmas"
                className="bg-white/5 border-white/10"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-300">
            <input
              type="checkbox"
              checked={overrideForm.isOpen}
              onChange={(e) => setOverrideForm({ ...overrideForm, isOpen: e.target.checked })}
              className="rounded border-white/20 bg-white/5"
            />
            Open this day (leave unchecked to mark it closed)
          </label>

          {overrideForm.isOpen && (
            <div className="flex items-center gap-2">
              <Input
                type="time"
                value={overrideForm.openTime}
                onChange={(e) => setOverrideForm({ ...overrideForm, openTime: e.target.value })}
                className="bg-white/5 border-white/10 w-32"
              />
              <span className="text-gray-500">to</span>
              <Input
                type="time"
                value={overrideForm.closeTime}
                onChange={(e) => setOverrideForm({ ...overrideForm, closeTime: e.target.value })}
                className="bg-white/5 border-white/10 w-32"
              />
            </div>
          )}

          <Button
            onClick={addOverride}
            disabled={savingOverride}
            className="w-full bg-white text-black hover:bg-gray-200"
          >
            {savingOverride ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4 mr-1" />}
            Add Exception
          </Button>
        </GlassCard>

        <div>
          <h2 className="text-lg font-bold mb-3">Upcoming Exceptions</h2>
          {overrides.length === 0 ? (
            <div className="text-center py-12 text-gray-500 border-2 border-dashed border-white/5 rounded-xl">
              <CalendarClock className="w-8 h-8 mx-auto mb-2 opacity-20" />
              <p>No exceptions coming up.</p>
            </div>
          ) : (
            <div className="space-y-2">
              <AnimatePresence initial={false}>
                {overrides.map((override) => (
                  <motion.div
                    key={override._id}
                    layout
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.97 }}
                    className="flex items-center justify-between gap-4 bg-white/5 p-4 rounded-xl border border-white/5"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{formatDate(override.date)}</span>
                        <span className={`text-xs rounded-full px-2 py-0.5 ${override.isOpen ? "border border-green-500/30 text-green-400" : "border border-red-500/30 text-red-400"}`}>
                          {override.isOpen ? `Open ${override.openTime}–${override.closeTime}` : "Closed"}
                        </span>
                      </div>
                      {override.note && <p className="text-sm text-gray-500 mt-0.5">{override.note}</p>}
                    </div>
                    <button
                      onClick={() => deleteOverride(override)}
                      title="Remove"
                      className="text-gray-500 hover:text-red-400 transition-all p-2 hover:bg-red-500/10 rounded-lg shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        <GlassCard className="mt-12 p-6 border-white/5 bg-white/5 flex items-start gap-4">
          <Info className="w-6 h-6 text-gray-400 shrink-0 mt-1" />
          <div>
            <h3 className="font-bold mb-1">How this is used</h3>
            <p className="text-sm text-gray-400">
              When customers book, the calendar only offers times inside your open hours for that day — using an exception if one exists for that
              date, otherwise your normal weekly hours.
            </p>
          </div>
        </GlassCard>
      </div>
    </div>
  )
}
