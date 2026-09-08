"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { GlassCard } from "@/components/ui/glass-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Navbar } from "@/components/navbar"
import { useToast } from "@/hooks/use-toast"
import { Skeleton } from "@/components/ui/skeleton"
import { Plus, Trash2, Coffee, Utensils, Loader2, Info, Package, AlertCircle } from "lucide-react"

export default function InventoryPage() {
  const [snacks, setSnacks] = useState<string[]>([])
  const [drinks, setDrinks] = useState<string[]>([])
  const [newSnack, setNewSnack] = useState("")
  const [newDrink, setNewDrink] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState<"snack" | "drink" | null>(null)
  const { toast } = useToast()

  const fetchInventory = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/inventory")
      const data = await res.json()
      if (data.success) {
        setSnacks(data.snacks || [])
        setDrinks(data.drinks || [])
      } else {
        throw new Error(data.error || "Failed to load inventory")
      }
    } catch (err: any) {
      console.error("Error fetching inventory:", err)
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchInventory()
  }, [])

  const addItem = async (type: "snack" | "drink") => {
    const name = type === "snack" ? newSnack : newDrink
    if (!name.trim()) return

    // Client-side duplicate check
    const list = type === "snack" ? snacks : drinks
    if (list.some(item => item.toLowerCase() === name.trim().toLowerCase())) {
      toast({ title: "Duplicate Item", description: `${name} is already in the list.`, variant: "destructive" })
      return
    }

    setIsAdding(type)
    try {
      const res = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, name: name.trim() })
      })
      const data = await res.json()
      if (data.success) {
        if (type === "snack") {
          setSnacks([...snacks, data.item.name].sort())
          setNewSnack("")
        } else {
          setDrinks([...drinks, data.item.name].sort())
          setNewDrink("")
        }
        toast({ title: "Item Added", description: `${name} has been added.` })
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" })
      }
    } catch (err) {
      toast({ title: "Error", description: "Something went wrong.", variant: "destructive" })
    } finally {
      setIsAdding(null)
    }
  }

  const removeItem = async (type: "snack" | "drink", name: string) => {
    try {
      const res = await fetch("/api/inventory", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, name })
      })
      const data = await res.json()
      if (data.success) {
        if (type === "snack") setSnacks(snacks.filter(s => s !== name))
        else setDrinks(drinks.filter(d => d !== name))
        toast({ title: "Item Removed", description: `${name} has been removed.` })
      }
    } catch (err) {
      toast({ title: "Error", description: "Failed to remove item.", variant: "destructive" })
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      <Navbar />
      <div className="pt-24 px-4 max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-4xl font-bold mb-2">Snack Inventory</h1>
            <p className="text-muted-foreground">Manage items available for VIP members during their visit.</p>
          </div>
          <GlassCard className="flex items-center gap-6 py-4 px-8 border-foreground/5">
            <div className="text-center">
              <p className="text-xs text-gray-500 uppercase font-bold tracking-tighter">Total Drinks</p>
              <p className="text-2xl font-bold text-primary">{drinks.length}</p>
            </div>
            <div className="w-px h-8 bg-foreground/10" />
            <div className="text-center">
              <p className="text-xs text-gray-500 uppercase font-bold tracking-tighter">Total Snacks</p>
              <p className="text-2xl font-bold text-orange-400">{snacks.length}</p>
            </div>
          </GlassCard>
        </div>

        {error && (
          <div className="mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3 text-red-400">
              <AlertCircle className="w-5 h-5" />
              <p>{error}</p>
            </div>
            <Button onClick={fetchInventory} size="sm" variant="outline" className="border-red-500/30 text-red-400 hover:bg-red-500/10">Try Again</Button>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-8">
          {/* Drinks Section */}
          <div className="space-y-6">
            <h2 className="text-xl font-bold flex items-center gap-2 text-primary ml-2">
              <Coffee className="w-5 h-5" /> Drink Options
            </h2>
            <GlassCard className="space-y-6 border-primary/10">
              <div className="flex gap-2">
                <Input
                  value={newDrink}
                  onChange={e => setNewDrink(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && addItem("drink")}
                  placeholder="e.g., Spring Water, Espresso..."
                  className="bg-foreground/5 border-foreground/10 focus:border-primary/50 transition-all"
                />
                <Button 
                  onClick={() => addItem("drink")} 
                  disabled={isAdding === "drink" || !newDrink.trim()}
                  className="bg-primary hover:bg-primary text-foreground shadow-lg shadow-primary/20"
                >
                  {isAdding === "drink" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                </Button>
              </div>
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                <AnimatePresence initial={false}>
                  {isLoading ? (
                    [1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)
                  ) : drinks.length === 0 ? (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-10 text-gray-500 border-2 border-dashed border-foreground/5 rounded-xl">
                      <Package className="w-8 h-8 mx-auto mb-2 opacity-20" />
                      <p>No drinks added yet.</p>
                    </motion.div>
                  ) : (
                    drinks.map(drink => (
                      <motion.div
                        key={drink}
                        layout
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="flex justify-between items-center bg-foreground/5 p-4 rounded-xl border border-foreground/5 hover:border-primary/30 hover:bg-foreground/10 transition-all group"
                      >
                        <span className="font-medium">{drink}</span>
                        <button 
                          onClick={() => removeItem("drink", drink)} 
                          className="text-gray-500 hover:text-red-400 transition-all p-1 hover:bg-red-500/10 rounded-lg"
                          title="Remove item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </motion.div>
                    ))
                  )}
                </AnimatePresence>
              </div>
            </GlassCard>
          </div>

          {/* Snacks Section */}
          <div className="space-y-6">
            <h2 className="text-xl font-bold flex items-center gap-2 text-orange-400 ml-2">
              <Utensils className="w-5 h-5" /> Snack Options
            </h2>
            <GlassCard className="space-y-6 border-orange-500/10">
              <div className="flex gap-2">
                <Input
                  value={newSnack}
                  onChange={e => setNewSnack(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && addItem("snack")}
                  placeholder="e.g., Protein Bar, Fruit Bowl..."
                  className="bg-foreground/5 border-foreground/10 focus:border-orange-500/50 transition-all"
                />
                <Button 
                  onClick={() => addItem("snack")} 
                  disabled={isAdding === "snack" || !newSnack.trim()}
                  className="bg-orange-600 hover:bg-orange-700 text-foreground shadow-lg shadow-orange-900/20"
                >
                  {isAdding === "snack" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                </Button>
              </div>
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                <AnimatePresence initial={false}>
                  {isLoading ? (
                    [1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)
                  ) : snacks.length === 0 ? (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-10 text-gray-500 border-2 border-dashed border-foreground/5 rounded-xl">
                      <Package className="w-8 h-8 mx-auto mb-2 opacity-20" />
                      <p>No snacks added yet.</p>
                    </motion.div>
                  ) : (
                    snacks.map(snack => (
                      <motion.div
                        key={snack}
                        layout
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="flex justify-between items-center bg-foreground/5 p-4 rounded-xl border border-foreground/5 hover:border-orange-500/30 hover:bg-foreground/10 transition-all group"
                      >
                        <span className="font-medium">{snack}</span>
                        <button 
                          onClick={() => removeItem("snack", snack)} 
                          className="text-gray-500 hover:text-red-400 transition-all p-1 hover:bg-red-500/10 rounded-lg"
                          title="Remove item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </motion.div>
                    ))
                  )}
                </AnimatePresence>
              </div>
            </GlassCard>
          </div>
        </div>

        <GlassCard className="mt-12 p-6 border-foreground/5 bg-foreground/5 flex items-start gap-4">
          <Info className="w-6 h-6 text-muted-foreground shrink-0 mt-1" />
          <div>
            <h3 className="font-bold mb-1">About Inventory Management</h3>
            <p className="text-sm text-muted-foreground">
              Changes made here are instantly reflected on the client signup page. VIP members can select their preferences from these lists to personalize their shop experience. Ensure the items listed are currently in stock.
            </p>
          </div>
        </GlassCard>
      </div>
      
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}</style>
    </div>
  )
}
