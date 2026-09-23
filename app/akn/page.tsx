"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import { Navbar } from "@/components/navbar"
import { GlassCard } from "@/components/ui/glass-card"
import { Button } from "@/components/ui/button"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { CheckCircle2, XCircle, AlertTriangle, MapPin, CalendarDays, Stethoscope } from "lucide-react"
import { brand } from "@/lib/brand-config"

const SYMPTOMS = [
  "Small bumps around the hair follicles",
  "Razor bumps",
  "Ingrown hairs",
  "Itching or irritation",
  "Pustules",
  "Dark marks",
  "Firm or raised bumps",
  "Thickened/scarred areas",
  "Hair loss in affected areas",
]

const CAUSES = [
  { icon: "✂️", title: "Extremely Close Haircuts", body: "Repeated close shaving or cutting the hair extremely short can irritate the follicles." },
  { icon: "🪒", title: "Razor Shaving", body: "A very close shave can create irritation and may contribute to follicular inflammation." },
  { icon: "👕", title: "Friction", body: "Collars, hats, helmets, athletic equipment and other items repeatedly rubbing the neck can aggravate the area." },
  { icon: "💦", title: "Heat & Sweat", body: "Heat and moisture can contribute to irritation and make the environment around affected follicles less comfortable." },
  { icon: "🌀", title: "Curly/Coarse Hair", body: "Tightly curled hair can be more prone to becoming trapped or re-entering the skin, contributing to follicular inflammation and ingrown hairs." },
  { icon: "🤲", title: "Picking & Scratching", body: "Constantly touching, scratching or picking at bumps can further traumatize the area." },
]

// technicalTitle: the cursive heading font this site uses everywhere else
// (see globals.css) is illegible for genuine clinical/Latin terminology —
// "Pseudofolliculitis" specifically — so those titles opt back into the
// plain sans-serif font instead. Everyday-English titles keep the cursive
// look, which reads fine.
const COMPARISON = [
  { title: "Ingrown Hair", body: "A hair grows back into the skin instead of growing normally outward. This can produce inflammation, bumps, itching and sometimes discoloration.", technicalTitle: false },
  { title: "Razor Bumps / Pseudofolliculitis", body: "This commonly occurs after shaving when hairs curve back into the skin and trigger inflammation. It's particularly common in tightly curled hair.", technicalTitle: true },
  { title: "AKN", body: "A chronic inflammatory follicular condition that most commonly affects the back of the neck/scalp and can progress to raised scarring and hair loss.", technicalTitle: false },
]

const WARNING_SIGNS = [
  "Recurring bumps in the same area",
  "Bumps that never completely go away",
  "Increasingly hard or raised bumps",
  "Persistent itching",
  "Pain or tenderness",
  "Pus-filled bumps",
  "Darkening of the skin",
  "Thickened/scarred skin",
  "Hair loss around the bumps",
]

const DOS = [
  "Pay attention to your haircut routine — if extremely close cuts consistently trigger your bumps, discuss alternative grooming approaches.",
  "Keep the area clean.",
  "Minimize friction. Pay attention to collars, hats, helmets, chains and athletic equipment.",
  "Follow your recommended aftercare routine.",
  "Give your skin time to recover between treatments.",
  "Seek medical evaluation when necessary — a dermatologist can determine whether you're dealing with AKN, pseudofolliculitis, folliculitis or another condition.",
]

const DONTS = [
  "Pick at your bumps.",
  "Scratch or squeeze them.",
  "Repeatedly shave over irritated skin.",
  "Aggressively exfoliate inflamed skin.",
  "Use random acids or harsh home remedies.",
  "Assume every bump is \"just an ingrown\" — the AAD specifically cautions against DIY remedies for AKN, since some can cause chemical burns and additional scarring.",
]

const TREATMENT_STEPS = [
  { title: "Assessment", body: "Understanding where the bumps occur, your grooming routine and your skin's history." },
  { title: "Targeted Treatment", body: "Addressing the affected area according to your individual condition and treatment plan." },
  { title: "Skin Education", body: "Understanding what may be contributing to recurring irritation." },
  { title: "Home Care", body: "A consistent aftercare routine designed to support the treatment process." },
  { title: "Maintenance", body: "Because recurring AKN and ingrown hairs often require ongoing management rather than a one-time fix." },
]

