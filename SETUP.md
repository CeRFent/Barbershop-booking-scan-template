# Setting up a new instance of this template

This is a **clone-per-client** template, not multi-tenant SaaS: every new
shop gets its own full deployment — own database, own Stripe account, own
domain, own everything. Nothing is shared between clients. That's
deliberate — it's much less engineering than real multi-tenancy, and every
client's data/payments/notifications stay fully isolated (worth mentioning
when pitching: you're not touching their money or their customers' data
through a shared system).

## 1. Clone and rename

\`\`\`bash
git clone <this-repo> new-client-name
cd new-client-name
rm -rf .git && git init   # fresh history — don't carry another client's commits
\`\`\`

## 2. Edit the brand config

Open **`lib/brand-config.ts`** and fill in: shop name, tagline, city, the
domain it'll actually be deployed to, contact email, and the Google review
link (or leave it blank to disable the review-request feature). This one
file drives page titles, email templates, push notification copy, SEO
metadata, and the logo text.

Two static files can't read that config (they're plain JSON, not
TypeScript) — edit these by hand too:
- `public/manifest.json` and `public/site.webmanifest` — `name`/`short_name`/`description`

## 3. Content that needs real per-client input (not mechanical)

These aren't in `brand-config.ts` because there's no sensible way to
template them — each shop's is genuinely different:

- **`app/page.tsx`** — hero copy, the "Why Choose Us" section, the physical
  address, shop hours, Instagram handle, and the Google Maps embed (get a
  fresh embed URL from the new shop's actual Maps listing: Maps → Share →
  Embed a map — don't hand-edit the coordinates in the old embed URL).
  Search for `REPLACE_WITH_` and `REPLACE_ME` — every one of those is a
  spot that needs real input before launch.
- **`app/layout.tsx`** — the JSON-LD structured-data block near the bottom
  has placeholder geo-coordinates, state, and Instagram link (`REPLACE_ME`)
  — same rule, pull real values from the shop's actual Google Business
  Profile / Maps listing.
- **`app/gallery/page.tsx`** — swap in the new shop's actual photos.
- **`app/akn/page.tsx`** — this was built for the original client's
  specific specialty (ingrown-hair/AKN treatment). Delete it (and its nav
  link in `app/page.tsx`'s footer and `components/navbar.tsx`) if the new
  shop doesn't offer this, or repurpose the page for whatever they do offer.
- **`app/terms/page.tsx`** and **`app/privacy/page.tsx`** — legal text
  written for the original business. Have a real lawyer review before using
  it for a different company; a brand-name swap alone doesn't make it
  correct for a new entity/jurisdiction.
- **Services & pricing** — these live in the database (the `Service`
  collection), not in code, so they're already client-specific by design —
  set them up through the admin panel after first deploy, no code changes
  needed.

## 4. External accounts (one full set per client — none of these can be shared)

Set these as environment variables — copy `.env.example` to `.env.local`
for local dev, and set the same names (with **live**, not test, values) in
Vercel's Production environment when you deploy.

| Service | What you need | Where |
|---|---|---|
| **MongoDB Atlas** | A connection string (free tier is fine to start) | atlas.mongodb.com → new cluster → Database Access (user) + Network Access (allow all, or Vercel's IPs) → get the URI |
| **Stripe** | Secret key, publishable key, a recurring Price, and a webhook secret | dashboard.stripe.com → Developers → API keys. Create the subscription Price under Products. Webhook: Developers → Webhooks → add endpoint `https://<domain>/api/webhook`, select `checkout.session.completed`, `invoice.payment_succeeded`, `invoice.payment_failed`, `customer.subscription.deleted` |
| **Resend** | An API key, and a verified sending domain | resend.com → API Keys. Domains → add the client's domain, add the DNS records it gives you, or transactional email won't send at all |
| **OneSignal** | An App ID + REST API key | onesignal.com → new Web Push app. **Read the gotcha below before setting the Site URL.** |
| **JWT_SECRET** | Any long random string | `openssl rand -hex 64` |
| **CRON_SECRET** | Any string | Vercel sets this automatically as a Bearer token on its own scheduled cron calls (see `vercel.json`) — you only need to set the *value* here so the route can check against it |

### The OneSignal gotcha that will silently break everything

This cost real production downtime on the original deployment, so it's
worth repeating explicitly: **OneSignal's "Site URL" setting must exactly
match the origin the browser actually runs on, including whether it has
`www.` or not.** If the site redirects every visitor from
`example.com` → `www.example.com` (or vice versa) but OneSignal is
configured for the other one, `OneSignal.init()` throws on every single
real visit and push notifications never work at all — with no obvious
error surfaced to an end user, just silence. Set OneSignal's Site URL to
whatever the site's actual, final, post-redirect URL is, exactly.

## 5. Deploy

1. Push the repo to GitHub, import it into Vercel, framework preset:
   Next.js.
2. Add every env var from step 4 (plus `NEXT_PUBLIC_SITE_URL` set to the
   real production domain, and `FROM_EMAIL` on the Resend-verified domain)
   to Vercel's **Production** environment.
3. Deploy. Then set `ADMIN_EMAIL`/`ADMIN_PASSWORD` and run
   `scripts/init-admin.js` once (or however the admin bootstrap is invoked)
   to create the first admin login — there's no public admin signup, by
   design.
4. Log into `/admin`, add real services/pricing, generate the shop's QR
   code (`/admin/qr-code`).

## 6. Before telling the client it's live

- [ ] Every `REPLACE_WITH_` / `REPLACE_ME` from step 3 is gone
- [ ] A real booking → deposit checkout → confirmation works end-to-end in
      Stripe **test mode** first, then again with live keys
- [ ] A real signup gets a real verification email (Resend)
- [ ] Enabling notifications on a real phone shows the actual native
      prompt and a subsequent broadcast/reminder arrives
- [ ] `/terms` and `/privacy` have been reviewed by someone who isn't this
      template
