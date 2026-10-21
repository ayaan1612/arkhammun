'use client'

import { useEffect, useState } from 'react'
import { arkham } from '@/lib/arkham-data'

export function ArkhamLoadingScreen() {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(false), 4000)
    return () => window.clearTimeout(timer)
  }, [])

  if (!visible) return null

  return (
    <div className="arkham-loading" role="status" aria-live="polite" aria-label="Loading Arkham MUN">
      <div className="loading-orbit loading-orbit-one" />
      <div className="loading-orbit loading-orbit-two" />
      <div className="loading-core">
        <img src={arkham.logo} alt="" />
        <span>ARKHAM MUN</span>
        <small>THE NEXT SESSION IS LOADING</small>
      </div>
      <div className="loading-progress"><span /></div>
      <p>Preparing the room for diplomacy</p>
    </div>
  )
}
