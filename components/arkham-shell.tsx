"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ArrowRight, Bell, Instagram, LogIn, LogOut, Mail, MapPin, Menu, Phone, Shield, User, X } from "lucide-react"
import { arkham } from "@/lib/arkham-data"
import { useAuth } from "@/lib/auth-context"
import { entryPassApi } from "@/lib/entry-pass-api"

export function ArkhamHeader() {
  const { user, token, logout, isAdmin } = useAuth()
  const [unreadCount, setUnreadCount] = useState(0)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const pathname = usePathname()

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

  return (
    <header className="arkham-header" style={{ position: "relative" }}>
      <Link href="/" className="arkham-brand">
        <img src={arkham.logo} alt="Arkham MUN emblem" />
        <span>
          <strong>ARKHAM</strong>
          <small>MUN</small>
        </span>
      </Link>

      {/* Desktop Navigation */}
      <nav aria-label="Primary navigation" style={{ display: "flex", alignItems: "center", gap: "20px" }}>
        <Link href="/">Home</Link>
        <Link href="/committees">Committees</Link>
        <Link href="/about">About</Link>
        <Link href="/schedule">Schedule</Link>
        <Link href="/faq">FAQ</Link>
        <Link href="/contact">Contact</Link>

        {user ? (
          <>
            <Link
              href="/dashboard"
              style={{
                position: "relative",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                color: pathname === "/dashboard" ? "#fff" : "#aaa8ba",
                fontWeight: 600,
              }}
            >
              <User size={13} style={{ color: "#e3262e" }} />
              Dashboard
              {unreadCount > 0 && (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    minWidth: "18px",
                    height: "18px",
                    padding: "0 4px",
                    borderRadius: "999px",
                    backgroundColor: "#e3262e",
                    color: "#fff",
                    fontSize: "10px",
                    fontWeight: 700,
                    lineHeight: 1,
                  }}
                  title={`${unreadCount} unread notification(s)`}
                >
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Link>

            {isAdmin && (
              <Link
                href="/admin"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  color: "#ff424b",
                  fontWeight: 600,
                }}
              >
                <Shield size={12} />
                Admin
              </Link>
            )}

            <button
              onClick={logout}
              title="Sign out of Arkham account"
              style={{
                background: "transparent",
                border: "1px solid rgba(255,255,255,0.18)",
                borderRadius: "4px",
                color: "#aaa8ba",
                padding: "6px 12px",
                fontSize: "11px",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#e3262e"
                e.currentTarget.style.color = "#fff"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.18)"
                e.currentTarget.style.color = "#aaa8ba"
              }}
            >
              <LogOut size={12} />
              Logout
            </button>
          </>
        ) : (
          <div style={{ display: "inline-flex", alignItems: "center", gap: "10px" }}>
            <Link href="/login" className="arkham-nav-cta">
              <LogIn size={13} /> Login
            </Link>
            <Link href="/register" className="arkham-nav-cta">
              Register <ArrowRight size={14} />
            </Link>
          </div>
        )}
      </nav>

      {/* Mobile Menu Toggle Button */}
      <button
        className="arkham-mobile-menu"
        aria-label={mobileMenuOpen ? "Close navigation" : "Open navigation"}
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        style={{
          display: "none",
          background: "none",
          border: 0,
          color: "#fff",
          cursor: "pointer",
          padding: "8px",
        }}
      >
        {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
      </button>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            zIndex: 100,
            backgroundColor: "#0a0a14",
            border: "1px solid rgba(255,255,255,0.16)",
            borderRadius: "0 0 8px 8px",
            padding: "20px 24px",
            display: "flex",
            flexDirection: "column",
            gap: "14px",
            boxShadow: "0 20px 40px rgba(0,0,0,0.8)",
          }}
        >
          <Link href="/" style={{ color: "#aaa8ba", textDecoration: "none", fontSize: "14px" }}>
            Home
          </Link>
          <Link href="/committees" style={{ color: "#aaa8ba", textDecoration: "none", fontSize: "14px" }}>
            Committees
          </Link>
          <Link href="/about" style={{ color: "#aaa8ba", textDecoration: "none", fontSize: "14px" }}>
            About
          </Link>
          <Link href="/schedule" style={{ color: "#aaa8ba", textDecoration: "none", fontSize: "14px" }}>
            Schedule
          </Link>
          <Link href="/faq" style={{ color: "#aaa8ba", textDecoration: "none", fontSize: "14px" }}>
            FAQ
          </Link>
          <Link href="/contact" style={{ color: "#aaa8ba", textDecoration: "none", fontSize: "14px" }}>
            Contact
          </Link>

          {user ? (
            <>
              <Link
                href="/dashboard"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  color: "#fff",
                  fontWeight: 600,
                  textDecoration: "none",
                  fontSize: "14px",
                }}
              >
                <span style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
                  <User size={14} style={{ color: "#e3262e" }} />
                  My Dashboard ({user.name})
                </span>
                {unreadCount > 0 && (
                  <span
                    style={{
                      backgroundColor: "#e3262e",
                      color: "#fff",
                      fontSize: "11px",
                      padding: "2px 8px",
                      borderRadius: "999px",
                    }}
                  >
                    {unreadCount} unread
                  </span>
                )}
              </Link>

              {isAdmin && (
                <Link
                  href="/admin"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    color: "#ff424b",
                    textDecoration: "none",
                    fontSize: "14px",
                  }}
                >
                  <Shield size={14} />
                  Admin Portal
                </Link>
              )}

              <button
                onClick={logout}
                style={{
                  marginTop: "6px",
                  background: "transparent",
                  border: "1px solid rgba(227,38,46,0.4)",
                  borderRadius: "4px",
                  color: "#ff424b",
                  padding: "10px",
                  fontSize: "13px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                }}
              >
                <LogOut size={14} />
                Logout ({user.email})
              </button>
            </>
          ) : (
            <div style={{ display: "grid", gap: "10px", marginTop: "8px" }}>
              <Link
                href="/login"
                style={{
                  textAlign: "center",
                  padding: "10px",
                  border: "1px solid rgba(255,255,255,0.2)",
                  borderRadius: "4px",
                  color: "#fff",
                  textDecoration: "none",
                  fontSize: "13px",
                }}
              >
                Login
              </Link>
              <Link href="/register" className="arkham-nav-cta" style={{ textAlign: "center" }}>
                Register <ArrowRight size={14} />
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  )
}

export function ArkhamFooter() {
  return (
    <footer className="arkham-footer">
      <div>
        <Link href="/" className="arkham-brand">
          <img src={arkham.logo} alt="Arkham MUN emblem" />
          <span>
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
    <section className="page-intro">
      <span className="section-kicker">{eyebrow}</span>
      <h1>{title}</h1>
      <p>{children}</p>
    </section>
  )
}
