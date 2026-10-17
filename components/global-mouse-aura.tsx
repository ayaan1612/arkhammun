"use client"

import { useEffect } from "react"

export function GlobalMouseAura({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const root = document.documentElement
    const updatePointer = (event: PointerEvent) => {
      root.style.setProperty("--mouse-x", `${event.clientX}px`)
      root.style.setProperty("--mouse-y", `${event.clientY}px`)
    }
    window.addEventListener("pointermove", updatePointer, { passive: true })
    return () => window.removeEventListener("pointermove", updatePointer)
  }, [])

  return <div className="global-mouse-aura">{children}</div>
}
