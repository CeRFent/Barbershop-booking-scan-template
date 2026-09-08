import { cn } from "@/lib/utils"
import { brand } from "@/lib/brand-config"

interface CursiveLogoProps {
  size?: "sm" | "md" | "lg" | "xl" | "2xl"
  className?: string
}

const sizeClasses = {
  sm: "text-2xl",
  md: "text-4xl",
  lg: "text-6xl",
  xl: "text-8xl",
  "2xl": "text-9xl",
}

export function CursiveLogo({ size = "md", className }: CursiveLogoProps) {
  return <h1 className={cn("font-dancing-script font-bold text-foreground", sizeClasses[size], className)}>{brand.name}</h1>
}
