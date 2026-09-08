"use client"

import { motion } from "@/lib/motion"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { CursiveLogo } from "@/components/ui/cursive-logo"
import { GlassCard } from "@/components/ui/glass-card"
import { Navbar } from "@/components/navbar"
import { Calendar, Clock, MapPin, Instagram, Check, Star, User, Sparkles, Scissors, Coffee, ShieldCheck, QrCode } from "lucide-react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { parseJWT } from "@/lib/jwt-utils"
import { brand } from "@/lib/brand-config"

export default function HomePage() {
  const router = useRouter()
  const [imageLoaded, setImageLoaded] = useState(false)
  const [subscriptionImageLoaded, setSubscriptionImageLoaded] = useState(false)
  const [monthlyPrice, setMonthlyPrice] = useState<number | null>(null)

  useEffect(() => {
    fetch("/api/settings/subscription-price")
      .then((r) => r.json())
      .then((data) => { if (data.success) setMonthlyPrice(data.price) })
      .catch(() => {})
  }, [])

  useEffect(() => {
    // Preload the hero image
    const heroImg = new Image()
    heroImg.crossOrigin = "anonymous"
    heroImg.onload = () => setImageLoaded(true)
    heroImg.src = "/hero-barbershop-new.jpg"

    // Preload the subscription image
    const subscriptionImg = new Image()
    subscriptionImg.crossOrigin = "anonymous"
    subscriptionImg.onload = () => setSubscriptionImageLoaded(true)
    subscriptionImg.src = "/subscription-photo.jpg"
  }, [])

  return (
    <div className="bg-black text-white flex flex-col min-h-screen pb-24 lg:pb-0">
      <Navbar />

      <main id="main-content" className="flex-1" tabIndex={-1}>
        {/* Hero Section */}
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-0">
          <div className="absolute inset-0">
            {!imageLoaded && <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-black to-gray-800 animate-pulse" />}
            <div
              className={`absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-1000 ${imageLoaded ? "opacity-100" : "opacity-0"}`}
              style={{ backgroundImage: "url('/hero-barbershop-new.jpg')" }}
            />
          </div>
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/40 to-black/60" />

          <div className="relative z-10 text-center px-4 max-w-4xl mx-auto pt-20">
            <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
              <CursiveLogo size="xl" className="mb-6 drop-shadow-2xl" />
              <motion.p initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.3 }} className="text-xl md:text-2xl text-white mb-8 font-light drop-shadow-2xl" style={{ textShadow: "2px 2px 4px rgba(0,0,0,0.8)" }}>
                Where Precision Meets Culture
              </motion.p>
              <motion.p initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.5 }} className="text-lg text-gray-100 mb-12 max-w-2xl mx-auto drop-shadow-2xl" style={{ textShadow: "2px 2px 4px rgba(0,0,0,0.8)" }}>
                Premium barbering experience in {brand.city}. Exclusive subscription-based service for discerning clients who value quality and convenience.
              </motion.p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <Button asChild size="lg" className="bg-white text-black hover:bg-gray-200 px-8 shadow-2xl">
                  <Link href="/signup">Join the Family</Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="border-white text-white hover:bg-white hover:text-black px-8 bg-black/30 backdrop-blur-sm shadow-2xl">
                  <Link href="/book">Book an Appointment</Link>
                </Button>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Why Choose Us Section (Restored) */}
        {/* TEMPLATE NOTE: the shop name, hours ("Tue–Fri: 2PM–7PM..."), and
            address ("Rich Forever Barbershop 2" / Kansas City) below are
            real per-client business info that can't come from
            brand-config.ts — edit them by hand for each new shop. */}
        <section className="py-20 px-4 bg-black">
          <div className="max-w-6xl mx-auto">
            <motion.div initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} viewport={{ once: true }} className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold mb-6">The {brand.name} Experience</h2>
              <p className="text-xl text-gray-400 max-w-3xl mx-auto">Located in {brand.city}, we offer an exclusive subscription service that guarantees your spot with premium cuts every month.</p>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-8">
              <motion.div initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.1 }} viewport={{ once: true }}>
                <GlassCard>
                  <Calendar className="w-12 h-12 mb-4 text-white" />
                  <h3 className="text-xl font-semibold mb-3">Flexible Scheduling</h3>
                  <p className="text-gray-300">4 cuts per month, use them when you need them. Perfect for maintaining your fresh look.</p>
                </GlassCard>
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.2 }} viewport={{ once: true }}>
                <GlassCard>
                  <Clock className="w-12 h-12 mb-4 text-white" />
                  <h3 className="text-xl font-semibold mb-3">Convenient Hours</h3>
                  <p className="text-gray-300">Tue–Fri: 2PM–7PM<br />Sunday: 10AM–4PM<br />Designed around your schedule.</p>
                </GlassCard>
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.3 }} viewport={{ once: true }}>
                <GlassCard>
                  <MapPin className="w-12 h-12 mb-4 text-white" />
                  <h3 className="text-xl font-semibold mb-3">Prime Location</h3>
                  <p className="text-gray-300">REPLACE_WITH_SHOP_ADDRESS<br />{brand.city}<br />Premium environment, premium service.</p>
                </GlassCard>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Restored Subscription Section with Photo Background */}
        <section className="relative py-24 px-4 overflow-hidden">
          <div className="absolute inset-0">
            {!subscriptionImageLoaded && <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-black to-gray-800 animate-pulse" />}
            <div
              className={`absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-1000 ${subscriptionImageLoaded ? "opacity-100" : "opacity-0"}`}
              style={{ backgroundImage: "url('/subscription-photo.jpg')" }}
            />
          </div>
          <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/70 to-black/80" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-black/60" />

          <div className="relative z-10 max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold mb-8 drop-shadow-2xl">Choose Your Path</h2>
              <p className="text-xl text-gray-200 max-w-3xl mx-auto drop-shadow-lg">Join the family today. Stay connected for free or upgrade to VIP for the ultimate experience.</p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
              {/* Regular Plan */}
              <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} transition={{ duration: 0.8 }} viewport={{ once: true }}>
                <GlassCard className="h-full flex flex-col backdrop-blur-xl bg-black/40 border-white/10 shadow-2xl">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="p-3 rounded-2xl bg-white/5"><User className="w-6 h-6 text-gray-400" /></div>
                    <h3 className="text-2xl font-bold">Regular Client</h3>
                  </div>
                  <div className="text-5xl font-bold mb-6">Free</div>
                  <ul className="space-y-4 mb-10 flex-1">
                    <li className="flex items-center gap-3 text-gray-200">
                      <Check className="w-5 h-5 text-green-400" /> Track visit history
                    </li>
                    <li className="flex items-center gap-3 text-gray-200">
                      <Check className="w-5 h-5 text-green-400" /> Mobile check-in
                    </li>
                    <li className="flex items-center gap-3 text-gray-200">
                      <Check className="w-5 h-5 text-green-400" /> Email notifications
                    </li>
                  </ul>
                  <Button asChild size="lg" className="w-full bg-white text-black hover:bg-gray-200">
                    <Link href="/signup">Join for Free</Link>
                  </Button>
                </GlassCard>
              </motion.div>

              {/* VIP Plan */}
              <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} transition={{ duration: 0.8 }} viewport={{ once: true }}>
                <GlassCard className="h-full flex flex-col backdrop-blur-xl bg-black/40 border-blue-500/30 shadow-[0_0_30px_rgba(37,99,235,0.2)] relative overflow-hidden">
                  <div className="absolute top-0 right-0 bg-blue-600 text-white px-4 py-1 text-[10px] font-bold uppercase tracking-widest rounded-bl-lg">Recommended</div>
                  <div className="flex items-center gap-4 mb-6">
                    <div className="p-3 rounded-2xl bg-blue-500/20"><Star className="w-6 h-6 text-blue-400" /></div>
                    <h3 className="text-2xl font-bold">VIP Membership</h3>
                  </div>
                  <div className="flex items-baseline gap-1 mb-6">
                    <span className="text-5xl font-extrabold">${monthlyPrice ?? 150}</span>
                    <span className="text-gray-400">/mo</span>
                  </div>
                  <ul className="space-y-4 mb-10 flex-1">
                    <li className="flex items-center gap-3 text-gray-200">
                      <Check className="w-5 h-5 text-blue-400" /> 4 Premium Haircuts/mo
                    </li>
                    <li className="flex items-center gap-3 text-gray-200">
                      <Check className="w-5 h-5 text-blue-400" /> Priority Booking
                    </li>
                    <li className="flex items-center gap-3 text-gray-200">
                      <Check className="w-5 h-5 text-blue-400" /> Premium Snacks & Drinks
                    </li>
                    <li className="flex items-center gap-3 text-gray-200">
                      <Check className="w-5 h-5 text-blue-400" /> 50% off all other services
                    </li>
                  </ul>
                  <Button asChild size="lg" className="w-full bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-900/20">
                    <Link href="/signup">Become a VIP</Link>
                  </Button>
                </GlassCard>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Why Choose Us Icons Section (Restored) */}
        <section className="py-20 px-4 bg-black">
          <div className="max-w-6xl mx-auto">
            <div className="bg-black/50 backdrop-blur-xl border border-white/10 rounded-3xl p-12 shadow-2xl">
              <h3 className="text-3xl font-bold mb-12 text-center">Why Choose {brand.name}?</h3>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
                <div className="text-center">
                  <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-6"><Scissors className="w-8 h-8 text-blue-400" /></div>
                  <h4 className="font-bold mb-3">Expert Barbering</h4>
                  <p className="text-sm text-gray-400">Master barbers with years of experience in premium styling.</p>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-6"><QrCode className="w-8 h-8 text-purple-400" /></div>
                  <h4 className="font-bold mb-3">Modern Tech</h4>
                  <p className="text-sm text-gray-400">QR code check-ins and streamlined mobile experience.</p>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-6"><Sparkles className="w-8 h-8 text-yellow-400" /></div>
                  <h4 className="font-bold mb-3">Exclusive Perks</h4>
                  <p className="text-sm text-gray-400">VIP lounge, curated snacks, and members-only events.</p>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-6"><Clock className="w-8 h-8 text-green-400" /></div>
                  <h4 className="font-bold mb-3">Time Saving</h4>
                  <p className="text-sm text-gray-400">Priority scheduling means less waiting, more precision.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Map Section */}
        {/* TEMPLATE NOTE: the Maps embed src, shop name/address, hours, and
            Instagram handle below (here and in the footer) are all real
            per-client info. Get a fresh Maps embed URL from the new shop's
            actual Google Maps listing (Maps -> Share -> Embed a map) rather
            than editing the coordinates by hand. */}
        <section className="py-24 px-4 bg-gray-900">
          <div className="max-w-6xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-12">Visit Our {brand.city} Shop</h2>
            <div className="relative overflow-hidden rounded-3xl border border-white/10 shadow-2xl mb-12">
              <div className="relative w-full" style={{ paddingBottom: "45%" }}>
                <iframe
                  src="REPLACE_WITH_GOOGLE_MAPS_EMBED_URL"
                  className="absolute top-0 left-0 w-full h-full border-0 grayscale invert contrast-125"
                  allowFullScreen
                  loading="lazy"
                />
              </div>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="flex items-center gap-4 p-6 bg-white/5 rounded-2xl border border-white/5">
                <MapPin className="text-blue-400 w-6 h-6" />
                <div className="text-left"><p className="font-bold">Location</p><p className="text-sm text-gray-400">REPLACE_WITH_SHOP_ADDRESS</p></div>
              </div>
              <div className="flex items-center gap-4 p-6 bg-white/5 rounded-2xl border border-white/5">
                <Clock className="text-green-400 w-6 h-6" />
                <div className="text-left"><p className="font-bold">Hours</p><p className="text-sm text-gray-400">Tue-Fri: 2-7PM | Sun: 10-4PM</p></div>
              </div>
              <div className="flex items-center gap-4 p-6 bg-white/5 rounded-2xl border border-white/5">
                <Instagram className="text-pink-400 w-6 h-6" />
                <div className="text-left"><p className="font-bold">Follow Us</p><p className="text-sm text-gray-400">@REPLACE_ME</p></div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="pt-16 pb-8 px-4 border-t border-white/10 bg-black text-gray-400">
        <div className="max-w-6xl mx-auto">
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-10 mb-12">
            <div>
              <CursiveLogo size="md" className="mb-4" />
              <p className="text-sm text-gray-500 max-w-xs">Premium barbering experience in {brand.city}. Where precision meets culture.</p>
            </div>

            <div>
              <p className="font-bold text-white mb-4 text-sm uppercase tracking-wide">Explore</p>
              <ul className="space-y-2 text-sm">
                <li><Link href="/book" className="hover:text-white transition-colors">Book an Appointment</Link></li>
                <li><Link href="/pricing" className="hover:text-white transition-colors">Membership & Pricing</Link></li>
                <li><Link href="/gallery" className="hover:text-white transition-colors">Gallery</Link></li>
                {/* TEMPLATE NOTE: /akn was built for the original client's
                    specific ingrown-hair specialty service. Remove this
                    link (and the page/nav entry) if the new shop doesn't
                    offer it — see lib/brand-config.ts's header comment. */}
                <li><Link href="/akn" className="hover:text-white transition-colors">AKN & Ingrown Hair Care</Link></li>
              </ul>
            </div>

            <div>
              <p className="font-bold text-white mb-4 text-sm uppercase tracking-wide">Visit</p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2"><MapPin className="w-4 h-4 mt-0.5 shrink-0 text-blue-400" /> REPLACE_WITH_SHOP_ADDRESS<br />{brand.city}</li>
                <li className="flex items-start gap-2"><Clock className="w-4 h-4 mt-0.5 shrink-0 text-green-400" /> Tue-Fri: 2-7PM<br />Sun: 10-4PM</li>
              </ul>
            </div>

            <div>
              <p className="font-bold text-white mb-4 text-sm uppercase tracking-wide">Connect</p>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="https://www.instagram.com/REPLACE_ME/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-white transition-colors">
                    <Instagram className="w-4 h-4 text-pink-400" /> @REPLACE_ME
                  </a>
                </li>
                <li><Link href="/login" className="hover:text-white transition-colors">Sign In</Link></li>
                <li><Link href="/signup" className="hover:text-white transition-colors">Become a Member</Link></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500">
            <p>© {new Date().getFullYear()} {brand.name}. All rights reserved.</p>
            <div className="flex items-center gap-6">
              <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
              <Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}


