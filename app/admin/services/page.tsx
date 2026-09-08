"use client"

import { useState, useEffect, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { GlassCard } from "@/components/ui/glass-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Navbar } from "@/components/navbar"
import { useToast } from "@/hooks/use-toast"
import { Skeleton } from "@/components/ui/skeleton"
import { Plus, Trash2, Pencil, Loader2, Info, ListChecks, AlertCircle, X, EyeOff, Eye } from "lucide-react"

interface ServiceItem {
  _id: string
  name: string
  category: string
  description: string
  price: number | null
  priceVaries: boolean
  durationMinutes: number
  isActive: boolean
  sortOrder: number
  depositRequired: boolean
  depositAmount: number | null
}

const emptyForm = {
  name: "",
  category: "",
  description: "",
  price: "",
  priceVaries: false,
  durationMinutes: "",
  depositRequired: false,
  depositAmount: "",
}

export default function AdminServicesPage() {
  const [services, setServices] = useState<ServiceItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  const fetchServices = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const token = localStorage.getItem("token")
      const res = await fetch("/api/admin/services", {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (data.success) {
        setServices(data.services || [])
      } else {
        throw new Error(data.error || "Failed to load services")
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchServices()
  }, [])

  const categories = useMemo(
    () => Array.from(new Set(services.map((s) => s.category))).sort(),
    [services]
  )

  const grouped = useMemo(() => {
    const groups: Record<string, ServiceItem[]> = {}
    for (const s of services) {
      if (!groups[s.category]) groups[s.category] = []
      groups[s.category].push(s)
    }
    return groups
  }, [services])

  const resetForm = () => {
    setForm(emptyForm)
    setEditingId(null)
  }

  const startEdit = (service: ServiceItem) => {
    setEditingId(service._id)
    setForm({
      name: service.name,
      category: service.category,
      description: service.description,
      price: service.priceVaries ? "" : String(service.price ?? ""),
      priceVaries: service.priceVaries,
      durationMinutes: String(service.durationMinutes),
      depositRequired: service.depositRequired,
      depositAmount: service.depositAmount ? String(service.depositAmount) : "",
    })
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.category.trim() || !form.durationMinutes) {
      toast({ title: "Missing info", description: "Name, category, and duration are required.", variant: "destructive" })
      return
    }
    if (form.depositRequired && (!form.depositAmount || Number(form.depositAmount) <= 0)) {
      toast({ title: "Missing info", description: "Set a deposit amount, or turn off the deposit requirement.", variant: "destructive" })
      return
    }

    setSaving(true)
    try {
      const token = localStorage.getItem("token")
      const payload = {
        name: form.name.trim(),
        category: form.category.trim(),
        description: form.description.trim(),
        durationMinutes: Number(form.durationMinutes),
        priceVaries: form.priceVaries,
        price: form.priceVaries ? null : Number(form.price) || 0,
        depositRequired: form.depositRequired,
        depositAmount: form.depositRequired ? Number(form.depositAmount) : null,
      }

      const res = await fetch(
        editingId ? `/api/admin/services/${editingId}` : "/api/admin/services",
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload),
        }
      )
      const data = await res.json()
      if (data.success) {
        toast({ title: editingId ? "Service updated" : "Service added" })
        resetForm()
        fetchServices()
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" })
      }
    } catch (err) {
      toast({ title: "Error", description: "Something went wrong.", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (service: ServiceItem) => {
    try {
      const token = localStorage.getItem("token")
      const res = await fetch(`/api/admin/services/${service._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ isActive: !service.isActive }),
      })
      const data = await res.json()
      if (data.success) {
        setServices((prev) => prev.map((s) => (s._id === service._id ? data.service : s)))
      }
    } catch (err) {
      toast({ title: "Error", description: "Failed to update service.", variant: "destructive" })
    }
  }

  const deleteService = async (service: ServiceItem) => {
    if (!confirm(`Remove "${service.name}"? This can't be undone.`)) return
    try {
      const token = localStorage.getItem("token")
      const res = await fetch(`/api/admin/services/${service._id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (data.success) {
        setServices((prev) => prev.filter((s) => s._id !== service._id))
        toast({ title: "Service removed" })
      }
    } catch (err) {
      toast({ title: "Error", description: "Failed to remove service.", variant: "destructive" })
    }
  }

  return (
    <div className="min-h-screen bg-black text-white pb-20">
      <Navbar />
      <div className="pt-24 px-4 max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Services</h1>
          <p className="text-gray-400">
            The menu customers will pick from when booking — each service's length is what the calendar uses to size appointments.
          </p>
        </div>

        {error && (
          <div className="mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3 text-red-400">
              <AlertCircle className="w-5 h-5" />
              <p>{error}</p>
            </div>
            <Button onClick={fetchServices} size="sm" variant="outline" className="border-red-500/30 text-red-400 hover:bg-red-500/10">
              Try Again
            </Button>
          </div>
        )}

        <GlassCard className="mb-10 space-y-4 border-blue-500/10">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">{editingId ? "Edit Service" : "Add a Service"}</h2>
            {editingId && (
              <button onClick={resetForm} className="text-gray-400 hover:text-white flex items-center gap-1 text-sm">
                <X className="w-4 h-4" /> Cancel edit
              </button>
            )}
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="svc-name">Name</Label>
              <Input
                id="svc-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g., Skin Fade"
                className="bg-white/5 border-white/10"
              />
            </div>
            <div>
              <Label htmlFor="svc-category">Category</Label>
              <Input
                id="svc-category"
                list="svc-categories"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                placeholder="e.g., Popular Services"
                className="bg-white/5 border-white/10"
              />
              <datalist id="svc-categories">
                {categories.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
          </div>

          <div>
            <Label htmlFor="svc-desc">Description (optional)</Label>
            <Textarea
              id="svc-desc"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Short details shown under the name"
              className="bg-white/5 border-white/10"
              rows={2}
            />
          </div>

          <div className="grid sm:grid-cols-3 gap-4 items-end">
            <div>
              <Label htmlFor="svc-duration">Duration (minutes)</Label>
              <Input
                id="svc-duration"
                type="number"
                min={5}
                step={5}
                value={form.durationMinutes}
                onChange={(e) => setForm({ ...form, durationMinutes: e.target.value })}
                placeholder="30"
                className="bg-white/5 border-white/10"
              />
            </div>
            <div>
              <Label htmlFor="svc-price">Price ($)</Label>
              <Input
                id="svc-price"
                type="number"
                min={0}
                step={1}
                disabled={form.priceVaries}
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                placeholder="45"
                className="bg-white/5 border-white/10 disabled:opacity-40"
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-300 pb-2.5">
              <input
                type="checkbox"
                checked={form.priceVaries}
                onChange={(e) => setForm({ ...form, priceVaries: e.target.checked })}
                className="rounded border-white/20 bg-white/5"
              />
              Price varies
            </label>
          </div>

          <div className="flex flex-wrap items-end gap-4 bg-white/5 p-3 rounded-lg border border-white/5">
            <label className="flex items-center gap-2 text-sm text-gray-300">
              <input
                type="checkbox"
                checked={form.depositRequired}
                onChange={(e) => setForm({ ...form, depositRequired: e.target.checked })}
                className="rounded border-white/20 bg-white/5"
              />
              Require a deposit to book online
            </label>
            {form.depositRequired && (
              <div>
                <Label htmlFor="svc-deposit">Deposit amount ($)</Label>
                <Input
                  id="svc-deposit"
                  type="number"
                  min={1}
                  step={1}
                  value={form.depositAmount}
                  onChange={(e) => setForm({ ...form, depositAmount: e.target.value })}
                  placeholder="75"
                  className="bg-white/5 border-white/10 w-32"
                />
              </div>
            )}
          </div>

          <Button
            onClick={handleSubmit}
            disabled={saving}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-900/20"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4 mr-1" />}
            {editingId ? "Save Changes" : "Add Service"}
          </Button>
        </GlassCard>

        <div className="space-y-8">
          {isLoading ? (
            [1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)
          ) : services.length === 0 ? (
            <div className="text-center py-16 text-gray-500 border-2 border-dashed border-white/5 rounded-xl">
              <ListChecks className="w-8 h-8 mx-auto mb-2 opacity-20" />
              <p>No services yet — add the first one above.</p>
            </div>
          ) : (
            Object.entries(grouped).map(([category, items]) => (
              <div key={category}>
                <h3 className="text-sm font-bold uppercase tracking-wide text-gray-400 mb-3 ml-1">{category}</h3>
                <div className="space-y-2">
                  <AnimatePresence initial={false}>
                    {items.map((service) => (
                      <motion.div
                        key={service._id}
                        layout
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.97 }}
                        className={`flex items-center justify-between gap-4 bg-white/5 p-4 rounded-xl border transition-all ${
                          service.isActive ? "border-white/5" : "border-white/5 opacity-50"
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{service.name}</span>
                            {!service.isActive && (
                              <span className="text-xs text-gray-500 border border-white/10 rounded-full px-2 py-0.5">Hidden</span>
                            )}
                          </div>
                          {service.description && (
                            <p className="text-sm text-gray-300 truncate">{service.description}</p>
                          )}
                          <p className="text-sm text-gray-400 mt-0.5">
                            {service.durationMinutes} min · {service.priceVaries ? "Varies" : `$${service.price?.toFixed(2)}`}
                            {service.depositRequired && (
                              <span className="text-amber-400"> · ${service.depositAmount?.toFixed(2)} deposit</span>
                            )}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => toggleActive(service)}
                            title={service.isActive ? "Hide from booking" : "Show in booking"}
                            className="text-gray-500 hover:text-white transition-all p-2 hover:bg-white/10 rounded-lg"
                          >
                            {service.isActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => startEdit(service)}
                            title="Edit"
                            className="text-gray-500 hover:text-blue-400 transition-all p-2 hover:bg-blue-500/10 rounded-lg"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteService(service)}
                            title="Delete"
                            className="text-gray-500 hover:text-red-400 transition-all p-2 hover:bg-red-500/10 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            ))
          )}
        </div>

        <GlassCard className="mt-12 p-6 border-white/5 bg-white/5 flex items-start gap-4">
          <Info className="w-6 h-6 text-gray-400 shrink-0 mt-1" />
          <div>
            <h3 className="font-bold mb-1">About the service catalog</h3>
            <p className="text-sm text-gray-400">
              This list is what customers will pick from when booking. Hiding a service keeps it here for your records without showing
              it to customers — deleting removes it entirely.
            </p>
          </div>
        </GlassCard>
      </div>
    </div>
  )
}
