"use client"

import { useState, useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { AnimatePresence, motion } from "motion/react"
import {
  ArrowRight,
  ChevronRight,
  Instagram,
  LayoutDashboard,
  LogIn,
  LogOut,
  Mail,
  MapPin,
  Menu,
  Phone,
  Shield,
  User,
  UserPlus,
  X,
} from "lucide-react"
import { arkham } from "@/lib/arkham-data"
import { useAuth } from "@/lib/auth-context"
import { entryPassApi } from "@/lib/entry-pass-api"
import { useTransitionNav } from "@/components/PageTransition"

function triggerRipple(e: React.PointerEvent<HTMLElement>) {
  const el = e.currentTarget
  const rect = el.getBoundingClientRect()
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top
  const ripple = document.createElement("span")
  ripple.className = "arkham-btn-ripple"
  ripple.style.left = `${x}px`
  ripple.style.top = `${y}px`
  el.appendChild(ripple)
  window.setTimeout(() => {
    if (ripple.parentNode) ripple.parentNode.removeChild(ripple)
  }, 600)
}

export function ArkhamHeader() {
  const { user, token, logout, isAdmin } = useAuth()
  const { activeTransition, isTransitioning, triggerTransition, prefetch } = useTransitionNav()
  const isDashboardLoading = activeTransition === "dashboard"
  const isLoginLoading = activeTransition === "login"
  const isLogoutLoading = activeTransition === "logout"
  const isRegisterLoading = activeTransition === "register"
  const [unreadCount, setUnreadCount] = useState(0)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)

  // Track active link for scroll spy & page navigation
  const [activeHref, setActiveHref] = useState<string>(pathname)
  const [hoveredHref, setHoveredHref] = useState<string | null>(null)
  const [indicatorStyle, setIndicatorStyle] = useState<{
    left: number
    width: number
    opacity: number
  }>({ left: 0, width: 0, opacity: 0 })

  const navRef = useRef<HTMLElement>(null)
  const linkRefs = useRef<Map<string, HTMLAnchorElement>>(new Map())

  const navLinks = [
    { label: "Home", href: "/" },
    { label: "Committees", href: "/committees" },
    { label: "About", href: "/about" },
    { label: "Schedule", href: "/schedule" },
    { label: "Policies", href: "/policies" },
    { label: "FAQ", href: "/faq" },
    { label: "Contact", href: "/contact" },
  ]

  useEffect(() => {
    setMounted(true)
  }, [])

  // 6. Scroll behavior: after 20px of scroll, the bar height goes from 74px to 58px,
  // the logo scales to .84, the background becomes more opaque (.88), and a soft shadow appears.
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }
    handleScroll()
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  // Sync activeHref with pathname
  useEffect(() => {
    setActiveHref(pathname)
  }, [pathname])

  // 3. Highlight the active link by scroll position (IntersectionObserver or scroll spy) on "/"
  useEffect(() => {
    if (pathname !== "/") return

    const sections = [
      { id: "top", href: "/" },
      { id: "about", href: "/about" },
      { id: "committees", href: "/committees" },
      { id: "schedule", href: "/schedule" },
      { id: "contact", href: "/contact" },
    ]

    const handleScrollSpy = () => {
      const scrollPos = window.scrollY + 180
      for (let i = sections.length - 1; i >= 0; i--) {
        const el = document.getElementById(sections[i].id)
        if (el) {
          const top = el.offsetTop
          if (scrollPos >= top) {
            setActiveHref(sections[i].href)
            break
          }
        }
      }
    }

    handleScrollSpy()
    window.addEventListener("scroll", handleScrollSpy, { passive: true })
    return () => window.removeEventListener("scroll", handleScrollSpy)
  }, [pathname])

  // 2. Gliding hover indicator calculation
  const targetHref = hoveredHref || activeHref

  const updateIndicator = () => {
    const target = linkRefs.current.get(targetHref)
    if (target && navRef.current) {
      const navRect = navRef.current.getBoundingClientRect()
      const targetRect = target.getBoundingClientRect()
      setIndicatorStyle({
        left: targetRect.left - navRect.left,
        width: targetRect.width,
        opacity: 1,
      })
    } else {
      setIndicatorStyle((prev) => ({ ...prev, opacity: 0 }))
    }
  }

  useEffect(() => {
    updateIndicator()
  }, [targetHref, activeHref, mounted])

  useEffect(() => {
    const onResize = () => updateIndicator()
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [targetHref])

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      const originalBodyOverflow = window.getComputedStyle(document.body).overflow
      const originalHtmlOverflow = window.getComputedStyle(document.documentElement).overflow
      document.body.style.overflow = "hidden"
      document.documentElement.style.overflow = "hidden"
      return () => {
        document.body.style.overflow = originalBodyOverflow
        document.documentElement.style.overflow = originalHtmlOverflow
      }
    }
  }, [mobileMenuOpen])

  // Handle ESC key to close mobile menu
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && mobileMenuOpen) {
        setMobileMenuOpen(false)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [mobileMenuOpen])

  // Fetch unread notification badge count when user is logged in
  useEffect(() => {
    let isMounted = true
    async function fetchUnread() {
      if (!token) {
        setUnreadCount(0)
        return
      }
      try {
        const { unreadCount: count } = await entryPassApi.getMyNotifications(token)
        if (isMounted) setUnreadCount(count)
      } catch {
        // Silently handle
      }
    }

    fetchUnread()
    const interval = setInterval(fetchUnread, 30000)
    return () => {
      isMounted = false
      clearInterval(interval)
    }
  }, [token, pathname])

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [pathname])

  const handleLinkClick = (e: React.MouseEvent, href: string) => {
    if (pathname === "/") {
      const id = href === "/" ? "top" : href.replace("/", "")
      const el = document.getElementById(id)
      if (el) {
        e.preventDefault()
        setActiveHref(href)
        el.scrollIntoView({ behavior: "smooth" })
        return
      }
    }
    setActiveHref(href)
  }

  return (
    <header
      className={`arkham-master-header ${isScrolled ? "is-scrolled" : ""}`}
      role="banner"
    >
      <div className="arkham-master-header-bar container-x">
        {/* Left: Round Arkham MUN logo with "ARKHAM" and "MUN" beneath it */}
        <Link
          href="/"
          className="arkham-brand nav-anim-item"
          style={{ "--stagger-i": 0 } as React.CSSProperties}
          aria-label="Arkham MUN Home"
          onClick={(e) => {
            setMobileMenuOpen(false)
            if (pathname === "/") {
              e.preventDefault()
              const topEl = document.getElementById("top")
              if (topEl) topEl.scrollIntoView({ behavior: "smooth" })
              else window.scrollTo({ top: 0, behavior: "smooth" })
            }
          }}
        >
          <div className="arkham-brand-logo-wrapper">
            <img
              src={arkham.logo}
              alt="Arkham MUN emblem"
              width={40}
              height={40}
              className="arkham-brand-logo-img"
            />
          </div>
          <div className="arkham-brand-text">
            <strong className="arkham-brand-title">ARKHAM</strong>
            <small className="arkham-brand-sub">MUN</small>
          </div>
        </Link>

        {/* Center: Home, Committees, About, Schedule, Policies, FAQ, Contact */}
        <nav
          ref={navRef}
          className="arkham-desktop-nav"
          aria-label="Primary navigation"
          onMouseLeave={() => setHoveredHref(null)}
        >
          {/* Gliding hover indicator */}
          <div
            className="nav-gliding-pill"
            aria-hidden="true"
            style={{
              transform: `translate3d(${indicatorStyle.left}px, -50%, 0)`,
              width: `${indicatorStyle.width}px`,
              opacity: indicatorStyle.opacity,
            }}
          />

          {navLinks.map((link, idx) => {
            const isActive = activeHref === link.href
            return (
              <Link
                key={link.href}
                ref={(el) => {
                  if (el) linkRefs.current.set(link.href, el)
                  else linkRefs.current.delete(link.href)
                }}
                href={link.href}
                onClick={(e) => handleLinkClick(e, link.href)}
                onMouseEnter={() => setHoveredHref(link.href)}
                onFocus={() => setHoveredHref(link.href)}
                className={`arkham-nav-link nav-anim-item ${isActive ? "is-active" : ""}`}
                style={{ "--stagger-i": idx + 1 } as React.CSSProperties}
                aria-current={isActive ? "page" : undefined}
              >
                <span className="relative z-10 flex items-center gap-1.5">
                  {link.label}
                  {isActive && <span className="nav-active-dot" aria-hidden="true" />}
                </span>
              </Link>
            )
          })}
        </nav>

        {/* Right: When logged in -> Dashboard + Logout. When NOT logged in -> Login + Register */}
        <div className="arkham-desktop-actions">
          {user ? (
            /* Logged in: Dashboard */
            <Link
              href="/dashboard"
              className={`arkham-nav-btn dashboard-btn nav-anim-item arkham-interactive-btn ${isDashboardLoading ? "is-loading pointer-events-none cursor-default opacity-90" : ""}`}
              style={{ "--stagger-i": 8 } as React.CSSProperties}
              title="Delegate Dashboard"
              onClick={(e) => {
                e.preventDefault()
                triggerTransition('dashboard', {
                  originRect: e.currentTarget.getBoundingClientRect(),
                  targetUrl: '/dashboard'
                })
              }}
              onPointerDown={triggerRipple}
              onMouseEnter={() => prefetch('/dashboard')}
              onFocus={() => prefetch('/dashboard')}
            >
              {isDashboardLoading ? (
                <>
                  <span className="inline-block w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  <span>Opening…</span>
                </>
              ) : (
                <>
                  <User size={14} className="text-[#e5252d] btn-icon" />
                  <span>Dashboard</span>
                  <span className="arkham-badge-pulse" title="Notifications">
                    {unreadCount > 0 ? (unreadCount > 9 ? "9+" : unreadCount) : "1"}
                  </span>
                </>
              )}
              <span className="arkham-btn-sheen" aria-hidden="true" />
            </Link>
          ) : (
            /* Not logged in: Login */
            <Link
              href="/login"
              className={`arkham-nav-btn dashboard-btn nav-anim-item arkham-interactive-btn ${isLoginLoading ? "is-loading pointer-events-none cursor-default opacity-90" : ""}`}
              style={{ "--stagger-i": 8 } as React.CSSProperties}
              title="Sign in to your account"
              onClick={(e) => {
                e.preventDefault()
                triggerTransition('login', {
                  originRect: e.currentTarget.getBoundingClientRect(),
                  targetUrl: '/login'
                })
              }}
              onPointerDown={triggerRipple}
              onMouseEnter={() => prefetch('/login')}
              onFocus={() => prefetch('/login')}
            >
              {isLoginLoading ? (
                <>
                  <span className="inline-block w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  <span>Opening…</span>
                </>
              ) : (
                <>
                  <LogIn size={14} className="text-[#e5252d] btn-icon" />
                  <span>Login</span>
                </>
              )}
              <span className="arkham-btn-sheen" aria-hidden="true" />
            </Link>
          )}

          {isAdmin && (
            <Link
              href="/admin"
              className="arkham-nav-btn admin-btn nav-anim-item"
              style={{ "--stagger-i": 9 } as React.CSSProperties}
              title="Admin Portal"
            >
              <Shield size={13} />
              <span>Admin</span>
            </Link>
          )}

          {/* Register button: ALWAYS stays as Register on the home page / navbar */}
          <Link
            href="/register"
            onClick={(e) => {
              e.preventDefault()
              const rect = e.currentTarget.getBoundingClientRect()
              triggerTransition('register', {
                originRect: rect,
                targetUrl: '/register'
              })
            }}
            onPointerDown={triggerRipple}
            onMouseEnter={() => prefetch('/register')}
            onFocus={() => prefetch('/register')}
            title="Register for Arkham MUN"
            className={`arkham-logout-btn nav-anim-item arkham-interactive-btn ${isRegisterLoading ? "is-loading pointer-events-none cursor-default opacity-90" : ""}`}
            style={{ "--stagger-i": isAdmin ? 10 : 9 } as React.CSSProperties}
            aria-label="Register"
            aria-disabled={isRegisterLoading || isTransitioning}
            data-transition="register"
          >
            {isRegisterLoading ? (
              <>
                <span className="inline-block w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                <span>Opening…</span>
              </>
            ) : (
              <>
                <UserPlus size={13} className="btn-icon" />
                <span>Register</span>
              </>
            )}
            <span className="arkham-btn-sheen" aria-hidden="true" />
          </Link>

          
        </div>

        {/* Mobile Hamburger Button */}
        <button
          className={`arkham-hamburger-btn ${mobileMenuOpen ? "is-open" : ""}`}
          onClick={() => setMobileMenuOpen((prev) => !prev)}
          aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={mobileMenuOpen}
          aria-controls="arkham-mobile-panel"
        >
          <span className="hamburger-bar top-bar" />
          <span className="hamburger-bar mid-bar" />
          <span className="hamburger-bar bot-bar" />
        </button>
      </div>

      {/* Sweeping Highlight Line */}
      <div className="nav-sweep-line" aria-hidden="true">
        <div className="nav-sweep-glow" />
      </div>

      {/* Mobile Panel: rendered via createPortal so it is outside header backdrop-filter and cannot be overlapped */}
      {mounted &&
        createPortal(
          <div
            id="arkham-mobile-panel"
            className={`arkham-mobile-panel ${mobileMenuOpen ? "is-open" : ""}`}
            style={{
              top: isScrolled ? "58px" : "74px",
            }}
            role="region"
            aria-label="Mobile navigation panel"
          >
            <div className="mobile-panel-inner container-x">
              <nav className="mobile-panel-nav" aria-label="Mobile main navigation">
                {navLinks.map((link, idx) => {
                  const isActive = activeHref === link.href
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={(e) => {
                        handleLinkClick(e, link.href)
                        setMobileMenuOpen(false)
                      }}
                      className={`mobile-nav-link ${isActive ? "is-active" : ""}`}
                      style={{ "--item-idx": idx } as React.CSSProperties}
                      aria-current={isActive ? "page" : undefined}
                    >
                      <span>{link.label}</span>
                      {isActive && <span className="nav-active-dot" aria-hidden="true" />}
                    </Link>
                  )
                })}
              </nav>

              {/* When logged in: Dashboard + Logout. When NOT logged in: Login + Register */}
              <div
                className="mobile-panel-actions"
                style={{ "--item-idx": navLinks.length } as React.CSSProperties}
              >
                {user ? (
                  <Link
                    href="/dashboard"
                    className={`arkham-nav-btn dashboard-btn mobile-action-btn arkham-interactive-btn ${isDashboardLoading ? "is-loading pointer-events-none cursor-default opacity-90" : ""}`}
                    onClick={(e) => {
                      e.preventDefault()
                      setMobileMenuOpen(false)
                      triggerTransition('dashboard', {
                        originRect: e.currentTarget.getBoundingClientRect(),
                        targetUrl: '/dashboard'
                      })
                    }}
                    onPointerDown={triggerRipple}
                    onMouseEnter={() => prefetch('/dashboard')}
                    onFocus={() => prefetch('/dashboard')}
                  >
                    {isDashboardLoading ? (
                      <span className="flex items-center gap-2">
                        <span className="inline-block w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                        <span>Opening…</span>
                      </span>
                    ) : (
                      <>
                        <span className="flex items-center gap-2">
                          <User size={15} className="text-[#e5252d] btn-icon" />
                          <span>Dashboard</span>
                        </span>
                        <span className="arkham-badge-pulse">
                          {unreadCount > 0 ? (unreadCount > 9 ? "9+" : unreadCount) : "1"}
                        </span>
                      </>
                    )}
                    <span className="arkham-btn-sheen" aria-hidden="true" />
                  </Link>
                ) : (
                  <Link
                    href="/login"
                    className={`arkham-nav-btn dashboard-btn mobile-action-btn arkham-interactive-btn ${isLoginLoading ? "is-loading pointer-events-none cursor-default opacity-90" : ""}`}
                    onClick={(e) => {
                      e.preventDefault()
                      setMobileMenuOpen(false)
                      triggerTransition('login', {
                        originRect: e.currentTarget.getBoundingClientRect(),
                        targetUrl: '/login'
                      })
                    }}
                    onPointerDown={triggerRipple}
                    onMouseEnter={() => prefetch('/login')}
                    onFocus={() => prefetch('/login')}
                  >
                    {isLoginLoading ? (
                      <span className="flex items-center gap-2">
                        <span className="inline-block w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                        <span>Opening…</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <LogIn size={15} className="text-[#e5252d] btn-icon" />
                        <span>Login</span>
                      </span>
                    )}
                    <span className="arkham-btn-sheen" aria-hidden="true" />
                  </Link>
                )}

                {/* Register button: ALWAYS stays as Register on the home page / mobile drawer */}
                <Link
                  href="/register"
                  onClick={(e) => {
                    e.preventDefault()
                    setMobileMenuOpen(false)
                    const rect = e.currentTarget.getBoundingClientRect()
                    triggerTransition('register', {
                      originRect: rect,
                      targetUrl: '/register'
                    })
                  }}
                  onPointerDown={triggerRipple}
                  onMouseEnter={() => prefetch('/register')}
                  onFocus={() => prefetch('/register')}
                  className={`arkham-logout-btn mobile-action-btn arkham-interactive-btn ${isRegisterLoading ? "is-loading pointer-events-none cursor-default opacity-90" : ""}`}
                  aria-disabled={isRegisterLoading || isTransitioning}
                  data-transition="register"
                >
                  {isRegisterLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="inline-block w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      <span>Opening…</span>
                    </span>
                  ) : (
                    <>
                      <UserPlus size={15} className="btn-icon" />
                      <span>Register</span>
                    </>
                  )}
                  <span className="arkham-btn-sheen" aria-hidden="true" />
                </Link>

                
              </div>
            </div>
          </div>,
          document.body
        )}
    </header>
  )
}

