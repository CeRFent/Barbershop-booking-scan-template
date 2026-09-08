"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { GlassCard } from "@/components/ui/glass-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Navbar } from "@/components/navbar"
import { useToast } from "@/hooks/use-toast"
import { Users, Search, Eye, RefreshCw, Mail, Plus, X, Star, Scissors } from "lucide-react"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"


interface ClientWithCuts {
  id: string
  email: string
  name: string
  phone: string
  role: string
  cuts: number
  createdAt: string
  lastSignIn: string | null
  isVerified: boolean
  isActive: boolean
  subscription_status: string
  remaining_cuts: number
  used_cuts: number
}

export default function ClientManagerPage() {
  const [user, setUser] = useState<any>(null)
  const [clients, setClients] = useState<ClientWithCuts[]>([])
  const [filteredClients, setFilteredClients] = useState<ClientWithCuts[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [showAddCutsDialog, setShowAddCutsDialog] = useState(false)
  const [showViewClientDialog, setShowViewClientDialog] = useState(false)
  const [selectedClient, setSelectedClient] = useState<ClientWithCuts | null>(null)
  const [numberOfCuts, setNumberOfCuts] = useState(1)
  const [reason, setReason] = useState("")
  const [addingCuts, setAddingCuts] = useState(false)
  const [processingAdjustment, setProcessingAdjustment] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  const handleManualAdjustment = async (action: 'add' | 'deduct') => {
    if (!selectedClient) return
    
    setProcessingAdjustment(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch("/api/admin/manual-cut-adjustment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          userId: selectedClient.id,
          action,
          reason: action === 'add' ? 'Manual addition by admin' : 'Manual deduction by admin'
        }),
      })

      const data = await response.json()
      if (data.success) {
        toast({ title: "Success", description: data.message })
        
        // Refresh full client list first
        await fetchClients()
        
        // Get the latest single user data to update the dialog state
        const updatedResponse = await fetch('/api/admin/users', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        const updatedData = await updatedResponse.json()
        const updatedClient = updatedData.users.find((u: any) => u.id === selectedClient.id)
        if (updatedClient) setSelectedClient(updatedClient)
      } else {
        throw new Error(data.error || "Adjustment failed")
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    } finally {
      setProcessingAdjustment(false)
    }
  }

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token')
      if (!token) {
        router.push("/login")
        return
      }

      try {
        const response = await fetch('/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        
        if (response.ok) {
          const userData = await response.json()
          if (userData.role === 'admin' || userData.role === 'barber') {
            setUser(userData)
            await fetchClients()
            setLoading(false)
          } else {
            toast({
              title: "Access Denied",
              description: "You don't have permission to access this page.",
              variant: "destructive",
            })
            router.push("/dashboard")
          }
        } else {
          localStorage.removeItem('token')
          router.push("/login")
        }
      } catch (error) {
        console.error('Auth check failed:', error)
        localStorage.removeItem('token')
        router.push("/login")
      }
    }
    checkAuth()
  }, [router, toast])

  const fetchClients = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        router.push("/login")
        return
      }

      const response = await fetch('/api/admin/users', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch clients')
      }
      
      const data = await response.json()
      
      // Filter for active VIP members
      const activeMembers = data.users.filter((user: any) => 
        user.role === 'customer' && user.subscription_status === 'active'
      )
      
      setClients(activeMembers)
      setFilteredClients(activeMembers)
    } catch (error) {
      console.error("Error fetching clients:", error)
      toast({
        title: "Error",
        description: "Failed to fetch active members",
        variant: "destructive",
      })
    }
  }

  useEffect(() => {
    if (!searchTerm) {
      setFilteredClients(clients)
    } else {
      const filtered = clients.filter(
        (client) =>
          client.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          client.email?.toLowerCase().includes(searchTerm.toLowerCase()),
      )
      setFilteredClients(filtered)
    }
  }, [searchTerm, clients])

  const refreshClients = async () => {
    setLoading(true)
    await fetchClients()
    setLoading(false)
    toast({
      title: "Refreshed",
      description: "Active member list has been updated",
    })
  }

  const handleAddCuts = async () => {
    if (!selectedClient) return

    setAddingCuts(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch("/api/add-cuts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          userId: selectedClient.id,
          numberOfCuts,
          reason,
        }),
      })

      const data = await response.json()
      if (data.success) {
        toast({ title: "Success", description: data.message })
        setShowAddCutsDialog(false)
        await fetchClients()
      } else {
        throw new Error(data.error || "Failed to renew cuts")
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    } finally {
      setAddingCuts(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-background text-foreground flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-foreground"></div>
      </div>
    )
  }

  return (
    <div className="bg-background text-foreground min-h-screen">
      <Navbar />

      <div className="pt-24 pb-8 px-4">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <div className="inline-block p-3 bg-primary/20 rounded-2xl mb-4">
              <Star className="w-12 h-12 text-primary" />
            </div>
            <h1 className="text-4xl font-bold mb-4">VIP Client Manager</h1>
            <p className="text-xl text-muted-foreground">Manage active subscription members and their monthly cuts</p>
          </motion.div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-8">
            <GlassCard>
              <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="flex-1 relative max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search VIP members..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-foreground/10 border-foreground/20 text-foreground"
                  />
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-sm text-muted-foreground">
                    {filteredClients.length} Active VIPs
                  </div>
                  <Button onClick={refreshClients} variant="outline" size="sm">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh
                  </Button>
                </div>
              </div>
            </GlassCard>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <GlassCard>
              <h2 className="text-2xl font-bold mb-6">Active Subscriptions</h2>

              {filteredClients.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-20" />
                  <p className="text-muted-foreground">No active VIP members found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-foreground/10 text-left">
                        <th className="py-4 px-4">Member</th>
                        <th className="py-4 px-4">Contact</th>
                        <th className="py-4 px-4">Cuts Progress</th>
                        <th className="py-4 px-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredClients.map((client) => (
                        <tr key={client.id} className="border-b border-foreground/5 hover:bg-foreground/5 transition-colors">
                          <td className="py-4 px-4">
                            <div className="font-semibold">{client.name}</div>
                            <div className="text-xs text-gray-500">Since {new Date(client.createdAt).toLocaleDateString()}</div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center text-sm text-gray-300">
                              <Mail className="w-3 h-3 mr-2" /> {client.email}
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center space-x-3">
                              <span className="font-bold text-lg">{client.remaining_cuts}/4</span>
                              <div className="w-24 bg-foreground/5 rounded-full h-2">
                                <div 
                                  className={`h-2 rounded-full ${client.remaining_cuts > 0 ? 'bg-primary' : 'bg-red-500'}`} 
                                  style={{ width: `${(client.remaining_cuts / 4) * 100}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex gap-2">
                              <Button onClick={() => { setSelectedClient(client); setShowViewClientDialog(true); }} variant="outline" size="sm" className="border-foreground/10">
                                <Eye className="w-4 h-4 mr-2" /> View
                              </Button>
                              <Button 
                                onClick={() => { setSelectedClient(client); setNumberOfCuts(4 - client.remaining_cuts); setShowAddCutsDialog(true); }} 
                                disabled={client.remaining_cuts >= 4}
                                size="sm"
                                className={client.remaining_cuts >= 4 ? "bg-gray-800 text-gray-500" : "bg-primary hover:bg-primary"}
                              >
                                <Plus className="w-4 h-4 mr-2" /> Renew
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </GlassCard>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6 mt-8">
            <GlassCard className="text-center p-8 border-primary/20">
              <p className="text-4xl font-bold text-primary mb-2">{clients.length}</p>
              <p className="text-muted-foreground uppercase text-xs font-bold tracking-widest">Active VIP Members</p>
            </GlassCard>
            <GlassCard className="text-center p-8 border-purple-500/20">
              <p className="text-4xl font-bold text-purple-400 mb-2">{clients.reduce((sum, c) => sum + c.remaining_cuts, 0)}</p>
              <p className="text-muted-foreground uppercase text-xs font-bold tracking-widest">Total Available Cuts</p>
            </GlassCard>
            <GlassCard className="text-center p-8 border-orange-500/20">
              <p className="text-4xl font-bold text-orange-400 mb-2">{clients.filter(c => c.remaining_cuts === 0).length}</p>
              <p className="text-muted-foreground uppercase text-xs font-bold tracking-widest">Out of Cuts</p>
            </GlassCard>
          </div>
        </div>
      </div>

      <Dialog open={showViewClientDialog} onOpenChange={(open) => {
        setShowViewClientDialog(open);
        if (!open) setSelectedClient(null);
      }}>
        <DialogContent className="bg-background border-foreground/20 text-foreground max-w-2xl">
          <DialogHeader>
            <DialogTitle>Member Details: {selectedClient?.name || 'Loading...'}</DialogTitle>
          </DialogHeader>
          
          {selectedClient ? (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-foreground/5 p-4 rounded-xl">
                  <p className="text-xs text-gray-500 uppercase font-bold mb-1">Email</p>
                  <p className="truncate">{selectedClient.email}</p>
                </div>
                <div className="bg-foreground/5 p-4 rounded-xl">
                  <p className="text-xs text-gray-500 uppercase font-bold mb-1">Status</p>
                  <p className="text-green-400 font-bold">{(selectedClient.subscription_status || 'active').toUpperCase()}</p>
                </div>
                <div className="bg-foreground/5 p-4 rounded-xl">
                  <p className="text-xs text-gray-500 uppercase font-bold mb-1">Cuts Available</p>
                  <p className="text-2xl font-bold">{selectedClient.remaining_cuts || 0} / 4</p>
                </div>
                <div className="bg-foreground/5 p-4 rounded-xl">
                  <p className="text-xs text-gray-500 uppercase font-bold mb-1">Total Visits</p>
                  <p className="text-2xl font-bold">{(selectedClient.used_cuts || 0) + ((selectedClient.remaining_cuts || 0) === 0 ? 4 : 0)}</p>
                </div>
              </div>

              <div className="border-t border-foreground/10 pt-6">
                <h3 className="text-lg font-bold mb-4">Manual Adjustment</h3>
                <p className="text-sm text-muted-foreground mb-6">
                  Manually add or deduct cuts for this member. These actions are logged for audit purposes.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button
                    onClick={() => handleManualAdjustment('add')}
                    disabled={processingAdjustment}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-foreground font-bold py-6 rounded-xl"
                  >
                    {processingAdjustment ? <RefreshCw className="w-5 h-5 animate-spin mr-2" /> : <Plus className="w-5 h-5 mr-2" />}
                    Add 1 Cut
                  </Button>
                  <Button
                    onClick={() => handleManualAdjustment('deduct')}
                    disabled={processingAdjustment || (selectedClient?.remaining_cuts || 0) <= 0}
                    className="flex-1 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 font-bold py-6 rounded-xl"
                  >
                    {processingAdjustment ? <RefreshCw className="w-5 h-5 animate-spin mr-2" /> : <Scissors className="w-5 h-5 mr-2" />}
                    Deduct 1 Cut
                  </Button>
                </div>
                {(selectedClient?.remaining_cuts || 0) <= 0 && (
                  <p className="text-xs text-red-400 mt-2 text-center">No cuts available to deduct.</p>
                )}
              </div>
            </div>
          ) : (
            <div className="py-12 text-center">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-gray-500 mb-4" />
              <p className="text-gray-500">Loading member data...</p>
            </div>
          )}
          
          <DialogFooter>
            <Button onClick={() => setShowViewClientDialog(false)} className="bg-foreground text-background font-bold">Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showAddCutsDialog} onOpenChange={(open) => {
        setShowAddCutsDialog(open);
        if (!open) setSelectedClient(null);
      }}>
        <DialogContent className="bg-background border-foreground/20 text-foreground">
          <DialogHeader>
            <DialogTitle>Renew Cuts for {selectedClient?.name || 'Member'}</DialogTitle>
            <DialogDescription>Reset used cuts back to available (Max 4 total).</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Number of Cuts to Add</Label>
              <Input 
                type="number" 
                max={4 - (selectedClient?.remaining_cuts || 0)} 
                min={1} 
                value={numberOfCuts} 
                onChange={e => setNumberOfCuts(parseInt(e.target.value))}
                className="bg-foreground/10"
              />
            </div>
            <div>
              <Label>Reason</Label>
              <Textarea value={reason} onChange={e => setReason(e.target.value)} className="bg-foreground/10" placeholder="Optional notes..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddCutsDialog(false)}>Cancel</Button>
            <Button onClick={handleAddCuts} disabled={addingCuts} className="bg-primary">
              {addingCuts ? "Processing..." : "Add Cuts"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
