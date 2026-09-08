"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { GlassCard } from "@/components/ui/glass-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Navbar } from "@/components/navbar"
import { useToast } from "@/hooks/use-toast"
import { Copy, Gift, Users, DollarSign, Loader2, ArrowLeft, CheckCircle } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { parseJWT, getToken } from "@/lib/jwt-utils"

export default function ReferralPage() {
  const [profile, setProfile] = useState<any>(null)
  const [referrals, setReferrals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    const init = async () => {
      const token = getToken()
      if (!token) {
        setLoading(false)
        return
      }

      try {
        const payload = parseJWT(token)
        if (!payload) throw new Error("Invalid session")
        setProfile(payload)
        await fetchReferrals(payload.userId, token)
      } catch (e) {
        console.error("Auth error:", e)
        router.push("/login")
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [router])

  const fetchReferrals = async (userId: string, token: string) => {
    try {
      const res = await fetch(`/api/user/referrals/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setReferrals(data.referrals || [])
      }
    } catch (e) {
      console.error("Failed to fetch referrals:", e)
    }
  }

  const copyReferralLink = () => {
    if (!profile?.referralCode) return
    const link = `${window.location.origin}/signup?ref=${profile.referralCode}`
    navigator.clipboard.writeText(link)
    toast({ title: "Copied!", description: "Referral link copied to clipboard" })
  }

  const copyReferralCode = () => {
    if (!profile?.referralCode) return
    navigator.clipboard.writeText(profile.referralCode)
    toast({ title: "Copied!", description: "Referral code copied to clipboard" })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-blue-500" />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p className="text-gray-400 mb-6">Please sign in to view your referral dashboard.</p>
          <Button asChild className="bg-white text-black hover:bg-gray-200 px-8">
            <Link href="/login">Sign In</Link>
          </Button>
        </div>
      </div>
    )
  }

  const totalEarnings = referrals.reduce((sum, ref) => sum + (ref.rewardAmount || 0), 0)
  const paidEarnings = referrals
    .filter((ref) => ref.rewardStatus === "paid")
    .reduce((sum, ref) => sum + (ref.rewardAmount || 0), 0)

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />

      <div className="pt-32 pb-12 px-4 max-w-5xl mx-auto">
        <Link href="/dashboard" className="inline-flex items-center text-sm text-gray-400 hover:text-white mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-block p-4 bg-yellow-500/10 rounded-2xl mb-6">
            <Gift className="w-12 h-12 text-yellow-500" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Refer & Earn Rewards</h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Get <span className="text-white font-bold">$50 credit</span> for every friend who joins the VIP family.
          </p>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <GlassCard className="p-6 border-blue-500/20">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-500/20 rounded-xl"><Users className="w-6 h-6 text-blue-400" /></div>
              <div>
                <p className="text-2xl font-bold">{referrals.length}</p>
                <p className="text-sm text-gray-400">Successful Referrals</p>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-6 border-green-500/20">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-500/20 rounded-xl"><DollarSign className="w-6 h-6 text-green-400" /></div>
              <div>
                <p className="text-2xl font-bold">${totalEarnings}</p>
                <p className="text-sm text-gray-400">Total Rewards Earned</p>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-6 border-yellow-500/20">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-yellow-500/20 rounded-xl"><CheckCircle className="w-6 h-6 text-yellow-400" /></div>
              <div>
                <p className="text-2xl font-bold">${paidEarnings}</p>
                <p className="text-sm text-gray-400">Total Paid Out</p>
              </div>
            </div>
          </GlassCard>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-6">
            <GlassCard className="p-6">
              <h2 className="text-xl font-bold mb-6">Your Tools</h2>
              <div className="space-y-6">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2 block">Referral Code</label>
                  <div className="flex gap-2">
                    <Input value={profile?.referralCode || ""} readOnly className="bg-white/5 border-white/10 font-mono text-lg" />
                    <Button onClick={copyReferralCode} variant="outline" size="icon" className="shrink-0 border-white/10"><Copy className="w-4 h-4" /></Button>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2 block">Personal Link</label>
                  <div className="flex gap-2">
                    <Input value={profile ? `${window.location.origin}/signup?ref=${profile.referralCode}` : ""} readOnly className="bg-white/5 border-white/10" />
                    <Button onClick={copyReferralLink} variant="outline" size="icon" className="shrink-0 border-white/10"><Copy className="w-4 h-4" /></Button>
                  </div>
                </div>
              </div>
              <div className="mt-8 p-4 bg-blue-500/5 rounded-xl border border-blue-500/10 text-sm">
                <h3 className="font-bold text-blue-400 mb-2">How it works</h3>
                <ul className="space-y-2 text-gray-400">
                  <li className="flex gap-2"><span>•</span> <span>Friend signs up with your link</span></li>
                  <li className="flex gap-2"><span>•</span> <span>They subscribe to a VIP plan</span></li>
                  <li className="flex gap-2"><span>•</span> <span>You get $50 credited to your account</span></li>
                </ul>
              </div>
            </GlassCard>
          </div>

          <div className="lg:col-span-2">
            <GlassCard className="p-6 overflow-hidden">
              <h2 className="text-xl font-bold mb-6">Referral History</h2>
              {referrals.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="w-12 h-12 mx-auto mb-4 text-white/10" />
                  <p className="text-gray-500">No referrals yet. Start sharing to earn rewards!</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-xs font-bold uppercase tracking-wider text-gray-500 border-b border-white/5">
                        <th className="pb-4 px-2">Friend</th>
                        <th className="pb-4 px-2">Joined</th>
                        <th className="pb-4 px-2">Reward</th>
                        <th className="pb-4 px-2">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {referrals.map((ref) => (
                        <tr key={ref.id} className="text-sm">
                          <td className="py-4 px-2">
                            <div className="font-bold">{ref.referred.name}</div>
                            <div className="text-xs text-gray-500">{ref.referred.email}</div>
                          </td>
                          <td className="py-4 px-2 text-gray-400">{new Date(ref.createdAt).toLocaleDateString()}</td>
                          <td className="py-4 px-2 font-bold text-green-400">${ref.rewardAmount}</td>
                          <td className="py-4 px-2">
                            <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                              ref.rewardStatus === "paid" ? "bg-green-500/20 text-green-400" :
                              ref.rewardStatus === "pending" ? "bg-yellow-500/20 text-yellow-400" :
                              "bg-blue-500/20 text-blue-400"
                            }`}>
                              {ref.rewardStatus}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </GlassCard>
          </div>
        </div>
      </div>
    </div>
  )
}
