"use client"

import React, { useEffect, useRef, useState } from "react"

export function BatCursor() {
  const [mounted, setMounted] = useState(false)
  const batRef = useRef<HTMLDivElement>(null)
  const flapRef = useRef<SVGGElement>(null)

  // Position & movement tracking
  const mxRef = useRef(0)
  const myRef = useRef(0)
  const bxRef = useRef(0)
  const byRef = useRef(0)
  const prevBxRef = useRef(0)
  const prevByRef = useRef(0)
  const hasMovedRef = useRef(false)
  const scaleRef = useRef(1)

  // State flags
  const isHoveringRef = useRef(false)
  const isMouseDownRef = useRef(false)
  const isOverTextRef = useRef(false)
  const isVisibleRef = useRef(false)
  const isReducedMotionRef = useRef(false)
  const currentDurationRef = useRef("0.9s")

  useEffect(() => {
    // 1. Show only on devices with a mouse or trackpad
    const pointerQuery = window.matchMedia("(pointer: fine)")
    if (!pointerQuery.matches) return

    setMounted(true)

    // 10. Respect prefers-reduced-motion
    const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)")
    isReducedMotionRef.current = reducedMotionQuery.matches

    const handleMotionChange = (e: MediaQueryListEvent) => {
      isReducedMotionRef.current = e.matches
    }
    reducedMotionQuery.addEventListener("change", handleMotionChange)

    // 2. Add cursor-bat class to html
    document.documentElement.classList.add("cursor-bat")

    // Event handlers
    const handleMouseMove = (e: MouseEvent) => {
      mxRef.current = e.clientX
      myRef.current = e.clientY
      isVisibleRef.current = true

      if (!hasMovedRef.current) {
        hasMovedRef.current = true
        bxRef.current = e.clientX
        byRef.current = e.clientY
        prevBxRef.current = e.clientX
        prevByRef.current = e.clientY
        if (batRef.current) {
          batRef.current.style.opacity = "1"
        }
      }

      // Check text inputs & interactive hover targets
      const target = e.target as Element | null
      if (target) {
        const isTextInput = !!target.closest(
          'input:not([type="button"]):not([type="submit"]):not([type="reset"]):not([type="checkbox"]):not([type="radio"]), textarea, [contenteditable="true"]'
        )
        isOverTextRef.current = isTextInput

        const isInteractive = !isTextInput && !!target.closest('a, button, [role="button"], [data-hover]')
        isHoveringRef.current = isInteractive
      }
    }

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return
      isMouseDownRef.current = true

      // 8. Click: create a red ripple ring at the click point
      if (!isReducedMotionRef.current) {
        const ripple = document.createElement("div")
        ripple.className = "bat-click-ripple"
        ripple.style.left = `${e.clientX}px`
        ripple.style.top = `${e.clientY}px`
        document.body.appendChild(ripple)

        const cleanup = () => ripple.remove()
        ripple.addEventListener("animationend", cleanup, { once: true })
        setTimeout(cleanup, 650)
      }
    }

    const handleMouseUp = () => {
      isMouseDownRef.current = false
    }

    // 9. Hide bat when mouse leaves window and show when it returns
    const handleMouseLeave = () => {
      isVisibleRef.current = false
    }

    const handleMouseEnter = () => {
      isVisibleRef.current = true
    }

    const handleBlur = () => {
      isMouseDownRef.current = false
      isVisibleRef.current = false
    }

    window.addEventListener("mousemove", handleMouseMove, { passive: true })
    window.addEventListener("mousedown", handleMouseDown, { passive: true })
    window.addEventListener("mouseup", handleMouseUp, { passive: true })
    window.addEventListener("blur", handleBlur, { passive: true })
    document.addEventListener("mouseleave", handleMouseLeave)
    document.addEventListener("mouseenter", handleMouseEnter)

    // 4. Smoothing requestAnimationFrame loop
    let rafId: number

    const tick = () => {
      if (hasMovedRef.current && batRef.current) {
        // 4. Smooth follow: bx += (mx - bx) * 0.28, and the same for y
        bxRef.current += (mxRef.current - bxRef.current) * 0.28
        byRef.current += (myRef.current - byRef.current) * 0.28

        const bx = bxRef.current
        const by = byRef.current

        // 5. Tilt: r = clamp((bx - previousBx) * 2.2, -35, 35) degrees
        const dx = bx - prevBxRef.current
        const r = Math.min(35, Math.max(-35, dx * 2.2))

        // 6. Wing flap: duration 0.9s when idle and 0.2s while moving (speed > 1.2 px/frame)
        const dy = by - prevByRef.current
        const speed = Math.hypot(dx, dy)
        prevBxRef.current = bx
        prevByRef.current = by

        if (!isReducedMotionRef.current && flapRef.current) {
          const targetDuration = speed > 1.2 ? "0.2s" : "0.9s"
          if (currentDurationRef.current !== targetDuration) {
            currentDurationRef.current = targetDuration
            flapRef.current.style.animationDuration = targetDuration
          }
        }

        // 7. Hover & click scale
        const targetScale = (isHoveringRef.current ? 1.35 : 1) * (isMouseDownRef.current ? 0.85 : 1)
        scaleRef.current += (targetScale - scaleRef.current) * 0.28

        // Place with translate(bx px, by px) translate(-50%, -50%) rotate(r deg) scale(s)
        batRef.current.style.transform = `translate(${bx.toFixed(2)}px, ${by.toFixed(2)}px) translate(-50%, -50%) rotate(${r.toFixed(2)}deg) scale(${scaleRef.current.toFixed(4)})`

        // 9. Opacity: hide when mouse leaves window or over text inputs
        const shouldShow = isVisibleRef.current && !isOverTextRef.current
        const targetOpacity = shouldShow ? "1" : "0"
        if (batRef.current.style.opacity !== targetOpacity) {
          batRef.current.style.opacity = targetOpacity
        }
      }

      rafId = requestAnimationFrame(tick)
    }

    rafId = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(rafId)
      document.documentElement.classList.remove("cursor-bat")

      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("mousedown", handleMouseDown)
      window.removeEventListener("mouseup", handleMouseUp)
      window.removeEventListener("blur", handleBlur)
      document.removeEventListener("mouseleave", handleMouseLeave)
      document.removeEventListener("mouseenter", handleMouseEnter)
      reducedMotionQuery.removeEventListener("change", handleMotionChange)

      document.querySelectorAll(".bat-click-ripple").forEach((el) => el.remove())
    }
  }, [])

  if (!mounted) return null

  return (
    <div
      ref={batRef}
      className="bat-cursor-element"
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 64 40"
        width="42"
        height="28"
        style={{
          fill: "#e5252d",
          filter: "drop-shadow(0 0 6px rgba(229,37,45,.9))",
          overflow: "visible",
          display: "block",
        }}
        aria-hidden="true"
      >
        <g ref={flapRef} className="flap">
          <path d="M32 8 L35 14 L40 10 L38 18 C46 12 56 14 62 20 C56 20 52 23 50 28 C46 25 42 26 40 30 C38 27 35 26 32 32 C29 26 26 27 24 30 C22 26 18 25 14 28 C12 23 8 20 2 20 C8 14 18 12 26 18 L24 10 L29 14 Z" />
        </g>
      </svg>
    </div>
  )
}

export default BatCursor
