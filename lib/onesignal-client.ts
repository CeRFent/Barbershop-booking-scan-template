// Client-safe helpers around the OneSignal Web SDK. Unlike lib/onesignal.ts
// (which imports connectDB/User and can only run server-side), everything
// here is safe to import from "use client" components. Every call goes
// through window.OneSignalDeferred — the same queue app/layout.tsx's init
// script pushes to — which is safe to push to even before the SDK script
// itself has finished loading.

type OneSignalCallback<T> = (OneSignal: any) => Promise<T>

// Found during QA: getPushOptedIn/setPushOptedIn hung indefinitely with no
// network request ever firing. The cause was here, not necessarily in
// OneSignal itself — this never wired up a `reject`, so if the wrapped call
// ever threw (wrong method name, unexpected shape, a genuine SDK issue,
// anything) the error became an unhandled rejection *inside* the
// OneSignalDeferred callback and the outer promise this function returns
// simply never settled, forever. A caller's `try { await ... } finally {...}`
// then hangs right along with it, since nothing ever resolves or rejects.
// This fixes that unconditionally (a real bug regardless of what the actual
// OneSignal API turns out to require) and adds a timeout as a second
// safety net, so any future hang — from this code or a genuinely slow/stuck
// SDK call — fails visibly within a bounded time instead of silently
// forever.
function runOnOneSignal<T>(fn: OneSignalCallback<T>, timeoutMs = 8000): Promise<T | null> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !(window as any).OneSignalDeferred) {
      resolve(null)
      return
    }

    let settled = false
    const timer = setTimeout(() => {
      if (settled) return
      settled = true
      reject(new Error("OneSignal call timed out"))
    }, timeoutMs)

    ;(window as any).OneSignalDeferred.push(async (OneSignal: any) => {
      try {
        const result = await fn(OneSignal)
        if (settled) return
        settled = true
        clearTimeout(timer)
        resolve(result)
      } catch (error) {
        if (settled) return
        settled = true
        clearTimeout(timer)
        reject(error)
      }
    })
  })
}

// The raw browser API is the reliable source of truth for "has this visitor
// decided yet" — always available synchronously, no SDK load-timing to
// worry about. 'denied' can never be turned back to 'default' from JS; only
// the visitor can do that in their own browser/phone settings.
export function getBrowserNotificationPermission(): NotificationPermission | null {
  if (typeof window === "undefined" || typeof Notification === "undefined") return null
  return Notification.permission
}

// Links this browser to the given account (harmless/idempotent if already
// linked) and shows the native permission prompt. Only call this from a
// real click handler — browsers (Chrome on Android especially) silently
// downgrade a permission request with no user gesture behind it to a quiet,
// easy-to-miss indicator instead of an actual prompt.
export async function requestOneSignalPermission(userId?: string): Promise<NotificationPermission | null> {
  // Real customers hit this: the native permission dialog needs an actual
  // human decision, which routinely takes longer than the 8s default
  // (glancing away, getting interrupted, just reading it) -- the timeout
  // was firing and throwing *while the visitor was still looking at the
  // real prompt*, showing "Couldn't enable notifications" right after they
  // engaged with it correctly. Given a much longer window here since this
  // is the one call in this file that waits on a person, not just the SDK.
  await runOnOneSignal(async (OneSignal) => {
    if (userId) await OneSignal.login(userId)
    await OneSignal.Notifications.requestPermission()
  }, 120_000)
  return getBrowserNotificationPermission()
}

// Whether the current subscription is actively opted in to receiving pushes
// — distinct from browser permission, which can't be revoked via JS at all.
// This is how a "disable notifications" toggle can work even though nothing
// can programmatically undo a granted browser permission.
export async function getPushOptedIn(): Promise<boolean | null> {
  return runOnOneSignal(async (OneSignal) => Boolean(OneSignal.User?.PushSubscription?.optedIn))
}

export async function setPushOptedIn(optIn: boolean): Promise<void> {
  await runOnOneSignal(async (OneSignal) => {
    if (optIn) {
      await OneSignal.User.PushSubscription.optIn()
    } else {
      await OneSignal.User.PushSubscription.optOut()
    }
  })
}
