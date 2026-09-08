"use client"

import { useState, useEffect } from "react"
import { motion } from "@/lib/motion"
import { GlassCard } from "@/components/ui/glass-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Navbar } from "@/components/navbar"
import { useToast } from "@/hooks/use-toast"
import { History, Search, RefreshCw } from "lucide-react"
import { useRouter } from "next/navigation"
import { parseJWT } from "@/lib/jwt-utils"

interface ScanLog {
  id: string;
  userId: string;
  barberId: string;
  cutId: string;
  action: 'scanned' | 'used' | 'expired' | 'created';
  shopToken: string;
  createdAt: string;
  user: {
    name: string;
    email: string;
  };
  barber: {
    name: string;
    email: string;
  };
  cut: {
    cutNumber: number;
    monthYear: string;
    status: string;
  } | null;
}

export default function ScanLogsPage() {
  const [scanLogs, setScanLogs] = useState<ScanLog[]>([])
  const [filteredLogs, setFilteredLogs] = useState<ScanLog[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [dateFilter, setDateFilter] = useState("")
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

        await fetchScanLogs()
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

  const fetchScanLogs = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/admin/scan-logs', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch scan logs')
      }

      const data = await response.json()
      setScanLogs(data.logs)
      setFilteredLogs(data.logs)
    } catch (error) {
      console.error("Error fetching scan logs:", error)
      toast({
        title: "Error",
        description: "Failed to fetch scan logs",
        variant: "destructive",
      })
    }
  }

  // Filter logs based on search term and date
  useEffect(() => {
    let filtered = scanLogs

    if (searchTerm) {
      filtered = filtered.filter(
        (log) =>
          log.user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          log.user.email?.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    if (dateFilter) {
      filtered = filtered.filter((log) => {
        const logDate = new Date(log.createdAt).toISOString().split('T')[0]
        return logDate === dateFilter
      })
    }

    setFilteredLogs(filtered)
  }, [searchTerm, dateFilter, scanLogs])

  const refreshLogs = async () => {
    setLoading(true)
    await fetchScanLogs()
    setLoading(false)
    toast({
      title: "Refreshed",
      description: "Scan logs have been updated",
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading scan logs...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />

      <div className="pt-24 pb-12 px-4">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-12"
          >
            <History className="w-16 h-16 mx-auto mb-4 text-white" />
            <h1 className="text-4xl font-bold mb-4">Scan Logs & Cut History</h1>
            <p className="text-xl text-gray-400">Track all client scans and cut usage</p>
          </motion.div>

          {/* Filters */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="mb-8"
          >
            <GlassCard>
              <div className="flex flex-col md:flex-row gap-4 items-center">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search by client name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                  />
                </div>
                <div className="flex gap-2">
                  <Input
                    type="date"
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="bg-white/10 border-white/20 text-white"
                  />
                  <Button onClick={refreshLogs} variant="outline" size="sm">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh
                  </Button>
                </div>
              </div>
            </GlassCard>
          </motion.div>

          {/* Scan Logs Table */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            <GlassCard>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Recent Scans</h2>
                <div className="text-sm text-gray-400">
                  Showing {filteredLogs.length} of {scanLogs.length} records
                </div>
              </div>

              {filteredLogs.length === 0 ? (
                <div className="text-center py-12">
                  <History className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-400 mb-2">No scan logs found</p>
                  <p className="text-sm text-gray-500">
                    {searchTerm || dateFilter
                      ? "Try adjusting your filters"
                      : "Scans will appear here once clients start using their cuts"}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="text-left py-3 px-4">Client Name</th>
                        <th className="text-left py-3 px-4">Email</th>
                        <th className="text-left py-3 px-4">Date & Time</th>
                        <th className="text-left py-3 px-4">Action</th>
                        <th className="text-left py-3 px-4">Cut Details</th>
                        <th className="text-left py-3 px-4">Barber</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLogs.map((log) => (
                        <tr key={log.id} className="border-b border-white/5 hover:bg-white/5">
                          <td className="py-4 px-4">
                            <div className="font-semibold">{log.user.name || "Unknown"}</div>
                          </td>
                          <td className="py-4 px-4 text-gray-300">{log.user.email || "N/A"}</td>
                          <td className="py-4 px-4 text-gray-300">
                            <div>{new Date(log.createdAt).toLocaleDateString()}</div>
                            <div className="text-sm text-gray-400">{new Date(log.createdAt).toLocaleTimeString()}</div>
                          </td>
                          <td className="py-4 px-4">
                            <span className={`px-2 py-1 rounded-full text-sm font-semibold ${
                              log.action === 'used'
                                ? 'bg-green-500/20 text-green-400'
                                : log.action === 'scanned'
                                ? 'bg-blue-500/20 text-blue-400'
                                : log.action === 'created'
                                ? 'bg-purple-500/20 text-purple-400'
                                : 'bg-red-500/20 text-red-400'
                            }`}>
                              {log.action.charAt(0).toUpperCase() + log.action.slice(1)}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-gray-300">
                            {log.cut ? (
                              <div>
                                <div className="font-semibold">Cut #{log.cut.cutNumber}</div>
                                <div className="text-sm text-gray-400">{log.cut.monthYear}</div>
                                <div className="text-xs text-gray-500">{log.cut.status}</div>
                              </div>
                            ) : (
                              "N/A"
                            )}
                          </td>
                          <td className="py-4 px-4 text-gray-300">
                            <div className="font-semibold">{log.barber.name || "Unknown"}</div>
                            <div className="text-sm text-gray-400">{log.barber.email || "N/A"}</div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </GlassCard>
          </motion.div>

          {/* Summary Stats */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="mt-8 grid md:grid-cols-3 gap-6"
          >
            <GlassCard className="text-center">
              <div className="text-2xl font-bold text-green-400 mb-2">{filteredLogs.length}</div>
              <div className="text-gray-400">Total Scans</div>
            </GlassCard>

            <GlassCard className="text-center">
              <div className="text-2xl font-bold text-blue-400 mb-2">
                {new Set(filteredLogs.map((log) => log.userId)).size}
              </div>
              <div className="text-gray-400">Unique Clients</div>
            </GlassCard>

            <GlassCard className="text-center">
              <div className="text-2xl font-bold text-purple-400 mb-2">
                {
                  filteredLogs.filter((log) => new Date(log.createdAt).toDateString() === new Date().toDateString())
                    .length
                }
              </div>
              <div className="text-gray-400">Today's Scans</div>
            </GlassCard>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
