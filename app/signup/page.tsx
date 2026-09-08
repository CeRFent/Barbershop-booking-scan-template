"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { GlassCard } from "@/components/ui/glass-card"
import { CursiveLogo } from "@/components/ui/cursive-logo"
import { Navbar } from "@/components/navbar"
import { toast } from "@/hooks/use-toast"
import { User, Mail, Lock, Phone, Loader2, CheckCircle, Calendar, Coffee, Utensils, AlertTriangle, ChevronDown, Star, Sparkles, Check } from "lucide-react"
import Cookies from "js-cookie"
import { parseJWT } from "@/lib/jwt-utils"
import { brand } from "@/lib/brand-config"

export default function SignupPage() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    fullName: "",
    phone: "",
    referralCode: "",
    dateOfBirth: "",
    preferences: {
      favoriteDrink: "",
      favoriteSnack: ""
    }
  })

  const [accountType, setAccountType] = useState<"regular" | "vip">("regular")
  const [inventory, setInventory] = useState<{snacks: string[], drinks: string[]}>({
    snacks: [],
    drinks: []
  })
  const [isInventoryLoading, setIsInventoryLoading] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<string[]>([])
  const [step, setStep] = useState<"signup" | "verification" | "success">("signup")
  const [verificationCode, setVerificationCode] = useState("")
  const [emailWarning, setEmailWarning] = useState<string | null>(null)
  const [duplicateEmail, setDuplicateEmail] = useState(false)
  const [resending, setResending] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)

  const router = useRouter()

  useEffect(() => {
    const fetchInventory = async () => {
      try {
        const res = await fetch("/api/inventory")
        const data = await res.json()
        if (data.success) {
          setInventory({
            snacks: data.snacks || [],
            drinks: data.drinks || []
          })
        }
      } catch (err) {
        console.error("Failed to fetch inventory:", err)
      } finally {
        setIsInventoryLoading(false)
      }
    }
    fetchInventory()
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    try {
      if (!e || !e.target) return
      const { name, value } = e.target
      if (name === "favoriteDrink" || name === "favoriteSnack") {
        setFormData(prev => ({
          ...prev,
          preferences: { ...prev.preferences, [name]: value }
        }))
      } else {
        setFormData(prev => ({ ...prev, [name]: value }))
      }
    } catch (err) {
      console.error("Error in handleInputChange:", err)
    }
  }

  const handleSignup = async (event: React.FormEvent) => {
    try {
      if (event && typeof event.preventDefault === "function") {
        event.preventDefault()
      }
    } catch (e) {
      console.error("PreventDefault failed:", e)
    }
    
    if (!formData.email || !formData.password || !formData.fullName) {
      setErrors(["Please fill in all required fields"])
      return
    }

    setIsLoading(true)
    setErrors([])
    setEmailWarning(null)
    setDuplicateEmail(false)

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (response.ok) {
        if (data.token) {
          localStorage.setItem("token", data.token)
          Cookies.set("token", data.token, { expires: 7 })

          // Tie this browser to the new account for push notifications, and
          // request permission right away — signup never goes through
          // /login, so without this here a fresh signup would never get
          // prompted at all. init() alone never shows the browser's
          // permission prompt, it has to be requested explicitly.
          const newUser = parseJWT(data.token)
          if (typeof window !== 'undefined' && (window as any).OneSignalDeferred && newUser) {
            ;(window as any).OneSignalDeferred.push(async function (OneSignal: any) {
              await OneSignal.login(newUser.userId)
              OneSignal.Notifications.requestPermission()
            })
          }
        }

        if (data.emailWarning) setEmailWarning(data.emailWarning)

        setStep("verification")
        
        try {
          toast({
            title: "Account Created!",
            description: "Please check your email for a verification code.",
          })
        } catch (tErr) {
          console.error("Toast failed:", tErr)
        }
      } else {
        setErrors([data.error || "Failed to create account"])
        if (data.code === "USER_ALREADY_EXISTS") setDuplicateEmail(true)
      }
    } catch (error: any) {
      console.error("Signup exception caught:", error)
      setErrors(["Network error or server unavailable. Please try again."])
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendCode = async () => {
    setResending(true)
    try {
      const response = await fetch("/api/send-verification-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.email }),
      })
      const data = await response.json()
      if (response.ok) {
        toast({ title: "Code sent", description: `A new code was sent to ${formData.email}.` })
        setResendCooldown(30)
      } else {
        toast({ title: "Couldn't resend code", description: data.error || "Please try again.", variant: "destructive" })
      }
    } catch {
      toast({ title: "Couldn't resend code", description: "Please try again.", variant: "destructive" })
    } finally {
      setResending(false)
    }
  }

  useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = setTimeout(() => setResendCooldown((s) => s - 1), 1000)
    return () => clearTimeout(timer)
  }, [resendCooldown])

  const handleVerification = async (event: React.FormEvent) => {
    try {
      if (event && typeof event.preventDefault === "function") {
        event.preventDefault()
      }
    } catch (e) {
      console.error("PreventDefault failed:", e)
    }

    if (!verificationCode.trim()) {
      setErrors(["Please enter the verification code"])
      return
    }

    setIsLoading(true)
    setErrors([])

    try {
      const response = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.email, code: verificationCode }),
      })

      const data = await response.json()

      if (response.ok) {
        setStep("success")
        try {
          toast({ title: "Email Verified!", description: "Your account is now ready." })
        } catch (tErr) {}

        setTimeout(() => {
          if (accountType === "vip") {
            router.push("/pricing")
            return
          }
          // If we got sent here mid-booking (e.g. from /book), go back to
          // finish that instead of dropping the customer on the dashboard.
          const postAuthRedirect = sessionStorage.getItem('postAuthRedirect')
          if (postAuthRedirect) {
            sessionStorage.removeItem('postAuthRedirect')
            router.push(postAuthRedirect)
          } else {
            router.push("/dashboard")
          }
        }, 2000)
      } else {
        setErrors([data.error || "Invalid verification code"])
      }
    } catch (error: any) {
      console.error("Verification exception caught:", error)
      setErrors(["An unexpected error occurred. Please try again."])
    } finally {
      setIsLoading(false)
    }
  }

  if (step === "verification") {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Navbar />
        <div className="pt-24 pb-12 px-4 text-center">
          <CursiveLogo size="lg" className="mb-4 mx-auto" />
          <h1 className="text-3xl font-bold mb-2">Verify Your Email</h1>
          <p className="text-gray-300 mb-4">Sent to <strong>{formData.email}</strong></p>

          {emailWarning && (
            <div className="max-w-md mx-auto mb-6 p-4 bg-amber-500/20 border border-amber-500/50 rounded-lg text-amber-200 text-sm flex items-start gap-3 text-left">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <p>{emailWarning}</p>
            </div>
          )}

          <GlassCard className="max-w-md mx-auto">
            <form onSubmit={handleVerification} className="space-y-6">
              <div className="space-y-2">
                <Label>Enter 6-digit Code</Label>
                <Input
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  placeholder="000000"
                  className="bg-foreground/15 border-foreground/30 text-center text-2xl tracking-widest font-mono py-6 text-foreground"
                  maxLength={6}
                  required
                />
              </div>
              <Button type="submit" disabled={isLoading} className="w-full bg-foreground text-background py-6 text-lg font-bold">
                {isLoading ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : "Verify Email"}
              </Button>
              {errors.length > 0 && <p className="text-red-400 text-sm font-medium">{errors[0]}</p>}
              <p className="text-center text-muted-foreground text-sm">
                Didn't get a code?{" "}
                {resendCooldown > 0 ? (
                  <span className="text-gray-500">Resend in {resendCooldown}s</span>
                ) : (
                  <button
                    type="button"
                    onClick={handleResendCode}
                    disabled={resending}
                    className="text-foreground hover:underline disabled:opacity-50"
                  >
                    {resending ? "Sending..." : "Resend code"}
                  </button>
                )}
              </p>
            </form>
          </GlassCard>
        </div>
      </div>
    )
  }

  if (step === "success") {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", damping: 12 }}>
            <CheckCircle className="w-20 h-20 mx-auto mb-6 text-green-400" />
          </motion.div>
          <h1 className="text-4xl font-bold mb-4">Verified!</h1>
          <p className="text-xl text-gray-300">
            {accountType === "vip" ? "Taking you to VIP checkout..." : "Welcome to the family. Taking you to dashboard..."}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <div className="pt-24 pb-12 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <CursiveLogo size="lg" className="mb-4" />
            <h1 className="text-4xl font-bold">Join the Family</h1>
            <p className="text-gray-300">Start your journey with {brand.name} today.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <div
              onClick={() => setAccountType("regular")}
              className={`cursor-pointer p-6 rounded-2xl border-2 transition-all ${accountType === "regular" ? "border-foreground bg-foreground/10" : "border-foreground/5 bg-foreground/5 hover:border-foreground/20"}`}
            >
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-gray-500/20 rounded-xl"><User className="w-6 h-6 text-gray-300" /></div>
                {accountType === "regular" && <div className="bg-foreground rounded-full p-1"><Check className="w-4 h-4 text-background" /></div>}
              </div>
              <h3 className="text-xl font-bold mb-2">Regular Client</h3>
              <p className="text-sm text-muted-foreground">Track visits, get notifications, and access your history for free.</p>
            </div>

            <div
              onClick={() => setAccountType("vip")}
              className={`cursor-pointer p-6 rounded-2xl border-2 transition-all relative overflow-hidden ${accountType === "vip" ? "border-primary bg-primary/10 shadow-[0_0_20px_rgba(37,99,235,0.2)]" : "border-foreground/5 bg-foreground/5 hover:border-foreground/20"}`}
            >
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-primary/20 rounded-xl"><Star className="w-6 h-6 text-primary" /></div>
                {accountType === "vip" && <div className="bg-primary rounded-full p-1"><Check className="w-4 h-4 text-foreground" /></div>}
              </div>
              <h3 className="text-xl font-bold mb-2">VIP Member</h3>
              <p className="text-sm text-muted-foreground">4 cuts/mo, priority booking, snacks, and exclusive benefits.</p>
              <div className="absolute top-2 right-2 bg-primary text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tighter">Recommended</div>
            </div>
          </div>

          <GlassCard>
            <form onSubmit={handleSignup} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name *</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                    <Input id="fullName" name="fullName" value={formData.fullName} onChange={handleInputChange} className="pl-10 bg-foreground/10 border-foreground/20 text-foreground focus:bg-foreground/15 transition-colors" required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                    <Input id="email" name="email" type="email" value={formData.email} onChange={handleInputChange} className="pl-10 bg-foreground/10 border-foreground/20 text-foreground focus:bg-foreground/15 transition-colors" required />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Password *</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                    <Input id="password" name="password" type="password" value={formData.password} onChange={handleInputChange} className="pl-10 bg-foreground/10 border-foreground/20 text-foreground focus:bg-foreground/15 transition-colors" required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                    <Input id="phone" name="phone" value={formData.phone} onChange={handleInputChange} className="pl-10 bg-foreground/10 border-foreground/20 text-foreground focus:bg-foreground/15 transition-colors" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dateOfBirth">Birthday</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                    <Input id="dateOfBirth" name="dateOfBirth" type="date" value={formData.dateOfBirth} onChange={handleInputChange} className="pl-10 bg-foreground/10 border-foreground/20 text-foreground focus:bg-foreground/15 transition-colors" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="referralCode">Referral Code</Label>
                  <div className="relative">
                    <Sparkles className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                    <Input id="referralCode" name="referralCode" value={formData.referralCode} onChange={handleInputChange} className="pl-10 bg-foreground/10 border-foreground/20 text-foreground focus:bg-foreground/15 transition-colors" placeholder="Optional" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="favoriteDrink">Fav Drink</Label>
                  <div className="relative">
                    <Coffee className="absolute left-3 top-3 w-4 h-4 text-muted-foreground z-10" />
                    <select id="favoriteDrink" name="favoriteDrink" value={formData.preferences.favoriteDrink} onChange={handleInputChange} className="w-full pl-10 pr-4 py-2 bg-foreground/10 border border-foreground/20 rounded-md appearance-none text-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20 transition-colors">
                      <option value="" className="bg-gray-900">Select Drink</option>
                      <option value="None" className="bg-gray-900">None</option>
                      {inventory.drinks.map(drink => <option key={drink} value={drink} className="bg-gray-900">{drink}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-muted-foreground pointer-events-none" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="favoriteSnack">Fav Snack</Label>
                  <div className="relative">
                    <Utensils className="absolute left-3 top-3 w-4 h-4 text-muted-foreground z-10" />
                    <select id="favoriteSnack" name="favoriteSnack" value={formData.preferences.favoriteSnack} onChange={handleInputChange} className="w-full pl-10 pr-4 py-2 bg-foreground/10 border border-foreground/20 rounded-md appearance-none text-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20 transition-colors">
                      <option value="" className="bg-gray-900">Select Snack</option>
                      <option value="None" className="bg-gray-900">None</option>
                      {inventory.snacks.map(snack => <option key={snack} value={snack} className="bg-gray-900">{snack}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-muted-foreground pointer-events-none" />
                  </div>
                </div>
              </div>

              {errors.length > 0 && (
                <div className="space-y-2">
                  <p className="text-red-400 text-sm font-medium">{errors[0]}</p>
                  {duplicateEmail && (
                    <a
                      href="/login"
                      className="flex items-center justify-center gap-2 w-full py-3 bg-foreground/10 hover:bg-foreground/15 border border-foreground/20 rounded-lg text-foreground text-sm font-medium transition-colors"
                    >
                      Sign in instead
                    </a>
                  )}
                </div>
              )}
              <Button type="submit" disabled={isLoading} className={`w-full py-8 text-xl font-bold mt-4 transition-all ${accountType === "vip" ? "bg-primary text-foreground hover:bg-primary" : "bg-foreground text-background hover:bg-foreground/90"}`}>
                {isLoading ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : accountType === "vip" ? "Create Account & Go VIP" : "Join for Free"}
              </Button>
              <p className="text-center text-muted-foreground text-sm mt-4">
                Already have an account? <a href="/login" className="text-foreground hover:underline">Sign In</a>
              </p>
            </form>
          </GlassCard>
        </div>
      </div>
    </div>
  )
}


