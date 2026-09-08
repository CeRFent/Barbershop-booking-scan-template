// Thin wrapper around the OneSignal REST API — mirrors the getStripe() /
// getResendClient() pattern already used in this codebase (a config getter
// that throws if the env isn't set, called lazily at request time).

import connectDB from "@/lib/mongodb"
import { User } from "@/lib/models"
import { brand } from "@/lib/brand-config"

interface OneSignalConfig {
  appId: string
  apiKey: string
}

function getOneSignalConfig(): OneSignalConfig {
  const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID
  const apiKey = process.env.ONESIGNAL_API_KEY
  if (!appId || !apiKey) {
    throw new Error(
      "NEXT_PUBLIC_ONESIGNAL_APP_ID / ONESIGNAL_API_KEY are not set in the environment – OneSignal calls cannot be made."
    )
  }
  return { appId, apiKey }
}

interface PushPayload {
  title: string
  message: string
  url?: string
}

interface EmailPayload {
  subject: string
  body: string
}

async function sendToChannel(
  externalId: string | string[],
  channel: "push" | "email",
  body: Record<string, unknown>
) {
  const { appId, apiKey } = getOneSignalConfig()
  const externalIds = Array.isArray(externalId) ? externalId : [externalId]

  // Current unified OneSignal API — targets by alias (external_id).
  // target_channel is required whenever targeting is done by alias (the API
  // rejects the request with 400 "target_channel must be specified when
  // using targeting by alias" otherwise) — confirmed against the real API,
  // contradicting this file's earlier assumption that channel is inferred
  // from content fields alone. include_aliases.external_id natively accepts
  // an array, so a batch of recipients is still one call.
  const res = await fetch("https://api.onesignal.com/notifications", {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      Authorization: `Key ${apiKey}`,
    },
    body: JSON.stringify({
      app_id: appId,
      target_channel: channel,
      include_aliases: { external_id: externalIds },
      ...body,
    }),
  })

  const data = await res.json().catch(() => null)

  if (!res.ok) {
    throw new Error(`OneSignal ${channel} notification failed (${res.status}): ${JSON.stringify(data)}`)
  }

  // A 200 with no `id` means none of the targeted external_ids have an
  // active subscription on that channel — not an error, just nobody to
  // deliver to.
  if (!data?.id) {
    console.log(`[onesignal] No active ${channel} subscription for external_id(s) ${externalIds.join(", ")}`)
    return null
  }

  return data.id as string
}

export async function notify(externalId: string, { push, email }: { push?: PushPayload; email?: EmailPayload }) {
  const results: { push?: string | null; email?: string | null } = {}

  if (push) {
    results.push = await sendToChannel(externalId, "push", {
      headings: { en: push.title },
      contents: { en: push.message },
      ...(push.url ? { url: push.url } : {}),
    })
  }

  if (email) {
    results.email = await sendToChannel(externalId, "email", {
      email_subject: email.subject,
      email_body: email.body,
    })
  }

  return results
}

// Same shape as notify(), but for a list of recipients at once — one
// OneSignal call per channel (include_aliases.external_id takes an array),
// not N separate calls.
export async function notifyBatch(
  externalIds: string[],
  { push, email }: { push?: PushPayload; email?: EmailPayload }
) {
  const results: { push?: string | null; email?: string | null } = {}

  if (push) {
    results.push = await sendToChannel(externalIds, "push", {
      headings: { en: push.title },
      contents: { en: push.message },
      ...(push.url ? { url: push.url } : {}),
    })
  }

  if (email) {
    results.email = await sendToChannel(externalIds, "email", {
      email_subject: email.subject,
      email_body: email.body,
    })
  }

  return results
}

// ----------------------------------------------------------------------------
// External ID registration
// ----------------------------------------------------------------------------

