"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, LayoutDashboard, Image } from "lucide-react"
import { cn } from "@/lib/utils"

export function BottomNav() {
  const pathname = usePathname()

  // Pages where bottom nav should be hidden. '/auth' as a prefix already
  // covers /auth/confirm, /auth/error, /auth/reset-password,
  // /auth/forgot-password.
  const hiddenPages = [
    '/login',
    '/signup',
    '/admin',
    '/auth',
    '/success',
  ]

  // Check if current page should hide bottom nav
  const shouldHide = hiddenPages.some(page => (pathname ?? "").startsWith(page))
  
  if (shouldHide) {
    return null
  }

  const navItems = [
    {
      href: "/",
      label: "Home",
      icon: Home,
      active: pathname === "/"
    },
    {
      href: "/dashboard",
      label: "Dashboard", 
      icon: LayoutDashboard,
      active: (pathname ?? "").startsWith("/dashboard")
    },
    {
      href: "/gallery",
      label: "Gallery",
      icon: Image,
      active: (pathname ?? "").startsWith("/gallery")
    }
  ]

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-black/95 backdrop-blur-md border-t border-white/10 lg:hidden">
      <div className="flex items-center justify-around py-3 px-4 max-w-sm mx-auto">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center justify-center min-w-0 flex-1 p-2 rounded-lg transition-all duration-200",
              "hover:bg-white/10 active:scale-95",
              item.active 
                ? "text-white bg-white/10" 
                : "text-gray-400 hover:text-white"
            )}
          >
            <item.icon className={cn(
              "w-6 h-6 mb-1 transition-transform duration-200",
              item.active && "scale-110"
            )} />
            <span className={cn(
              "text-xs font-medium transition-all duration-200",
              item.active ? "text-white" : "text-gray-400"
            )}>
              {item.label}
            </span>
          </Link>
        ))}
      </div>
      
      {/* Safe area spacing for devices with home indicator */}
      <div className="h-safe-area-inset-bottom bg-black/95" />
    </div>
  )
}
