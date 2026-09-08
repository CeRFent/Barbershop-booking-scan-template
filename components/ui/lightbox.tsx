"use client"

import type React from "react"

import { useState, useEffect, useRef, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, ChevronLeft, ChevronRight, Play, Pause } from "lucide-react"

interface MediaItem {
  id: string
  src: string
  type: "image" | "video"
  alt?: string
}

interface LightboxProps {
  isOpen: boolean
  onClose: () => void
  mediaItems: MediaItem[]
  currentIndex: number
  onNavigate: (index: number) => void
}

export function Lightbox({ isOpen, onClose, mediaItems, currentIndex, onNavigate }: LightboxProps) {
  const [isVideoPlaying, setIsVideoPlaying] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null)
  const [touchEnd, setTouchEnd] = useState<{ x: number; y: number } | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  // Minimum swipe distance for navigation
  const minSwipeDistance = 50

  const handleKeyPress = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) return

      // Prevent default behavior for all handled keys
      switch (e.key) {
        case "Escape":
          e.preventDefault()
          e.stopPropagation()
          onClose()
          break
        case "ArrowLeft":
          e.preventDefault()
          e.stopPropagation()
          goToPrevious()
          break
        case "ArrowRight":
          e.preventDefault()
          e.stopPropagation()
          goToNext()
          break
        case " ":
          e.preventDefault()
          e.stopPropagation()
          if (mediaItems[currentIndex]?.type === "video") {
            toggleVideoPlayback()
          }
          break
      }
    },
    [isOpen, currentIndex, onClose, mediaItems],
  )

  useEffect(() => {
    if (isOpen) {
      // Add event listeners
      document.addEventListener("keydown", handleKeyPress, { capture: true })
      // Prevent body scroll when lightbox is open
      document.body.style.overflow = "hidden"
      // Focus the close button for accessibility
      setTimeout(() => {
        closeButtonRef.current?.focus()
      }, 100)
    } else {
      // Clean up
      document.removeEventListener("keydown", handleKeyPress, { capture: true })
      document.body.style.overflow = "unset"
    }

    return () => {
      document.removeEventListener("keydown", handleKeyPress, { capture: true })
      document.body.style.overflow = "unset"
    }
  }, [isOpen, handleKeyPress])

  const currentMedia = mediaItems[currentIndex]

  const goToPrevious = useCallback(() => {
    const newIndex = currentIndex > 0 ? currentIndex - 1 : mediaItems.length - 1
    onNavigate(newIndex)
    setIsVideoPlaying(false)
    setImageLoaded(false)
  }, [currentIndex, mediaItems.length, onNavigate])

  const goToNext = useCallback(() => {
    const newIndex = currentIndex < mediaItems.length - 1 ? currentIndex + 1 : 0
    onNavigate(newIndex)
    setIsVideoPlaying(false)
    setImageLoaded(false)
  }, [currentIndex, mediaItems.length, onNavigate])

  const toggleVideoPlayback = useCallback(() => {
    if (videoRef.current) {
      if (isVideoPlaying) {
        videoRef.current.pause()
      } else {
        videoRef.current.play()
      }
      setIsVideoPlaying(!isVideoPlaying)
    }
  }, [isVideoPlaying])

  // Enhanced overlay click handler - simplified
  const handleOverlayClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      // Check if the click target is the overlay itself or has the overlay class
      const target = e.target as HTMLElement
      const isOverlayClick =
        target === overlayRef.current ||
        target.classList.contains("lightbox-overlay") ||
        target.classList.contains("lightbox-backdrop")

      if (isOverlayClick) {
        onClose()
      }
    },
    [onClose],
  )

  // Touch event handlers for mobile swipe navigation
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (!isOpen) return
      const touch = e.touches[0]
      setTouchStart({ x: touch.clientX, y: touch.clientY })
      setTouchEnd(null)
    },
    [isOpen],
  )

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!touchStart) return
      const touch = e.touches[0]
      setTouchEnd({ x: touch.clientX, y: touch.clientY })
    },
    [touchStart],
  )

  const handleTouchEnd = useCallback(() => {
    if (!touchStart || !touchEnd) return

    const distanceX = touchStart.x - touchEnd.x
    const distanceY = touchStart.y - touchEnd.y
    const isHorizontalSwipe = Math.abs(distanceX) > Math.abs(distanceY)

    // Only trigger navigation if it's a horizontal swipe and meets minimum distance
    if (isHorizontalSwipe && Math.abs(distanceX) > minSwipeDistance) {
      if (distanceX > 0) {
        // Swipe left - next image
        goToNext()
      } else {
        // Swipe right - previous image
        goToPrevious()
      }
    }

    // Reset touch state
    setTouchStart(null)
    setTouchEnd(null)
  }, [touchStart, touchEnd, goToNext, goToPrevious, minSwipeDistance])

  // Reset state when media changes
  useEffect(() => {
    setIsVideoPlaying(false)
    setImageLoaded(false)
    if (videoRef.current) {
      videoRef.current.pause()
      videoRef.current.currentTime = 0
    }

    // Preload current image
    if (currentMedia?.type === "image") {
      const img = new Image()
      img.crossOrigin = "anonymous"
      img.onload = () => setImageLoaded(true)
      img.onerror = () => setImageLoaded(true) // Still show something even if image fails
      img.src = currentMedia.src
    }
  }, [currentIndex, currentMedia])

  if (!isOpen || !currentMedia) return null

  return (
    <AnimatePresence mode="wait">
      <motion.div
        ref={overlayRef}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="lightbox-overlay lightbox-backdrop fixed inset-0 z-50 bg-background/95 backdrop-blur-sm overflow-hidden"
        onClick={handleOverlayClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        role="dialog"
        aria-modal="true"
        aria-label="Image gallery lightbox"
      >
        {/* Close Button - Simplified and more reliable */}
        <button
          ref={closeButtonRef}
          onClick={onClose}
          className="fixed top-4 right-4 z-[60] w-12 h-12 flex items-center justify-center text-foreground hover:bg-foreground/20 bg-background/60 backdrop-blur-sm rounded-full transition-all duration-200 hover:scale-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-foreground/50 touch-manipulation"
          aria-label="Close lightbox"
          type="button"
          style={{ WebkitTapHighlightColor: "transparent" }}
        >
          <X className="w-6 h-6 pointer-events-none" />
        </button>

        {/* Navigation Buttons - Simplified */}
        {mediaItems.length > 1 && (
          <>
            {/* Previous Button */}
            <button
              onClick={goToPrevious}
              className="fixed left-4 top-1/2 transform -translate-y-1/2 z-[60] w-12 h-12 flex items-center justify-center text-foreground hover:bg-foreground/20 bg-background/60 backdrop-blur-sm rounded-full transition-all duration-200 hover:scale-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-foreground/50 touch-manipulation"
              aria-label="Previous image"
              type="button"
              style={{ WebkitTapHighlightColor: "transparent" }}
            >
              <ChevronLeft className="w-8 h-8 pointer-events-none" />
            </button>

            {/* Next Button */}
            <button
              onClick={goToNext}
              className="fixed right-4 top-1/2 transform -translate-y-1/2 z-[60] w-12 h-12 flex items-center justify-center text-foreground hover:bg-foreground/20 bg-background/60 backdrop-blur-sm rounded-full transition-all duration-200 hover:scale-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-foreground/50 touch-manipulation"
              aria-label="Next image"
              type="button"
              style={{ WebkitTapHighlightColor: "transparent" }}
            >
              <ChevronRight className="w-8 h-8 pointer-events-none" />
            </button>
          </>
        )}

        {/* Enhanced touch areas for mobile navigation */}
        {mediaItems.length > 1 && (
          <>
            {/* Left touch area */}
            <div
              className="fixed left-0 top-0 bottom-0 w-1/4 z-40 cursor-pointer sm:hidden"
              onClick={goToPrevious}
              aria-label="Previous image (tap left side)"
              role="button"
              tabIndex={-1}
            />

            {/* Right touch area */}
            <div
              className="fixed right-0 top-0 bottom-0 w-1/4 z-40 cursor-pointer sm:hidden"
              onClick={goToNext}
              aria-label="Next image (tap right side)"
              role="button"
              tabIndex={-1}
            />
          </>
        )}

        {/* Media Container - Enhanced for better responsiveness */}
        <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 md:p-8">
          <motion.div
            ref={contentRef}
            key={currentIndex}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="relative w-full max-w-7xl mx-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {currentMedia.type === "image" ? (
              <div className="relative w-full">
                {/* Loading placeholder with better responsive sizing */}
                {!imageLoaded && (
                  <div className="w-full h-64 sm:h-80 md:h-96 bg-gradient-to-br from-gray-800 to-gray-900 animate-pulse rounded-lg mx-auto flex items-center justify-center">
                    <div className="text-foreground/60 text-sm">Loading...</div>
                  </div>
                )}
                <img
                  src={currentMedia.src || "/placeholder.svg"}
                  alt={currentMedia.alt || "Gallery image"}
                  className={`w-full h-auto max-h-[85vh] sm:max-h-[90vh] object-contain rounded-lg mx-auto block transition-opacity duration-300 ${
                    imageLoaded ? "opacity-100" : "opacity-0"
                  }`}
                  style={{
                    maxWidth: "100%",
                    minHeight: imageLoaded ? "auto" : "0",
                  }}
                  onLoad={() => setImageLoaded(true)}
                  onError={() => setImageLoaded(true)}
                  draggable={false}
                />
              </div>
            ) : (
              <div className="relative w-full max-w-4xl mx-auto">
                <video
                  ref={videoRef}
                  src={currentMedia.src}
                  className="w-full h-auto max-h-[85vh] sm:max-h-[90vh] object-contain rounded-lg"
                  controls={isVideoPlaying}
                  muted
                  loop
                  playsInline
                  preload="metadata"
                  onPlay={() => setIsVideoPlaying(true)}
                  onPause={() => setIsVideoPlaying(false)}
                  onLoadStart={() => setImageLoaded(false)}
                  onLoadedData={() => setImageLoaded(true)}
                />
                {!isVideoPlaying && imageLoaded && (
                  <button
                    className="absolute inset-0 flex items-center justify-center bg-background/30 rounded-lg cursor-pointer hover:bg-background/20 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-foreground/50"
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleVideoPlayback()
                    }}
                    aria-label="Play video"
                    type="button"
                  >
                    <div className="bg-foreground/20 backdrop-blur-sm rounded-full p-3 sm:p-4 hover:bg-foreground/30 transition-all duration-200 hover:scale-110">
                      <Play className="w-8 h-8 sm:w-12 sm:h-12 text-foreground ml-1" />
                    </div>
                  </button>
                )}
                {isVideoPlaying && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleVideoPlayback()
                    }}
                    className="absolute top-4 left-4 w-10 h-10 flex items-center justify-center text-foreground hover:bg-foreground/20 bg-background/60 backdrop-blur-sm rounded-full transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-foreground/50"
                    aria-label="Pause video"
                    type="button"
                  >
                    <Pause className="w-5 h-5" />
                  </button>
                )}
              </div>
            )}

            {/* Media Description - Enhanced responsive typography */}
            {currentMedia.alt && (
              <div className="mt-4 text-center px-4">
                <p className="text-foreground text-sm sm:text-base md:text-lg font-medium bg-background/60 backdrop-blur-sm px-4 py-2 rounded-lg inline-block max-w-full">
                  {currentMedia.alt}
                </p>
              </div>
            )}
          </motion.div>
        </div>

        {/* Counter - Enhanced responsive positioning */}
        {mediaItems.length > 1 && (
          <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 text-foreground text-sm bg-background/60 backdrop-blur-sm px-4 py-2 rounded-full z-50">
            {currentIndex + 1} / {mediaItems.length}
          </div>
        )}

        {/* Navigation Hints - Enhanced responsive text */}
        <div className="fixed bottom-16 left-1/2 transform -translate-x-1/2 text-foreground/60 text-xs text-center px-4 z-50">
          <div className="sm:hidden">
            <p>Swipe or tap sides to navigate • Tap outside to close</p>
          </div>
          <div className="hidden sm:block">
            <p>Use arrow keys or click buttons to navigate • Press ESC or click outside to close</p>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
