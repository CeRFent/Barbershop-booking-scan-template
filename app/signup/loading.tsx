"use client"

import { motion } from "framer-motion"
import { Loader2 } from "lucide-react"
import { CursiveLogo } from "@/components/ui/cursive-logo"

export default function Loading() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="text-center"
      >
        <CursiveLogo size="lg" className="mb-8 mx-auto" />
        <div className="relative">
          <Loader2 className="w-12 h-12 animate-spin text-foreground mx-auto" />
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="mt-4 text-muted-foreground font-medium tracking-widest uppercase text-xs"
          >
            Preparing your experience
          </motion.div>
        </div>
      </motion.div>
    </div>
  )
}
