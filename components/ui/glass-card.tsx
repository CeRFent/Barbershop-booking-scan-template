import type React from "react"
import { cn } from "@/lib/utils"

interface GlassCardProps {
  children: React.ReactNode
  className?: string
}

// Deliberately plain: a solid card, no backdrop-blur/translucency. The
// glassmorphism look this component used to have is a distinctive visual
// style in its own right -- shipping a flat, token-driven card instead means
// a fresh client instance doesn't carry that look until someone opts into it.
export function GlassCard({ children, className }: GlassCardProps) {
  return (
    <div className={cn("bg-card border border-border rounded-2xl p-6", className)}>
      {children}
    </div>
  )
}
