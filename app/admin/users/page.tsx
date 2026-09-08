"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { GlassCard } from "@/components/ui/glass-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Navbar } from "@/components/navbar"
import { useToast } from "@/hooks/use-toast"
import { Search, RefreshCw, Trash2, AlertTriangle, Coffee, Utensils, Hash, Shield } from "lucide-react"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { parseJWT } from "@/lib/jwt-utils"

interface UserProfile {
  id: string;
  email: string;
  name: string;
  phone?: string;
  age: number | null;
  totalVisits: number;
  lastVisit: string | null;
  preferences: {
    favoriteDrink: string;
    favoriteSnack: string;
  };
  role: string;
  joinedAt: string;
  subscriptionStatus: string;
  remainingCuts: number;
}

export default function UsersManagementPage() {
  const [users, setUsers] = useState<UserProfile[]>([])
  const [filteredUsers, setFilteredUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [userToDelete, setUserToDelete] = useState<{ id: string; email: string; name: string } | null>(null)
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
        if (!userData || userData.role !== 'admin') {
          toast({
            title: "Access Denied",
            description: "You don't have permission to access this page.",
            variant: "destructive",
          })
          router.push("/dashboard")
          return
        }

        await fetchAllUsers()
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

  const fetchAllUsers = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch("/api/admin/users", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error("Failed to fetch users")
      }

      const data = await response.json()
      setUsers(data.users)
      setFilteredUsers(data.users)
    } catch (error) {
      console.error("Error fetching users:", error)
      toast({
        title: "Error",
        description: "Failed to fetch users",
        variant: "destructive",
      })
    }
  }

  useEffect(() => {
    if (!searchTerm) {
      setFilteredUsers(users)
    } else {
      const filtered = users.filter(
        (user) =>
          user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (user.phone && user.phone.toLowerCase().includes(searchTerm.toLowerCase())),
      )
      setFilteredUsers(filtered)
    }
  }, [searchTerm, users])

  const refreshUsers = async () => {
    setLoading(true)
    await fetchAllUsers()
    setLoading(false)
    toast({
      title: "Refreshed",
      description: "User list has been updated",
    })
  }

  const showDeleteConfirmation = (userId: string, userEmail: string, userName: string) => {
    setUserToDelete({ id: userId, email: userEmail, name: userName })
    setShowDeleteDialog(true)
  }

  const deleteUser = async () => {
    if (!userToDelete) return
    setDeletingUserId(userToDelete.id)

    try {
      const token = localStorage.getItem('token')
      const response = await fetch("/api/admin/delete-user", {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId: userToDelete.id }),
      })

      if (!response.ok) throw new Error("Failed to delete user")

      toast({
        title: "Success",
        description: "User has been deleted successfully",
      })

      setShowDeleteDialog(false)
      setUserToDelete(null)
      await fetchAllUsers()
    } catch (error) {
      console.error("Error deleting user:", error)
      toast({
        title: "Error",
        description: "Failed to delete user",
        variant: "destructive",
      })
    } finally {
      setDeletingUserId(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading users...</p>
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
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <Shield className="w-16 h-16 mx-auto mb-4 text-white" />
            <h1 className="text-4xl font-bold mb-4">User Management</h1>
            <p className="text-xl text-gray-400">View and manage all registered user accounts</p>
          </motion.div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-8">
            <GlassCard>
              <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="flex-1 relative max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search name, email, or phone..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                  />
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-sm text-gray-400">
                    Showing {filteredUsers.length} users
                  </div>
                  <Button onClick={refreshUsers} variant="outline" size="sm">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh
                  </Button>
                </div>
              </div>
            </GlassCard>
          </motion.div>

          <GlassCard className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10 text-left">
                    <th className="py-4 px-4 font-semibold">User</th>
                    <th className="py-4 px-4 font-semibold">Age</th>
                    <th className="py-4 px-4 font-semibold">Visits</th>
                    <th className="py-4 px-4 font-semibold">Preferences</th>
                    <th className="py-4 px-4 font-semibold">Status</th>
                    <th className="py-4 px-4 font-semibold">Cuts</th>
                    <th className="py-4 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="py-4 px-4">
                        <div className="font-semibold">{user.name}</div>
                        <div className="text-xs text-gray-400">{user.email}</div>
                        <div className="text-xs text-gray-500">{user.phone}</div>
                      </td>
                      <td className="py-4 px-4 text-gray-300">
                        {user.age || "—"}
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <Hash className="w-3 h-3 text-blue-400" />
                          <span className="font-bold">{user.totalVisits}</span>
                        </div>
                        <div className="text-[10px] text-gray-500 uppercase">
                          Last: {user.lastVisit ? new Date(user.lastVisit).toLocaleDateString() : 'Never'}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex flex-col gap-1">
                          {user.preferences.favoriteDrink && (
                            <div className="flex items-center text-xs text-gray-300">
                              <Coffee className="w-3 h-3 mr-1.5 text-orange-400" />
                              {user.preferences.favoriteDrink}
                            </div>
                          )}
                          {user.preferences.favoriteSnack && (
                            <div className="flex items-center text-xs text-gray-300">
                              <Utensils className="w-3 h-3 mr-1.5 text-green-400" />
                              {user.preferences.favoriteSnack}
                            </div>
                          )}
                          {!user.preferences.favoriteDrink && !user.preferences.favoriteSnack && (
                            <span className="text-gray-600 text-xs italic">No preferences</span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                          user.subscriptionStatus === 'active' 
                            ? 'bg-green-500/20 text-green-400' 
                            : 'bg-gray-500/20 text-gray-500'
                        }`}>
                          {user.subscriptionStatus}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="font-bold text-lg">{user.remainingCuts}</div>
                        <div className="text-[10px] text-gray-500 uppercase">Available</div>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <Button
                          onClick={() => showDeleteConfirmation(user.id, user.email, user.name)}
                          variant="ghost"
                          size="sm"
                          className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </div>
      </div>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="bg-black border-white/20 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center text-red-400">
              <AlertTriangle className="w-5 h-5 mr-2" />
              Confirm User Deletion
            </DialogTitle>
            <DialogDescription className="text-gray-300">
              Delete <span className="font-semibold text-white">{userToDelete?.name}</span>? This is permanent.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)} className="border-white/20">Cancel</Button>
            <Button onClick={deleteUser} disabled={deletingUserId !== null} className="bg-red-600 hover:bg-red-700">
              {deletingUserId ? "Deleting..." : "Delete User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
