"use client"

import { Suspense, useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { Button } from "@/components/ui/button"
import { getToken } from "@/lib/jwt-utils"
import { CheckCircle2, Loader2, Clock } from "lucide-react"

// Stripe success_url redirect target for a deposit checkout. The webhook
// (checkout.session.completed) is what actually flips the booking to
// confirmed — this page polls the real booking status instead of just
// assuming that already happened, so a slow or misconfigured webhook
// doesn't show "confirmed" for a booking that's still pending_payment.
const POLL_INTERVAL_MS = 1500
const POLL_TIMEOUT_MS = 15000

function BookingConfirmationContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [status, setStatus] = useState<"checking" | "confirmed" | "timeout">("checking")

  useEffect(() => {
    const bookingId = searchParams?.get("bookingId")
    const token = getToken()
    if (!bookingId || !token) {
      setStatus("timeout")
      return
    }

    let cancelled = false
    const startedAt = Date.now()

    const poll = async () => {
      try {
        const res = await fetch(`/api/bookings/${bookingId}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await res.json()
        if (cancelled) return

        if (data.success && data.booking.status === "confirmed") {
          setStatus("confirmed")
          return
        }
      } catch {
        // keep polling — a transient network hiccup shouldn't end the check early
      }

      if (Date.now() - startedAt >= POLL_TIMEOUT_MS) {
        if (!cancelled) setStatus("timeout")
        return
      }
      setTimeout(poll, POLL_INTERVAL_MS)
    }

    poll()
    return () => {
      cancelled = true
    }
  }, [searchParams])

  return (
    <div className="pt-32 px-4 max-w-md mx-auto text-center">
      {status === "checking" && (
        <>
          <Loader2 className="w-10 h-10 mx-auto mb-4 animate-spin text-gray-400" />
          <h1 className="text-2xl font-bold mb-2">Confirming your deposit...</h1>
          <p className="text-gray-400">Just a moment while we finish up with Stripe.</p>
        </>
      )}

      {status === "confirmed" && (
        <>
          <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-green-400" />
          <h1 className="text-2xl font-bold mb-2">Deposit received!</h1>
          <p className="text-gray-400 mb-6">Your appointment is confirmed. We'll see you soon.</p>
          <Button onClick={() => router.push("/dashboard")} className="bg-white text-black hover:bg-gray-200">
            Go to Dashboard
          </Button>
        </>
      )}

      {status === "timeout" && (
        <>
          <Clock className="w-16 h-16 mx-auto mb-4 text-amber-400" />
          <h1 className="text-2xl font-bold mb-2">Payment received</h1>
          <p className="text-gray-400 mb-6">
            We got your payment, but confirming it is taking longer than expected. Check your dashboard in a few minutes — if it's still not
            showing as confirmed, reach out and we'll sort it out.
          </p>
          <Button onClick={() => router.push("/dashboard")} className="bg-white text-black hover:bg-gray-200">
            Go to Dashboard
          </Button>
        </>
      )}
    </div>
  )
}

export default function BookingConfirmationPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />
      <Suspense fallback={null}>
        <BookingConfirmationContent />
      </Suspense>
    </div>
  )
}
