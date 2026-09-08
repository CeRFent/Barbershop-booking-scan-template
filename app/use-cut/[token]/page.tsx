"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { GlassCard } from "@/components/ui/glass-card"
import { Button } from "@/components/ui/button"
import { Navbar } from "@/components/navbar"
import { useToast } from "@/hooks/use-toast"
import { CheckCircle, Loader2, Scissors, AlertCircle } from "lucide-react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { parseJWT } from "@/lib/jwt-utils"

export default function UseCutPage() {
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [scanResult, setScanResult] = useState<{type: string, message: string} | null>(null)

  const { toast } = useToast()
  const params = useParams()
  const router = useRouter()
  const token = params?.token as string

  useEffect(() => {
    const checkAuth = async () => {
      const authToken = localStorage.getItem("token")
      if (!authToken) {
        router.push(`/login?redirect=/use-cut/${token}`)
        return
      }

      try {
        const payload = parseJWT(authToken)
        if (!payload) throw new Error("Invalid token")
        // Just confirm the session is valid — redemption requires an explicit
        // tap below, so a bookmarked or screenshotted link can't silently
        // burn a cut just by being opened.
      } catch (e) {
        localStorage.removeItem("token")
        router.push(`/login?redirect=/use-cut/${token}`)
      } finally {
        setLoading(false)
      }
    }

    if (token) {
      checkAuth()
    }
  }, [token, router])

  const handleProcessToken = async (tokenData: string) => {
    if (processing) return
    setProcessing(true)
    setError(null)
    
    try {
      const authToken = localStorage.getItem("token")
      
      const res = await fetch("/api/user/use-cut", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json", 
          "Authorization": `Bearer ${authToken}`
        },
        body: JSON.stringify({ shopToken: tokenData }),
      })
      
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Invalid token")

      setScanResult({ type: data.type, message: data.message })
      setSuccess(true)
      toast({ 
        title: data.type === "HAIRCUT" ? "Cut Redeemed!" : "Visit Recorded!", 
        description: data.message 
      })
    } catch (err: any) {
      setError(err.message)
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive"
      })
    } finally {
      setProcessing(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-foreground mx-auto mb-4" />
          <p className="text-xl font-bold">Verifying your session...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      <div className="pt-24 pb-12 px-4">
        <div className="max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-8"
          >
            <Scissors className="w-16 h-16 mx-auto mb-4 text-foreground" />
            <h1 className="text-4xl font-bold mb-4">Use Cut</h1>
            <p className="text-xl text-muted-foreground">
              {processing ? "Processing your request..." : "Confirm you're at the shop to redeem a cut."}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <GlassCard className="border-foreground/10">
              {!success && !error && !processing ? (
                <div className="text-center py-8">
                  <Scissors className="w-20 h-20 mx-auto mb-6 text-foreground" />
                  <h2 className="text-2xl font-bold mb-4">Redeem a cut?</h2>
                  <p className="text-gray-300 mb-8 text-lg">
                    This will deduct one haircut from your monthly balance. Only confirm if you're checking in with your barber right now.
                  </p>
                  <Button
                    onClick={() => handleProcessToken(token)}
                    className="w-full bg-foreground text-background hover:bg-foreground/90 py-6 text-lg font-bold rounded-xl"
                  >
                    Confirm Redemption
                  </Button>
                </div>
              ) : processing && !success && !error ? (
                <div className="text-center py-8">
                  <Loader2 className="w-12 h-12 animate-spin text-foreground mx-auto mb-4" />
                  <p className="text-lg text-gray-300">Processing your request...</p>
                </div>
              ) : success ? (
                <div className="text-center py-8">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.5, type: "spring" }}
                  >
                    <CheckCircle className="w-24 h-24 mx-auto mb-6 text-green-400" />
                  </motion.div>
                  <h2 className="text-3xl font-bold mb-4 text-green-400">
                    {scanResult?.type === "HAIRCUT" ? "Cut Redeemed! ✅" : "Visit Recorded! ✅"}
                  </h2>
                  <p className="text-gray-300 mb-6 text-lg">{scanResult?.message}</p>

                  <div className="bg-green-900/20 border border-green-500/30 rounded-xl p-6 mb-8">
                    <p className="text-green-300">
                      <strong>Show this screen to your barber to confirm your session.</strong>
                    </p>
                  </div>

                  <div className="space-y-3">
                    <Button asChild className="w-full bg-foreground text-background hover:bg-foreground/90 py-6 text-lg font-bold rounded-xl">
                      <Link href="/dashboard">Return to Dashboard</Link>
                    </Button>
                    <Button
                      asChild
                      variant="outline"
                      className="w-full border-foreground/10 text-foreground hover:bg-foreground/5 bg-transparent py-6 text-lg rounded-xl"
                    >
                      <Link href="/book">Book Next Appointment</Link>
                    </Button>
                  </div>
                </div>
              ) : error ? (
                <div className="text-center py-8">
                  <AlertCircle className="w-20 h-20 mx-auto mb-6 text-red-400" />
                  <h2 className="text-2xl font-bold mb-4 text-red-400">Unable to Process</h2>
                  <p className="text-gray-300 mb-8 text-lg">{error}</p>

                  <div className="space-y-3">
                    <Button
                      onClick={() => handleProcessToken(token)}
                      className="w-full bg-foreground text-background hover:bg-foreground/90 py-6 text-lg font-bold rounded-xl"
                    >
                      Try Again
                    </Button>
                    <Button
                      asChild
                      variant="outline"
                      className="w-full border-foreground/10 text-foreground hover:bg-foreground/5 bg-transparent py-6 text-lg rounded-xl"
                    >
                      <Link href="/dashboard">Back to Dashboard</Link>
                    </Button>
                  </div>
                </div>
              ) : null}
            </GlassCard>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="mt-8"
          >
            <GlassCard className="border-foreground/5">
              <h3 className="text-lg font-bold mb-4">What happens next?</h3>
              <div className="space-y-4 text-gray-300">
                <div className="flex items-start">
                  <span className="bg-foreground text-background rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold mr-3 mt-0.5">
                    1
                  </span>
                  <p>Confirming deducts one cut from your monthly allowance (VIP only)</p>
                </div>
                <div className="flex items-start">
                  <span className="bg-foreground text-background rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold mr-3 mt-0.5">
                    2
                  </span>
                  <p>Show the success screen to your barber to confirm</p>
                </div>
                <div className="flex items-start">
                  <span className="bg-foreground text-background rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold mr-3 mt-0.5">
                    3
                  </span>
                  <p>Enjoy your premium haircut experience!</p>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
