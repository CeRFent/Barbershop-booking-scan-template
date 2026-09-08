"use client"

import { useEffect } from "react"
import { getToken, parseJWT } from "@/lib/jwt-utils"

// login.tsx / signup.tsx call OneSignal.login(userId) + requestPermission()
// right after authenticating — but that's the *only* place either ever ran.
// Someone who's already logged in (token sitting in localStorage, which is
// most of the time for most people — nobody logs out and back in
// regularly) never got linked or prompted at all. Combined with the OneSignal
// App ID having been broken/mismatched in production, this meant no real
// customer ever ended up with a working push subscription. This re-runs the
// same pairing for anyone already authenticated, once per page load (the
// root layout doesn't remount on client-side navigation, so this doesn't
// re-fire on every route change) — both calls are safe to repeat: login()
// just re-confirms the same external_id, and requestPermission() no-ops once
// a browser has already decided allow/deny.
export function OneSignalSessionSync() {
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID) return

    const token = getToken()
    if (!token) return

    const userData = parseJWT(token)
    if (!userData?.userId) return

    if ((window as any).OneSignalDeferred) {
      ;(window as any).OneSignalDeferred.push(async function (OneSignal: any) {
        await OneSignal.login(userData.userId)
        OneSignal.Notifications.requestPermission()
      })
    }
  }, [])

  return null
}
