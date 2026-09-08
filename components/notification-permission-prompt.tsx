"use client"

import { useEffect, useRef, useState } from "react"
import { usePathname } from "next/navigation"
import { Bell, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { getToken, parseJWT } from "@/lib/jwt-utils"
import { getBrowserNotificationPermission, requestOneSignalPermission } from "@/lib/onesignal-client"

const RECHECK_INTERVAL_MS = 30_000

// Same list BottomNav hides on (components/bottom-nav.tsx) — mirrors the
// positioning approach already used by components/ios-install-prompt.tsx.
const NO_BOTTOM_NAV_PAGES = ["/login", "/signup", "/admin", "/auth", "/success"]

// Modern Chrome (Android especially) silently downgrades an automatic,
// no-user-gesture requestPermission() call to a small easy-to-miss address
// bar icon instead of showing the real prompt — this is why real customers
// reported never seeing anything even though the code was calling it. This
// banner is the fix: a clearly visible, branded ask that only calls the
// actual native permission request from inside a real button click, which
// browsers treat far more seriously. Re-checks every 30s and re-shows
// itself (even if previously dismissed) as long as the visitor genuinely
// hasn't decided yet — 'default' permission, not 'denied'. Once they've
// decided either way, the recheck stops resurfacing anything: 'granted'
// means nothing left to ask, and 'denied' can never be re-prompted from JS
// at all, so showing this again would just be a dead end.
export function NotificationPermissionPrompt() {
  const [visible, setVisible] = useState(false)
  const [requesting, setRequesting] = useState(false)
  const pathname = usePathname()
  const userIdRef = useRef<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID) return

    const token = getToken()
    if (!token) return
    const userData = parseJWT(token)
    if (!userData?.userId) return
    userIdRef.current = userData.userId

    const check = () => {
      setVisible(getBrowserNotificationPermission() === "default")
    }

    check()
    const interval = setInterval(check, RECHECK_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [])

  if (!visible) return null

  const hasBottomNav = !NO_BOTTOM_NAV_PAGES.some((page) => (pathname ?? "").startsWith(page))

  const enable = async () => {
    setRequesting(true)
    try {
      const result = await requestOneSignalPermission(userIdRef.current ?? undefined)
      // Hide immediately once the visitor has actually decided, rather
      // than waiting for the next 30s recheck to notice.
      if (result !== "default") setVisible(false)
    } catch {
      toast({ title: "Couldn't enable notifications", description: "Please try again.", variant: "destructive" })
    } finally {
      setRequesting(false)
    }
  }

  return (
    <div className={`fixed left-0 right-0 z-50 px-4 ${hasBottomNav ? "bottom-20" : "bottom-4"}`}>
      <div className="max-w-sm mx-auto bg-background/95 backdrop-blur-md border border-foreground/20 rounded-xl p-4 shadow-lg">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <Bell className="w-5 h-5 text-primary shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <p className="text-sm font-semibold text-foreground">Stay in the loop</p>
              <p className="text-xs text-muted-foreground mt-0.5">Enable notifications for booking updates and offers.</p>
            </div>
          </div>
          <button
            onClick={() => setVisible(false)}
            aria-label="Dismiss"
            className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <Button
          onClick={enable}
          disabled={requesting}
          size="sm"
          className="w-full mt-3 bg-foreground text-background hover:bg-foreground/90"
        >
          {requesting ? "Requesting..." : "Enable Notifications"}
        </Button>
      </div>
    </div>
  )
}
