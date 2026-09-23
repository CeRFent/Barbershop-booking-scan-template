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

// Deliberately plain: bold sans-serif text, no cursive/script font baked in.
// A wordmark is one of the most identity-specific pieces of any brand, so
// this template ships it as neutral as possible rather than committing to a
// typographic style that would carry over from client to client. Swap this
// component's rendering (a different font, an actual logo image, etc.) per
// client, same as brand.name itself.
export function CursiveLogo({ size = "md", className }: CursiveLogoProps) {
  return <h1 className={cn("font-bold text-foreground", sizeClasses[size], className)}>{brand.name}</h1>
}
