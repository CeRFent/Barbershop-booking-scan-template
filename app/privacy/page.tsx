import type { Metadata } from "next"
import { Navbar } from "@/components/navbar"
import { brand } from "@/lib/brand-config"

// TEMPLATE NOTE: this legal copy was written for the original business.
// Have a real lawyer review it before using it for a different company —
// swapping the brand name isn't enough to make it legally correct for a
// new entity, jurisdiction, or set of actual data-handling practices.

export const metadata: Metadata = {
  title: `Privacy Policy - ${brand.name}`,
  description: `Privacy policy for ${brand.name} barbershop services and website.`,
}

// Update this by hand whenever the policy text actually changes — was
// previously `new Date().toLocaleDateString()`, which silently printed
// today's date on every page load instead of a real last-edited date.
const LAST_UPDATED = "August 29, 2026"

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />
      <div className="container mx-auto px-4 pt-32 pb-16 max-w-4xl">
        <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>
        <div className="max-w-none">
          <p className="text-gray-400 mb-6">Last updated: {LAST_UPDATED}</p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Information We Collect</h2>
            <p className="mb-4 text-gray-300">
              We collect information you provide directly to us, such as when you create an account, subscribe to our
              services, or contact us for support.
            </p>
            <ul className="list-disc pl-6 mb-4 text-gray-300 space-y-1">
              <li>Name and email address</li>
              <li>Payment information (processed securely through Stripe)</li>
              <li>Service preferences and appointment history</li>
              <li>Communication records</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">How We Use Your Information</h2>
            <p className="mb-4 text-gray-300">We use the information we collect to:</p>
            <ul className="list-disc pl-6 mb-4 text-gray-300 space-y-1">
              <li>Provide and maintain our barbershop services</li>
              <li>Process payments and manage subscriptions</li>
              <li>Send service-related communications</li>
              <li>Improve our services and customer experience</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Information Sharing</h2>
            <p className="mb-4 text-gray-300">
              We do not sell, trade, or otherwise transfer your personal information to third parties except as
              described in this policy. We may share information with:
            </p>
            <ul className="list-disc pl-6 mb-4 text-gray-300 space-y-1">
              <li>Service providers (payment processing, email delivery)</li>
              <li>Legal authorities when required by law</li>
              <li>Business partners with your consent</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Data Security</h2>
            <p className="mb-4 text-gray-300">
              We implement appropriate security measures to protect your personal information against unauthorized
              access, alteration, disclosure, or destruction.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Your Rights</h2>
            <p className="mb-4 text-gray-300">You have the right to:</p>
            <ul className="list-disc pl-6 mb-4 text-gray-300 space-y-1">
              <li>Access and update your personal information</li>
              <li>Request deletion of your data</li>
              <li>Opt out of marketing communications</li>
              <li>Request data portability</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Contact Us</h2>
            <p className="mb-4 text-gray-300">If you have questions about this Privacy Policy, please contact us at:</p>
            <p className="mb-2 text-gray-300">Email: {brand.contactEmail}</p>
          </section>
        </div>
      </div>
    </div>
  )
}
