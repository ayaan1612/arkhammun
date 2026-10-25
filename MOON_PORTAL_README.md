# Arkham MUN — Scroll-Driven Moon Portal Hero

A scroll-driven "moon portal" hero transition built with **React + TypeScript + Tailwind CSS** (zero animation dependencies). Driven strictly by viewport scroll progress through direct DOM ref mutations and a single high-performance `requestAnimationFrame` loop.

---

## 🏛️ Architecture & Structure

```
<MoonPortalHero emblemSrc="/logo.jpg" next={<AboutSection />} />
```

- **Wrapper (`MoonPortalHero`)**: Height set to `3.2 × 100vh` (`320vh`), providing an extended scroll track.
- **Sticky Pin (`.moon-portal-pin`)**: `position: sticky; top: 0; height: 100vh; overflow: hidden;`. Stays locked in view while the user scrolls down the wrapper.
- **Hero Layer (`z-2`)**:
  - Eyebrow with pulsating live dot
  - Three-line headline: `"Question."`, `"Negotiate."`, `"Shape tomorrow."` (each line independent)
  - Lead paragraph and CTA buttons
  - Bottom meta items (`DATE`, `VENUE`)
  - Blood moon emblem with rotating dashed ring and speed-reactive scanning arc
  - Hexagonal patterned background
- **Next Section Layer (`z-3`)**:
  - Contains `{next}` content
  - Revealed seamlessly as the moon emblem expands into a full-screen circular portal
- **Portal Glow Ring (`#portal-ring`, `z-4`)**: Glowing `#ff4a50` ring tracking the portal perimeter
- **Particles Canvas (`z-5`)**:
  - 26 drifting red petals (rotation, sway, scroll-velocity reactive)
  - Up to 70 embers spawning at the moon's perimeter with `lighter` composite blend mode
- **Scroll Cue & Progress Bar (`z-6` / `z-50`)**:
  - Vertical cue fading out by $p \approx 0.17$ with filling line
  - Top red progress bar scaling with $p \in [0, 1]$

---

## 🎛️ Tuning Knobs

All knobs can be customized via props on `<MoonPortalHero>` or directly in `useMoonPortal({ ... })`:

| Tuning Knob | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| **`wrapperHeightMultiplier`** | `number` | `3.2` | Scroll track height relative to viewport height (`3.2` = `320vh`). Increase for a slower, more deliberate transition; decrease for a quicker portal reveal. |
| **`lerpFactor`** | `number` | `0.1` | Smoothing factor for scroll position interpolation ($0.01$ to $1.0$). Lower values feel weightier/cinematic; higher values respond snappier. |
| **`smoothScroll`** | `boolean` | `true` | Enables or disables smooth scroll lerp. Can be toggled live via the in-component button. When `false`, uses raw `window.scrollY`. |
| **`petalCount`** | `number` | `26` | Number of drifting crimson petals falling in the canvas particle system. Petals accelerate with scroll velocity. |
| **`emberCount`** | `number` | `70` | Maximum simultaneous embers emitted from the moon's outer boundary. |
| **`ringGlowIntensity`** | `number` | `1.0` | Multiplier for the glowing red portal ring (`#portal-ring`) outer and inner `box-shadow` blur. |

---

## 📐 Scroll Math & Formulas

1. **Normalized Progress ($p$)**:
   $$p = \operatorname{clamp}\left(\frac{\text{smoothedScrollY} - \text{wrapperTop}}{\text{wrapperHeight} - \text{viewportHeight}}, 0, 1\right)$$

2. **Cubic Easing ($e$)**:
   $$e(p) = \begin{cases} 4p^3 & \text{if } p < 0.5 \\ 1 - \frac{(-2p + 2)^3}{2} & \text{if } p \ge 0.5 \end{cases}$$

3. **Portal Geometry**:
   - Moon center: $(c_x, c_y)$ relative to the sticky pin
   - Initial radius: $r_0 \approx 0.39 \times \text{moonWrapper.width}$
   - Max radius: $R = \max(d_{\text{TL}}, d_{\text{TR}}, d_{\text{BL}}, d_{\text{BR}}) + 30\text{px}$
   - Portal radius: $r = r_0 + (R - r_0) \times e(p)$
   - Scale factor: $s = r / r_0$

4. **Layer Transformations**:
   - **Next Section**:
     - `clipPath: circle(r px at cx px cy px)`
     - `opacity: clamp((p - 0.2) / 0.12, 0, 1)`
     - `transform: scale(1.12 - 0.12 * e)` (transform origin at moon center)
   - **Moon Emblem**:
     - `transform: scale(s)`
     - `opacity: clamp(1 - (p - 0.3) / 0.28, 0, 1)`
   - **Glow Ring**:
     - `transform: scale(s)`
     - `opacity: clamp(1 - (p - 0.55) / 0.4, 0, 1)` ($0$ when $p \le 0.02$)
   - **Headline Lines**:
     - Middle line (`"Negotiate."`): $x = +e \times 0.55 \times \text{vw}$, $y = -e \times 40\text{px}$
     - Outer lines: $x = -e \times 0.55 \times \text{vw}$, $y = -e \times 40\text{px}$
     - `opacity: clamp(1 - p * 2.6, 0, 1)`
   - **UI Elements (Eyebrow, Lead, CTAs)**:
     - `opacity: clamp(1 - p * 3, 0, 1)`
     - Lead moves down $p \times 70\text{px}$, CTAs down $p \times 90\text{px}$
   - **Info Items**:
     - `opacity: clamp(1 - p * 2.4, 0, 1)`
     - Item $i$ moves down $p \times (60 + i \times 30)\text{px}$

---

## 🚀 Usage Example

```tsx
import { MoonPortalHero } from '@/components/MoonPortalHero'
import { AboutConference } from '@/components/AboutConference'

export default function HomePage() {
  return (
    <main className="bg-[#0a0608]">
      <MoonPortalHero
        emblemSrc="/arkham-moon-emblem.jpg"
        next={<AboutConference />}
        wrapperHeightMultiplier={3.2}
        lerpFactor={0.1}
        petalCount={26}
        emberCount={70}
        ringGlowIntensity={1.0}
      />
    </main>
  )
}
```

---

## ♿ Accessibility & Responsiveness

- **`prefers-reduced-motion`**: Detects system settings, stops particle animations, and displays the static hero.
- **Responsive Breakpoint (< 820px)**:
  - Moon wrapper shrinks to `min(44vw, 200px)` and orders above the headline.
  - Scroll cue hides automatically.
  - Re-measures center coordinates $(c_x, c_y)$ dynamically on window resize and font load.
- **Zero Scroll Trapping**: Interactive elements and overlays maintain appropriate `pointer-events` rules to ensure native scroll accessibility and keyboard focus rings (`focus-visible:ring-2 focus-visible:ring-[#ff4a50]`).
