"use client"

import React, { useState } from "react"
import Link from "next/link"
import { ArkhamShell } from "@/components/arkham-shell"
import { LiquidMetalButton } from "@/components/ui/liquid-metal-button"
import { LimelightNav, NavItem } from "@/components/ui/limelight-nav"
import {
  Compass,
  Calendar,
  FileText,
  Home,
  MessageSquare,
  Sparkles,
} from "lucide-react"

export default function DemoPage() {
  const [activeTab, setActiveTab] = useState(0)
  const [lastAction, setLastAction] = useState<string>("None")

  const navItems: NavItem[] = [
    {
      id: "home",
      icon: <Home className="w-5 h-5" />,
      label: "Home",
      onClick: () => setLastAction("Navigated to Home Tab"),
    },
    {
      id: "committees",
      icon: <Compass className="w-5 h-5" />,
      label: "Committees",
      onClick: () => setLastAction("Navigated to Committees Tab"),
    },
    {
      id: "schedule",
      icon: <Calendar className="w-5 h-5" />,
      label: "Schedule",
      onClick: () => setLastAction("Navigated to Schedule Tab"),
    },
    {
      id: "policies",
      icon: <FileText className="w-5 h-5" />,
      label: "Policies",
      onClick: () => setLastAction("Navigated to Policies Tab"),
    },
    {
      id: "contact",
      icon: <MessageSquare className="w-5 h-5" />,
      label: "Contact",
      onClick: () => setLastAction("Navigated to Contact Tab"),
    },
  ]

  return (
    <ArkhamShell>
      <div className="container-x py-16 text-white">
        {/* Header */}
        <div className="mb-12 text-center">
          <span className="text-xs font-bold uppercase tracking-widest text-[#e3262e]">
            Interactive Component Suite
          </span>
          <h1 className="mt-2 text-3xl font-extrabold sm:text-4xl text-white">
            Liquid Metal &amp; Limelight Navigation
          </h1>
          <p className="mt-3 text-sm text-[#aaa8ba] max-w-2xl mx-auto">
            Live WebGL shaders, tactile active press states, click speed bursts, and adaptive limelight highlights running inside the Arkham MUN theme.
          </p>
        </div>

        {/* SECTION 1: LiquidMetalButton Showcase */}
        <section className="mb-16 rounded-2xl border border-white/10 bg-[#0c0b16]/80 p-8 shadow-2xl backdrop-blur-md">
          <div className="mb-8 border-b border-white/10 pb-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#e3262e]" />
              <span>1. LiquidMetalButton (WebGL Shaders)</span>
            </h2>
            <p className="mt-1 text-xs text-[#8d8a9e]">
              Hover to accelerate speed from 0.6 → 1.0. Click to trigger 2.4 speed boost with radial ripple wave.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 justify-items-center max-w-lg mx-auto">
            {/* 1. Text Mode */}
            <div className="flex flex-col items-center gap-3">
              <span className="text-xs font-semibold text-[#8d8a9e] uppercase tracking-wider">
                Text Mode
              </span>
              <LiquidMetalButton
                label="Get Started"
                onClick={() => setLastAction("Clicked: LiquidMetalButton (Text Mode)")}
              />
              <span className="text-[11px] text-[#636075]">142×46px · Liquid metal</span>
            </div>

            {/* 2. Icon Mode */}
            <div className="flex flex-col items-center gap-3">
              <span className="text-xs font-semibold text-[#8d8a9e] uppercase tracking-wider">
                Icon Mode
              </span>
              <LiquidMetalButton
                viewMode="icon"
                onClick={() => setLastAction("Clicked: LiquidMetalButton (Icon Mode)")}
              />
              <span className="text-[11px] text-[#636075]">46×46px · Sparkles</span>
            </div>
          </div>
        </section>

        {/* SECTION 2: LimelightNav Showcase */}
        <section className="mb-16 rounded-2xl border border-white/10 bg-[#0c0b16]/80 p-8 shadow-2xl backdrop-blur-md">
          <div className="mb-8 border-b border-white/10 pb-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Compass className="w-5 h-5 text-[#e3262e]" />
              <span>2. LimelightNav (Adaptive Spotlight Dock)</span>
            </h2>
            <p className="mt-1 text-xs text-[#8d8a9e]">
              Click any tab to smoothly animate the limelight highlight and conic beam across the bar.
            </p>
          </div>

          <div className="flex flex-col items-center justify-center gap-6 py-6">
            <LimelightNav
              items={navItems}
              defaultActiveIndex={activeTab}
              onTabChange={(idx) => setActiveTab(idx)}
              className="bg-[#121122] border-white/15 text-white shadow-2xl"
              limelightClassName="bg-[#e3262e] shadow-[0_50px_20px_#e3262e]"
            />

            <div className="text-center text-xs text-[#aaa8ba]">
              Active Tab: <span className="text-white font-semibold">{navItems[activeTab]?.label}</span>
            </div>
          </div>
        </section>

        {/* Interactive Status Log */}
        <div className="rounded-xl border border-white/10 bg-[#080810] p-4 text-center text-xs text-[#8d8a9e]">
          Live Interaction Event:{" "}
          <span className="font-mono text-[#ff4d55] font-semibold">{lastAction}</span>
        </div>

        {/* Back to Homepage */}
        <div className="mt-10 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-[#aaa8ba] hover:text-white transition-colors"
          >
            ← Back to Arkham MUN Homepage
          </Link>
        </div>
      </div>
    </ArkhamShell>
  )
}
