# Barbershop Booking Template

A full booking + subscription system for a barbershop, built on Next.js 14
(App Router), MongoDB, Stripe, OneSignal (push), and Resend (email). Extracted
from a real, deployed production system — this isn't a mockup or a scaffold,
it's the actual working app with one shop's branding pulled out into
`lib/brand-config.ts` so it can be reused for a different shop without
rebuilding any of it from scratch.

## What's in the box

- **Customer booking flow** — service selection, live slot availability,
  optional deposit via Stripe Checkout, reschedule/cancel.
- **VIP subscription** — monthly recurring plan (Stripe), mid-month signup
  proration, admin-editable price, cut tracking and QR-code redemption.
- **Push notifications** (OneSignal) — booking reminders, new-booking alerts
  to staff, broadcast messaging, post-visit review requests, a real native
  permission-prompt flow (not just an auto-request that browsers silently
  suppress).
- **Transactional email** (Resend) — verification codes, password reset,
  review requests, a one-time "turn on notifications" nudge.
- **Admin panel** — calendar/booking management, service catalog, staff QR
  codes, broadcast tool, subscription price control, customer management.
- **Auth** — JWT-based, email verification, password reset, admin vs.
  customer roles.

## Setting this up for a new shop

Read **[SETUP.md](./SETUP.md)** before doing anything else — it's the actual
step-by-step: what external accounts you need, what to edit in
`lib/brand-config.ts`, and what's genuinely per-client content that can't be
templated (address, hours, photos, legal text).

## Local development

\`\`\`bash
npm install
cp .env.example .env.local   # fill in dev/test credentials — see SETUP.md
npm run dev
\`\`\`

## Tech stack

Next.js 14 (App Router) · TypeScript · MongoDB/Mongoose · Stripe · OneSignal
Web Push SDK v16 · Resend · JWT auth · Tailwind CSS · shadcn/ui

## Docs

- `SETUP.md` — new-client setup checklist (start here)
- `MONGODB_SCHEMA_DOCUMENTATION.md` — full data model reference
- `lib/brand-config.ts` — the one file most rebranding starts from
