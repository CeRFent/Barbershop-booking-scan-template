"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Navbar } from "@/components/navbar"
import { Lightbox } from "@/components/ui/lightbox"
import { Play, ImageIcon } from "lucide-react"
import { brand } from "@/lib/brand-config"


// TEMPLATE NOTE: this template ships with no photos in it at all -- add the
// new shop's own images to public/gallery/ and list them here the same way
// the original client's photos used to be listed (id, src, type, alt).
const mediaItems: { id: string; src: string; type: "image" | "video"; alt: string }[] = []

export default function GalleryPage() {
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set())

  const openLightbox = (index: number) => {
    setCurrentIndex(index)
    setLightboxOpen(true)
  }

  const closeLightbox = () => {
    setLightboxOpen(false)
  }

  // Enhanced image preloading with error handling
  useEffect(() => {
    const preloadImages = () => {
      mediaItems.forEach((item, index) => {
        if (item.type === "image") {
          const img = new Image()
          img.crossOrigin = "anonymous"
          img.onload = () => {
            setLoadedImages((prev) => new Set(prev).add(item.id))
          }
          img.onerror = () => {
            // Still mark as "loaded" to show placeholder or fallback
            setLoadedImages((prev) => new Set(prev).add(item.id))
          }
          // Add slight delay for staggered loading
          setTimeout(() => {
            img.src = item.src
          }, index * 100)
        }
      })
    }

    preloadImages()
  }, [])

  // Handle touch gestures for mobile navigation
  useEffect(() => {
    let startX = 0
    let startY = 0

    const handleTouchStart = (e: TouchEvent) => {
      if (!lightboxOpen) return
      startX = e.touches[0].clientX
      startY = e.touches[0].clientY
    }

    const handleTouchEnd = (e: TouchEvent) => {
      if (!lightboxOpen) return

      const endX = e.changedTouches[0].clientX
      const endY = e.changedTouches[0].clientY
      const diffX = startX - endX
      const diffY = startY - endY

      // Only trigger if horizontal swipe is more significant than vertical
      if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 50) {
        if (diffX > 0) {
          // Swipe left - next image
          const newIndex = currentIndex < mediaItems.length - 1 ? currentIndex + 1 : 0
          setCurrentIndex(newIndex)
        } else {
          // Swipe right - previous image
          const newIndex = currentIndex > 0 ? currentIndex - 1 : mediaItems.length - 1
          setCurrentIndex(newIndex)
        }
      }
    }

    document.addEventListener("touchstart", handleTouchStart)
    document.addEventListener("touchend", handleTouchEnd)

    return () => {
      document.removeEventListener("touchstart", handleTouchStart)
      document.removeEventListener("touchend", handleTouchEnd)
    }
  }, [lightboxOpen, currentIndex])

  // Enhanced keyboard navigation for gallery grid
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (lightboxOpen) return // Don't interfere with lightbox navigation

      if (e.key === "Enter" || e.key === " ") {
        const focusedElement = document.activeElement as HTMLElement
        if (focusedElement?.dataset?.index) {
          e.preventDefault()
          const index = Number.parseInt(focusedElement.dataset.index)
          openLightbox(index)
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [lightboxOpen])

  return (
    <div className="bg-background text-foreground min-h-screen pb-24 lg:pb-0">
      <Navbar />

      <div className="pt-24 pb-8 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <ImageIcon className="w-16 h-16 mx-auto mb-6 text-foreground" />
            <h1 className="text-4xl md:text-6xl font-bold mb-6">Our Work</h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Experience the artistry and precision that defines {brand.name}. Every cut tells a story of craftsmanship,
              attention to detail, and the pursuit of perfection.
            </p>
          </motion.div>

          {/* Gallery Grid */}
          {mediaItems.length === 0 ? (
            <div className="text-center py-20 border border-dashed border-foreground/20 rounded-2xl">
              <ImageIcon className="w-10 h-10 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No photos yet — add the shop's own work to public/gallery/ and list them in mediaItems above.</p>
            </div>
          ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6"
          >
            {mediaItems.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="group relative aspect-square overflow-hidden rounded-2xl cursor-pointer focus-within:ring-2 focus-within:ring-foreground/50"
                onClick={() => openLightbox(index)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault()
                    openLightbox(index)
                  }
                }}
                tabIndex={0}
                role="button"
                aria-label={`View ${item.type}: ${item.alt}`}
                data-index={index}
              >
                {item.type === "image" ? (
                  <div className="relative w-full h-full">
                    {/* Enhanced loading placeholder */}
                    {!loadedImages.has(item.id) && (
                      <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900 animate-pulse flex items-center justify-center">
                        <div className="text-foreground/40 text-sm">Loading...</div>
                      </div>
                    )}
                    <img
                      src={item.src || "/placeholder.svg"}
                      alt={item.alt}
                      className={`w-full h-full object-cover transition-all duration-500 group-hover:scale-110 group-focus:scale-110 ${
                        loadedImages.has(item.id) ? "opacity-100" : "opacity-0"
                      }`}
                      loading="lazy"
                      decoding="async"
                      draggable={false}
                    />
                  </div>
                ) : (
                  <div className="relative w-full h-full">
                    <video
                      src={item.src}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 group-focus:scale-110"
                      muted
                      loop
                      playsInline
                      preload="metadata"
                      onLoadedData={() => setLoadedImages((prev) => new Set(prev).add(item.id))}
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-background/30 transition-opacity duration-300 group-hover:bg-background/20 group-focus:bg-background/20">
                      <div className="bg-foreground/20 backdrop-blur-sm rounded-full p-3 group-hover:bg-foreground/30 group-focus:bg-foreground/30 transition-all duration-300 group-hover:scale-110 group-focus:scale-110">
                        <Play className="w-6 h-6 sm:w-8 sm:h-8 text-foreground ml-1" />
                      </div>
                    </div>
                  </div>
                )}

                {/* Enhanced overlay with better responsive text */}
                <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity duration-300">
                  <div className="absolute bottom-4 left-4 right-4">
                    <p className="text-foreground text-xs sm:text-sm font-medium line-clamp-2">{item.alt}</p>
                  </div>
                </div>

                {/* Enhanced hover border effect */}
                <div className="absolute inset-0 border-2 border-foreground/0 group-hover:border-foreground/30 group-focus:border-foreground/50 rounded-2xl transition-colors duration-300" />
              </motion.div>
            ))}
          </motion.div>
          )}

          {/* Call to Action */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="text-center mt-16 sm:mt-20"
          >
            <div className="bg-gradient-to-r from-foreground/5 to-foreground/10 backdrop-blur-sm border border-foreground/10 rounded-3xl p-8 sm:p-12 max-w-4xl mx-auto">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-6">Ready to Experience {brand.name}?</h2>
              <p className="text-lg sm:text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
                Join our exclusive subscription service and get premium cuts that reflect your unique style and
                personality.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <motion.a
                  href="/signup"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-foreground text-background px-6 sm:px-8 py-3 rounded-full font-semibold hover:bg-foreground/90 transition-colors focus:outline-none focus:ring-2 focus:ring-foreground/50"
                >
                  Subscribe Now
                </motion.a>
                <motion.a
                  href="/book"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="border border-foreground text-foreground px-6 sm:px-8 py-3 rounded-full font-semibold hover:bg-foreground hover:text-background transition-colors focus:outline-none focus:ring-2 focus:ring-foreground/50"
                >
                  Book an Appointment
                </motion.a>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Lightbox */}
      <Lightbox
        isOpen={lightboxOpen}
        onClose={closeLightbox}
        mediaItems={mediaItems}
        currentIndex={currentIndex}
        onNavigate={setCurrentIndex}
      />
    </div>
  )
}