// Upserts a OneSignal user identity (external_id -> email subscription).
// Called once at signup so push/email notifications can target this user by
// their Mongo _id from anywhere in the app.
export async function registerExternalId(externalId: string, email: string) {
  const { appId, apiKey } = getOneSignalConfig()

  const res = await fetch(`https://api.onesignal.com/apps/${appId}/users`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      Authorization: `Key ${apiKey}`,
    },
    body: JSON.stringify({
      identity: { external_id: externalId },
      // notification_types: 1 = explicitly opted in. Without it a new
      // subscription defaults to -99 (no action taken) and OneSignal
      // silently refuses to send to it — confirmed by inspecting a real
      // subscription record via the API (enabled: true but
      // notification_types: -99, never receiving a "no active
      // subscription" send).
      subscriptions: [{ type: "Email", token: email, notification_types: 1 }],
    }),
  })

  if (!res.ok) {
    const data = await res.json().catch(() => null)
    throw new Error(`OneSignal external_id registration failed (${res.status}): ${JSON.stringify(data)}`)
  }
}

// ----------------------------------------------------------------------------
// Per-trigger named functions
// ----------------------------------------------------------------------------

export async function notifyCutRedeemed(externalId: string, remainingCuts: number) {
  return notify(externalId, {
    push: {
      title: "Haircut redeemed",
      message: `Enjoy your cut! You have ${remainingCuts} cut${remainingCuts === 1 ? "" : "s"} remaining this month.`,
    },
  })
}

export async function notifyPaymentIssue(externalId: string, reason: "payment_failed" | "subscription_cancelled") {
  const copy =
    reason === "payment_failed"
      ? {
          title: "Payment issue with your subscription",
          message:
            "We couldn't process your latest payment. Please update your payment method to keep your subscription active.",
        }
      : {
          title: "Your subscription has ended",
          message: `Your ${brand.name} subscription is no longer active. Resubscribe any time to keep getting monthly cuts.`,
        }

  return notify(externalId, {
    push: copy,
    email: { subject: copy.title, body: copy.message },
  })
}

// Push-only per the client's explicit call ("long as I can send out straight
// notifications I'm all good" — SMS deferred, and email is separately
// blocked on account verification). Fired from app/api/cron/booking-reminders.
export async function notifyBookingReminder(externalId: string, serviceName: string, startTime: string) {
  return notify(externalId, {
    push: {
      title: "Appointment tomorrow",
      message: `Reminder: you're booked for ${serviceName} tomorrow at ${startTime}. See you then!`,
      url: "/dashboard",
    },
  })
}

// Fired once when an admin marks a booking "completed" (see
// app/api/admin/bookings/[id]/route.ts) — the first point a customer has
// actually had the service, so it's the right moment to ask for a review.
// The push's url opens the review link directly on tap, same as any other
// push here, just an external URL instead of an in-app path this time.
export async function notifyReviewRequest(externalId: string, reviewUrl: string) {
  return notify(externalId, {
    push: {
      title: "How was your cut?",
      message: "Thanks for coming in! Got a minute to leave a review?",
      url: reviewUrl,
    },
  })
}

// Notifies every admin/barber account that a new booking landed — fired
// once a booking is actually confirmed, not at initial creation: a
// deposit-required booking starts as pending_payment and may never be
// paid, so notifying then would tell the barber about appointments that
// might not really happen. Called both from app/api/bookings' POST
// (no-deposit services confirm immediately) and from the webhook's
// booking_deposit handler (confirms once payment succeeds).
export async function notifyAdminsOfNewBooking(
  customerName: string,
  serviceName: string,
  date: string,
  startTime: string
) {
  await connectDB()
  const admins = await User.find({ role: "admin" }).select("_id").lean()
  const adminIds = admins.map((a: any) => a._id.toString())
  if (adminIds.length === 0) return

  const prettyDate = new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  })
  const [hour, minute] = startTime.split(":").map(Number)
  const period = hour >= 12 ? "PM" : "AM"
  const hour12 = hour % 12 === 0 ? 12 : hour % 12
  const prettyTime = `${hour12}:${String(minute).padStart(2, "0")} ${period}`

  return notifyBatch(adminIds, {
    push: {
      title: "New booking",
      message: `${customerName} booked ${serviceName} — ${prettyDate} at ${prettyTime}`,
      url: "/admin/calendar",
    },
  })
}

// TODO VIP renewal reminder: needs a scheduled/cron mechanism — now that
// Vercel Cron exists (see app/api/cron/booking-reminders), this is a natural
// next addition following the same pattern, just not built yet.

// TODO referral bonus notification: the referral system itself doesn't exist
// yet (intentionally out of scope, client hasn't paid for it). Documented
// here only; nothing to call until that feature is built.