export function ArkhamFooter() {
  return (
    <footer className="arkham-footer container-x">
      <div>
        <Link
          href="/"
          className="arkham-brand"
          onClick={(e) => {
            if (typeof window !== "undefined" && window.location.pathname === "/") {
              e.preventDefault()
              const topEl = document.getElementById("top")
              if (topEl) topEl.scrollIntoView({ behavior: "smooth" })
              else window.scrollTo({ top: 0, behavior: "smooth" })
            }
          }}
        >
          <img
            src={arkham.logo}
            alt="Arkham MUN emblem"
            width={44}
            height={44}
            className="arkham-brand-emblem"
          />
          <span className="arkham-brand-text">
            <strong>ARKHAM MUN</strong>
            <small>SEE YOU AT THE DAIS.</small>
          </span>
        </Link>
        <p>Diplomacy, debate and ideas that move nations.</p>
      </div>
      <div className="footer-links">
        <div>
          <span>EXPLORE</span>
          <Link href="/about">About Arkham</Link>
          <Link href="/committees">Committees</Link>
          <Link href="/schedule">Schedule</Link>
          <Link href="/policies">Policies</Link>
          <Link href="/faq">FAQs</Link>
          <Link href="/dashboard">Delegate Dashboard</Link>
          <Link href="/admin">Admin Portal</Link>
        </div>
        <div>
          <span>GET IN TOUCH</span>
          <a href={`mailto:${arkham.email}`}>
            <Mail size={14} />
            {arkham.email}
          </a>
          <a href={`tel:${arkham.phone}`}>
            <Phone size={14} />
            {arkham.phone}
          </a>
          <a href="https://instagram.com/arkhammun" target="_blank" rel="noreferrer">
            <Instagram size={14} />
            {arkham.instagram}
          </a>
        </div>
        <div>
          <span>THE CONFERENCE</span>
          <p>
            <MapPin size={14} />
            {arkham.location}
          </p>
          <p>{arkham.dates}</p>
        </div>
      </div>
      <small className="footer-copyright">
        © Arkham Model United Nations. Conference details should be confirmed by the secretariat.
      </small>
    </footer>
  )
}

export function ArkhamShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="arkham-page">
      <ArkhamHeader />
      {children}
      <ArkhamFooter />
    </div>
  )
}

export function PageIntro({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string
  title: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="page-intro container-x">
      <span className="section-kicker">{eyebrow}</span>
      <h1>{title}</h1>
      <p>{children}</p>
    </section>
  )
}