const KITS = [
  { name: "Starter Kit", desc: "For clients beginning their routine." },
  { name: "Maintenance Kit", desc: "For returning clients maintaining their results." },
  { name: "AKN Care Kit", desc: "For clients specifically dealing with neck/scalp concerns." },
  { name: "Ingrown Hair Kit", desc: "For beard, neck, body or shaving-related ingrown hairs." },
]

const DERM_SIGNS = [
  "Significant pain",
  "Spreading redness",
  "Drainage/pus",
  "Severe inflammation",
  "Rapidly worsening bumps",
  "Significant scarring",
  "Hair loss",
  "A diagnosis you're uncertain about",
  "A condition that isn't responding to your current routine",
]

const FAQS = [
  { q: "Is AKN the same as ingrown hairs?", a: "No. They can look similar and may occur together, but AKN is a distinct inflammatory follicular condition." },
  { q: "Can shaving cause AKN?", a: "Close shaving and repeated irritation can contribute to or worsen AKN in susceptible individuals." },
  { q: "Can I still get haircuts if I have AKN?", a: "Possibly, but your grooming routine may need to be modified. Close shaving is a common trigger, and minimizing irritation is important." },
  { q: "Can AKN cause hair loss?", a: "Yes. Advanced AKN can cause scarring that results in permanent hair loss." },
  { q: "Can I pick my ingrown hairs?", a: "It's better not to. Picking, squeezing and scratching can increase irritation and potentially worsen inflammation or scarring." },
  { q: "Can AKN be treated?", a: "It can be managed, but there isn't a single treatment that works for everyone. Medical treatment may include prescription medications and procedures, depending on severity." },
]

function SectionHeading({ eyebrow, title }: { eyebrow?: string; title: string }) {
  return (
    <div className="mb-8 text-center">
      {eyebrow && <p className="text-sm font-bold uppercase tracking-widest text-primary mb-2">{eyebrow}</p>}
      <h2 className="text-3xl md:text-4xl font-bold">{title}</h2>
    </div>
  )
}

