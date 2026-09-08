"use client"

import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

interface PageContainerProps {
  children: React.ReactNode
  className?: string
  showBottomPadding?: boolean
}

function PageContainer({ children, className, showBottomPadding = true }: PageContainerProps) {
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
  const shouldHideBottomNav = hiddenPages.some(page => (pathname ?? "").startsWith(page))
  
  // Add bottom padding only if bottom nav is shown and showBottomPadding is true
  const shouldAddBottomPadding = !shouldHideBottomNav && showBottomPadding

  return (
    <div className={cn(
      "min-h-screen",
      shouldAddBottomPadding && "pb-24 lg:pb-0", // 96px bottom padding on mobile, none on desktop
      className
    )}>
      {children}
    </div>
  )
}

export { PageContainer }
export default PageContainer
