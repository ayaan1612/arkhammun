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
  X,
} from "lucide-react"
import { arkham } from "@/lib/arkham-data"
import { useAuth } from "@/lib/auth-context"
import { entryPassApi } from "@/lib/entry-pass-api"

export function ArkhamHeader() {
  const { user, token, logout, isAdmin } = useAuth()
  const [unreadCount, setUnreadCount] = useState(0)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const pathname = usePathname()
  const drawerRef = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Handle scroll detection for sticky glass header
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 12)
    }
    handleScroll()
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      const originalStyle = window.getComputedStyle(document.body).overflow
      document.body.style.overflow = "hidden"
      return () => {
        document.body.style.overflow = originalStyle
      }
    }
  }, [mobileMenuOpen])

  // Handle ESC key to close drawer
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

  const navLinks = [
    { label: "Home", href: "/" },
    { label: "Committees", href: "/committees" },
    { label: "About", href: "/about" },
    { label: "Schedule", href: "/schedule" },
    { label: "Policies", href: "/policies" },
    { label: "FAQ", href: "/faq" },
    { label: "Contact", href: "/contact" },
    { label: "Demo", href: "/demo" },
  ]

  const isActiveLink = (href: string) => {
    if (href === "/") return pathname === "/"
    return pathname.startsWith(href)
  }

  return (
    <header
      className={`arkham-master-header ${isScrolled ? "is-scrolled" : ""}`}
      role="banner"
    >
      <div className="arkham-master-header-bar container-x">
        {/* Brand Logo and Text */}
        <Link
          href="/"
          className="arkham-brand"
          aria-label="Arkham MUN Home"
          onClick={() => setMobileMenuOpen(false)}
        >
          <img
            src={arkham.logo}
            alt="Arkham MUN emblem"
            width={40}
            height={40}
            className="arkham-brand-emblem"
          />
          <span className="arkham-brand-text">
            <strong>ARKHAM</strong>
            <small>MUN</small>
          </span>
        </Link>

        {/* Desktop Primary Navigation */}
        <nav
          className="arkham-desktop-nav"
          aria-label="Primary navigation"
        >
          {navLinks.map((link) => {
            const active = isActiveLink(link.href)
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`arkham-nav-item ${active ? "is-active" : ""}`}
                aria-current={active ? "page" : undefined}
              >
                {link.label}
                {active && <span className="active-dot" aria-hidden="true" />}
              </Link>
            )
          })}
        </nav>

        {/* Desktop Actions Area */}
        <div className="arkham-desktop-actions">
          {user ? (
            <>
              <Link
                href="/dashboard"
                className={`arkham-nav-btn arkham-dashboard-link ${
                  pathname === "/dashboard" ? "is-active" : ""
                }`}
                title="Delegate Dashboard"
              >
                <User size={14} className="accent-red" />
                <span>Dashboard</span>
                {unreadCount > 0 && (
                  <span
                    className="arkham-unread-badge"
                    title={`${unreadCount} unread notification(s)`}
                  >
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Link>

              {isAdmin && (
                <Link
                  href="/admin"
                  className="arkham-nav-btn arkham-admin-link"
                  title="Admin Portal"
                >
                  <Shield size={13} />
                  <span>Admin</span>
                </Link>
              )}

              <button
                onClick={logout}
                title="Sign out of Arkham account"
                className="arkham-logout-btn"
                aria-label="Sign out"
              >
                <LogOut size={13} />
                <span>Logout</span>
              </button>
            </>
          ) : (
            <div className="arkham-auth-group">
              <Link href="/login" className="arkham-login-link">
                <LogIn size={13} />
                <span>Login</span>
              </Link>
              <Link href="/register" className="arkham-register-cta">
                <span>Register</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Header Controls */}
        <div className="arkham-mobile-controls">
          {/* Quick CTA on mobile */}
          {user ? (
            <Link
              href="/dashboard"
              className="arkham-mobile-quick-dash"
              aria-label="Go to Dashboard"
              title="Dashboard"
            >
              <User size={15} />
              {unreadCount > 0 && (
                <span className="arkham-mobile-badge">{unreadCount > 9 ? "9+" : unreadCount}</span>
              )}
            </Link>
          ) : (
            <Link href="/register" className="arkham-mobile-quick-reg">
              Register
            </Link>
          )}

          {/* Accessible Menu Toggle */}
          <button
            className={`arkham-hamburger-toggle ${mobileMenuOpen ? "is-open" : ""}`}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? "Close main navigation menu" : "Open main navigation menu"}
            aria-expanded={mobileMenuOpen}
            aria-controls="arkham-mobile-drawer"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer and Backdrop - rendered via React Portal so header backdrop filter and stacking context cannot cause bleed-through */}
      {mounted &&
        createPortal(
          <AnimatePresence>
            {mobileMenuOpen && (
              <>
                {/* Backdrop */}
                <motion.div
                  className="arkham-mobile-backdrop"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  onClick={() => setMobileMenuOpen(false)}
                  aria-hidden="true"
                />

                {/* Mobile Drawer Panel */}
                <motion.div
                  ref={drawerRef}
                  id="arkham-mobile-drawer"
                  className="arkham-mobile-drawer"
                  role="dialog"
                  aria-modal="true"
                  aria-label="Site navigation"
                  initial={{ x: "100%" }}
                  animate={{ x: 0 }}
                  exit={{ x: "100%" }}
                  transition={{ type: "spring", damping: 25, stiffness: 240 }}
                  style={{ backgroundColor: "#080812" }}
                >
              {/* Drawer Top Bar */}
              <div className="arkham-drawer-header">
                <Link
                  href="/"
                  className="arkham-brand"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <img
                    src={arkham.logo}
                    alt="Arkham MUN emblem"
                    width={34}
                    height={34}
                    className="arkham-brand-emblem"
                  />
                  <span className="arkham-brand-text">
                    <strong>ARKHAM</strong>
                    <small>MUN</small>
                  </span>
                </Link>
                <button
                  className="arkham-drawer-close"
                  onClick={() => setMobileMenuOpen(false)}
                  aria-label="Close navigation menu"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Drawer Navigation Links */}
              <nav className="arkham-drawer-nav" aria-label="Mobile main navigation">
                {navLinks.map((link, idx) => {
                  const active = isActiveLink(link.href)
                  return (
                    <motion.div
                      key={link.href}
                      initial={{ opacity: 0, x: 15 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.04 * idx, duration: 0.22 }}
                    >
                      <Link
                        href={link.href}
                        className={`arkham-drawer-link ${active ? "is-active" : ""}`}
                        aria-current={active ? "page" : undefined}
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <span>{link.label}</span>
                        <ChevronRight size={15} className="drawer-chevron" />
                      </Link>
                    </motion.div>
                  )
                })}
              </nav>

              {/* Drawer Account / CTA Block */}
              <div className="arkham-drawer-account">
                {user ? (
                  <div className="arkham-drawer-user-card">
                    <div className="user-info-row">
                      <div className="user-avatar-circle">
                        <User size={16} />
                      </div>
                      <div className="user-details">
                        <strong className="user-name">{user.name}</strong>
                        <small className="user-email">{user.email}</small>
                      </div>
                    </div>

                    <div className="user-actions-stack">
                      <Link
                        href="/dashboard"
                        className="drawer-action-btn primary"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <LayoutDashboard size={15} />
                        <span>Delegate Dashboard</span>
                        {unreadCount > 0 && (
                          <span className="user-badge">{unreadCount}</span>
                        )}
                      </Link>

                      {isAdmin && (
                        <Link
                          href="/admin"
                          className="drawer-action-btn admin"
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          <Shield size={15} />
                          <span>Admin Portal</span>
                        </Link>
                      )}

                      <button
                        onClick={() => {
                          setMobileMenuOpen(false)
                          logout()
                        }}
                        className="drawer-action-btn logout"
                      >
                        <LogOut size={15} />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="arkham-drawer-guest-card">
                    <Link
                      href="/register"
                      className="drawer-action-btn primary"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <span>Register for Arkham MUN</span>
                      <ArrowRight size={15} />
                    </Link>
                    <Link
                      href="/login"
                      className="drawer-action-btn secondary"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <LogIn size={15} />
                      <span>Delegate Login</span>
                    </Link>
                  </div>
                )}
              </div>

              {/* Drawer Footer Details */}
              <div className="arkham-drawer-footer">
                <div className="drawer-meta-line">
                  <MapPin size={13} />
                  <span>Central Delhi, India · 24—25 October</span>
                </div>
                <div className="drawer-meta-contacts">
                  <a href={`tel:${arkham.phone}`}>
                    <Phone size={12} />
                    <span>{arkham.phone}</span>
                  </a>
                  <a href={`mailto:${arkham.email}`}>
                    <Mail size={12} />
                    <span>{arkham.email}</span>
                  </a>
                  <a
                    href="https://instagram.com/arkhammun"
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Instagram size={12} />
                    <span>@arkhammun</span>
                  </a>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>,
      document.body
    )}
    </header>
  )
}

export function ArkhamFooter() {
  return (
    <footer className="arkham-footer container-x">
      <div>
        <Link href="/" className="arkham-brand">
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
