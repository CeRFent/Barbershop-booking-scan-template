// Single source of truth for everything that changes per client. When
// standing up a new instance of this template for a new shop, this is the
// first file to edit — most of the app reads its copy/identity from here
// instead of hardcoding a shop name throughout the codebase.
//
// What this file does NOT cover (per-client, but not mechanical enough to
// template — see SETUP.md's "Content that needs real per-client input"):
//   - Homepage hero copy, testimonials, gallery photos (app/page.tsx,
//     app/gallery/page.tsx) — every shop's story is different, rewrite it.
//   - The physical address / Google Maps embed (app/page.tsx) — needs the
//     new shop's real Place ID, not a find-and-replace.
//   - The /akn page — this was built for the original client's specific
//     specialty service (ingrown-hair/AKN treatment). Delete it (and its
//     nav link in components/navbar.tsx) if the new shop doesn't offer
//     this, or rewrite it if they offer something else worth its own page.
//   - Legal copy in app/terms/page.tsx and app/privacy/page.tsx — these
//     were written for the original business; have a real lawyer review
//     before using them for a different company.

export const brand = {
  // Shown in the logo, page titles, email templates, push notification
  // titles — the name everything else in this file's consumers reference.
  name: "Your Shop Name",

  // Used in <title> templates ("%s | {tagline}") and Open Graph descriptions.
  tagline: "Premium Barbering Services",

  // City/region shown in SEO copy and the structured-data JSON-LD block in
  // app/layout.tsx. Update the full address there too — this alone isn't
  // enough for local SEO.
  city: "Your City",

  // The production domain this instance will actually be deployed to.
  // Must match NEXT_PUBLIC_SITE_URL and the OneSignal app's configured Site
  // URL exactly (including whether it has "www." or not) — a mismatch
  // there breaks push notifications outright (see SETUP.md).
  domain: "https://example.com",

  // Public contact email shown on /terms and /privacy. Should generally
  // match FROM_EMAIL's domain, though it doesn't have to.
  contactEmail: "contact@example.com",

  // The shop's own Google Business Profile "Get more reviews" share link
  // (Google Business Profile dashboard → "Get more reviews" → share link).
  // Do NOT try to derive this from a Maps embed's Place ID — that encoding
  // doesn't reliably convert to a working review URL. Leave blank to
  // disable the post-booking review-request feature entirely (guard this
  // in app/api/admin/bookings/[id]/route.ts if a client doesn't want it).
  googleReviewUrl: "",
} as const