export default function AknPage() {
  return (
    <div className="min-h-screen bg-background text-foreground pb-24">
      <Navbar />

      {/* Hero */}
      <section className="relative pt-32 pb-16 px-4 text-center max-w-4xl mx-auto overflow-hidden">
        <div
          className="absolute inset-0 -z-10 opacity-40 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 60% 50% at 50% 0%, hsl(var(--primary) / 0.25), transparent 70%)" }}
        />
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
          <p className="text-sm font-bold uppercase tracking-widest text-primary mb-4">AKN &amp; Ingrown Hair Treatment</p>
          <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
            Stop Fighting the Bumps.
            <br />
            Start Understanding Your Skin.
          </h1>
          <p className="text-lg text-muted-foreground mb-4">
            Professional AKN &amp; ingrown-hair focused services in {brand.city}.
          </p>
          <p className="text-muted-foreground mb-10 max-w-2xl mx-auto">
            Whether you&apos;re dealing with recurring ingrown hairs, razor bumps, dark marks, irritation, or bumps along the neck and
            hairline, understanding why they&apos;re happening is the first step toward improving them.
          </p>
          <Button asChild size="lg" className="bg-foreground text-background hover:bg-foreground/90 px-8">
            <Link href="/book?serviceName=AKN">Book an AKN / Ingrown Hair Consultation</Link>
          </Button>
        </motion.div>
      </section>

      {/* What is AKN */}
      <section className="py-16 px-4 max-w-5xl mx-auto">
        <SectionHeading title="What Is AKN?" />
        <div className="grid gap-6 items-start">
          {/* TEMPLATE NOTE: this section used to carry a photo of the shop's
              own AKN assessment process (public/akn/*) -- removed along
              with the rest of this template's real client photos. Add the
              new shop's own photo back in the same spot if wanted. */}
          <GlassCard className="border-primary/10 space-y-4">
            <h3 className="text-xl font-bold font-inter">Acne Keloidalis Nuchae (AKN)</h3>
            <p className="text-gray-300">
              AKN is a chronic inflammatory condition that commonly affects the back of the neck and lower scalp. It often starts as
              small, itchy or irritated bumps around hair follicles and can progressively develop into firm, raised scars.
            </p>
            <p className="text-gray-300">
              Despite the name, AKN isn&apos;t traditional acne, and the resulting scars aren&apos;t technically keloids.
            </p>
            <p className="text-gray-300">
              Early recognition matters because untreated AKN can progress to more significant scarring and permanent hair loss.
            </p>
            <div className="pt-2">
              <p className="font-medium mb-3">AKN can look like:</p>
              <div className="grid sm:grid-cols-2 gap-2">
                {SYMPTOMS.map((s) => (
                  <div key={s} className="flex items-start gap-2 text-sm text-gray-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                    {s}
                  </div>
                ))}
              </div>
            </div>
          </GlassCard>
        </div>
      </section>

      {/* Causes */}
      <section className="py-16 px-4 bg-gradient-to-b from-primary/[0.04] via-primary/[0.02] to-transparent">
        <div className="max-w-5xl mx-auto">
          <SectionHeading title="So How Do You Get AKN?" />
          <p className="text-center text-muted-foreground max-w-2xl mx-auto mb-10 -mt-4">
            There isn&apos;t one single cause. AKN appears to involve inflammation around the hair follicles, and repeated irritation,
            friction and trauma can contribute to triggering or worsening it.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {CAUSES.map((c) => (
              <GlassCard key={c.title} className="border-foreground/5">
                <p className="text-3xl mb-3">{c.icon}</p>
                <h3 className="font-bold mb-2">{c.title}</h3>
                <p className="text-sm text-muted-foreground">{c.body}</p>
              </GlassCard>
            ))}
          </div>
        </div>
      </section>

      {/* AKN vs Ingrown Hairs */}
      <section className="py-16 px-4 max-w-5xl mx-auto">
        <SectionHeading title="AKN vs. Ingrown Hairs" />
        <p className="text-center text-muted-foreground max-w-2xl mx-auto mb-10 -mt-4">They&apos;re not exactly the same thing.</p>
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {COMPARISON.map((c) => (
            <GlassCard key={c.title} className="border-foreground/5">
              <h3 className={`font-bold mb-2 ${c.technicalTitle ? "font-inter" : ""}`}>{c.title}</h3>
              <p className="text-sm text-muted-foreground">{c.body}</p>
            </GlassCard>
          ))}
        </div>
        <GlassCard className="border-amber-500/20 bg-amber-500/5">
          <p className="text-amber-200 text-sm">
            <strong>The important part:</strong> you can have ingrown hairs, razor bumps and AKN at the same time, which is why proper
            evaluation is important.
          </p>
        </GlassCard>
      </section>

      {/* Signs you shouldn't ignore */}
      <section className="py-16 px-4 max-w-4xl mx-auto">
        <SectionHeading title="Signs You Shouldn't Ignore" />
        <GlassCard className="border-red-500/20">
          <div className="grid sm:grid-cols-2 gap-2 mb-4">
            {WARNING_SIGNS.map((s) => (
              <div key={s} className="flex items-start gap-2 text-sm text-gray-300">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                {s}
              </div>
            ))}
          </div>
          <p className="text-sm text-muted-foreground border-t border-foreground/10 pt-4">
            If you&apos;re experiencing any of the above, it may be time to stop treating the problem like a normal razor bump. AKN can
            become more difficult to manage once significant scarring develops.
          </p>
        </GlassCard>
      </section>

      {/* Do's and Don'ts */}
      <section className="py-16 px-4 max-w-5xl mx-auto">
        <SectionHeading title="The Do's & Don'ts" />
        <div className="grid md:grid-cols-2 gap-6">
          <GlassCard className="border-green-500/20">
            <h3 className="font-bold mb-4 flex items-center gap-2 text-green-400">
              <CheckCircle2 className="w-5 h-5" /> DO
            </h3>
            <ul className="space-y-3">
              {DOS.map((d) => (
                <li key={d} className="text-sm text-gray-300 flex gap-2">
                  <span className="text-green-400 shrink-0">•</span> {d}
                </li>
              ))}
            </ul>
          </GlassCard>
          <GlassCard className="border-red-500/20">
            <h3 className="font-bold mb-4 flex items-center gap-2 text-red-400">
              <XCircle className="w-5 h-5" /> DON&apos;T
            </h3>
            <ul className="space-y-3">
              {DONTS.map((d) => (
                <li key={d} className="text-sm text-gray-300 flex gap-2">
                  <span className="text-red-400 shrink-0">•</span> {d}
                </li>
              ))}
            </ul>
          </GlassCard>
        </div>
      </section>

      {/* History */}
      <section className="py-16 px-4 max-w-4xl mx-auto">
        <SectionHeading title="The History of AKN" />
        <GlassCard className="border-foreground/5 space-y-4">
          <p className="text-gray-300 font-medium">A condition that&apos;s been misunderstood for generations.</p>
          <p className="text-muted-foreground text-sm">
            AKN has historically been confused with acne, razor bumps and keloids because of the way the bumps and scars can look. The
            term &quot;nuchae&quot; refers to the nape/back of the neck, while &quot;acne keloidalis&quot; describes the acne-like
            appearance and keloid-like scarring associated with the condition. However, the AAD notes that the bumps aren&apos;t
            actually acne and the resulting scars aren&apos;t technically keloids.
          </p>
          <p className="text-muted-foreground text-sm">
            Modern dermatology recognizes AKN as a follicular inflammatory disorder, and treatment focuses on controlling inflammation,
            reducing triggers and preventing progression.
          </p>
        </GlassCard>
      </section>

      {/* Why haircuts matter */}
      <section className="py-16 px-4 max-w-4xl mx-auto">
        <GlassCard className="border-primary/30 bg-primary/5 space-y-4">
          <h2 className="text-2xl md:text-3xl font-bold">Why Haircuts Matter</h2>
          <p className="text-gray-200 font-medium">Your haircut could be part of the problem.</p>
          <p className="text-gray-300 text-sm">
            If your skin consistently breaks out after a close haircut, the issue may not simply be &quot;dirty clippers&quot; or acne.
            Close shaving and repeated trauma can irritate the follicles and aggravate AKN. Dermatology guidance commonly recommends
            avoiding very close shaving and minimizing friction around the affected area.
          </p>
          <p className="text-gray-300 text-sm">
            That doesn&apos;t necessarily mean you can never get a haircut. It means your haircut routine may need to change.
          </p>
        </GlassCard>
      </section>

      {/* Treatment approach */}
      <section className="py-16 px-4 bg-gradient-to-b from-primary/[0.04] via-primary/[0.02] to-transparent">
        <div className="max-w-4xl mx-auto">
          <SectionHeading title="Professional AKN & Ingrown Hair Care" />
          <p className="text-center text-muted-foreground max-w-2xl mx-auto mb-10 -mt-4">
            My approach focuses on more than simply removing what&apos;s visible.
          </p>
          <div className="space-y-4 mb-8">
            {TREATMENT_STEPS.map((step, i) => (
              <GlassCard key={step.title} className="border-foreground/5 flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center font-bold shrink-0">{i + 1}</div>
                <div>
                  <h3 className="font-bold mb-1">{step.title}</h3>
                  <p className="text-sm text-muted-foreground">{step.body}</p>
                </div>
              </GlassCard>
            ))}
          </div>

          {/* TEMPLATE NOTE: this section used to carry two photos of the
              shop's own assessment/steam-treatment process (public/akn/*)
              -- removed along with the rest of this template's real client
              photos. Add the new shop's own photos back in the same spot
              if wanted. */}

          <GlassCard className="border-amber-500/20 bg-amber-500/5">
            <p className="text-sm text-amber-200">
              <strong>Important:</strong> AKN can require medical treatment, particularly when there is significant inflammation,
              infection, scarring or hair loss. This service is professional skin care and support — not a replacement for diagnosis or
              medical treatment. The AAD recommends dermatologic evaluation for suspected AKN.
            </p>
          </GlassCard>
        </div>
      </section>

      {/* Care kits */}
      <section className="py-16 px-4 max-w-5xl mx-auto">
        <SectionHeading title="AKN & Ingrown Hair Care Kits" />
        <p className="text-center text-muted-foreground max-w-2xl mx-auto mb-10 -mt-4">
          Consistency between appointments matters. Our AKN &amp; Ingrown Hair Care Kits are designed to help clients maintain their
          recommended routine between professional treatments.
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {KITS.map((kit) => (
            <GlassCard key={kit.name} className="border-foreground/5 text-center opacity-70">
              <h3 className="font-bold mb-2">{kit.name}</h3>
              <p className="text-sm text-muted-foreground mb-4">{kit.desc}</p>
              <span className="text-xs uppercase tracking-wide text-gray-500 border border-foreground/10 rounded-full px-3 py-1">
                Coming soon
              </span>
            </GlassCard>
          ))}
        </div>
      </section>

      {/* Before & After */}
      <section className="py-16 px-4 max-w-5xl mx-auto">
        <SectionHeading title="Before & After" />
        <p className="text-center text-muted-foreground max-w-2xl mx-auto mb-10 -mt-4">Real skin. Real progress.</p>
        <GlassCard className="border-foreground/5 text-center py-16">
          <p className="text-gray-500">Client before/after photos coming soon.</p>
        </GlassCard>
      </section>

      {/* FAQ */}
      <section className="py-16 px-4 max-w-3xl mx-auto">
        <SectionHeading title="Frequently Asked Questions" />
        <GlassCard className="border-foreground/5">
          <Accordion type="single" collapsible className="w-full">
            {FAQS.map((faq, i) => (
              <AccordionItem key={faq.q} value={`faq-${i}`} className="border-foreground/10">
                <AccordionTrigger className="text-left hover:no-underline">{faq.q}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">{faq.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </GlassCard>
      </section>

      {/* When to see a dermatologist */}
      <section className="py-16 px-4 max-w-4xl mx-auto">
        <GlassCard className="border-red-500/20 space-y-4">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Stethoscope className="w-6 h-6 text-red-400" /> When to See a Dermatologist
          </h2>
          <p className="text-gray-300 text-sm">Some skin concerns require a dermatologist. Seek professional medical evaluation if you have:</p>
          <div className="grid sm:grid-cols-2 gap-2">
            {DERM_SIGNS.map((s) => (
              <div key={s} className="flex items-start gap-2 text-sm text-gray-300">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                {s}
              </div>
            ))}
          </div>
          <p className="text-sm text-muted-foreground border-t border-foreground/10 pt-4">
            A dermatologist can help determine whether the condition is AKN, pseudofolliculitis, folliculitis, infection or another
            skin disorder.
          </p>
        </GlassCard>
      </section>

      {/* Final CTA */}
      <section className="py-16 px-4 max-w-3xl mx-auto text-center">
        <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Take Control of Your Skin?</h2>
        <p className="text-muted-foreground mb-8">
          Your bumps shouldn&apos;t control how you wear your hair. If you&apos;re dealing with recurring ingrown hairs, razor bumps or
          concerns around the neck and hairline, let&apos;s create a plan for your skin.
        </p>
        <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground mb-8">
          <span className="flex items-center gap-2">
            <MapPin className="w-4 h-4" /> {brand.city}
          </span>
          <span className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4" /> Appointments currently available
          </span>
        </div>
        <Button asChild size="lg" className="bg-foreground text-background hover:bg-foreground/90 px-8">
          <Link href="/book?serviceName=AKN">Book Your AKN / Ingrown Hair Service</Link>
        </Button>
      </section>
    </div>
  )
}
