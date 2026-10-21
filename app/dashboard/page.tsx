"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowRight,
  Bell,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Eye,
  FileText,
  LoaderCircle,
  LogOut,
  MapPin,
  QrCode,
  RefreshCw,
  Shield,
  ShieldAlert,
  Sparkles,
  Ticket,
  User,
  X,
} from "lucide-react"
import { ArkhamShell, PageIntro } from "@/components/arkham-shell"
import { useAuth } from "@/lib/auth-context"
import {
  DbEvent,
  EntryQrResponse,
  RegistrationStatus,
  UserNotification,
  UserRegistration,
  entryPassApi,
} from "@/lib/entry-pass-api"

export default function DashboardPage() {
  const router = useRouter()
  const { user, token, logout, isLoading: authLoading, isAdmin } = useAuth()

  const [events, setEvents] = useState<DbEvent[]>([])
  const [registrations, setRegistrations] = useState<UserRegistration[]>([])
  const [notifications, setNotifications] = useState<UserNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState("")

  // Pass modal
  const [selectedPass, setSelectedPass] = useState<EntryQrResponse | null>(null)
  const [passLoading, setPassLoading] = useState(false)
  const [passError, setPassError] = useState("")

  // Route protection
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login?redirect=/dashboard")
    }
  }, [user, authLoading, router])

  // Fetch all dashboard data from backend
  async function loadDashboardData() {
    if (!token) return
    setError("")
    try {
      const [eventsRes, regsRes, notifsRes] = await Promise.all([
        entryPassApi.getEvents().catch(() => ({ events: [] })),
        entryPassApi.getMyRegistrations(token).catch(() => ({ registrations: [] })),
        entryPassApi.getMyNotifications(token).catch(() => ({ notifications: [], unreadCount: 0 })),
      ])

      setEvents(eventsRes.events || [])
      setRegistrations(regsRes.registrations || [])
      setNotifications(notifsRes.notifications || [])
      setUnreadCount(notifsRes.unreadCount || 0)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load dashboard data."
      setError(msg)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    if (token) {
      loadDashboardData()
    }
  }, [token])

  async function handleMarkAsRead(notificationId: string) {
    if (!token) return
    try {
      await entryPassApi.markNotificationAsRead(notificationId, token)
      setNotifications((prev) =>
        prev.map((n) => (n._id === notificationId ? { ...n, read: true } : n))
      )
      setUnreadCount((c) => Math.max(0, c - 1))
    } catch (err) {
      console.error("Mark read error:", err)
    }
  }

  async function handleViewPass(registrationId: string) {
    setPassLoading(true)
    setPassError("")
    try {
      const passData = await entryPassApi.getEntryQr(registrationId)
      setSelectedPass(passData)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Could not load pass QR code."
      setPassError(msg)
    } finally {
      setPassLoading(false)
    }
  }

  // Check if user is registered for an event
  function getRegistrationForEvent(eventId: string) {
    return registrations.find((r) => {
      const regEventId = typeof r.eventId === "string" ? r.eventId : r.eventId?._id
      return regEventId === eventId
    })
  }

  if (authLoading || (loading && !events.length && !registrations.length)) {
    return (
      <ArkhamShell>
        <div style={{ minHeight: "70vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ textAlign: "center", color: "#aaa8ba" }}>
            <LoaderCircle size={32} className="animate-spin" style={{ color: "#e3262e", margin: "0 auto 16px" }} />
            <p style={{ letterSpacing: "0.1em", fontSize: "14px" }}>INITIALIZING DELEGATE DAIS...</p>
          </div>
        </div>
      </ArkhamShell>
    )
  }

  return (
    <ArkhamShell>
      <PageIntro
        eyebrow="DELEGATE HEADQUARTERS"
        title={
          <>
            Welcome, <em>{user?.name || "Delegate"}</em>
          </>
        }
      >
        Manage your committee delegations, view real-time payment reviews, access your venue entry QR code, and receive
        official secretariat notices.
      </PageIntro>

      <div className="page-section" style={{ paddingTop: "30px" }}>
        {/* Top Header / Profile Bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "16px",
            padding: "20px 24px",
            background: "rgba(16, 14, 24, 0.75)",
            border: "1px solid rgba(255, 255, 255, 0.16)",
            borderRadius: "8px",
            marginBottom: "36px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                background: "linear-gradient(135deg, #e3262e, #1a080c)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "1px solid rgba(227, 38, 46, 0.6)",
                color: "#fff",
                fontWeight: 700,
                fontSize: "18px",
              }}
            >
              {user?.name ? user.name.charAt(0).toUpperCase() : "D"}
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <strong style={{ color: "#fff", fontSize: "16px" }}>{user?.name}</strong>
                <span
                  style={{
                    backgroundColor: isAdmin ? "#e3262e" : "rgba(255, 255, 255, 0.12)",
                    color: "#fff",
                    fontSize: "10px",
                    fontWeight: 700,
                    letterSpacing: "0.1em",
                    padding: "2px 8px",
                    borderRadius: "4px",
                    textTransform: "uppercase",
                  }}
                >
                  {isAdmin ? "Secretariat Administrator" : "Verified Delegate"}
                </span>
              </div>
              <small style={{ color: "#8d8a9e", fontSize: "12px" }}>{user?.email}</small>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button
              onClick={() => {
                setRefreshing(true)
                loadDashboardData()
              }}
              disabled={refreshing}
              title="Refresh dashboard data"
              style={{
                background: "transparent",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                borderRadius: "4px",
                color: "#fff",
                padding: "8px 14px",
                fontSize: "12px",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
              {refreshing ? "Syncing..." : "Sync Cloud"}
            </button>

            {isAdmin && (
              <Link
                href="/admin"
                className="primary-button"
                style={{
                  padding: "8px 14px",
                  fontSize: "12px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <Shield size={13} /> Admin Portal
              </Link>
            )}

            <button
              onClick={logout}
              style={{
                background: "transparent",
                border: "1px solid rgba(227, 38, 46, 0.4)",
                borderRadius: "4px",
                color: "#ff424b",
                padding: "8px 14px",
                fontSize: "12px",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <LogOut size={13} /> Logout
            </button>
          </div>
        </div>

        {error && (
          <div
            style={{
              padding: "16px 20px",
              backgroundColor: "rgba(227, 38, 46, 0.12)",
              border: "1px solid rgba(227, 38, 46, 0.5)",
              borderRadius: "6px",
              color: "#ff8288",
              fontSize: "14px",
              marginBottom: "30px",
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <ShieldAlert size={18} style={{ color: "#e3262e" }} />
            <div>{error}</div>
          </div>
        )}

        {/* 2-Column Grid: Left: Registrations & Events | Right: Notifications */}
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: "30px" }} className="contact-grid">
          {/* LEFT COLUMN: Registered Events & Browse */}
          <div style={{ display: "flex", flexDirection: "column", gap: "30px" }}>
            {/* My Registrations Section */}
            <div
              style={{
                background: "rgba(12, 12, 12, 0.94)",
                border: "1px solid rgba(255, 255, 255, 0.16)",
                borderRadius: "8px",
                padding: "26px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "20px",
                  paddingBottom: "14px",
                  borderBottom: "1px solid rgba(255, 255, 255, 0.12)",
                }}
              >
                <div>
                  <span className="section-kicker">PERSISTENT ADMISSION</span>
                  <h2 style={{ fontSize: "22px", margin: "4px 0 0", fontWeight: 500 }}>
                    My Registered <em>Conferences</em>
                  </h2>
                </div>
                <span
                  style={{
                    backgroundColor: "rgba(227, 38, 46, 0.16)",
                    color: "#ff424b",
                    padding: "4px 10px",
                    borderRadius: "4px",
                    fontSize: "12px",
                    fontWeight: 700,
                  }}
                >
                  {registrations.length} Conference{registrations.length === 1 ? "" : "s"}
                </span>
              </div>

              {registrations.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 20px", color: "#8d8a9e" }}>
                  <Ticket size={36} style={{ color: "#3d3758", margin: "0 auto 12px" }} />
                  <p style={{ color: "#fff", fontSize: "15px", marginBottom: "6px" }}>No Active Registrations Found</p>
                  <p style={{ fontSize: "13px", maxWidth: "360px", margin: "0 auto 20px" }}>
                    You have not registered for any conferences yet. Explore the available dockets below and secure your
                    seat at the dais.
                  </p>
                  <Link href="/register" className="primary-button" style={{ display: "inline-flex", gap: "8px" }}>
                    Register for Arkham MUN <ArrowRight size={14} />
                  </Link>
                </div>
              ) : (
                <div style={{ display: "grid", gap: "16px" }}>
                  {registrations.map((reg) => {
                    const eventTitle =
                      typeof reg.eventId === "object" && reg.eventId?.title
                        ? reg.eventId.title
                        : "Arkham Model United Nations"
                    const eventDate =
                      typeof reg.eventId === "object" && reg.eventId?.date ? reg.eventId.date : "24–25 October 2026"
                    const eventVenue =
                      typeof reg.eventId === "object" && reg.eventId?.venue
                        ? reg.eventId.venue
                        : "Arkham Assembly Hall & International Dais, New Delhi"

                    return (
                      <div
                        key={reg._id}
                        style={{
                          padding: "20px",
                          backgroundColor: "#07070b",
                          border: "1px solid rgba(255, 255, 255, 0.12)",
                          borderRadius: "6px",
                          display: "flex",
                          flexDirection: "column",
                          gap: "14px",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "flex-start",
                            justifyContent: "space-between",
                            flexWrap: "wrap",
                            gap: "10px",
                          }}
                        >
                          <div>
                            <h3 style={{ margin: "0 0 6px", fontSize: "18px", color: "#fff", fontWeight: 600 }}>
                              {eventTitle}
                            </h3>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "14px",
                                flexWrap: "wrap",
                                color: "#aaa8ba",
                                fontSize: "12px",
                              }}
                            >
                              <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                <Calendar size={13} style={{ color: "#e3262e" }} /> {eventDate}
                              </span>
                              <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                <MapPin size={13} style={{ color: "#e3262e" }} /> {eventVenue}
                              </span>
                            </div>
                          </div>

                          {/* Status Badge */}
                          <div>
                            {reg.status === "approved" && (
                              <span
                                style={{
                                  backgroundColor: "rgba(34, 197, 94, 0.15)",
                                  color: "#4ade80",
                                  border: "1px solid rgba(34, 197, 94, 0.35)",
                                  padding: "4px 10px",
                                  borderRadius: "4px",
                                  fontSize: "11px",
                                  fontWeight: 700,
                                  letterSpacing: "0.08em",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "5px",
                                }}
                              >
                                <CheckCircle2 size={13} /> APPROVED &amp; CLEARED
                              </span>
                            )}
                            {reg.status === "payment_submitted" && (
                              <span
                                style={{
                                  backgroundColor: "rgba(234, 179, 8, 0.15)",
                                  color: "#facc15",
                                  border: "1px solid rgba(234, 179, 8, 0.35)",
                                  padding: "4px 10px",
                                  borderRadius: "4px",
                                  fontSize: "11px",
                                  fontWeight: 700,
                                  letterSpacing: "0.08em",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "5px",
                                }}
                              >
                                <Clock size={13} /> UNDER SECRETARIAT REVIEW
                              </span>
                            )}
                            {reg.status === "pending_payment" && (
                              <span
                                style={{
                                  backgroundColor: "rgba(249, 115, 22, 0.15)",
                                  color: "#fb923c",
                                  border: "1px solid rgba(249, 115, 22, 0.35)",
                                  padding: "4px 10px",
                                  borderRadius: "4px",
                                  fontSize: "11px",
                                  fontWeight: 700,
                                  letterSpacing: "0.08em",
                                }}
                              >
                                PAYMENT PENDING
                              </span>
                            )}
                            {reg.status === "rejected" && (
                              <span
                                style={{
                                  backgroundColor: "rgba(239, 68, 68, 0.15)",
                                  color: "#f87171",
                                  border: "1px solid rgba(239, 68, 68, 0.35)",
                                  padding: "4px 10px",
                                  borderRadius: "4px",
                                  fontSize: "11px",
                                  fontWeight: 700,
                                  letterSpacing: "0.08em",
                                }}
                              >
                                PAYMENT REJECTED
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Delegate details row */}
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
                            gap: "8px",
                            padding: "10px 12px",
                            backgroundColor: "#0d0c14",
                            borderRadius: "4px",
                            fontSize: "12px",
                            color: "#8d8a9e",
                          }}
                        >
                          <div>
                            <span style={{ color: "#aaa8ba", display: "block" }}>Committee:</span>
                            <strong style={{ color: "#fff" }}>{reg.committee || "General Delegate"}</strong>
                          </div>
                          <div>
                            <span style={{ color: "#aaa8ba", display: "block" }}>Institution:</span>
                            <strong style={{ color: "#fff" }}>{reg.organization || "Independent"}</strong>
                          </div>
                          <div>
                            <span style={{ color: "#aaa8ba", display: "block" }}>Amount:</span>
                            <strong style={{ color: "#fff" }}>₹{reg.amount}</strong>
                          </div>
                          <div>
                            <span style={{ color: "#aaa8ba", display: "block" }}>UTR Reference:</span>
                            <strong style={{ color: "#fff" }}>{reg.utr || "Pending"}</strong>
                          </div>
                        </div>

                        {/* Rejection Notice if any */}
                        {reg.status === "rejected" && reg.reject_reason && (
                          <div
                            style={{
                              padding: "10px 12px",
                              backgroundColor: "rgba(227, 38, 46, 0.12)",
                              borderLeft: "3px solid #e3262e",
                              color: "#ff8288",
                              fontSize: "12px",
                            }}
                          >
                            <strong>Rejection Reason:</strong> {reg.reject_reason}
                            <div style={{ marginTop: "6px" }}>
                              <Link
                                href="/register"
                                style={{ color: "#fff", textDecoration: "underline", fontWeight: 600 }}
                              >
                                Update payment proof and resubmit
                              </Link>
                            </div>
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "4px" }}>
                          {reg.status === "approved" && (
                            <button
                              onClick={() => handleViewPass(reg._id)}
                              disabled={passLoading}
                              className="primary-button"
                              style={{
                                padding: "9px 16px",
                                fontSize: "11px",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "6px",
                              }}
                            >
                              <QrCode size={13} />
                              {passLoading ? "Loading QR Pass..." : "Access Official Entry Pass"}
                            </button>
                          )}

                          {reg.status === "pending_payment" && (
                            <Link
                              href="/register"
                              className="primary-button"
                              style={{
                                padding: "9px 16px",
                                fontSize: "11px",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "6px",
                              }}
                            >
                              Complete Payment &amp; Upload Proof <ArrowRight size={12} />
                            </Link>
                          )}

                          <span style={{ fontSize: "11px", color: "#6e6c7d" }}>
                            Registered on {new Date(reg.registeredAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Available Conferences Section */}
            <div
              style={{
                background: "rgba(12, 12, 12, 0.94)",
                border: "1px solid rgba(255, 255, 255, 0.16)",
                borderRadius: "8px",
                padding: "26px",
              }}
            >
              <div style={{ marginBottom: "20px" }}>
                <span className="section-kicker">CONFERENCE CALENDAR</span>
                <h2 style={{ fontSize: "22px", margin: "4px 0 0", fontWeight: 500 }}>
                  Active <em>Conference Dais</em>
                </h2>
              </div>

              <div style={{ display: "grid", gap: "14px" }}>
                {events.map((ev) => {
                  const existingReg = getRegistrationForEvent(ev._id)
                  const isRegistered = Boolean(existingReg)

                  return (
                    <div
                      key={ev._id}
                      style={{
                        padding: "18px 20px",
                        backgroundColor: "#07070b",
                        border: isRegistered ? "1px solid rgba(34, 197, 94, 0.3)" : "1px solid rgba(255, 255, 255, 0.1)",
                        borderRadius: "6px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        flexWrap: "wrap",
                        gap: "14px",
                      }}
                    >
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <h4 style={{ margin: 0, color: "#fff", fontSize: "16px", fontWeight: 600 }}>{ev.title}</h4>
                          {isRegistered && (
                            <span
                              style={{
                                backgroundColor: "rgba(34, 197, 94, 0.18)",
                                color: "#4ade80",
                                padding: "2px 8px",
                                borderRadius: "4px",
                                fontSize: "10px",
                                fontWeight: 700,
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                              }}
                            >
                              <Check size={11} /> REGISTERED
                            </span>
                          )}
                        </div>
                        <p style={{ margin: "4px 0 6px", color: "#aaa8ba", fontSize: "13px" }}>{ev.description}</p>
                        <div style={{ display: "flex", gap: "14px", color: "#8d8a9e", fontSize: "12px" }}>
                          <span>📅 {ev.date}</span>
                          <span>📍 {ev.venue}</span>
                          <span>💰 ₹{ev.entryFee}</span>
                        </div>
                      </div>

                      <div>
                        {isRegistered ? (
                          <button
                            onClick={() => existingReg && handleViewPass(existingReg._id)}
                            style={{
                              padding: "8px 14px",
                              background: "rgba(34, 197, 94, 0.12)",
                              border: "1px solid rgba(34, 197, 94, 0.3)",
                              borderRadius: "4px",
                              color: "#4ade80",
                              fontSize: "12px",
                              fontWeight: 600,
                              cursor: "pointer",
                            }}
                          >
                            View Status
                          </button>
                        ) : ev.registrationOpen ? (
                          <Link
                            href="/register"
                            className="primary-button"
                            style={{ padding: "8px 16px", fontSize: "12px" }}
                          >
                            Register Now
                          </Link>
                        ) : (
                          <span style={{ color: "#77748a", fontSize: "12px", fontStyle: "italic" }}>
                            Registration Closed
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Real-Time Notifications Feed */}
          <div>
            <div
              style={{
                background: "rgba(12, 12, 12, 0.94)",
                border: "1px solid rgba(255, 255, 255, 0.16)",
                borderRadius: "8px",
                padding: "26px",
                position: "sticky",
                top: "20px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "20px",
                  paddingBottom: "14px",
                  borderBottom: "1px solid rgba(255, 255, 255, 0.12)",
                }}
              >
                <div>
                  <span className="section-kicker">COMMUNIQUÉS &amp; UPDATES</span>
                  <h2 style={{ fontSize: "20px", margin: "4px 0 0", fontWeight: 500 }}>
                    Official <em>Notifications</em>
                  </h2>
                </div>
                {unreadCount > 0 && (
                  <span
                    style={{
                      backgroundColor: "#e3262e",
                      color: "#fff",
                      fontSize: "11px",
                      fontWeight: 700,
                      padding: "3px 8px",
                      borderRadius: "999px",
                    }}
                  >
                    {unreadCount} unread
                  </span>
                )}
              </div>

              {notifications.length === 0 ? (
                <div style={{ textAlign: "center", padding: "30px 10px", color: "#8d8a9e" }}>
                  <Bell size={32} style={{ color: "#3d3758", margin: "0 auto 10px" }} />
                  <p style={{ color: "#fff", fontSize: "14px", margin: 0 }}>All Caught Up!</p>
                  <p style={{ fontSize: "12px", margin: "6px 0 0" }}>
                    Official approval notices, inquiry replies, and conference announcements will appear here.
                  </p>
                </div>
              ) : (
                <div style={{ display: "grid", gap: "10px", maxHeight: "550px", overflowY: "auto" }}>
                  {notifications.map((n) => (
                    <div
                      key={n._id}
                      style={{
                        padding: "14px 16px",
                        backgroundColor: n.read ? "#09090f" : "rgba(227, 38, 46, 0.08)",
                        border: n.read ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid rgba(227, 38, 46, 0.35)",
                        borderRadius: "6px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "6px",
                        position: "relative",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span
                          style={{
                            fontSize: "10px",
                            letterSpacing: "0.1em",
                            textTransform: "uppercase",
                            fontWeight: 700,
                            color:
                              n.type === "approval"
                                ? "#4ade80"
                                : n.type === "rejection"
                                ? "#f87171"
                                : n.type === "announcement"
                                ? "#60a5fa"
                                : "#e3262e",
                          }}
                        >
                          {n.type || "Update"}
                        </span>
                        <span style={{ fontSize: "11px", color: "#6e6c7d" }}>
                          {new Date(n.createdAt).toLocaleDateString([], {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>

                      <p style={{ margin: 0, color: "#f4f1ff", fontSize: "13px", lineHeight: 1.5 }}>{n.message}</p>

                      {!n.read && (
                        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "4px" }}>
                          <button
                            onClick={() => handleMarkAsRead(n._id)}
                            style={{
                              background: "none",
                              border: 0,
                              color: "#e3262e",
                              fontSize: "11px",
                              cursor: "pointer",
                              padding: "2px 0",
                              fontWeight: 600,
                            }}
                          >
                            Mark as Read
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Official Venue Entry Pass Modal */}
      {selectedPass && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            backgroundColor: "rgba(0, 0, 0, 0.85)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
          onClick={() => setSelectedPass(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: "460px",
              backgroundColor: "#07070d",
              border: "1px solid rgba(227, 38, 46, 0.5)",
              borderRadius: "10px",
              padding: "28px",
              boxShadow: "0 24px 60px rgba(0, 0, 0, 0.9), 0 0 32px rgba(227, 38, 46, 0.2)",
              textAlign: "center",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
              <span className="section-kicker" style={{ color: "#e3262e" }}>
                OFFICIAL ENTRY PASS
              </span>
              <button
                onClick={() => setSelectedPass(null)}
                style={{
                  background: "none",
                  border: 0,
                  color: "#aaa8ba",
                  cursor: "pointer",
                  padding: "4px",
                }}
              >
                <X size={20} />
              </button>
            </div>

            <h3 style={{ margin: "0 0 6px", color: "#fff", fontSize: "22px", fontWeight: 600 }}>
              {selectedPass.event?.name || "Arkham MUN 2026"}
            </h3>
            <p style={{ margin: "0 0 16px", color: "#8d8a9e", fontSize: "12px" }}>
              {selectedPass.event?.venue} | {selectedPass.event?.date}
            </p>

            <div
              style={{
                backgroundColor: "#fff",
                padding: "16px",
                borderRadius: "8px",
                display: "inline-block",
                marginBottom: "16px",
                boxShadow: "0 8px 24px rgba(0, 0, 0, 0.4)",
              }}
            >
              <img
                src={selectedPass.qr}
                alt="Venue Entry Pass QR Code"
                style={{ width: "240px", height: "240px", display: "block" }}
              />
            </div>

            <p style={{ color: "#aaa8ba", fontSize: "12px", lineHeight: 1.5, margin: "0 0 20px" }}>
              Present this digital pass at the Arkham Security Checkpoint. Once scanned by Secretariat personnel, you
              will be granted Dais credentials.
            </p>

            <button
              onClick={() => setSelectedPass(null)}
              className="primary-button"
              style={{ width: "100%", padding: "12px" }}
            >
              Dismiss Pass
            </button>
          </div>
        </div>
      )}
    </ArkhamShell>
  )
}
