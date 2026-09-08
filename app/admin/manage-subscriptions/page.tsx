"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { GlassCard } from '@/components/ui/glass-card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { Navbar } from '@/components/navbar'
import { useRouter } from 'next/navigation'
import { parseJWT } from '@/lib/jwt-utils'
import { Loader2, Settings, CheckCircle2 } from 'lucide-react'

const ACTIONS = [
  { value: 'get_info', label: 'Get Subscription Info' },
  { value: 'update_price', label: 'Update Price' },
  { value: 'pause', label: 'Pause Subscription' },
  { value: 'resume', label: 'Resume Subscription' },
  { value: 'cancel', label: 'Cancel at Period End' },
  { value: 'cancel_immediately', label: 'Cancel Immediately' },
]

// Actions that change real billing state and deserve a confirmation before
// firing — get_info and update_price are read/blocked, everything else
// actually touches the customer's Stripe subscription.
const CONFIRM_ACTIONS = new Set(['pause', 'resume', 'cancel', 'cancel_immediately'])

const CONFIRM_MESSAGES: Record<string, string> = {
  pause: "Pause this customer's subscription? They'll stop being billed and stop receiving cuts until resumed.",
  resume: "Resume this customer's subscription? Billing and cuts will pick back up.",
  cancel: "Cancel this customer's subscription at the end of their current period? They'll keep access until then, but it will not renew.",
  cancel_immediately: "Cancel this customer's subscription RIGHT NOW? This ends their access immediately and cannot be undone from here.",
}

function formatLabel(key: string) {
  return key.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase())
}

function formatValue(key: string, value: any) {
  if (value === null || value === undefined || value === '') return '—'
  if (key.toLowerCase().includes('period') || key.toLowerCase() === 'lastrenewal' || key.toLowerCase() === 'nextrenewal') {
    const d = new Date(value)
    if (!isNaN(d.getTime())) return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  }
  return String(value)
}

export default function ManageSubscriptions() {
  const [email, setEmail] = useState('')
  const [action, setAction] = useState('get_info')
  const [newPriceId, setNewPriceId] = useState('')
  const [loading, setLoading] = useState(false)
  const [authLoading, setAuthLoading] = useState(true)
  const [result, setResult] = useState<any>(null)
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token')
      if (!token) {
        router.push("/login")
        return
      }

      try {
        const userData = parseJWT(token)
        if (!userData || userData.role !== 'admin') {
          toast({
            title: "Access Denied",
            description: "You don't have permission to access this page.",
            variant: "destructive",
          })
          router.push("/dashboard")
          return
        }
        setAuthLoading(false)
      } catch (error) {
        localStorage.removeItem('token')
        router.push("/login")
      }
    }
    checkAuth()
  }, [router, toast])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (CONFIRM_ACTIONS.has(action)) {
      const confirmed = window.confirm(`${CONFIRM_MESSAGES[action]}\n\nCustomer: ${email}`)
      if (!confirmed) return
    }

    setLoading(true)
    setResult(null)

    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/manage-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          email,
          action,
          newPriceId: action === 'update_price' ? newPriceId : undefined,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setResult(data)
        toast({
          title: "Success",
          description: data.message,
        })
      } else {
        toast({
          title: "Error",
          description: data.message || 'Something went wrong',
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to manage subscription",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground pb-24">
      <Navbar />
      <div className="pt-24 px-4 max-w-2xl mx-auto">
        <div className="mb-8 text-center">
          <Settings className="w-12 h-12 mx-auto mb-4 text-foreground" />
          <h1 className="text-3xl font-bold mb-2">Manage Subscriptions</h1>
          <p className="text-muted-foreground">Look up or act on a customer's subscription by email — for support cases handled outside the normal flow.</p>
        </div>

        <GlassCard>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email" className="text-muted-foreground mb-1 block">Customer Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="customer@example.com"
                required
                className="bg-foreground/5 border-foreground/10"
              />
            </div>

            <div>
              <Label className="text-muted-foreground mb-1 block">Action</Label>
              <Select value={action} onValueChange={setAction}>
                <SelectTrigger className="bg-foreground/5 border-foreground/10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACTIONS.map((a) => (
                    <SelectItem key={a.value} value={a.value}>
                      {a.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {action === 'update_price' && (
              <div>
                <Label htmlFor="newPriceId" className="text-muted-foreground mb-1 block">New Price ID</Label>
                <Input
                  id="newPriceId"
                  value={newPriceId}
                  onChange={(e) => setNewPriceId(e.target.value)}
                  placeholder="price_1234567890"
                  required
                  className="bg-foreground/5 border-foreground/10"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Get price IDs from Stripe Dashboard → Products → Select Product → Pricing
                </p>
              </div>
            )}

            <Button type="submit" disabled={loading} className="w-full bg-foreground text-background hover:bg-foreground/90">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Execute Action'}
            </Button>
          </form>
        </GlassCard>

        {result && (
          <GlassCard className="mt-6">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" />
              <h3 className="font-bold">{result.message || 'Done'}</h3>
            </div>
            {result.subscription && (
              <div className="divide-y divide-foreground/10 border border-foreground/10 rounded-lg overflow-hidden">
                {Object.entries(result.subscription).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between px-4 py-2.5 text-sm">
                    <span className="text-muted-foreground">{formatLabel(key)}</span>
                    <span className="text-foreground font-medium">{formatValue(key, value)}</span>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
        )}
      </div>
    </div>
  )
}
