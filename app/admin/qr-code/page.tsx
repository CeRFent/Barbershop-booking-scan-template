"use client"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { GlassCard } from "@/components/ui/glass-card"
import { Button } from "@/components/ui/button"
import { Navbar } from "@/components/navbar"
import { useToast } from "@/hooks/use-toast"
import { QrCode, Download, Printer, Copy, RefreshCw, Sparkles, Scissors, UserCheck, CalendarCheck, Users } from "lucide-react"
import { useRouter } from "next/navigation"
import { parseJWT } from "@/lib/jwt-utils"
import { brand } from "@/lib/brand-config"

interface AdminProfile {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface CheckinEvent {
  _id: string
  customerName: string
  cutRedeemed: boolean
  isNewCustomer: boolean
  hasBookingToday: boolean
  createdAt: string
}

const POLL_INTERVAL_MS = 3000
const POPUP_DISPLAY_MS = 6000

export default function QRCodePage() {
  const [profile, setProfile] = useState<AdminProfile | null>(null)
  const [shopToken, setShopToken] = useState<string>("")
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [activeCheckin, setActiveCheckin] = useState<CheckinEvent | null>(null)
  const queueRef = useRef<CheckinEvent[]>([])
  const sinceRef = useRef<string>(new Date().toISOString())
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      const timeout = setTimeout(() => {
        setLoading(false)
        toast({
          title: "Timeout",
          description: "Authentication check timed out.",
          variant: "destructive",
        })
        router.push("/login")
      }, 10000)

      try {
        const token = localStorage.getItem('token')
        if (!token) {
          clearTimeout(timeout)
          router.push("/login")
          return
        }
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

        setProfile({
          id: userData.userId,
          name: userData.name || userData.email,
          email: userData.email,
          role: userData.role
        })

        await fetchShopToken(userData.userId)
        clearTimeout(timeout)
      } catch (error) {
        console.error('Error parsing token:', error)
        localStorage.removeItem('token')
        clearTimeout(timeout)
        router.push("/login")
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [router, toast])

  // Live check-in feed for this tablet screen — poll rather than push
  // (see app/api/admin/recent-scans for why). sinceRef starts at mount
  // time so reloading this page never replays a shift's worth of history
  // as fresh popups. queueRef/showingRef are refs (not state) because
  // they're driven from a setInterval closure and a setTimeout callback,
  // not from renders — a ref update alone wouldn't otherwise trigger the
  // next popup to appear, so tryAdvance() is called explicitly from both
  // places instead of relying on an effect keyed off state.
  useEffect(() => {
    if (!profile) return
    const showingRef = { current: false }

    const tryAdvance = () => {
      if (showingRef.current || queueRef.current.length === 0) return
      const next = queueRef.current.shift()!
      showingRef.current = true
      setActiveCheckin(next)
      setTimeout(() => {
        showingRef.current = false
        setActiveCheckin(null)
        tryAdvance()
      }, POPUP_DISPLAY_MS)
    }

    const poll = async () => {
      try {
        const token = localStorage.getItem('token')
        const res = await fetch(`/api/admin/recent-scans?since=${encodeURIComponent(sinceRef.current)}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await res.json()
        if (data.success) {
          if (data.events.length > 0) {
            queueRef.current.push(...data.events)
            tryAdvance()
          }
          sinceRef.current = data.serverTime
        }
      } catch {
        // A missed poll just gets caught on the next tick — nothing to
        // surface for a background check-in feed.
      }
    }

    poll()
    const interval = setInterval(poll, POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [profile])

  const fetchShopToken = async (adminId: string) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/admin/shop-token/${adminId}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      if (!response.ok) throw new Error('Failed to fetch shop token')

      const data = await response.json()
      setShopToken(data.token)
      generateQRCode(data.token)
    } catch (error) {
      console.error('Error fetching shop token:', error)
      toast({
        title: "Error",
        description: "Failed to fetch shop token",
        variant: "destructive",
      })
    }
  }

  const generateQRCode = async (token: string) => {
    try {
      // Encode RAW token for faster scanning and better sync
      const QRCodeLib = (await import("qrcode")).default
      const qrDataUrl = await QRCodeLib.toDataURL(token, {
        width: 400,
        margin: 2,
        color: { dark: "#000000", light: "#FFFFFF" },
        errorCorrectionLevel: 'H' // High error correction for reliability
      })

      setQrCodeUrl(qrDataUrl)
    } catch (error) {
      console.error("Error generating QR code:", error)
    }
  }

  const copyToken = () => {
    navigator.clipboard.writeText(shopToken)
    toast({ title: "Copied!", description: "Full token copied" })
  }

  const copyShortToken = () => {
    const short = shopToken.slice(-4)
    navigator.clipboard.writeText(short)
    toast({ title: "Copied!", description: "Short code (last 4 chars) copied" })
  }

  const downloadQR = () => {
    if (!qrCodeUrl) return
    const link = document.createElement("a")
    link.download = `${brand.name.toLowerCase().replace(/\s+/g, "-")}-qr-${profile?.name?.replace(/\s+/g, "-") || "barber"}.png`
    link.href = qrCodeUrl
    link.click()
    toast({ title: "Download Started", description: "QR code image downloaded" })
  }

  const printQR = () => {
    const printWindow = window.open("", "_blank")
    if (printWindow && qrCodeUrl) {
      const shortCode = shopToken.slice(-4)
      printWindow.document.write(`
        <html>
          <head>
            <title>${brand.name} QR - ${profile?.name}</title>
            <style>
              body { font-family: sans-serif; text-align: center; padding: 40px; background: white; color: black; }
              .qr-container { border: 4px solid #000; padding: 20px; display: inline-block; margin: 20px; border-radius: 20px; }
              h1 { font-size: 48px; margin: 0; }
              .short-code { font-size: 32px; font-weight: bold; margin-top: 10px; border: 2px dashed #000; padding: 10px; display: inline-block; }
              .instructions { margin-top: 30px; font-size: 18px; max-width: 500px; margin-left: auto; margin-right: auto; line-height: 1.5; }
            </style>
          </head>
          <body>
            <h1>${brand.name}</h1>
            <h2>${profile?.name || "Barber"}</h2>
            <div class="qr-container">
              <img src="${qrCodeUrl}" width="350" />
            </div>
            <div>
              <p>Manual Entry Code:</p>
              <div class="short-code">${shortCode}</div>
            </div>
            <div class="instructions">
              <p><strong>Instructions for Clients:</strong></p>
              <p>1. Open the ${brand.name} app and tap "Use Cut"</p>
              <p>2. Scan this QR code OR enter the 4-character code above</p>
              <p>3. Show the success screen to your barber</p>
            </div>
          </body>
        </html>
      `)
      printWindow.document.close()
      printWindow.focus()
      printWindow.print()
    }
  }

  const regenerateToken = async () => {
    if (!profile) return
    if (!window.confirm("Generate a new code? The current QR code and 4-character code will stop working immediately — any printed copies posted in the shop will need to be replaced.")) {
      return
    }
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/admin/shop-token/${profile.id}/regenerate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!response.ok) throw new Error('Failed to regenerate token')
      const data = await response.json()
      setShopToken(data.token)
      generateQRCode(data.token)
      toast({ title: "New Code Generated", description: "QR code updated successfully" })
    } catch (error) {
      toast({ title: "Error", description: "Failed to regenerate", variant: "destructive" })
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-foreground mx-auto mb-4"></div>
          <p>Loading your shop token...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <div className="pt-24 pb-12 px-4 max-w-4xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
          <QrCode className="w-16 h-16 mx-auto mb-4 text-foreground" />
          <h1 className="text-4xl font-bold mb-4">Your Shop QR Code</h1>
          <p className="text-muted-foreground">Display this for clients to check-in or redeem cuts</p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8">
          <GlassCard className="text-center p-8">
            <div className="bg-foreground p-4 rounded-2xl mb-6 mx-auto inline-block">
              {qrCodeUrl && <img src={qrCodeUrl} alt="QR Code" className="w-64 h-64" />}
            </div>
            
            <div className="mb-6">
              <p className="text-sm text-muted-foreground mb-1">Manual Entry Code:</p>
              <p className="text-3xl font-mono font-bold tracking-widest text-foreground border-2 border-foreground/20 rounded-xl py-3 bg-foreground/5">
                {shopToken.slice(-4)}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button onClick={copyShortToken} variant="outline" className="border-foreground/20 hover:bg-foreground/5">Copy Code</Button>
              <Button onClick={downloadQR} variant="outline" className="border-foreground/20 hover:bg-foreground/5">Download</Button>
              <Button onClick={printQR} variant="outline" className="border-foreground/20 hover:bg-foreground/5">Print</Button>
              <Button onClick={regenerateToken} variant="outline" className="border-red-500/50 text-red-400 hover:bg-red-500/10">New Code</Button>
            </div>
          </GlassCard>

          <GlassCard className="p-8">
            <h2 className="text-xl font-bold mb-6">Barber Instructions</h2>
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-foreground text-background flex items-center justify-center font-bold shrink-0">1</div>
                <p className="text-gray-300">Show the QR code or the 4-character code to your client.</p>
              </div>
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-foreground text-background flex items-center justify-center font-bold shrink-0">2</div>
                <p className="text-gray-300">Client scans the code using the "Use Cut" button on their dashboard.</p>
              </div>
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-foreground text-background flex items-center justify-center font-bold shrink-0">3</div>
                <p className="text-gray-300">If the camera fails, they can type the 4-character code manually.</p>
              </div>
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-foreground text-background flex items-center justify-center font-bold shrink-0">4</div>
                <p className="text-gray-300">VERIFY their success screen (Cut Redeemed vs. Visit Only) before starting.</p>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>

      <AnimatePresence>
        {activeCheckin && (
          <motion.div
            key={activeCheckin._id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-6"
          >
            <motion.div
              initial={{ scale: 0.85, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: "spring", damping: 16, stiffness: 220 }}
              className="w-full max-w-md text-center"
            >
              <GlassCard className="p-10 border-primary/30">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.1, type: "spring", damping: 12 }}
                >
                  {activeCheckin.cutRedeemed ? (
                    <Scissors className="w-16 h-16 mx-auto mb-4 text-primary" />
                  ) : (
                    <UserCheck className="w-16 h-16 mx-auto mb-4 text-primary" />
                  )}
                </motion.div>
                <p className="text-3xl font-bold mb-2">{activeCheckin.customerName}</p>
                <p className="text-muted-foreground mb-6">{activeCheckin.cutRedeemed ? "Haircut redeemed" : "Checked in"}</p>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 text-sm font-medium rounded-full px-3 py-1.5 ${
                      activeCheckin.isNewCustomer
                        ? "bg-purple-500/15 text-purple-300 border border-purple-500/30"
                        : "bg-foreground/5 text-gray-300 border border-foreground/10"
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    {activeCheckin.isNewCustomer ? "New Customer" : "Returning Customer"}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1.5 text-sm font-medium rounded-full px-3 py-1.5 ${
                      activeCheckin.hasBookingToday
                        ? "bg-green-500/15 text-green-300 border border-green-500/30"
                        : "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                    }`}
                  >
                    {activeCheckin.hasBookingToday ? <CalendarCheck className="w-3.5 h-3.5" /> : <Users className="w-3.5 h-3.5" />}
                    {activeCheckin.hasBookingToday ? "Booked Appointment" : "Walk-in"}
                  </span>
                </div>
              </GlassCard>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
