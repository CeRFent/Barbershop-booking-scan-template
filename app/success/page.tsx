"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react"
import { CursiveLogo } from "@/components/ui/cursive-logo"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { brand } from "@/lib/brand-config"

interface VerificationData {
  email: string
  userId: string
  fullName: string
  phone: string
}

export default function Success() {
  const [verificationData, setVerificationData] = useState<VerificationData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [activationAttempted, setActivationAttempted] = useState(false)

  useEffect(() => {
    const activateSubscriptionIfNeeded = async () => {
      try {
        // Check URL parameters first (for mock payment completion)
        const urlParams = new URLSearchParams(window.location.search)
        const sessionId = urlParams.get('session_id')
        const userId = urlParams.get('userId')
        const email = urlParams.get('email')
        const fullName = urlParams.get('fullName')
        const phone = urlParams.get('phone')
        const mock = urlParams.get('mock')

                  if (sessionId && userId && !activationAttempted) {
            // Check if we've already attempted activation in this session
            const activationKey = `activation_attempted_${userId}`
            if (sessionStorage.getItem(activationKey)) {
              return
            }

            setActivationAttempted(true)
            sessionStorage.setItem(activationKey, 'true')
            
            // Add a small delay to prevent race conditions in Strict Mode
            await new Promise(resolve => setTimeout(resolve, 100))
            
            // Activate subscription
            const activateResponse = await fetch('/api/activate-subscription', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId, email, sessionId })
            })

            if (activateResponse.ok) {
              // Generate login token for the user
              const loginResponse = await fetch('/api/auth/login-by-id', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, sessionId })
              })
              
              if (loginResponse.ok) {
                const loginData = await loginResponse.json()
                // Save the token so user can access dashboard
                localStorage.setItem('token', loginData.token)
                
                // Set cookies as well for persistence (httpOnly will be set by the API)
                document.cookie = `token=${loginData.token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=lax`
              } else {
                console.error('Failed to generate login token:', await loginResponse.text())
              }
              
              setVerificationData({
                email: email || '',
                userId: userId || '',
                fullName: fullName || '',
                phone: phone || ''
              })
            } else {
              console.error('Failed to activate subscription')
              setError('Failed to activate subscription. Please contact support.')
            }
        } else {
          // Check URL parameters for payment completion data
          const urlParams = new URLSearchParams(window.location.search)
          const sessionId = urlParams.get('session_id')
          const email = urlParams.get('email')
          const fullName = urlParams.get('fullName')
          const phone = urlParams.get('phone')
          const userId = urlParams.get('userId')
          
          if (sessionId && email) {
            // Payment completion flow
            // If we have a userId, activate the subscription
            if (userId && !activationAttempted) {
              setActivationAttempted(true)
              
              try {
                // Activate subscription
                const activateResponse = await fetch('/api/activate-subscription', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ userId, email, sessionId })
                })

                if (activateResponse.ok) {
                  // Generate login token for the user
                  const loginResponse = await fetch('/api/auth/login-by-id', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId, sessionId })
                  })
                  
                  if (loginResponse.ok) {
                    const loginData = await loginResponse.json()
                    // Save the token so user can access dashboard
                    localStorage.setItem('token', loginData.token)
                    
                    // Set cookies as well for persistence
                    document.cookie = `token=${loginData.token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=lax`
                  } else {
                    console.error('Failed to generate login token:', await loginResponse.text())
                  }
                } else {
                  console.error('Failed to activate subscription for payment completion')
                }
              } catch (error) {
                console.error('Error activating subscription for payment completion:', error)
              }
            }
            
            setVerificationData({
              email: email,
              userId: userId || '',
              fullName: fullName || '',
              phone: phone || ''
            })
          } else {
            // Get verification data from localStorage (existing flow)
            const storedData = localStorage.getItem("verificationSuccess")

            if (storedData) {
              const data = JSON.parse(storedData) as VerificationData
              setVerificationData(data)

              // Clear the stored data after using it
              localStorage.removeItem("verificationSuccess")
            } else {
              setError("No verification data found. Please try signing up again.")
            }
          }
        }
      } catch (err) {
        console.error("Error processing success page:", err)
        setError("An error occurred. Please try signing up again.")
      } finally {
        setLoading(false)
      }
    }

    activateSubscriptionIfNeeded()
  }, [])

  const handleContinue = () => {
    // Redirect to dashboard or login page
    window.location.href = "/dashboard"
  }

  const handleBackToHome = () => {
    window.location.href = "/"
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-black/50 backdrop-blur-sm border-gray-800">
          <CardContent className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-white" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-black/50 backdrop-blur-sm border-gray-800">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <CursiveLogo className="h-12 w-auto text-white" />
            </div>
            <CardTitle className="text-2xl font-bold text-white flex items-center justify-center gap-2">
              <AlertCircle className="h-6 w-6 text-red-400" />
              Error
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="border-red-500 bg-red-500/10 text-red-400">
              <AlertDescription>{error}</AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Button
                onClick={() => (window.location.href = "/signup")}
                className="w-full bg-white text-black hover:bg-gray-200"
              >
                Try Again
              </Button>

              <Button
                onClick={handleBackToHome}
                variant="outline"
                className="w-full border-gray-600 text-gray-300 hover:bg-gray-800 bg-transparent"
              >
                Back to Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-black/50 backdrop-blur-sm border-gray-800">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <CursiveLogo className="h-12 w-auto text-white" />
          </div>
          <CardTitle className="text-2xl font-bold text-white flex items-center justify-center gap-2">
            <CheckCircle className="h-6 w-6 text-green-400" />
            Account Created Successfully!
          </CardTitle>
          <CardDescription className="text-gray-400">
            Welcome to {brand.name}, {verificationData?.fullName}!
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <Alert className="border-green-500 bg-green-500/10 text-green-400">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>Your email {verificationData?.email} has been verified successfully.</AlertDescription>
          </Alert>

          <div className="bg-gray-900/50 rounded-lg p-4 space-y-2">
            <h3 className="font-semibold text-white">Account Details:</h3>
            <div className="text-sm text-gray-300 space-y-1">
              <p>
                <span className="text-gray-400">Name:</span> {verificationData?.fullName}
              </p>
              <p>
                <span className="text-gray-400">Email:</span> {verificationData?.email}
              </p>
              <p>
                <span className="text-gray-400">Phone:</span> {verificationData?.phone}
              </p>
              <p>
                <span className="text-gray-400">User ID:</span> {verificationData?.userId}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Button onClick={handleContinue} className="w-full bg-white text-black hover:bg-gray-200">
              Continue to Dashboard
            </Button>

            <Button
              onClick={handleBackToHome}
              variant="outline"
              className="w-full border-gray-600 text-gray-300 hover:bg-gray-800 bg-transparent"
            >
              Back to Home
            </Button>
          </div>

          <div className="text-center text-sm text-gray-400">
            <p>You can now access all {brand.name} services.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
