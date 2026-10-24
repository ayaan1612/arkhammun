"use client"

import React, { useState } from "react"
import { LimelightNav, NavItem } from "@/components/ui/limelight-nav"
import { LiquidMetalButton } from "@/components/ui/liquid-metal-button"
import { Home, Bookmark, PlusCircle, User, Settings } from "lucide-react"

// --- Limelight Nav Demos ---
const customNavItems: NavItem[] = [
  { id: "home", icon: <Home />, label: "Home", onClick: () => console.log("Home Clicked!") },
  { id: "bookmark", icon: <Bookmark />, label: "Bookmarks", onClick: () => console.log("Bookmark Clicked!") },
  { id: "add", icon: <PlusCircle />, label: "Add New", onClick: () => console.log("Add Clicked!") },
  { id: "profile", icon: <User />, label: "Profile", onClick: () => console.log("Profile Clicked!") },
  { id: "settings", icon: <Settings />, label: "Settings", onClick: () => console.log("Settings Clicked!") },
]

export const Customized = () => {
  return <LimelightNav className="bg-secondary dark:bg-card/50 dark:border-accent/50 rounded-xl" items={customNavItems} />
}

export const Default = () => {
  return <LimelightNav />
}

// --- LiquidMetalButton 4-Way Combination Demo ---
export function LiquidMetalDemo() {
  const [clicked, setClicked] = useState<string>("None")

  return (
    <div className="flex min-h-[460px] w-full flex-col items-center justify-center gap-8 rounded-xl bg-neutral-900 p-8 text-neutral-200">
      <div className="text-center">
        <h2 className="text-xl font-bold text-white">LiquidMetalButton Demo</h2>
        <p className="text-xs text-neutral-400 mt-1">
          Last clicked: <span className="text-red-400 font-mono">{clicked}</span>
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 items-center justify-items-center">
        {/* Black Variant (Default) - Text Mode */}
        <div className="flex flex-col items-center gap-2">
          <span className="text-xs text-neutral-400">Variant: Black · Text</span>
          <LiquidMetalButton
            variant="black"
            viewMode="text"
            label="Black Metal"
            onClick={() => setClicked("Black · Text")}
          />
        </div>

        {/* Black Variant (Default) - Icon Mode */}
        <div className="flex flex-col items-center gap-2">
          <span className="text-xs text-neutral-400">Variant: Black · Icon</span>
          <LiquidMetalButton
            variant="black"
            viewMode="icon"
            onClick={() => setClicked("Black · Icon")}
          />
        </div>

        {/* Red Variant - Text Mode */}
        <div className="flex flex-col items-center gap-2">
          <span className="text-xs text-neutral-400">Variant: Red · Text</span>
          <LiquidMetalButton
            variant="red"
            viewMode="text"
            label="Red Metal"
            onClick={() => setClicked("Red · Text")}
          />
        </div>

        {/* Red Variant - Icon Mode */}
        <div className="flex flex-col items-center gap-2">
          <span className="text-xs text-neutral-400">Variant: Red · Icon</span>
          <LiquidMetalButton
            variant="red"
            viewMode="icon"
            onClick={() => setClicked("Red · Icon")}
          />
        </div>
      </div>
    </div>
  )
}

export default LiquidMetalDemo
