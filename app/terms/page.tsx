import type { Metadata } from "next"
import { Navbar } from "@/components/navbar"
import { brand } from "@/lib/brand-config"

// TEMPLATE NOTE: this legal copy was written for the original business.
// Have a real lawyer review it before using it for a different company —
// swapping the brand name isn't enough to make it legally correct for a
// new entity, jurisdiction, or set of actual business practices.

export const metadata: Metadata = {
  title: `Terms of Service - ${brand.name}`,
  description: `Terms of service for ${brand.name} barbershop services and subscriptions.`,
}

// Update this by hand whenever the terms text actually changes — was
// previously `new Date().toLocaleDateString()`, which silently printed
// today's date on every page load instead of a real last-edited date.
const LAST_UPDATED = "August 29, 2026"

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />
      <div className="container mx-auto px-4 pt-32 pb-16 max-w-4xl">
        <h1 className="text-4xl font-bold mb-8">Terms of Service</h1>
        <div className="max-w-none">
          <p className="text-gray-400 mb-6">Last updated: {LAST_UPDATED}</p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Acceptance of Terms</h2>
            <p className="mb-4 text-gray-300">
              By accessing and using {brand.name} services, you accept and agree to be bound by the terms and provision of
              this agreement.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Service Description</h2>
            <p className="mb-4 text-gray-300">
              {brand.name} provides premium barbershop services through a subscription-based model. Our services include
              haircuts, styling, and grooming services.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Subscription Terms</h2>
            <ul className="list-disc pl-6 mb-4 text-gray-300 space-y-1">
              <li>Monthly subscriptions include 4 cuts per month</li>
              <li>Unused cuts do not roll over to the next month</li>
              <li>Subscriptions auto-renew unless cancelled</li>
              <li>Cancellation must be made before the next billing cycle</li>
              <li>Refunds are provided according to our refund policy</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Payment Terms</h2>
            <p className="mb-4 text-gray-300">
              Payment is processed monthly through Stripe. By subscribing, you authorize us to charge your payment
              method for the subscription fee.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Appointment Policy</h2>
            <ul className="list-disc pl-6 mb-4 text-gray-300 space-y-1">
              <li>Appointments must be scheduled in advance</li>
              <li>24-hour cancellation notice required</li>
              <li>No-shows may result in cut deduction</li>
              <li>Late arrivals may result in shortened service time</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">User Conduct</h2>
            <p className="mb-4 text-gray-300">You agree to:</p>
            <ul className="list-disc pl-6 mb-4 text-gray-300 space-y-1">
              <li>Provide accurate account information</li>
              <li>Maintain the security of your account</li>
              <li>Respect our staff and other customers</li>
              <li>Follow health and safety guidelines</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Limitation of Liability</h2>
            <p className="mb-4 text-gray-300">
              {brand.name} shall not be liable for any indirect, incidental, special, consequential, or punitive damages
              resulting from your use of our services.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Contact Information</h2>
            <p className="mb-4 text-gray-300">For questions about these Terms of Service, contact us at:</p>
            <p className="mb-2 text-gray-300">Email: {brand.contactEmail}</p>
          </section>
        </div>
      </div>
    </div>
  )
}
