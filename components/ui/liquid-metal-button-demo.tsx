"use client"

import React from "react"
import { LiquidMetalButton } from "@/components/ui/liquid-metal-button"

export function LiquidMetalButtonDemo() {
  return (
    <div className="flex flex-col items-center justify-center gap-8 p-8">
      <LiquidMetalButton label="Get Started" />
      <LiquidMetalButton viewMode="icon" />
    </div>
  )
}

export default LiquidMetalButtonDemo
