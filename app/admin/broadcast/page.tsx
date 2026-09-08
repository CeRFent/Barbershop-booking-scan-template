"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { GlassCard } from "@/components/ui/glass-card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Navbar } from "@/components/navbar"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Megaphone, Info, Bell } from "lucide-react"

type Audience = "all" | "vip" | "regular"

const audienceOptions: { value: Audience; label: string; description: string }[] = [
  { value: "all", label: "All Customers", description: "Every customer account" },
  { value: "vip", label: "VIP Only", description: "Customers with an active subscription" },
  { value: "regular", label: "Regular Only", description: "Customers without an active subscription" },
]

export default function AdminBroadcastPage() {
  const [audience, setAudience] = useState<Audience>("all")
  const [subject, setSubject] = useState("")
  const [message, setMessage] = useState("")
  const [sending, setSending] = useState(false)
  const [sendingReminder, setSendingReminder] = useState(false)
  const { toast } = useToast()

  const handleSendReminder = async () => {
    const audienceLabel = audienceOptions.find((a) => a.value === audience)?.label
    if (!confirm(`Send a "turn on notifications" reminder email to: ${audienceLabel}?\n\nThis can't be undone.`)) return

    setSendingReminder(true)
    try {
      const token = localStorage.getItem("token")
      const res = await fetch("/api/admin/notification-reminder", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ audience }),
      })
      const data = await res.json()
      if (data.success) {
        toast({
          title: "Reminder sent",
          description: `Sent to ${data.recipientCount} client${data.recipientCount === 1 ? "" : "s"}.`,
        })
      } else {
        toast({ title: "Error", description: data.error || "Failed to send reminder.", variant: "destructive" })
      }
    } catch {
      toast({ title: "Error", description: "Something went wrong.", variant: "destructive" })
    } finally {
      setSendingReminder(false)
    }
  }

  const handleSend = async () => {
    if (!message.trim()) {
      toast({ title: "Missing message", description: "Write a message before sending.", variant: "destructive" })
      return
    }

    const audienceLabel = audienceOptions.find((a) => a.value === audience)?.label
    const preview = [
      `Send this to: ${audienceLabel}`,
      subject.trim() ? `Subject: ${subject.trim()}` : `Subject: (none — push notification only)`,
      ``,
      message.trim(),
      ``,
      `This can't be undone. Send it?`,
    ].join('\n')
    if (!confirm(preview)) return

    setSending(true)
    try {
      const token = localStorage.getItem("token")
      const res = await fetch("/api/admin/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          message: message.trim(),
          subject: subject.trim() || undefined,
          audience,
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast({
          title: "Broadcast sent",
          description: `Sent to ${data.recipientCount} client${data.recipientCount === 1 ? "" : "s"}.`,
        })
        setMessage("")
        setSubject("")
      } else {
        toast({ title: "Error", description: data.error || "Failed to send broadcast.", variant: "destructive" })
      }
    } catch (err) {
      toast({ title: "Error", description: "Something went wrong.", variant: "destructive" })
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white pb-20">
      <Navbar />
      <div className="pt-24 px-4 max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Broadcast</h1>
          <p className="text-gray-400">Send a push + email notification to a group of clients at once.</p>
        </div>

        <GlassCard className="space-y-4 border-blue-500/10">
          <div>
            <Label>Audience</Label>
            <div className="grid sm:grid-cols-3 gap-3 mt-2">
              {audienceOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setAudience(opt.value)}
                  className={`text-left p-3 rounded-xl border transition-all ${
                    audience === opt.value
                      ? "border-blue-500/50 bg-blue-500/10"
                      : "border-white/10 bg-white/5 hover:border-white/20"
                  }`}
                >
                  <p className="font-medium text-sm">{opt.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{opt.description}</p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="bc-subject">Email subject (optional)</Label>
            <Input
              id="bc-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Leave blank to send push only"
              className="bg-white/5 border-white/10"
            />
          </div>

          <div>
            <Label htmlFor="bc-message">Message</Label>
            <Textarea
              id="bc-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="What do you want to tell them?"
              className="bg-white/5 border-white/10"
              rows={5}
            />
          </div>

          <Button
            onClick={handleSend}
            disabled={sending}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-900/20"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Megaphone className="w-4 h-4 mr-1" />}
            Send Broadcast
          </Button>
        </GlassCard>

        <GlassCard className="mt-8 space-y-3 border-white/5">
          <h3 className="font-bold flex items-center gap-2">
            <Bell className="w-5 h-5 text-blue-400" /> Notification Reminder
          </h3>
          <p className="text-sm text-gray-400">
            Push permission can only be granted by a customer actively on the site — there's no way to turn it on for
            them remotely. This sends a one-time email (to the audience selected above) pointing customers back to
            the site to enable it themselves.
          </p>
          <Button
            onClick={handleSendReminder}
            disabled={sendingReminder}
            variant="outline"
            className="w-full border-white/20"
          >
            {sendingReminder ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Bell className="w-4 h-4 mr-1" />}
            Send Notification Reminder
          </Button>
        </GlassCard>

        <GlassCard className="mt-8 p-6 border-white/5 bg-white/5 flex items-start gap-4">
          <Info className="w-6 h-6 text-gray-400 shrink-0 mt-1" />
          <div>
            <h3 className="font-bold mb-1">About broadcasts</h3>
            <p className="text-sm text-gray-400">
              Every recipient gets a push notification; adding an email subject also sends the same message by email.
              Only customers who've enabled notifications will actually receive it.
            </p>
          </div>
        </GlassCard>
      </div>
    </div>
  )
}
