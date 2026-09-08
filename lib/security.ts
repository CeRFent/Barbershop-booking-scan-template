import type { NextRequest } from "next/server"

// Custom rate limiting implementation for Next.js API routes
const requestCounts = new Map<string, { count: number; resetTime: number }>()

export function checkRateLimit(request: NextRequest, maxRequests = 100, windowMs: number = 15 * 60 * 1000): boolean {
  const ip = request.ip || request.headers.get("x-forwarded-for") || "unknown"
  return checkRateLimitByKey(ip, maxRequests, windowMs)
}

// Same limiter, keyed by an arbitrary caller-supplied string (e.g. a userId)
// rather than IP — useful once a request is already authenticated, since IP
// alone is easy to rotate around.
export function checkRateLimitByKey(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now()

  const requestData = requestCounts.get(key)

  if (!requestData || now > requestData.resetTime) {
    requestCounts.set(key, { count: 1, resetTime: now + windowMs })
    return true
  }

  if (requestData.count >= maxRequests) {
    return false
  }

  requestData.count++
  return true
}

// Rate limiting for authentication endpoints
export function checkAuthRateLimit(request: NextRequest): boolean {
  return checkRateLimit(request, 5, 15 * 60 * 1000) // 5 requests per 15 minutes
}

// Rate limiting for general endpoints
export function checkGeneralRateLimit(request: NextRequest): boolean {
  return checkRateLimit(request, 100, 15 * 60 * 1000) // 100 requests per 15 minutes
}

// Input sanitization
export function sanitizeInput(input: string): string {
  if (typeof input !== "string") return ""

  return input
    .replace(/[<>]/g, "") // Remove potential HTML tags
    .replace(/javascript:/gi, "") // Remove javascript: protocol
    .replace(/on\w+=/gi, "") // Remove event handlers
    .trim()
}

// Email validation
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email) && email.length <= 254
}

// Password strength validation
export function isStrongPassword(password: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = []

  if (password.length < 8) {
    errors.push("Password must be at least 8 characters long")
  }

  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter")
  }

  if (!/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter")
  }

  if (!/\d/.test(password)) {
    errors.push("Password must contain at least one number")
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}
