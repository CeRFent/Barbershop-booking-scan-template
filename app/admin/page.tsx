"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { GlassCard } from "@/components/ui/glass-card"
import { Button } from "@/components/ui/button"
import { Navbar } from "@/components/navbar"
import { useToast } from "@/hooks/use-toast"
import { Users, Scissors, Calendar, QrCode, History, Settings, Shield, Utensils, ListChecks, Clock, Megaphone, CalendarDays, CreditCard, DollarSign } from "lucide-react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { parseJWT } from "@/lib/jwt-utils"
import { brand } from "@/lib/brand-config"

interface Profile {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface Stats {
  totalClients: number;
  scansThisWeek: number;
  cutsUsedToday: number;
  activeSubscriptions: number;
}

interface ScanActivity {
  id: string;
  user: {
    name: string;
    email: string;
  };
  action: string;
  createdAt: string;
  cut?: {
    cutNumber: number;
    monthYear: string;
  };
}

export default function AdminDashboardPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [stats, setStats] = useState<Stats>({
    totalClients: 0,
    scansThisWeek: 0,
    cutsUsedToday: 0,
    activeSubscriptions: 0,
  })
  const [recentActivity, setRecentActivity] = useState<ScanActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [activityLoading, setActivityLoading] = useState(false)
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
        const userData = parseJWT(token)
        if (!userData) throw new Error("Invalid token")

        if (userData.role !== 'admin') {
          toast({
            title: "Access Denied",
            description: "You don't have permission to access the admin dashboard.",
            variant: "destructive",
          })
          router.push("/dashboard")
          return
        }

        setProfile({
          id: userData.userId,
          email: userData.email,
          name: userData.name || userData.email,
          role: userData.role
        })

