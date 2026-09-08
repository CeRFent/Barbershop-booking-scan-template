"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { useSearchParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { GlassCard } from "@/components/ui/glass-card"
import { CursiveLogo } from "@/components/ui/cursive-logo"
import { Navbar } from "@/components/navbar"
import { AlertCircle, RefreshCw } from "lucide-react"

export default function AuthErrorPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [description, setDescription] = useState<string | null>(null)

  useEffect(() => {
    setError(searchParams?.get("error") ?? null)
    setDescription(searchParams?.get("description") ?? null)
  }, [searchParams])

  const getErrorMessage = () => {
    switch (error) {
      case "otp_expired":
        return {
          title: "Verification Link Expired",
          message: "The email verification link has expired. Please request a new one.",
          action: "Request New Link",
        }
      case "access_denied":
        return {
          title: "Access Denied",
          message: "The verification link is invalid or has already been used.",
          action: "Try Again",
        }
      case "verification_failed":
        return {
          title: "Verification Failed",
          message: description || "There was an issue processing your email verification.",
          action: "Try Again",
        }
      case "server_error":
        return {
          title: "Server Error",
          message: description || "A server error occurred during verification.",
          action: "Try Again",
        }
      case "invalid_request":
        return {
          title: "Invalid Request",
          message: description || "The verification request was invalid.",
          action: "Start Over",
        }
      default:
        return {
          title: "Verification Error",
          message: description || "An unexpected error occurred during email verification.",
          action: "Try Again",
        }
    }
  }

  const errorInfo = getErrorMessage()

  const handleRetry = () => {
            router.push("/signup")
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      <div className="pt-24 pb-12 px-4">
        <div className="max-w-md mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-8"
          >
            <CursiveLogo size="lg" className="mb-4" />
            <h1 className="text-3xl font-bold mb-2">Email Verification</h1>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <GlassCard>
              <div className="text-center">
                <AlertCircle className="w-16 h-16 mx-auto mb-6 text-red-400" />
                <h2 className="text-xl font-semibold mb-4 text-red-400">{errorInfo.title}</h2>
                <p className="text-gray-300 mb-8">{errorInfo.message}</p>

                <div className="space-y-4">
                  <Button onClick={handleRetry} className="w-full bg-foreground text-background hover:bg-foreground/90" size="lg">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    {errorInfo.action}
                  </Button>

                  <Button
                    onClick={() => router.push("/")}
                    variant="ghost"
                    className="w-full text-muted-foreground hover:text-foreground"
                  >
                    Back to Home
                  </Button>
                </div>

                <div className="mt-6 p-4 bg-foreground/5 rounded-lg border border-foreground/10">
                  <h3 className="font-semibold mb-2 text-sm">Need Help?</h3>
                  <ul className="text-xs text-muted-foreground space-y-1 text-left">
                    <li>• Email verification links expire after 1 hour</li>
                    <li>• Each link can only be used once</li>
                    <li>• Check your spam/junk folder</li>
                    <li>• Try using a different browser or device</li>
                    <li>• Make sure you're clicking the latest email</li>
                  </ul>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
