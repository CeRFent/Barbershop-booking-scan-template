import type React from "react"
import { cn } from "@/lib/utils"

interface GlassCardProps {
  children: React.ReactNode
  className?: string
}

export function GlassCard({ children, className }: GlassCardProps) {
  return (
    <div className={cn("backdrop-blur-md bg-foreground/10 border border-foreground/20 rounded-2xl p-6 shadow-xl", className)}>
      {children}
    </div>
  )
}
