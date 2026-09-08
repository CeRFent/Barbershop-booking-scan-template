"use client"

import { Suspense, useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { Button } from "@/components/ui/button"
import { getToken } from "@/lib/jwt-utils"
import { XCircle } from "lucide-react"

// Stripe cancel_url redirect target. The booking created for this checkout
// is still pending_payment and unpaid — clean it up so it stops holding
// the slot instead of relying only on the 30-minute lazy-expiry fallback.
function BookingCancelledContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [cleaned, setCleaned] = useState(false)

  useEffect(() => {
    const bookingId = searchParams?.get("bookingId")
    const token = getToken()
    if (!bookingId || !token) {
      setCleaned(true)
      return
    }

    fetch(`/api/bookings/${bookingId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    })
      .catch(() => {})
      .finally(() => setCleaned(true))
  }, [searchParams])

  return (
    <div className="pt-32 px-4 max-w-md mx-auto text-center">
      <XCircle className="w-16 h-16 mx-auto mb-4 text-gray-500" />
      <h1 className="text-2xl font-bold mb-2">Checkout cancelled</h1>
      <p className="text-muted-foreground mb-6">No worries — your time slot wasn't held. You can pick a new time whenever you're ready.</p>
      <Button onClick={() => router.push("/book")} disabled={!cleaned} className="bg-foreground text-background hover:bg-foreground/90">
        Back to Booking
      </Button>
    </div>
  )
}

export default function BookingCancelledPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <Suspense fallback={null}>
        <BookingCancelledContent />
      </Suspense>
    </div>
  )
}
