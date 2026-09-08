"use client"

import { useEffect } from "react"
import { usePathname, useSearchParams } from "next/navigation"

declare global {
  interface Window {
    gtag: (command: string, targetId: string, config?: Record<string, any>) => void
  }
}

export function Analytics() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (typeof window !== "undefined" && window.gtag) {
      const url = pathname + (searchParams?.toString() ?? "")

      // Track page views
      window.gtag("config", "GA_MEASUREMENT_ID", {
        page_path: url,
      })
    }
  }, [pathname, searchParams])

  return null
}

// Custom event tracking functions
export const trackEvent = (action: string, category: string, label?: string, value?: number) => {
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("event", action, {
      event_category: category,
      event_label: label,
      value: value,
    })
  }
}

export const trackSubscription = (plan: string) => {
  trackEvent("subscribe", "subscription", plan)
}

export const trackCutUsed = (location: string) => {
  trackEvent("cut_used", "service", location)
}

export const trackLogin = (method: string) => {
  trackEvent("login", "authentication", method)
}
