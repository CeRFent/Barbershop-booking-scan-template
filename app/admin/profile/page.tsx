"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { GlassCard } from "@/components/ui/glass-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Navbar } from "@/components/navbar"
import { useToast } from "@/hooks/use-toast"
import { Settings, User, Lock, Save, ExternalLink } from "lucide-react"
import { useRouter } from "next/navigation"
import { parseJWT } from "@/lib/jwt-utils"
import { brand } from "@/lib/brand-config"

interface AdminProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  referralCode?: string;
  createdAt: string;
}

export default function ProfileSettingsPage() {
  const [profile, setProfile] = useState<AdminProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    shop_name: brand.name,
  })
  const [passwordData, setPasswordData] = useState({
    newPassword: "",
    confirmPassword: "",
  })
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token')
      if (!token) {
        router.push("/login")
        return
      }

      try {
        // Parse the JWT token
        const userData = parseJWT(token)

        if (!userData || userData.role !== 'admin') {
          toast({
            title: "Access Denied",
            description: "You don't have permission to access this page.",
            variant: "destructive",
          })
          router.push("/dashboard")
          return
        }

        await fetchProfile(userData.userId)
      } catch (error) {
        console.error('Error parsing token:', error)
        localStorage.removeItem('token')
        router.push("/login")
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [router, toast])

  const fetchProfile = async (adminId: string) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/admin/profile/${adminId}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch profile')
      }

      const data = await response.json()
      setProfile(data)
      setFormData({
        name: data.name || "",
        email: data.email || "",
        phone: data.phone || "",
        shop_name: brand.name,
      })
    } catch (error) {
      console.error("Error fetching profile:", error)
      toast({
        title: "Error",
        description: "Failed to load profile",
        variant: "destructive",
      })
    }
  }

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile) return

    setSaving(true)

    try {
      const token = localStorage.getItem('token')
      const updateData = {
        name: formData.name,
        phone: formData.phone
      }
      
      const response = await fetch(`/api/admin/profile/${profile.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(updateData)
      })

      if (!response.ok) {
        throw new Error('Failed to update profile')
      }

      toast({
        title: "Profile Updated",
        description: "Your profile has been successfully updated.",
      })

      // Refresh profile data
      await fetchProfile(profile.id)
    } catch (error) {
      console.error("Profile update error:", error)
      toast({
        title: "Update Failed",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile) return

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "New passwords do not match.",
        variant: "destructive",
      })
      return
    }

    if (passwordData.newPassword.length < 8) {
      toast({
        title: "Password Too Short",
        description: "Password must be at least 8 characters long.",
        variant: "destructive",
      })
      return
    }

    setSaving(true)

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/admin/profile/${profile.id}/password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          newPassword: passwordData.newPassword
        })
      })

      if (!response.ok) {
        throw new Error('Failed to update password')
      }

      toast({
        title: "Password Updated",
        description: "Your password has been successfully updated.",
      })

      setPasswordData({
        newPassword: "",
        confirmPassword: "",
      })
    } catch (error) {
      toast({
        title: "Password Update Failed",
        description: "Failed to update password. Please try again.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-foreground mx-auto mb-4"></div>
          <p>Loading profile...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      <div className="pt-24 pb-12 px-4">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-12"
          >
            <Settings className="w-16 h-16 mx-auto mb-4 text-foreground" />
            <h1 className="text-4xl font-bold mb-4">Profile Settings</h1>
            <p className="text-xl text-muted-foreground">Manage your admin profile and account settings</p>
          </motion.div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Profile Information */}
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              <GlassCard>
                <div className="flex items-center mb-6">
                  <User className="w-6 h-6 mr-3 text-primary" />
                  <h2 className="text-xl font-semibold">Profile Information</h2>
                </div>

                <form onSubmit={handleProfileUpdate} className="space-y-4">
                  <div>
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                      className="bg-foreground/10 border-foreground/20 text-foreground placeholder:text-muted-foreground"
                      placeholder="Enter your full name"
                    />
                  </div>

                  <div>
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      disabled
                      className="bg-foreground/5 border-foreground/10 text-muted-foreground cursor-not-allowed"
                    />
                    <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                  </div>

                  <div>
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                      className="bg-foreground/10 border-foreground/20 text-foreground placeholder:text-muted-foreground"
                      placeholder="Enter your phone number"
                    />
                  </div>

                  <div>
                    <Label htmlFor="shop_name">Shop Name</Label>
                    <Input
                      id="shop_name"
                      type="text"
                      value={formData.shop_name}
                      disabled
                      className="bg-foreground/5 border-foreground/10 text-muted-foreground cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <Label>Role</Label>
                    <div className="mt-1">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-500/20 text-purple-400">
                        {profile?.role === "admin" ? "Administrator" : "Barber"}
                      </span>
                    </div>
                  </div>

                  <Button type="submit" disabled={saving} className="w-full bg-foreground text-background hover:bg-foreground/90">
                    {saving ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-background mr-2"></div>
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Save Profile
                      </>
                    )}
                  </Button>
                </form>
              </GlassCard>
            </motion.div>

            {/* Password & Security */}
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="space-y-6"
            >
              {/* Change Password */}
              <GlassCard>
                <div className="flex items-center mb-6">
                  <Lock className="w-6 h-6 mr-3 text-yellow-400" />
                  <h2 className="text-xl font-semibold">Change Password</h2>
                </div>

                <form onSubmit={handlePasswordUpdate} className="space-y-4">
                  <div>
                    <Label htmlFor="newPassword">New Password</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData((prev) => ({ ...prev, newPassword: e.target.value }))}
                      className="bg-foreground/10 border-foreground/20 text-foreground placeholder:text-muted-foreground"
                      placeholder="Enter new password"
                      minLength={8}
                    />
                  </div>

                  <div>
                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                      className="bg-foreground/10 border-foreground/20 text-foreground placeholder:text-muted-foreground"
                      placeholder="Confirm new password"
                      minLength={8}
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={saving || !passwordData.newPassword || !passwordData.confirmPassword}
                    variant="outline"
                    className="w-full"
                  >
                    {saving ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-foreground mr-2"></div>
                        Updating...
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4 mr-2" />
                        Update Password
                      </>
                    )}
                  </Button>
                </form>
              </GlassCard>

              {/* Account Info */}
              <GlassCard>
                <h2 className="text-xl font-semibold mb-4">Account Information</h2>

                <div className="space-y-4">
                  <div className="flex justify-between items-center py-2 border-b border-foreground/10">
                    <span className="text-muted-foreground">Account Created</span>
                    <span>{new Date(profile?.createdAt || "").toLocaleDateString()}</span>
                  </div>

                  <div className="flex justify-between items-center py-2 border-b border-foreground/10">
                    <span className="text-muted-foreground">User ID</span>
                    <span className="font-mono text-sm">{profile?.id?.slice(0, 8)}...</span>
                  </div>

                  <div className="flex justify-between items-center py-2">
                    <span className="text-muted-foreground">Referral Code</span>
                    <span className="font-mono text-sm">{profile?.referralCode || "N/A"}</span>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-foreground/10">
                  <Button
                    asChild
                    variant="outline"
                    className="w-full"
                  >
                    <a href="https://dashboard.stripe.com" target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      View Stripe Dashboard
                    </a>
                  </Button>
                </div>
              </GlassCard>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}
