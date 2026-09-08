"use client"

import React from "react"
import type { JSX } from "react"

/**
 * Dynamic, zero-dependency stand-in for `framer-motion`.
 *
 * Any JSX tag accessed (e.g. motion.div, motion.p) is lazily created
 * and renders the requested element with framer-motion props filtered out.
 *
 * This prevents "Element type is invalid" errors and React warnings
 * when framer-motion isn't available in the browser-only `Next.js` runtime.
 */

type AnyProps = React.HTMLAttributes<HTMLElement> & Record<string, any>

// List of framer-motion specific props to filter out
const MOTION_PROPS = new Set([
  'initial',
  'animate',
  'exit',
  'transition',
  'variants',
  'whileHover',
  'whileTap',
  'whileFocus',
  'whileDrag',
  'whileInView',
  'viewport',
  'layout',
  'layoutId',
  'layoutDependency',
  'onAnimationStart',
  'onAnimationComplete',
  'onUpdate',
  'onDrag',
  'onDragStart',
  'onDragEnd',
  'drag',
  'dragConstraints',
  'dragElastic',
  'dragMomentum',
  'dragPropagation',
  'dragSnapToOrigin',
  'dragTransition',
  'custom'
])

function filterMotionProps(props: AnyProps) {
  const filteredProps: AnyProps = {}
  
  for (const [key, value] of Object.entries(props)) {
    if (!MOTION_PROPS.has(key)) {
      filteredProps[key] = value
    }
  }
  
  return filteredProps
}

function createMotionTag(tag: keyof JSX.IntrinsicElements) {
  /* eslint-disable react/display-name */
  return React.forwardRef<HTMLElement, AnyProps>((props, ref) => {
    const domProps = filterMotionProps(props)
    return React.createElement(tag, { ref, ...domProps })
  })
}

/* Use a Proxy so *any* property access returns a valid component */
export const motion: Record<string, React.ComponentType<any>> = new Proxy(
  {} as Record<string, React.ComponentType<any>>,
  {
    get(target, prop: string) {
      if (!target[prop]) {
        target[prop] = createMotionTag(prop as keyof JSX.IntrinsicElements)
      }
      return target[prop]
    },
  },
)

// Fallback AnimatePresence component
export const AnimatePresence: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <>{children}</>
}
