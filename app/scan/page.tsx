"use client"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { GlassCard } from "@/components/ui/glass-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Navbar } from "@/components/navbar"
import { useToast } from "@/hooks/use-toast"
import { QrCode, Camera, CheckCircle, X, Loader2, AlertCircle, Sparkles, Scissors, UserCheck, Keyboard, ArrowRight, RefreshCcw, Clock, HelpCircle } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

export default function ScanPage() {
  const [profile, setProfile] = useState<any>(null)
  const [processing, setProcessing] = useState(false)
  const [success, setSuccess] = useState(false)
  const [scanResult, setScanResult] = useState<{type: string, message: string, cutsRemaining?: number, membershipIssue?: string | null} | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [alreadyCheckedIn, setAlreadyCheckedIn] = useState<{ minutesAgo: number } | null>(null)
  const [confirmPrompt, setConfirmPrompt] = useState<{ token: string; minutesAgo: number } | null>(null)
  const [mode, setMode] = useState<"idle" | "qr" | "manual">("idle")
  const [manualToken, setManualToken] = useState("")
  const [jsqrInstance, setJsqrInstance] = useState<any>(null)
  const [scanningActive, setScanningActive] = useState(false)

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const requestRef = useRef<number>()
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (!token) { router.push("/login"); return }

    try {
      const payload = JSON.parse(atob(token.split(".")[1]))
      setProfile(payload)
    } catch (e) {
      localStorage.removeItem("token")
      router.push("/login")
    }

    // Pre-load jsqr library
    import("jsqr").then((mod) => {
      setJsqrInstance(() => mod.default)
    }).catch(err => {
      console.error("Failed to load jsqr:", err)
      setError("Failed to load scanner library.")
    })

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current)
    }
  }, [router])

  // Core Decoding Loop using requestAnimationFrame (Industry Standard)
  const tick = () => {
    if (!scanningActive || processing || success) return

    if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
      const video = videoRef.current
      const canvas = canvasRef.current
      if (canvas) {
        const context = canvas.getContext("2d", { willReadFrequently: true })
        if (context) {
          canvas.height = video.videoHeight
          canvas.width = video.videoWidth
          context.drawImage(video, 0, 0, canvas.width, canvas.height)
          
          const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
          const code = jsqrInstance(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "dontInvert",
          })

          if (code && code.data) {
            handleProcessToken(code.data)
            return // Stop the loop once found
          }
        }
      }
    }
    requestRef.current = requestAnimationFrame(tick)
  }

  useEffect(() => {
    if (scanningActive && jsqrInstance && mode === "qr") {
      requestRef.current = requestAnimationFrame(tick)
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current)
    }
  }, [scanningActive, jsqrInstance, mode])

  const startQRScanner = async () => {
    setError(null)
    setMode("qr")
    
    // 1. Check Permissions & Browser Support
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError("Your browser doesn't support camera access.")
      return
    }

    try {
      // 2. Mobile Optimization: facingMode 'environment'
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      })
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.setAttribute("playsinline", "true") // Essential for iOS
        await videoRef.current.play()
        setScanningActive(true)
      }
    } catch (err: any) {
      console.error("Camera error:", err)
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setError("Camera permission denied. Please allow camera access in your settings.")
      } else {
        setError("Could not access camera: " + err.message)
      }
      setMode("idle")
    }
  }

  const stopCamera = () => {
    setScanningActive(false)
    if (requestRef.current) cancelAnimationFrame(requestRef.current)
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop())
      videoRef.current.srcObject = null
    }
  }

  const handleProcessToken = async (token: string, confirmed = false) => {
    if (processing) return
    setProcessing(true)
    setScanningActive(false) // Stop scanning while processing

    try {
      const authToken = localStorage.getItem("token")

      // Clean token (handles full URLs or raw tokens)
      let cleanToken = token
      if (token.includes("/use-cut/")) {
        const parts = token.split("/use-cut/")
        cleanToken = parts[parts.length - 1].split(/[?#]/)[0]
      }

      const res = await fetch("/api/user/use-cut", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`
        },
        body: JSON.stringify({ shopToken: cleanToken, confirmed }),
      })

      const data = await res.json()

      if (!res.ok) {
        if (data.alreadyCheckedIn) {
          stopCamera()
          setAlreadyCheckedIn({ minutesAgo: data.minutesAgo })
          setMode("idle")
          return
        }
        if (data.needsConfirmation) {
          stopCamera()
          setConfirmPrompt({ token: cleanToken, minutesAgo: data.minutesAgo })
          return
        }
        // A stale/rotated code (the shop's QR regenerates over time, and a
        // screenshot or old print goes dead) reads as a generic "invalid
        // token" from the API — point the customer at what actually fixes
        // it instead of leaving them stuck retrying the same dead code.
        if (typeof data.error === "string" && data.error.toLowerCase().includes("invalid or expired")) {
          throw new Error("This code is no longer valid — ask your barber to show the current QR code and scan fresh (don't reuse a screenshot or old code).")
        }
        throw new Error(data.error || "Invalid token")
      }

      stopCamera()
      setScanResult({ type: data.type, message: data.message, cutsRemaining: data.cutsRemaining, membershipIssue: data.membershipIssue })
      setSuccess(true)
      toast({
        title: data.type === "HAIRCUT" ? "Cut Redeemed!" : "Visit Recorded!",
        description: data.message
      })
    } catch (err: any) {
      setError(err.message)
      setMode("idle")
      stopCamera()
    } finally {
      setProcessing(false)
    }
  }

  if (!profile) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <Loader2 className="w-12 h-12 animate-spin text-white" />
    </div>
  )

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />
      <div className="pt-24 pb-12 px-4 max-w-2xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
          <QrCode className="w-16 h-16 mx-auto mb-4 text-white" />
          <h1 className="text-4xl font-bold mb-2">Shop Check-in</h1>
          <p className="text-gray-400">Align QR code within the frame to scan</p>
        </motion.div>

        <GlassCard className="overflow-hidden border-white/10 relative">
          <AnimatePresence mode="wait">
            {confirmPrompt ? (
              <motion.div key="confirm" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center py-12 px-6">
                <div className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 bg-amber-500/20">
                  <HelpCircle className="w-12 h-12 text-amber-400" />
                </div>
                <h2 className="text-3xl font-bold mb-4">Check In Again?</h2>
                <p className="text-gray-400 mb-8 text-lg">
                  You checked in {confirmPrompt.minutesAgo} minute{confirmPrompt.minutesAgo === 1 ? "" : "s"} ago. Is this another cut, or was that by accident?
                </p>
                <div className="space-y-3">
                  <Button
                    onClick={() => { const t = confirmPrompt.token; setConfirmPrompt(null); handleProcessToken(t, true) }}
                    className="w-full bg-white text-black py-6 text-lg font-bold rounded-xl"
                  >
                    Yes, Another Cut
                  </Button>
                  <Button
                    onClick={() => { setConfirmPrompt(null); setMode("idle") }}
                    variant="outline"
                    className="w-full py-6 text-lg border-white/10 hover:bg-white/5 rounded-xl"
                  >
                    No, That Was Accidental
                  </Button>
                </div>
              </motion.div>
            ) : alreadyCheckedIn ? (
              <motion.div key="already" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center py-12 px-6">
                <div className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 bg-amber-500/20">
                  <Clock className="w-12 h-12 text-amber-400" />
                </div>
                <h2 className="text-3xl font-bold mb-4">Already Checked In</h2>
                <p className="text-gray-400 mb-8 text-lg">
                  You checked in {alreadyCheckedIn.minutesAgo} minute{alreadyCheckedIn.minutesAgo === 1 ? "" : "s"} ago — no need to scan again.
                </p>
                <div className="space-y-3">
                  <Button asChild className="w-full bg-white text-black py-6 text-lg font-bold rounded-xl">
                    <Link href="/dashboard">Back to Dashboard</Link>
                  </Button>
                  <Button onClick={() => { setAlreadyCheckedIn(null); setMode("idle") }} variant="outline" className="w-full py-6 text-lg border-white/10 hover:bg-white/5 rounded-xl">
                    Dismiss
                  </Button>
                </div>
              </motion.div>
            ) : success ? (
              <motion.div key="success" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center py-12 px-6">
                <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 ${scanResult?.type === "HAIRCUT" ? "bg-blue-500/20" : "bg-green-500/20"}`}>
                  {scanResult?.type === "HAIRCUT" ? <Scissors className="w-12 h-12 text-blue-400" /> : <UserCheck className="w-12 h-12 text-green-400" />}
                </div>
                <h2 className="text-3xl font-bold mb-2">{scanResult?.type === "HAIRCUT" ? "Cut Redeemed!" : "Visit Recorded!"}</h2>
                <p className="text-sm text-gray-500 mb-4 uppercase tracking-wide font-bold">Show this screen to your barber</p>
                <p className="text-gray-400 mb-4 text-lg">{scanResult?.message}</p>
                {typeof scanResult?.cutsRemaining === "number" && (
                  <p className="text-sm text-gray-500 mb-6">
                    {scanResult.cutsRemaining} cut{scanResult.cutsRemaining === 1 ? "" : "s"} remaining this month
                  </p>
                )}
                {scanResult?.membershipIssue === "past_due" && (
                  <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-left flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                    <p className="text-sm text-amber-200">
                      Your last payment failed. Fix it from your dashboard to get your cuts back.
                    </p>
                  </div>
                )}
                <div className="space-y-3">
                  <Button asChild className="w-full bg-white text-black py-6 text-lg font-bold rounded-xl">
                    <Link href="/dashboard">Back to Dashboard</Link>
                  </Button>
                  <Button onClick={() => { setSuccess(false); setMode("idle"); setError(null); setAlreadyCheckedIn(null); setConfirmPrompt(null); }} variant="outline" className="w-full py-6 text-lg border-white/10 hover:bg-white/5 rounded-xl">
                    Scan Again
                  </Button>
                </div>
              </motion.div>
            ) : mode === "qr" ? (
              <motion.div key="scanner" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative bg-black">
                {/* Real hidden canvas for decoding */}
                <canvas ref={canvasRef} className="hidden" />
                
                {/* Visible video stream */}
                <video ref={videoRef} className="w-full aspect-square object-cover rounded-lg" playsInline muted autoPlay />
                
                {/* UI Overlay */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-64 h-64 border-2 border-white/30 rounded-2xl relative">
                    <div className="absolute top-0 left-0 w-full h-1 bg-blue-500 shadow-[0_0_15px_#3b82f6] animate-[scan_2s_linear_infinite]" />
                    <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-blue-500 rounded-tl-lg" />
                    <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-blue-500 rounded-tr-lg" />
                    <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-blue-500 rounded-bl-lg" />
                    <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-blue-500 rounded-br-lg" />
                  </div>
                </div>

                <div className="absolute bottom-6 left-0 right-0 flex flex-col items-center gap-4">
                  {processing && (
                    <div className="bg-black/90 px-6 py-2 rounded-full flex items-center gap-3 border border-blue-500/50 shadow-lg">
                      <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
                      <span className="font-bold">Decoding Boxes...</span>
                    </div>
                  )}
                  <Button onClick={() => { stopCamera(); setMode("idle"); }} className="bg-red-500/80 hover:bg-red-500 text-white px-8 rounded-full py-6 backdrop-blur-md">
                    <X className="w-5 h-5 mr-2" /> Cancel Scan
                  </Button>
                </div>
              </motion.div>
            ) : mode === "manual" ? (
              <motion.div key="manual" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-8 text-center">
                <div className="bg-white/5 rounded-2xl p-6 mb-8 inline-block">
                  <Keyboard className="w-12 h-12 text-blue-400" />
                </div>
                <h3 className="text-xl font-bold mb-4">Enter 4-Character Code</h3>
                <p className="text-gray-400 mb-8">Type the code from the barber's stand</p>
                <div className="space-y-4">
                  <Input
                    value={manualToken}
                    onChange={(e) => setManualToken(e.target.value.toUpperCase())}
                    placeholder="E.G. A1B2"
                    maxLength={4}
                    className="bg-white/5 border-white/20 text-center text-3xl font-mono py-8 tracking-[1rem] uppercase focus:border-blue-500"
                    onKeyDown={(e) => e.key === "Enter" && manualToken.length === 4 && handleProcessToken(manualToken)}
                  />
                  <Button
                    onClick={() => handleProcessToken(manualToken)}
                    disabled={manualToken.length < 4 || processing}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white py-8 text-xl font-bold rounded-xl"
                  >
                    {processing ? <Loader2 className="animate-spin mr-2" /> : "Submit Code"}
                  </Button>
                  <Button onClick={() => setMode("idle")} variant="ghost" className="text-gray-400 hover:text-white">
                    Back to Camera
                  </Button>
                </div>
              </motion.div>
            ) : (
              <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-12 text-center px-6">
                <div className="grid grid-cols-1 gap-6">
                  <Button 
                    onClick={startQRScanner} 
                    disabled={!jsqrInstance || processing} 
                    className="w-full bg-white text-black py-12 text-2xl font-bold rounded-2xl hover:bg-gray-200 flex flex-col gap-3 h-auto"
                  >
                    {!jsqrInstance ? <RefreshCcw className="w-10 h-10 animate-spin" /> : <Camera className="w-10 h-10" />}
                    <span>{!jsqrInstance ? "Initializing..." : "Scan QR Code"}</span>
                  </Button>

                  <div className="relative py-4">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10"></div></div>
                    <div className="relative flex justify-center text-xs uppercase"><span className="bg-black px-4 text-gray-500 tracking-widest font-bold">Or</span></div>
                  </div>

                  <Button onClick={() => setMode("manual")} variant="outline" className="w-full py-10 text-xl font-bold rounded-2xl border-white/10 hover:bg-white/5 flex flex-col gap-2 h-auto">
                    <Keyboard className="w-8 h-8 text-gray-400" />
                    <span>Type 4-Char Code</span>
                  </Button>
                </div>

                {error && (
                  <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="mt-8 p-6 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-4 text-red-400 text-left">
                    <AlertCircle className="w-6 h-6 flex-shrink-0" />
                    <div>
                      <p className="font-bold">Scanner Error</p>
                      <p className="text-sm opacity-80">{error}</p>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </GlassCard>

        <style jsx global>{`
          @keyframes scan {
            0% { top: 0%; }
            50% { top: 100%; }
            100% { top: 0%; }
          }
        `}</style>
      </div>
    </div>
  )
}
