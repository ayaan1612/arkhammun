"use client"

import React, { useState } from "react"
import { LiquidMetalButton } from "@/components/ui/liquid-metal-button"

export function LiquidMetalButtonDemo() {
  const [lastClicked, setLastClicked] = useState<string>("None")

  return (
    <div className="flex min-h-[480px] w-full flex-col items-center justify-center gap-10 rounded-2xl bg-[#0e0e14] p-8 text-neutral-100 border border-neutral-800">
      <div className="text-center">
        <h3 className="text-xl font-bold tracking-tight text-white">
          LiquidMetalButton Showcase
        </h3>
        <p className="mt-1 text-sm text-neutral-400">
          Interactive WebGL shaders with press depth, click ripple, and hover speed acceleration.
        </p>
        <p className="mt-2 text-xs font-mono text-neutral-500">
          Last clicked: <span className="text-neutral-300 font-semibold">{lastClicked}</span>
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 items-center justify-items-center w-full max-w-xl">
        {/* 1. Black Variant - Text Mode */}
        <div className="flex flex-col items-center gap-3">
          <span className="text-xs font-medium uppercase tracking-wider text-neutral-400">
            Black Variant · Text Mode
          </span>
          <LiquidMetalButton
            variant="black"
            viewMode="text"
            label="Initialize Dais"
            onClick={() => setLastClicked("Black Variant (Text Mode)")}
          />
        </div>

        {/* 2. Black Variant - Icon Mode */}
        <div className="flex flex-col items-center gap-3">
          <span className="text-xs font-medium uppercase tracking-wider text-neutral-400">
            Black Variant · Icon Mode
          </span>
          <LiquidMetalButton
            variant="black"
            viewMode="icon"
            onClick={() => setLastClicked("Black Variant (Icon Mode)")}
          />
        </div>

        {/* 3. Red Variant - Text Mode */}
        <div className="flex flex-col items-center gap-3">
          <span className="text-xs font-medium uppercase tracking-wider text-neutral-400">
            Red Variant · Text Mode
          </span>
          <LiquidMetalButton
            variant="red"
            viewMode="text"
            label="Confirm Delegate"
            onClick={() => setLastClicked("Red Variant (Text Mode)")}
          />
        </div>

        {/* 4. Red Variant - Icon Mode */}
        <div className="flex flex-col items-center gap-3">
          <span className="text-xs font-medium uppercase tracking-wider text-neutral-400">
            Red Variant · Icon Mode
          </span>
          <LiquidMetalButton
            variant="red"
            viewMode="icon"
            onClick={() => setLastClicked("Red Variant (Icon Mode)")}
          />
        </div>
      </div>
    </div>
  )
}

export default LiquidMetalButtonDemo
