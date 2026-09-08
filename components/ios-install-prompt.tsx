"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { Share, X } from "lucide-react"

const DISMISS_KEY = "iosInstallPromptDismissedAt"
const DISMISS_COOLDOWN_MS = 14 * 24 * 60 * 60 * 1000 // re-show after 2 weeks if still not installed

// Same list BottomNav hides on (components/bottom-nav.tsx) — where it's
// hidden there's no bottom nav bar to clear, so this banner can sit flush at
// the very bottom there instead of floating above it.
const NO_BOTTOM_NAV_PAGES = ["/login", "/signup", "/admin", "/auth", "/success"]

function isIOSDevice(): boolean {
  if (typeof navigator === "undefined") return false
  const ua = navigator.userAgent
  // iPadOS 13+ reports its platform as "MacIntel" like a real Mac — only a
  // real Mac never has touch points, so maxTouchPoints tells them apart.
  return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false
  // navigator.standalone is Safari's own (non-standard) flag for "launched
  // from a Home Screen icon" — matchMedia is the standard fallback for any
  // other engine that might someday report standalone display-mode on iOS.
  return (window.navigator as any).standalone === true || window.matchMedia("(display-mode: standalone)").matches
}

// iOS only delivers web push to a site that's been added to the Home Screen
// and opened from that icon — a regular browser tab can never receive push
// there, no matter how correctly OneSignal is configured server-side. This
// nudges iOS visitors through the one manual step (Share -> Add to Home
// Screen) that unlocks it, since nothing else in the browser prompts for it.
export function IOSInstallPrompt() {
  const [visible, setVisible] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    // No point nudging anyone toward push if it isn't even configured.
    if (!process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID) return
    if (!isIOSDevice() || isStandalone()) return

    let dismissedAt = 0
    try {
      dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || 0)
    } catch {
      // Private browsing / storage blocked — treat as never dismissed.
    }
    if (Date.now() - dismissedAt < DISMISS_COOLDOWN_MS) return

    setVisible(true)
  }, [])

  if (!visible) return null

  const hasBottomNav = !NO_BOTTOM_NAV_PAGES.some((page) => (pathname ?? "").startsWith(page))

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()))
    } catch {
      // Ignore — worst case it shows again next visit.
    }
    setVisible(false)
  }

  return (
    <div className={`fixed left-0 right-0 z-50 px-4 ${hasBottomNav ? "bottom-20" : "bottom-4"}`}>
      <div className="max-w-sm mx-auto bg-black/95 backdrop-blur-md border border-white/20 rounded-xl p-4 shadow-lg">
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm text-gray-200 leading-snug">
            <span className="font-semibold text-white">Get notifications:</span> tap{" "}
            <Share className="inline w-4 h-4 -mt-0.5" aria-hidden="true" /> Share, then{" "}
            <span className="font-semibold text-white">Add to Home Screen</span> — iPhones and
            iPads only allow notifications for apps installed that way.
          </p>
          <button
            onClick={dismiss}
            aria-label="Dismiss"
            className="shrink-0 text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
