"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { GlassCard } from "@/components/ui/glass-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Navbar } from "@/components/navbar"
import { useToast } from "@/hooks/use-toast"
import { Skeleton } from "@/components/ui/skeleton"
import { User, Loader2, Lock, Save, Bell, BellOff } from "lucide-react"
import { useRouter } from "next/navigation"
import { parseJWT } from "@/lib/jwt-utils"
import { brand } from "@/lib/brand-config"
import {
  getBrowserNotificationPermission,
  getPushOptedIn,
  requestOneSignalPermission,
  setPushOptedIn,
} from "@/lib/onesignal-client"

const brandHost = brand.domain.replace(/^https?:\/\//, "")

export default function AccountPage() {
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [savingProfile, setSavingProfile] = useState(false)

  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [changingPassword, setChangingPassword] = useState(false)

  const [notifPermission, setNotifPermission] = useState<NotificationPermission | null>(null)
  const [notifOptedIn, setNotifOptedIn] = useState<boolean | null>(null)
  const [notifBusy, setNotifBusy] = useState(false)

  const { toast } = useToast()
  const router = useRouter()

  const expireSession = () => {
    localStorage.removeItem("token")
    toast({ title: "Session expired", description: "Please sign in again to continue.", variant: "destructive" })
    router.push("/login")
  }

  useEffect(() => {
    const load = async () => {
      const token = localStorage.getItem("token")
      if (!token) { router.push("/login"); return }

      try {
        const payload = parseJWT(token)
        if (!payload) { expireSession(); return }
        if (payload.role === "admin") { router.push("/admin/profile"); return }
        setUserId(payload.userId)

        const res = await fetch(`/api/user/profile/${payload.userId}`, { headers: { Authorization: `Bearer ${token}` } })
        if (res.status === 401) { expireSession(); return }
        const data = await res.json()
        if (res.ok) {
          setName(data.name || "")
          setPhone(data.phone || "")
          setEmail(data.email || "")
        } else {
          toast({ title: "Couldn't load profile", description: data.error, variant: "destructive" })
        }
      } catch {
        expireSession()
      } finally {
        setLoading(false)
      }
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID) return
    const permission = getBrowserNotificationPermission()
    setNotifPermission(permission)
    if (permission === "granted") {
      getPushOptedIn().then((optedIn) => setNotifOptedIn(optedIn ?? true))
    }
  }, [])

  const enableNotifications = async () => {
    if (!userId) return
    setNotifBusy(true)
    try {
      const result = await requestOneSignalPermission(userId)
      setNotifPermission(result)
      if (result === "granted") {
        setNotifOptedIn(true)
        toast({ title: "Notifications enabled" })
      } else if (result === "denied") {
        toast({
          title: "Notifications blocked",
          description: "Check your browser or phone settings for this site to allow them.",
          variant: "destructive",
        })
      }
    } catch {
      toast({ title: "Couldn't enable notifications", description: "Please try again.", variant: "destructive" })
    } finally {
      setNotifBusy(false)
    }
  }

  const toggleNotifications = async () => {
    setNotifBusy(true)
    try {
      const next = !notifOptedIn
      await setPushOptedIn(next)
      setNotifOptedIn(next)
      toast({ title: next ? "Notifications enabled" : "Notifications disabled" })
    } catch {
      toast({ title: "Couldn't update notifications", description: "Please try again.", variant: "destructive" })
    } finally {
      setNotifBusy(false)
    }
  }

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId) return
    const token = localStorage.getItem("token")
    if (!token) { expireSession(); return }

    setSavingProfile(true)
    try {
      const res = await fetch(`/api/user/profile/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name, phone }),
      })
      const data = await res.json()
      if (res.status === 401) { expireSession(); return }
      if (!res.ok) {
        toast({ title: "Couldn't save changes", description: data.error, variant: "destructive" })
        return
      }
      toast({ title: "Profile updated" })
    } catch {
      toast({ title: "Error", description: "Something went wrong.", variant: "destructive" })
    } finally {
      setSavingProfile(false)
    }
  }

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId) return

    if (newPassword !== confirmPassword) {
      toast({ title: "Passwords don't match", variant: "destructive" })
      return
    }
    if (newPassword.length < 8) {
      toast({ title: "Password too short", description: "Must be at least 8 characters.", variant: "destructive" })
      return
    }

    const token = localStorage.getItem("token")
    if (!token) { expireSession(); return }

    setChangingPassword(true)
    try {
      const res = await fetch(`/api/user/profile/${userId}/password`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      const data = await res.json()
      if (res.status === 401 && data.error !== "Current password is incorrect") { expireSession(); return }
      if (!res.ok) {
        toast({ title: "Couldn't change password", description: data.error, variant: "destructive" })
        return
      }
      toast({ title: "Password changed" })
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
    } catch {
      toast({ title: "Error", description: "Something went wrong.", variant: "destructive" })
    } finally {
      setChangingPassword(false)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      <Navbar />
      <div className="pt-24 px-4 max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
            <User className="w-8 h-8 text-blue-400" /> Account Settings
          </h1>
          <p className="text-gray-400">Update your info or change your password.</p>
        </div>

        {loading ? (
          <div className="space-y-6">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : (
          <div className="space-y-6">
            <GlassCard>
              <h2 className="text-xl font-bold mb-6">Profile</h2>
              <form onSubmit={saveProfile} className="space-y-4">
                <div>
                  <Label htmlFor="acct-email">Email</Label>
                  <Input id="acct-email" type="email" value={email} disabled className="bg-white/5 border-white/10 text-gray-400" />
                  <p className="text-xs text-gray-500 mt-1">Your email is your login — contact us to change it.</p>
                </div>
                <div>
                  <Label htmlFor="acct-name">Full Name</Label>
                  <Input
                    id="acct-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="bg-white/5 border-white/10"
                  />
                </div>
                <div>
                  <Label htmlFor="acct-phone">Phone</Label>
                  <Input
                    id="acct-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(555) 555-5555"
                    className="bg-white/5 border-white/10"
                  />
                </div>
                <Button type="submit" disabled={savingProfile} className="bg-white text-black hover:bg-gray-200">
                  {savingProfile ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                  Save Changes
                </Button>
              </form>
            </GlassCard>

            <GlassCard>
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <Lock className="w-5 h-5 text-blue-400" /> Change Password
              </h2>
              <form onSubmit={changePassword} className="space-y-4">
                <div>
                  <Label htmlFor="acct-current-password">Current Password</Label>
                  <Input
                    id="acct-current-password"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    className="bg-white/5 border-white/10"
                  />
                </div>
                <div>
                  <Label htmlFor="acct-new-password">New Password</Label>
                  <Input
                    id="acct-new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={8}
                    className="bg-white/5 border-white/10"
                  />
                </div>
                <div>
                  <Label htmlFor="acct-confirm-password">Confirm New Password</Label>
                  <Input
                    id="acct-confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={8}
                    className="bg-white/5 border-white/10"
                  />
                </div>
                <Button type="submit" disabled={changingPassword} className="bg-white text-black hover:bg-gray-200">
                  {changingPassword ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Lock className="w-4 h-4 mr-2" />}
                  Change Password
                </Button>
              </form>
            </GlassCard>

            {process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID && (
              <GlassCard>
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <Bell className="w-5 h-5 text-blue-400" /> Notifications
                </h2>
                {notifPermission === "denied" ? (
                  <p className="text-sm text-gray-400">
                    Notifications are blocked in your browser. To enable them, check your browser or phone's
                    site settings for {brandHost} and allow notifications.
                  </p>
                ) : notifPermission === "granted" ? (
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-sm text-gray-400">
                      {notifOptedIn === false
                        ? "You won't receive notifications right now."
                        : "You'll receive booking updates and offers."}
                    </p>
                    <Button
                      type="button"
                      onClick={toggleNotifications}
                      disabled={notifBusy || notifOptedIn === null}
                      variant="outline"
                      className="border-white/20 shrink-0"
                    >
                      {notifBusy ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : notifOptedIn === false ? (
                        <Bell className="w-4 h-4 mr-2" />
                      ) : (
                        <BellOff className="w-4 h-4 mr-2" />
                      )}
                      {notifOptedIn === false ? "Enable" : "Disable"}
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-sm text-gray-400">
                      Get notified about your bookings and offers.
                    </p>
                    <Button
                      type="button"
                      onClick={enableNotifications}
                      disabled={notifBusy}
                      className="bg-white text-black hover:bg-gray-200 shrink-0"
                    >
                      {notifBusy ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Bell className="w-4 h-4 mr-2" />}
                      Enable
                    </Button>
                  </div>
                )}
              </GlassCard>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
