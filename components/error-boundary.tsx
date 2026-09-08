"use client"

import React from "react"
import { AlertCircle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { GlassCard } from "@/components/ui/glass-card"

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
  errorInfo?: React.ErrorInfo
}

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ComponentType<{ error: Error; retry: () => void }>
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[ErrorBoundary] Caught error:", error)
    console.error("[ErrorBoundary] Error info:", errorInfo)

    // Log to monitoring service
    this.logErrorToService(error, errorInfo)

    // Call custom error handler
    this.props.onError?.(error, errorInfo)

    this.setState({
      error,
      errorInfo,
    })
  }

  private logErrorToService(error: Error, errorInfo: React.ErrorInfo) {
    // Log to console in development
    if (process.env.NODE_ENV === "development") {
      console.group("[ErrorBoundary] Error Details")
      console.error("Error:", error)
      console.error("Component Stack:", errorInfo.componentStack)
      console.error("Error Stack:", error.stack)
      console.groupEnd()
    }

    // In production, you would send to monitoring service like Sentry
    if (process.env.NODE_ENV === "production") {
      // Example: Sentry.captureException(error, { contexts: { react: errorInfo } })
      console.error("[ErrorBoundary] Production error logged:", {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
      })
    }
  }

  private retry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined })
  }

  render() {
    if (this.state.hasError) {
      const { fallback: Fallback } = this.props

      if (Fallback && this.state.error) {
        return <Fallback error={this.state.error} retry={this.retry} />
      }

      return (
        <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
          <div className="max-w-md w-full">
            <GlassCard>
              <div className="text-center">
                <AlertCircle className="w-16 h-16 mx-auto mb-6 text-red-400" />
                <h2 className="text-xl font-semibold mb-4 text-red-400">Something went wrong</h2>
                <p className="text-gray-300 mb-6">
                  An unexpected error occurred. Please try refreshing the page or contact support if the problem
                  persists.
                </p>

                {process.env.NODE_ENV === "development" && this.state.error && (
                  <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-left">
                    <h3 className="font-semibold text-red-400 mb-2">Error Details (Development)</h3>
                    <p className="text-sm text-red-300 font-mono break-all">{this.state.error.message}</p>
                  </div>
                )}

                <div className="space-y-3">
                  <Button onClick={this.retry} className="w-full bg-foreground text-background hover:bg-foreground/90">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Try Again
                  </Button>
                  <Button
                    onClick={() => window.location.reload()}
                    variant="outline"
                    className="w-full border-foreground text-foreground hover:bg-foreground hover:text-background bg-transparent"
                  >
                    Refresh Page
                  </Button>
                </div>
              </div>
            </GlassCard>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

// Hook for functional components to handle errors
export function useErrorHandler() {
  return React.useCallback((error: Error, errorInfo?: string) => {
    console.error("[useErrorHandler] Error caught:", error)

    // Log to monitoring service
    if (process.env.NODE_ENV === "production") {
      console.error("[useErrorHandler] Production error:", {
        message: error.message,
        stack: error.stack,
        info: errorInfo,
        timestamp: new Date().toISOString(),
        url: window.location.href,
        userAgent: navigator.userAgent,
      })
    }
  }, [])
}