        await Promise.all([fetchStats(), fetchRecentActivity()])
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

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/admin/stats', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch stats')
      }

      const data = await response.json()
      setStats(data)
    } catch (error) {
      console.error('Error fetching stats:', error)
      toast({
        title: "Error",
        description: "Failed to load dashboard statistics.",
        variant: "destructive",
      })
    }
  }

  const fetchRecentActivity = async () => {
    setActivityLoading(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/admin/scan-logs', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch recent activity')
      }

      const data = await response.json()

      // Filter for today's activity and limit to 5 most recent
      const today = new Date().toDateString()
      const todaysActivity = data.logs
        .filter((log: any) => new Date(log.createdAt).toDateString() === today)
        .slice(0, 5)
        .map((log: any) => ({
          id: log.id,
          user: log.user,
          action: log.action,
          createdAt: log.createdAt,
          cut: log.cut
        }))

      setRecentActivity(todaysActivity)
    } catch (error) {
      console.error("Error fetching recent activity:", error)
      // Don't show toast for this error as it's not critical
    } finally {
      setActivityLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-foreground mx-auto mb-4"></div>
          <p>Loading admin dashboard...</p>
        </div>
      </div>
    )
  }

  const firstName = profile?.name?.split(" ")[0] || "Admin"

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      <div className="pt-24 pb-12 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Welcome Section */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-12"
          >
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Welcome back, {firstName}</h1>
            <p className="text-xl text-muted-foreground">Your {brand.name} admin dashboard</p>
          </motion.div>

          {/* Stats Overview */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="grid md:grid-cols-4 gap-6 mb-12"
          >
            <GlassCard>
              <div className="flex items-center">
                <Users className="w-8 h-8 mr-4 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{stats.totalClients}</p>
                  <p className="text-muted-foreground">Total Clients</p>
                </div>
              </div>
            </GlassCard>

            <GlassCard>
              <div className="flex items-center">
                <QrCode className="w-8 h-8 mr-4 text-green-400" />
                <div>
                  <p className="text-2xl font-bold">{stats.scansThisWeek}</p>
                  <p className="text-muted-foreground">Scans This Week</p>
                </div>
              </div>
            </GlassCard>

            <GlassCard>
              <div className="flex items-center">
                <Scissors className="w-8 h-8 mr-4 text-purple-400" />
                <div>
                  <p className="text-2xl font-bold">{stats.cutsUsedToday}</p>
                  <p className="text-muted-foreground">Cuts Used Today</p>
                </div>
              </div>
            </GlassCard>

            <GlassCard>
              <div className="flex items-center">
                <Calendar className="w-8 h-8 mr-4 text-yellow-400" />
                <div>
                  <p className="text-2xl font-bold">{stats.activeSubscriptions}</p>
                  <p className="text-muted-foreground">Active Subscriptions</p>
                </div>
              </div>
            </GlassCard>
          </motion.div>

          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12"
          >
            <GlassCard className="text-center">
              <QrCode className="w-12 h-12 mx-auto mb-4 text-green-400" />
              <h3 className="text-lg font-semibold mb-3">QR Code</h3>
              <p className="text-muted-foreground mb-4 text-sm">Display your QR code for clients to scan</p>
              <Button asChild size="sm" className="w-full bg-foreground text-background hover:bg-foreground/90">
                <Link href="/admin/qr-code">View QR Code</Link>
              </Button>
            </GlassCard>

            <GlassCard className="text-center">
              <History className="w-12 h-12 mx-auto mb-4 text-primary" />
              <h3 className="text-lg font-semibold mb-3">Scan Logs</h3>
              <p className="text-muted-foreground mb-4 text-sm">View recent client scans and cut history</p>
              <Button asChild size="sm" className="w-full bg-foreground text-background hover:bg-foreground/90">
                <Link href="/admin/scan-logs">View Logs</Link>
              </Button>
            </GlassCard>

            <GlassCard className="text-center">
              <Users className="w-12 h-12 mx-auto mb-4 text-purple-400" />
              <h3 className="text-lg font-semibold mb-3">Client Manager</h3>
              <p className="text-muted-foreground mb-4 text-sm">Manage active VIP members and their cuts</p>
              <Button asChild size="sm" className="w-full bg-foreground text-background hover:bg-foreground/90">
                <Link href="/admin/clients">Manage VIP Members</Link>
              </Button>
            </GlassCard>

            <GlassCard className="text-center">
              <Utensils className="w-12 h-12 mx-auto mb-4 text-orange-400" />
              <h3 className="text-lg font-semibold mb-3">Snack Inventory</h3>
              <p className="text-muted-foreground mb-4 text-sm">Manage snack and drink preferences</p>
              <Button asChild size="sm" className="w-full bg-foreground text-background hover:bg-foreground/90">
                <Link href="/admin/inventory">Manage Inventory</Link>
              </Button>
            </GlassCard>

            <GlassCard className="text-center">
              <ListChecks className="w-12 h-12 mx-auto mb-4 text-teal-400" />
              <h3 className="text-lg font-semibold mb-3">Services</h3>
              <p className="text-muted-foreground mb-4 text-sm">Manage the menu customers book from</p>
              <Button asChild size="sm" className="w-full bg-foreground text-background hover:bg-foreground/90">
                <Link href="/admin/services">Manage Services</Link>
              </Button>
            </GlassCard>

            <GlassCard className="text-center">
              <Clock className="w-12 h-12 mx-auto mb-4 text-pink-400" />
              <h3 className="text-lg font-semibold mb-3">Hours</h3>
              <p className="text-muted-foreground mb-4 text-sm">Set your working hours and exceptions</p>
              <Button asChild size="sm" className="w-full bg-foreground text-background hover:bg-foreground/90">
                <Link href="/admin/availability">Manage Hours</Link>
              </Button>
            </GlassCard>

            <GlassCard className="text-center">
              <Megaphone className="w-12 h-12 mx-auto mb-4 text-cyan-400" />
              <h3 className="text-lg font-semibold mb-3">Broadcast</h3>
              <p className="text-muted-foreground mb-4 text-sm">Send a push/email message to clients</p>
              <Button asChild size="sm" className="w-full bg-foreground text-background hover:bg-foreground/90">
                <Link href="/admin/broadcast">Send Broadcast</Link>
              </Button>
            </GlassCard>

            <GlassCard className="text-center">
              <CalendarDays className="w-12 h-12 mx-auto mb-4 text-indigo-400" />
              <h3 className="text-lg font-semibold mb-3">Calendar</h3>
              <p className="text-muted-foreground mb-4 text-sm">View and manage every booking</p>
              <Button asChild size="sm" className="w-full bg-foreground text-background hover:bg-foreground/90">
                <Link href="/admin/calendar">View Calendar</Link>
              </Button>
            </GlassCard>

            <GlassCard className="text-center">
              <Shield className="w-12 h-12 mx-auto mb-4 text-red-400" />
              <h3 className="text-lg font-semibold mb-3">User Management</h3>
              <p className="text-muted-foreground mb-4 text-sm">View and manage all registered users</p>
              <Button asChild size="sm" className="w-full bg-foreground text-background hover:bg-foreground/90">
                <Link href="/admin/users">Manage All Users</Link>
              </Button>
            </GlassCard>

            <GlassCard className="text-center">
              <Settings className="w-12 h-12 mx-auto mb-4 text-yellow-400" />
              <h3 className="text-lg font-semibold mb-3">Profile Settings</h3>
              <p className="text-muted-foreground mb-4 text-sm">Update your profile and settings</p>
              <Button asChild size="sm" className="w-full bg-foreground text-background hover:bg-foreground/90">
                <Link href="/admin/profile">Edit Profile</Link>
              </Button>
            </GlassCard>

            <GlassCard className="text-center">
              <CreditCard className="w-12 h-12 mx-auto mb-4 text-emerald-400" />
              <h3 className="text-lg font-semibold mb-3">Subscriptions</h3>
              <p className="text-muted-foreground mb-4 text-sm">Look up or act on a customer's subscription by email</p>
              <Button asChild size="sm" className="w-full bg-foreground text-background hover:bg-foreground/90">
                <Link href="/admin/manage-subscriptions">Manage Subscriptions</Link>
              </Button>
            </GlassCard>

            <GlassCard className="text-center">
              <DollarSign className="w-12 h-12 mx-auto mb-4 text-emerald-400" />
              <h3 className="text-lg font-semibold mb-3">Subscription Price</h3>
              <p className="text-muted-foreground mb-4 text-sm">Set the VIP monthly price and its mid-month proration</p>
              <Button asChild size="sm" className="w-full bg-foreground text-background hover:bg-foreground/90">
                <Link href="/admin/settings">Edit Price</Link>
              </Button>
            </GlassCard>
          </motion.div>

          {/* Recent Activity */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
          >
            <GlassCard>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Today's Activity</h2>
                <div className="flex gap-2">
                  <Button
                    onClick={fetchRecentActivity}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                    disabled={activityLoading}
                  >
                    {activityLoading ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-foreground" />
                    ) : (
                      <History className="w-4 h-4" />
                    )}
                    {activityLoading ? 'Refreshing...' : 'Refresh'}
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <Link href="/admin/scan-logs">View All</Link>
                  </Button>
                </div>
              </div>

              {recentActivity.length === 0 ? (
                <div className="text-center py-8">
                  <History className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground mb-4">No recent scan activity</p>
                  <p className="text-sm text-gray-500">
                    {stats.cutsUsedToday > 0
                      ? `${stats.cutsUsedToday} cuts processed today`
                      : "No cuts processed today yet"}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentActivity.map((activity) => (
                    <div key={activity.id} className="flex items-center justify-between p-4 bg-foreground/5 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className={`w-2 h-2 rounded-full ${
                          activity.action === 'used' ? 'bg-green-400' :
                          activity.action === 'scanned' ? 'bg-primary' :
                          activity.action === 'created' ? 'bg-purple-400' :
                          'bg-red-400'
                        }`} />
                        <div>
                          <p className="font-semibold text-foreground">
                            {activity.user.name || activity.user.email}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {activity.action.charAt(0).toUpperCase() + activity.action.slice(1)}
                            {activity.cut && ` - Cut #${activity.cut.cutNumber}`}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-300">
                          {new Date(activity.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </GlassCard>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
