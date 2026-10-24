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
  Download,
  Eye,
  FileText,
  LoaderCircle,
  LogOut,
  MapPin,
  MessageSquareText,
  HelpCircle,
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
  ContactQuery,
  DbEvent,
  EntryQrResponse,
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
  const [myQueries, setMyQueries] = useState<ContactQuery[]>([])
  const [notificationsModalOpen, setNotificationsModalOpen] = useState(false)
  const [activeNotifTab, setActiveNotifTab] = useState<"announcements" | "enquiries">("announcements")

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState("")

  // Comprehensive Status & Pass Modal state
  const [statusModalReg, setStatusModalReg] = useState<UserRegistration | null>(null)
  const [modalPassData, setModalPassData] = useState<EntryQrResponse | null>(null)
  const [modalLoadingQr, setModalLoadingQr] = useState(false)
  const [modalError, setModalError] = useState("")

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
      const [eventsRes, regsRes, notifsRes, queriesRes] = await Promise.all([
        entryPassApi.getEvents().catch(() => ({ events: [] })),
        entryPassApi.getMyRegistrations(token).catch(() => ({ registrations: [] })),
        entryPassApi.getMyNotifications(token).catch(() => ({ notifications: [], unreadCount: 0 })),
        entryPassApi.getMyQueries(token).catch(() => ({ queries: [] })),
      ])

      setEvents(eventsRes.events || [])
      setRegistrations(regsRes.registrations || [])
      setNotifications(notifsRes.notifications || [])
      setUnreadCount(notifsRes.unreadCount || 0)
      setMyQueries(queriesRes.queries || [])
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

  // Open the comprehensive Status & Entry Pass Inspector Modal
  async function handleOpenStatus(reg: UserRegistration) {
    setStatusModalReg(reg)
    setModalPassData(null)
    setModalError("")

    if (reg.status === "approved") {
      setModalLoadingQr(true)
      try {
        const passData = await entryPassApi.getEntryQr(reg._id)
        setModalPassData(passData)
        if (passData.used_at && !reg.used_at) {
          setStatusModalReg((prev) => (prev ? { ...prev, used_at: passData.used_at || prev.used_at } : null))
          setRegistrations((prev) =>
            prev.map((r) => (r._id === reg._id ? { ...r, used_at: passData.used_at || r.used_at } : r))
          )
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Could not load pass QR code."
        setModalError(msg)
      } finally {
        setModalLoadingQr(false)
      }
    }
  }

  function downloadPassQr(qrDataUrl: string, name: string, regId: string) {
    const link = document.createElement("a")
    link.href = qrDataUrl
    link.download = `ArkhamMUN_EntryPass_${name.replace(/\s+/g, "_")}_${regId.slice(-6)}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
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
        {/* ENQUIRIES & SECRETARIAT REPLIES MODAL */}
      {notificationsModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            backgroundColor: "rgba(0, 0, 0, 0.88)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            overflowY: "auto",
          }}
          onClick={() => setNotificationsModalOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: "680px",
              backgroundColor: "#0d0c18",
              border: "1px solid rgba(227, 38, 46, 0.35)",
              borderRadius: "12px",
              padding: "28px",
              boxShadow: "0 24px 60px rgba(0, 0, 0, 0.95), 0 0 35px rgba(227, 38, 46, 0.15)",
              display: "grid",
              gap: "20px",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            {/* Modal Top Bar */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "8px",
                    backgroundColor: "rgba(227, 38, 46, 0.15)",
                    border: "1px solid rgba(227, 38, 46, 0.4)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#e3262e",
                  }}
                >
                  <Bell size={20} />
                </div>
                <div>
                  <span className="section-kicker" style={{ color: "#e3262e" }}>
                    SECRETARIAT COMMUNICATIONS
                  </span>
                  <h3 style={{ margin: "2px 0 0", color: "#fff", fontSize: "20px", fontWeight: 600 }}>
                    Announcements &amp; Enquiry Replies
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setNotificationsModalOpen(false)}
                style={{
                  background: "rgba(255, 255, 255, 0.08)",
                  border: 0,
                  color: "#aaa8ba",
                  cursor: "pointer",
                  padding: "8px",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            {/* Navigation Tabs */}
            <div
              style={{
                display: "flex",
                gap: "8px",
                borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
                paddingBottom: "10px",
              }}
            >
              <button
                onClick={() => setActiveNotifTab("announcements")}
                style={{
                  padding: "8px 16px",
                  borderRadius: "6px",
                  border: 0,
                  cursor: "pointer",
                  fontSize: "13px",
                  fontWeight: 600,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  backgroundColor: activeNotifTab === "announcements" ? "#e3262e" : "rgba(255, 255, 255, 0.05)",
                  color: activeNotifTab === "announcements" ? "#fff" : "#aaa8ba",
                  transition: "all 0.2s ease",
                }}
              >
                <Bell size={14} />
                <span>Admin Announcements</span>
                {notifications.length > 0 && (
                  <span
                    style={{
                      backgroundColor: activeNotifTab === "announcements" ? "#fff" : "rgba(227, 38, 46, 0.8)",
                      color: activeNotifTab === "announcements" ? "#e3262e" : "#fff",
                      fontSize: "10px",
                      fontWeight: 800,
                      padding: "1px 6px",
                      borderRadius: "999px",
                    }}
                  >
                    {notifications.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveNotifTab("enquiries")}
                style={{
                  padding: "8px 16px",
                  borderRadius: "6px",
                  border: 0,
                  cursor: "pointer",
                  fontSize: "13px",
                  fontWeight: 600,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  backgroundColor: activeNotifTab === "enquiries" ? "#e3262e" : "rgba(255, 255, 255, 0.05)",
                  color: activeNotifTab === "enquiries" ? "#fff" : "#aaa8ba",
                  transition: "all 0.2s ease",
                }}
              >
                <MessageSquareText size={14} />
                <span>Enquiry Replies</span>
                {myQueries.filter((q) => q.status === "replied").length > 0 && (
                  <span
                    style={{
                      backgroundColor: activeNotifTab === "enquiries" ? "#fff" : "#22c55e",
                      color: activeNotifTab === "enquiries" ? "#000" : "#fff",
                      fontSize: "10px",
                      fontWeight: 800,
                      padding: "1px 6px",
                      borderRadius: "999px",
                    }}
                  >
                    {myQueries.filter((q) => q.status === "replied").length}
                  </span>
                )}
              </button>
            </div>

            {/* TAB 1: Admin Announcements */}
            {activeNotifTab === "announcements" && (
              <div style={{ display: "grid", gap: "12px" }}>
                {notifications.length === 0 ? (
                  <div
                    style={{
                      padding: "40px 20px",
                      textAlign: "center",
                      backgroundColor: "#08080f",
                      borderRadius: "8px",
                      border: "1px dashed rgba(255, 255, 255, 0.15)",
                    }}
                  >
                    <Bell size={36} style={{ color: "#48435c", margin: "0 auto 12px" }} />
                    <h4 style={{ margin: "0 0 6px", color: "#fff", fontSize: "16px" }}>No Active Announcements</h4>
                    <p style={{ margin: 0, color: "#8d8a9e", fontSize: "13px" }}>
                      Official Secretariat notices, agenda updates, and room allocations will appear here.
                    </p>
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif._id}
                      style={{
                        padding: "16px",
                        backgroundColor: "#08080f",
                        border: "1px solid rgba(227, 38, 46, 0.25)",
                        borderRadius: "8px",
                        display: "grid",
                        gap: "8px",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
                        <span
                          style={{
                            fontSize: "10px",
                            fontWeight: 700,
                            letterSpacing: "0.1em",
                            textTransform: "uppercase",
                            backgroundColor: "rgba(227, 38, 46, 0.18)",
                            color: "#ff4d55",
                            padding: "3px 8px",
                            borderRadius: "4px",
                            border: "1px solid rgba(227, 38, 46, 0.35)",
                          }}
                        >
                          📢 OFFICIAL SECRETARIAT BROADCAST
                        </span>
                        <span style={{ fontSize: "11px", color: "#8d8a9e" }}>
                          {new Date(notif.createdAt).toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <p style={{ margin: 0, fontSize: "13.5px", color: "#f2efff", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                        {notif.message}
                      </p>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* TAB 2: Enquiry Replies */}
            {activeNotifTab === "enquiries" && (
              <div style={{ display: "grid", gap: "12px" }}>
                {myQueries.length === 0 ? (
                  <div
                    style={{
                      padding: "40px 20px",
                      textAlign: "center",
                      backgroundColor: "#08080f",
                      borderRadius: "8px",
                      border: "1px dashed rgba(255, 255, 255, 0.15)",
                    }}
                  >
                    <HelpCircle size={36} style={{ color: "#48435c", margin: "0 auto 12px" }} />
                    <h4 style={{ margin: "0 0 6px", color: "#fff", fontSize: "16px" }}>No Enquiries Submitted</h4>
                    <p style={{ margin: "0 0 16px", color: "#8d8a9e", fontSize: "13px" }}>
                      Have questions about your registration, committee allocations, or fees? Reach out to the Secretariat.
                    </p>
                    <Link
                      href="/contact"
                      className="primary-button"
                      style={{ padding: "8px 16px", fontSize: "12px", display: "inline-block" }}
                      onClick={() => setNotificationsModalOpen(false)}
                    >
                      Contact Secretariat Desk →
                    </Link>
                  </div>
                ) : (
                  myQueries.map((q) => (
                    <div
                      key={q.id}
                      style={{
                        padding: "16px",
                        backgroundColor: "#08080f",
                        border: q.status === "replied" ? "1px solid rgba(34, 197, 94, 0.35)" : "1px solid rgba(255, 255, 255, 0.1)",
                        borderRadius: "8px",
                        display: "grid",
                        gap: "10px",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px", flexWrap: "wrap" }}>
                        <div>
                          <h4 style={{ margin: "0 0 4px", color: "#fff", fontSize: "15px" }}>{q.subject}</h4>
                          <span style={{ fontSize: "11px", color: "#8d8a9e" }}>
                            Submitted: {new Date(q.created_at).toLocaleString()}
                          </span>
                        </div>
                        <span
                          style={{
                            padding: "3px 8px",
                            borderRadius: "4px",
                            fontSize: "10px",
                            fontWeight: 700,
                            textTransform: "uppercase",
                            backgroundColor: q.status === "replied" ? "rgba(34, 197, 94, 0.15)" : "rgba(234, 179, 8, 0.15)",
                            color: q.status === "replied" ? "#4ade80" : "#facc15",
                            border: q.status === "replied" ? "1px solid rgba(34, 197, 94, 0.3)" : "1px solid rgba(234, 179, 8, 0.3)",
                          }}
                        >
                          {q.status === "replied" ? "✓ SECRETARIAT REPLIED" : "⏳ PENDING REVIEW"}
                        </span>
                      </div>

                      {/* Original Message */}
                      <div
                        style={{
                          padding: "10px 12px",
                          backgroundColor: "rgba(255, 255, 255, 0.02)",
                          borderLeft: "2px solid #5a546d",
                          borderRadius: "2px",
                          fontSize: "13px",
                          color: "#c2bed2",
                          lineHeight: 1.5,
                        }}
                      >
                        <strong style={{ display: "block", fontSize: "10px", textTransform: "uppercase", color: "#8d8a9e", marginBottom: "4px" }}>
                          Your Query:
                        </strong>
                        {q.message}
                      </div>

                      {/* Secretariat Reply */}
                      {q.reply_message ? (
                        <div
                          style={{
                            padding: "12px 14px",
                            backgroundColor: "rgba(34, 197, 94, 0.08)",
                            borderLeft: "3px solid #22c55e",
                            borderRadius: "4px",
                            display: "grid",
                            gap: "6px",
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: "11px", fontWeight: 700, color: "#4ade80", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                              Official Secretariat Response:
                            </span>
                            {q.replied_at && (
                              <span style={{ fontSize: "10px", color: "#8d8a9e" }}>
                                {new Date(q.replied_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            )}
                          </div>
                          <p style={{ margin: 0, fontSize: "13px", color: "#eefbee", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                            {q.reply_message}
                          </p>
                        </div>
                      ) : (
                        <p style={{ margin: 0, fontSize: "11px", color: "#8d8a9e", fontStyle: "italic" }}>
                          Secretariat review is in progress. The official reply will appear here as soon as reviewed.
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Modal Actions */}
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <Link
                href="/contact"
                className="secondary-button"
                style={{ padding: "8px 16px", fontSize: "12px" }}
                onClick={() => setNotificationsModalOpen(false)}
              >
                Send New Query to Secretariat
              </Link>
              <button
                onClick={() => setNotificationsModalOpen(false)}
                className="primary-button"
                style={{ padding: "8px 18px", fontSize: "12px" }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

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
            backgroundColor: "#0d0c14",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            borderRadius: "8px",
            marginBottom: "32px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                backgroundColor: "rgba(227, 38, 46, 0.15)",
                border: "1px solid #e3262e",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                fontWeight: 700,
                fontSize: "18px",
              }}
            >
              {user?.name ? user.name.slice(0, 2).toUpperCase() : "DG"}
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 600 }}>{user?.name}</h3>
                <span
                  style={{
                    backgroundColor: isAdmin ? "rgba(227, 38, 46, 0.2)" : "rgba(255, 255, 255, 0.08)",
                    border: isAdmin ? "1px solid #e3262e" : "1px solid rgba(255, 255, 255, 0.15)",
                    color: isAdmin ? "#ff424b" : "#aaa8ba",
                    fontSize: "10px",
                    fontWeight: 700,
                    padding: "2px 8px",
                    borderRadius: "4px",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                  }}
                >
                  {isAdmin ? "Secretariat Administrator" : "Verified Delegate"}
                </span>
              </div>
              <p style={{ margin: "4px 0 0", color: "#8d8a9e", fontSize: "13px" }}>{user?.email}</p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <button
              onClick={() => {
                setRefreshing(true)
                loadDashboardData()
              }}
              disabled={refreshing}
              className="secondary-button"
              style={{ padding: "8px 14px", fontSize: "12px" }}
              title="Refresh Dashboard"
            >
              <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
              {refreshing ? "Updating..." : "Refresh"}
            </button>

            {/* Secretariat Announcements & Enquiry Replies Bell Button */}
            <button
              onClick={() => setNotificationsModalOpen(true)}
              className="secondary-button"
              style={{
                position: "relative",
                width: "42px",
                height: "42px",
                minWidth: "42px",
                minHeight: "42px",
                padding: 0,
                display: "grid",
                placeItems: "center",
                borderRadius: "8px",
                backgroundColor: (notifications.length + myQueries.filter((q) => q.status === "replied").length) > 0 ? "rgba(227, 38, 46, 0.16)" : "#0d0c14",
                borderColor: (notifications.length + myQueries.filter((q) => q.status === "replied").length) > 0 ? "#e3262e" : "rgba(255, 255, 255, 0.2)",
                color: (notifications.length + myQueries.filter((q) => q.status === "replied").length) > 0 ? "#ff424b" : "#fff",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
              title="Secretariat Announcements & Helpdesk Replies"
              aria-label="Secretariat Announcements & Helpdesk Replies"
            >
              <Bell size={18} />
              {(notifications.length + myQueries.filter((q) => q.status === "replied").length) > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: "-4px",
                    right: "-4px",
                    backgroundColor: "#e3262e",
                    color: "#fff",
                    fontSize: "10px",
                    fontWeight: 800,
                    minWidth: "18px",
                    height: "18px",
                    padding: "0 4px",
                    borderRadius: "999px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 0 10px rgba(227, 38, 46, 0.7)",
                  }}
                >
                  {(notifications.length + myQueries.filter((q) => q.status === "replied").length) > 9
                    ? "9+"
                    : (notifications.length + myQueries.filter((q) => q.status === "replied").length)}
                </span>
              )}
            </button>

            {isAdmin && (
              <Link
                href="/admin"
                className="secondary-button"
                style={{
                  padding: "8px 14px",
                  fontSize: "12px",
                  color: "#ff424b",
                  borderColor: "rgba(227, 38, 46, 0.4)",
                }}
              >
                <Shield size={13} /> Secretariat Command Dais
              </Link>
            )}

            <button
              onClick={logout}
              className="secondary-button"
              style={{ padding: "8px 14px", fontSize: "12px" }}
              title="Sign Out"
            >
              <LogOut size={13} /> Sign Out
            </button>
          </div>
        </div>

        {/* Global Error Banner if any */}
        {error && (
          <div
            style={{
              padding: "12px 16px",
              backgroundColor: "rgba(227, 38, 46, 0.12)",
              border: "1px solid rgba(227, 38, 46, 0.4)",
              borderRadius: "6px",
              color: "#ff8288",
              fontSize: "13px",
              marginBottom: "24px",
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <ShieldAlert size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* 2-Column Grid: Left: Registrations & Events | Right: Notifications */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "36px" }}>
          {/* Active Conferences Dais with Dynamic Status */}
          <div
            style={{
              backgroundColor: "#0c0b15",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              borderRadius: "8px",
              padding: "28px",
            }}
          >
            <div style={{ marginBottom: "20px" }}>
              <span className="section-kicker">CONFERENCE CALENDAR</span>
              <h3 style={{ margin: "4px 0 0", fontSize: "22px", fontWeight: 600 }}>
                Active <em>Conference Dais</em>
              </h3>
            </div>

            {events.length === 0 ? (
              <div style={{ padding: "30px", textAlign: "center", color: "#8d8a9e" }}>
                No active conferences announced yet. Check back soon.
              </div>
            ) : (
              <div style={{ display: "grid", gap: "16px" }}>
                {events.map((ev) => {
                  const existingReg = getRegistrationForEvent(ev._id)
                  const isRegistered = Boolean(existingReg)

                  return (
                    <div
                      key={ev._id}
                      style={{
                        padding: "20px",
                        backgroundColor: "#08080f",
                        border: isRegistered ? "1px solid rgba(227, 38, 46, 0.45)" : "1px solid rgba(255, 255, 255, 0.08)",
                        borderRadius: "6px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: "16px",
                      }}
                    >
                      <div style={{ flex: 1, minWidth: "260px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                          <h4 style={{ margin: 0, fontSize: "17px", color: "#fff" }}>{ev.title}</h4>
                          {existingReg && (
                            <>
                              {existingReg.status === "approved" && (
                                existingReg.used_at ? (
                                  <span
                                    style={{
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: "4px",
                                      padding: "3px 8px",
                                      borderRadius: "4px",
                                      backgroundColor: "rgba(168, 85, 247, 0.15)",
                                      border: "1px solid rgba(168, 85, 247, 0.4)",
                                      color: "#c084fc",
                                      fontSize: "11px",
                                      fontWeight: 700,
                                    }}
                                  >
                                    <CheckCircle2 size={12} /> ADMITTED · QR EXPIRED
                                  </span>
                                ) : (
                                  <span
                                    style={{
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: "4px",
                                      padding: "3px 8px",
                                      borderRadius: "4px",
                                      backgroundColor: "rgba(34, 197, 94, 0.15)",
                                      border: "1px solid rgba(34, 197, 94, 0.4)",
                                      color: "#4ade80",
                                      fontSize: "11px",
                                      fontWeight: 700,
                                    }}
                                  >
                                    <CheckCircle2 size={12} /> APPROVED &amp; PASS READY
                                  </span>
                                )
                              )}
                              {existingReg.status === "rejected" && (
                                <span
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "4px",
                                    padding: "3px 8px",
                                    borderRadius: "4px",
                                    backgroundColor: "rgba(239, 68, 68, 0.15)",
                                    border: "1px solid rgba(239, 68, 68, 0.4)",
                                    color: "#f87171",
                                    fontSize: "11px",
                                    fontWeight: 700,
                                  }}
                                >
                                  <ShieldAlert size={12} /> PAYMENT REJECTED
                                </span>
                              )}
                              {existingReg.status === "payment_submitted" && (
                                <span
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "4px",
                                    padding: "3px 8px",
                                    borderRadius: "4px",
                                    backgroundColor: "rgba(234, 179, 8, 0.15)",
                                    border: "1px solid rgba(234, 179, 8, 0.4)",
                                    color: "#facc15",
                                    fontSize: "11px",
                                    fontWeight: 700,
                                  }}
                                >
                                  <Clock size={12} /> UNDER SECRETARIAT REVIEW
                                </span>
                              )}
                              {existingReg.status === "pending_payment" && (
                                <span
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "4px",
                                    padding: "3px 8px",
                                    borderRadius: "4px",
                                    backgroundColor: "rgba(249, 115, 22, 0.15)",
                                    border: "1px solid rgba(249, 115, 22, 0.4)",
                                    color: "#fb923c",
                                    fontSize: "11px",
                                    fontWeight: 700,
                                  }}
                                >
                                  PAYMENT PENDING
                                </span>
                              )}
                            </>
                          )}
                        </div>
                        <p style={{ margin: "6px 0 8px", color: "#aaa8ba", fontSize: "13px", lineHeight: 1.5 }}>
                          {ev.description}
                        </p>
                        <div style={{ display: "flex", gap: "16px", color: "#8d8a9e", fontSize: "12px", flexWrap: "wrap" }}>
                          <span>📅 {ev.date}</span>
                          <span>📍 {ev.venue}</span>
                          <span>💰 ₹{ev.entryFee}</span>
                        </div>
                      </div>

                      <div>
                        {existingReg ? (
                          <button
                            onClick={() => handleOpenStatus(existingReg)}
                            style={{
                              padding: "10px 18px",
                              backgroundColor:
                                existingReg.status === "approved"
                                  ? "rgba(34, 197, 94, 0.2)"
                                  : existingReg.status === "rejected"
                                  ? "rgba(239, 68, 68, 0.2)"
                                  : "rgba(227, 38, 46, 0.9)",
                              border:
                                existingReg.status === "approved"
                                  ? "1px solid #4ade80"
                                  : existingReg.status === "rejected"
                                  ? "1px solid #f87171"
                                  : "1px solid #e3262e",
                              borderRadius: "4px",
                              color: "#fff",
                              fontSize: "12px",
                              fontWeight: 700,
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "6px",
                              boxShadow: "0 4px 14px rgba(0,0,0,0.4)",
                            }}
                          >
                            <Eye size={14} /> View Status
                          </button>
                        ) : ev.registrationOpen ? (
                          <Link
                            href="/register"
                            className="primary-button"
                            style={{ padding: "10px 18px", fontSize: "12px" }}
                          >
                            Register as Delegate
                          </Link>
                        ) : (
                          <span
                            style={{
                              padding: "6px 12px",
                              backgroundColor: "rgba(255, 255, 255, 0.05)",
                              borderRadius: "4px",
                              color: "#8d8a9e",
                              fontSize: "12px",
                              fontStyle: "italic",
                            }}
                          >
                            Registration Closed
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* My Registrations Queue */}
          <div
            style={{
              backgroundColor: "#0c0b15",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              borderRadius: "8px",
              padding: "28px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <div>
                <span className="section-kicker">MY CREDENTIALS</span>
                <h3 style={{ margin: "4px 0 0", fontSize: "22px", fontWeight: 600 }}>
                  Event <em>Registrations</em>
                </h3>
              </div>
              <Link href="/register" className="primary-button" style={{ padding: "8px 14px", fontSize: "12px" }}>
                + New Registration
              </Link>
            </div>

            {registrations.length === 0 ? (
              <div
                style={{
                  padding: "40px 20px",
                  textAlign: "center",
                  backgroundColor: "#08080f",
                  borderRadius: "6px",
                  border: "1px dashed rgba(255, 255, 255, 0.15)",
                }}
              >
                <Ticket size={36} style={{ color: "#3d3758", margin: "0 auto 12px" }} />
                <h4 style={{ margin: "0 0 6px", color: "#fff", fontSize: "16px" }}>No Registrations Found</h4>
                <p style={{ margin: "0 0 18px", color: "#8d8a9e", fontSize: "13px" }}>
                  You have not registered for any upcoming conferences yet.
                </p>
                <Link href="/register" className="primary-button" style={{ padding: "10px 20px", fontSize: "12px" }}>
                  Register for Arkham MUN 2026
                </Link>
              </div>
            ) : (
              <div style={{ display: "grid", gap: "16px" }}>
                {registrations.map((reg) => {
                  const eventTitle =
                    typeof reg.eventId === "object" && reg.eventId?.title
                      ? reg.eventId.title
                      : "Arkham MUN 2026"
                  const eventDate =
                    typeof reg.eventId === "object" && reg.eventId?.date
                      ? reg.eventId.date
                      : "October 24-25, 2026"
                  const eventVenue =
                    typeof reg.eventId === "object" && reg.eventId?.venue
                      ? reg.eventId.venue
                      : "Arkham Assembly Hall, New Delhi"

                  return (
                    <div
                      key={reg._id}
                      style={{
                        padding: "20px",
                        backgroundColor: "#08080f",
                        border: "1px solid rgba(255, 255, 255, 0.12)",
                        borderRadius: "6px",
                        display: "grid",
                        gap: "14px",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "10px" }}>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span style={{ fontSize: "11px", color: "#e3262e", fontWeight: 700, letterSpacing: "0.08em" }}>
                              REG ID: {reg._id.slice(-8).toUpperCase()}
                            </span>
                            <span style={{ color: "#6b667a" }}>•</span>
                            <span style={{ fontSize: "12px", color: "#8d8a9e" }}>
                              {new Date(reg.registeredAt).toLocaleDateString()}
                            </span>
                          </div>
                          <h4 style={{ margin: "4px 0 2px", fontSize: "18px", color: "#fff" }}>{eventTitle}</h4>
                          <div style={{ display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap", color: "#aaa8ba", fontSize: "12px" }}>
                            <span>📅 {eventDate}</span>
                            <span>📍 {eventVenue}</span>
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div>
                          {reg.status === "approved" && (
                            reg.used_at ? (
                              <span
                                style={{
                                  backgroundColor: "rgba(168, 85, 247, 0.15)",
                                  color: "#c084fc",
                                  border: "1px solid rgba(168, 85, 247, 0.35)",
                                  padding: "4px 10px",
                                  borderRadius: "4px",
                                  fontSize: "11px",
                                  fontWeight: 700,
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "5px",
                                }}
                              >
                                <CheckCircle2 size={13} /> ADMITTED · QR EXPIRED
                              </span>
                            ) : (
                              <span
                                style={{
                                  backgroundColor: "rgba(34, 197, 94, 0.15)",
                                  color: "#4ade80",
                                  border: "1px solid rgba(34, 197, 94, 0.35)",
                                  padding: "4px 10px",
                                  borderRadius: "4px",
                                  fontSize: "11px",
                                  fontWeight: 700,
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "5px",
                                }}
                              >
                                <CheckCircle2 size={13} /> APPROVED &amp; PASS ACTIVE
                              </span>
                            )
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

                      {/* Venue Check-in Status Notice */}
                      {reg.status === "approved" && reg.used_at && (
                        <div
                          style={{
                            padding: "10px 14px",
                            backgroundColor: "rgba(168, 85, 247, 0.12)",
                            borderLeft: "3px solid #a855f7",
                            borderRadius: "4px",
                            color: "#d8b4fe",
                            fontSize: "12px",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                          }}
                        >
                          <CheckCircle2 size={16} style={{ color: "#c084fc", flexShrink: 0 }} />
                          <span>
                            <strong>Venue Check-in Completed:</strong> Admitted at{" "}
                            {new Date(reg.used_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}. Entry QR pass is expired for re-entry.
                          </span>
                        </div>
                      )}

                      {/* Rejection Notice if any */}
                      {reg.status === "rejected" && reg.reject_reason && (
                        <div
                          style={{
                            padding: "10px 14px",
                            backgroundColor: "rgba(227, 38, 46, 0.12)",
                            borderLeft: "3px solid #e3262e",
                            borderRadius: "4px",
                            color: "#ff8288",
                            fontSize: "12px",
                          }}
                        >
                          <strong>Secretariat Rejection Reason:</strong> {reg.reject_reason}
                          <div style={{ marginTop: "6px" }}>
                            <Link href="/register" style={{ color: "#fff", textDecoration: "underline", fontWeight: 600 }}>
                              Click here to update payment proof and resubmit →
                            </Link>
                          </div>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "4px" }}>
                        <button
                          onClick={() => handleOpenStatus(reg)}
                          className="primary-button"
                          style={{
                            padding: "9px 16px",
                            fontSize: "11px",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                            backgroundColor: reg.status === "approved" ? "#22c55e" : "#e3262e",
                          }}
                        >
                          <Eye size={13} /> View Status &amp; Details
                        </button>

                        {reg.status === "pending_payment" && (
                          <Link
                            href="/register"
                            className="secondary-button"
                            style={{
                              padding: "9px 16px",
                              fontSize: "11px",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "6px",
                            }}
                          >
                            Complete Payment <ArrowRight size={12} />
                          </Link>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* COMPREHENSIVE STATUS & PASS MODAL */}
      {statusModalReg && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            backgroundColor: "rgba(0, 0, 0, 0.88)",
            backdropFilter: "blur(10px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            overflowY: "auto",
          }}
          onClick={() => setStatusModalReg(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: "520px",
              backgroundColor: "#0c0b16",
              border: "1px solid rgba(227, 38, 46, 0.5)",
              borderRadius: "10px",
              padding: "28px",
              boxShadow: "0 24px 60px rgba(0, 0, 0, 0.95), 0 0 32px rgba(227, 38, 46, 0.2)",
              display: "grid",
              gap: "20px",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            {/* Modal Top Bar */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <span className="section-kicker" style={{ color: "#e3262e" }}>
                  REGISTRATION STATUS &amp; CREDENTIALS
                </span>
                <h3 style={{ margin: "4px 0 0", color: "#fff", fontSize: "20px", fontWeight: 600 }}>
                  {typeof statusModalReg.eventId === "object" && statusModalReg.eventId?.title
                    ? statusModalReg.eventId.title
                    : "Arkham MUN 2026"}
                </h3>
              </div>
              <button
                onClick={() => setStatusModalReg(null)}
                style={{
                  background: "rgba(255, 255, 255, 0.08)",
                  border: 0,
                  color: "#aaa8ba",
                  cursor: "pointer",
                  padding: "6px",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* STATUS BANNER */}
            <div>
              {statusModalReg.status === "approved" && (
                (statusModalReg.used_at || modalPassData?.isExpired) ? (
                  <div
                    style={{
                      padding: "16px",
                      borderRadius: "6px",
                      backgroundColor: "rgba(168, 85, 247, 0.12)",
                      border: "1px solid rgba(168, 85, 247, 0.45)",
                      textAlign: "center",
                    }}
                  >
                    <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", color: "#c084fc", fontWeight: 700, fontSize: "14px" }}>
                      <CheckCircle2 size={18} /> VENUE ADMISSION COMPLETED · PASS EXPIRED
                    </div>
                    <p style={{ margin: "6px 0 0", fontSize: "12px", color: "#d8b4fe" }}>
                      You have entered the venue at{" "}
                      <strong>
                        {new Date(statusModalReg.used_at || modalPassData?.used_at || "").toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </strong>
                      . Your single-use entry QR has expired and cannot be reused for entry.
                    </p>
                  </div>
                ) : (
                  <div
                    style={{
                      padding: "16px",
                      borderRadius: "6px",
                      backgroundColor: "rgba(34, 197, 94, 0.12)",
                      border: "1px solid rgba(34, 197, 94, 0.45)",
                      textAlign: "center",
                    }}
                  >
                    <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", color: "#4ade80", fontWeight: 700, fontSize: "14px" }}>
                      <CheckCircle2 size={18} /> PAYMENT VERIFIED &amp; ENTRY PASS ISSUED
                    </div>
                    <p style={{ margin: "6px 0 0", fontSize: "12px", color: "#aaa8ba" }}>
                      Your registration has been fully approved by the Secretariat Dais. Present your pass at venue entrance camera scanner.
                    </p>
                  </div>
                )
              )}

              {statusModalReg.status === "payment_submitted" && (
                <div
                  style={{
                    padding: "16px",
                    borderRadius: "6px",
                    backgroundColor: "rgba(234, 179, 8, 0.12)",
                    border: "1px solid rgba(234, 179, 8, 0.45)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#facc15", fontWeight: 700, fontSize: "14px" }}>
                    <Clock size={18} /> PAYMENT UNDER SECRETARIAT REVIEW
                  </div>
                  <p style={{ margin: "6px 0 12px", fontSize: "12px", color: "#aaa8ba", lineHeight: 1.5 }}>
                    Your UPI Transaction Reference (UTR: <strong>{statusModalReg.utr || "Submitted"}</strong>) is currently being verified against our bank records. Your entry pass QR code will appear here once approved.
                  </p>
                  {/* Progress tracker */}
                  <div style={{ display: "flex", gap: "8px", alignItems: "center", fontSize: "11px" }}>
                    <span style={{ color: "#4ade80", fontWeight: 600 }}>✓ Enrolled</span>
                    <span style={{ color: "#6b667a" }}>→</span>
                    <span style={{ color: "#facc15", fontWeight: 600 }}>⏳ Under Review</span>
                    <span style={{ color: "#6b667a" }}>→</span>
                    <span style={{ color: "#8d8a9e" }}>○ Dais Clearance</span>
                  </div>
                </div>
              )}

              {statusModalReg.status === "rejected" && (
                <div
                  style={{
                    padding: "16px",
                    borderRadius: "6px",
                    backgroundColor: "rgba(239, 68, 68, 0.12)",
                    border: "1px solid rgba(239, 68, 68, 0.5)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#f87171", fontWeight: 700, fontSize: "14px" }}>
                    <ShieldAlert size={18} /> PAYMENT REJECTED BY SECRETARIAT
                  </div>
                  <div style={{ marginTop: "10px", padding: "10px 12px", background: "rgba(0, 0, 0, 0.4)", borderRadius: "4px" }}>
                    <span style={{ display: "block", color: "#ff8288", fontSize: "11px", fontWeight: 600, textTransform: "uppercase" }}>
                      Reason for Rejection:
                    </span>
                    <p style={{ margin: "4px 0 0", color: "#fff", fontSize: "13px" }}>
                      {statusModalReg.reject_reason || "Invalid transaction reference or unreadable proof."}
                    </p>
                  </div>
                  <div style={{ marginTop: "12px" }}>
                    <Link
                      href="/register"
                      className="primary-button"
                      style={{ padding: "8px 16px", fontSize: "12px", display: "inline-flex", alignItems: "center", gap: "6px" }}
                    >
                      Update UTR &amp; Resubmit <ArrowRight size={12} />
                    </Link>
                  </div>
                </div>
              )}

              {statusModalReg.status === "pending_payment" && (
                <div
                  style={{
                    padding: "16px",
                    borderRadius: "6px",
                    backgroundColor: "rgba(249, 115, 22, 0.12)",
                    border: "1px solid rgba(249, 115, 22, 0.45)",
                  }}
                >
                  <div style={{ color: "#fb923c", fontWeight: 700, fontSize: "14px" }}>PAYMENT PENDING</div>
                  <p style={{ margin: "6px 0 10px", fontSize: "12px", color: "#aaa8ba" }}>
                    Please scan our payment QR code and submit your UTR reference to confirm your delegate seat.
                  </p>
                  <Link href="/register" className="primary-button" style={{ padding: "8px 16px", fontSize: "12px" }}>
                    Complete Payment Now
                  </Link>
                </div>
              )}
            </div>

            {/* IF APPROVED: SHOW ENTRY QR PASS */}
            {statusModalReg.status === "approved" && (
              <div
                style={{
                  backgroundColor: "#07070d",
                  border: (statusModalReg.used_at || modalPassData?.isExpired)
                    ? "1px solid rgba(168, 85, 247, 0.45)"
                    : "1px solid rgba(34, 197, 94, 0.35)",
                  borderRadius: "8px",
                  padding: "20px",
                  textAlign: "center",
                  position: "relative",
                }}
              >
                {modalLoadingQr ? (
                  <div style={{ padding: "30px", color: "#aaa8ba" }}>
                    <LoaderCircle size={28} className="animate-spin" style={{ color: "#4ade80", margin: "0 auto 8px" }} />
                    <span style={{ fontSize: "12px" }}>Rendering Cryptographic Pass...</span>
                  </div>
                ) : modalPassData ? (
                  <>
                    <div
                      style={{
                        backgroundColor: "#fff",
                        padding: "14px",
                        borderRadius: "8px",
                        display: "inline-block",
                        marginBottom: "12px",
                        boxShadow: "0 8px 24px rgba(0, 0, 0, 0.6)",
                        position: "relative",
                        opacity: (statusModalReg.used_at || modalPassData.isExpired) ? 0.45 : 1,
                        filter: (statusModalReg.used_at || modalPassData.isExpired) ? "grayscale(40%)" : "none",
                      }}
                    >
                      <img
                        src={modalPassData.qr}
                        alt="Signed Venue Entry QR Pass"
                        style={{ width: "220px", height: "220px", display: "block" }}
                      />
                      {(statusModalReg.used_at || modalPassData.isExpired) && (
                        <div
                          style={{
                            position: "absolute",
                            top: "50%",
                            left: "50%",
                            transform: "translate(-50%, -50%) rotate(-12deg)",
                            backgroundColor: "rgba(147, 51, 234, 0.95)",
                            color: "#fff",
                            fontWeight: 900,
                            fontSize: "14px",
                            letterSpacing: "0.1em",
                            padding: "8px 14px",
                            borderRadius: "4px",
                            boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
                            whiteSpace: "nowrap",
                            border: "2px solid #fff",
                          }}
                        >
                          ADMITTED · EXPIRED
                        </div>
                      )}
                    </div>

                    {(statusModalReg.used_at || modalPassData.isExpired) ? (
                      <div style={{ fontSize: "12px", color: "#c084fc", fontWeight: 700, marginBottom: "8px" }}>
                        🔒 PASS USED &amp; EXPIRED AT {new Date(statusModalReg.used_at || modalPassData.used_at || "").toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    ) : (
                      <div style={{ fontSize: "12px", color: "#4ade80", fontWeight: 700, marginBottom: "8px" }}>
                        ✓ CRYPTOGRAPHICALLY SIGNED PASS · ACTIVE FOR ENTRY
                      </div>
                    )}

                    <p style={{ margin: "0 0 14px", color: "#8d8a9e", fontSize: "11px", lineHeight: 1.4 }}>
                      Registration ID: <code style={{ color: "#fff" }}>{statusModalReg._id}</code>
                      <br />
                      {(statusModalReg.used_at || modalPassData.isExpired)
                        ? "This pass was verified at venue entrance and has expired for single admission."
                        : "Keep this pass saved on your mobile device for security check-in."}
                    </p>
                    <button
                      onClick={() =>
                        downloadPassQr(modalPassData.qr, statusModalReg.name, statusModalReg._id)
                      }
                      className="primary-button"
                      style={{
                        width: "100%",
                        padding: "10px",
                        fontSize: "12px",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "6px",
                        backgroundColor: (statusModalReg.used_at || modalPassData.isExpired) ? "#6b7280" : "#22c55e",
                      }}
                    >
                      <Download size={14} /> Download {(statusModalReg.used_at || modalPassData.isExpired) ? "Archived Pass" : "Entry Pass"} (PNG)
                    </button>
                  </>
                ) : (
                  <div style={{ color: "#f87171", fontSize: "12px" }}>
                    {modalError || "Pass could not be rendered. Contact Secretariat."}
                  </div>
                )}
              </div>
            )}

            {/* DETAILS GRID */}
            <div
              style={{
                backgroundColor: "#07070f",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "6px",
                padding: "16px",
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "12px",
                fontSize: "12px",
              }}
            >
              <div>
                <span style={{ color: "#8d8a9e", display: "block" }}>Delegate Name</span>
                <strong style={{ color: "#fff", fontSize: "13px" }}>{statusModalReg.name}</strong>
              </div>
              <div>
                <span style={{ color: "#8d8a9e", display: "block" }}>Committee Allocation</span>
                <strong style={{ color: "#fff", fontSize: "13px" }}>{statusModalReg.committee || "General Delegate"}</strong>
              </div>
              <div>
                <span style={{ color: "#8d8a9e", display: "block" }}>Institution / School</span>
                <strong style={{ color: "#fff", fontSize: "13px" }}>{statusModalReg.organization || "Independent"}</strong>
              </div>
              <div>
                <span style={{ color: "#8d8a9e", display: "block" }}>Registered Email</span>
                <strong style={{ color: "#fff", fontSize: "13px" }}>{statusModalReg.email || user?.email}</strong>
              </div>
              <div>
                <span style={{ color: "#8d8a9e", display: "block" }}>Payment UTR</span>
                <strong style={{ color: "#fff", fontSize: "13px", fontFamily: "monospace" }}>{statusModalReg.utr || "Pending"}</strong>
              </div>
              <div>
                <span style={{ color: "#8d8a9e", display: "block" }}>Entry Fee Amount</span>
                <strong style={{ color: "#fff", fontSize: "13px" }}>₹{statusModalReg.amount}</strong>
              </div>
              <div style={{ gridColumn: "1 / -1", paddingTop: "6px", borderTop: "1px dashed rgba(255, 255, 255, 0.08)" }}>
                <span style={{ color: "#8d8a9e", display: "block" }}>Venue Admission Status</span>
                <strong style={{ color: (statusModalReg.used_at || modalPassData?.isExpired) ? "#c084fc" : "#4ade80", fontSize: "13px" }}>
                  {(statusModalReg.used_at || modalPassData?.used_at)
                    ? `✓ Admitted & Checked In (${new Date(statusModalReg.used_at || modalPassData?.used_at || "").toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}) · QR Expired`
                    : "⏳ Awaiting Arrival at Venue"}
                </strong>
              </div>
            </div>

            {/* SECRETARIAT NOTICES FOR THIS DELEGATE */}
            <div>
              <span style={{ color: "#8d8a9e", fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                Secretariat Notice Log:
              </span>
              <div style={{ marginTop: "6px", display: "grid", gap: "6px" }}>
                {notifications
                  .filter(
                    (n) =>
                      !n.eventId ||
                      n.eventId ===
                        (typeof statusModalReg.eventId === "string"
                          ? statusModalReg.eventId
                          : statusModalReg.eventId?._id)
                  )
                  .slice(0, 3)
                  .map((n) => (
                    <div
                      key={n._id}
                      style={{
                        padding: "8px 12px",
                        backgroundColor: "rgba(255, 255, 255, 0.03)",
                        border: "1px solid rgba(255, 255, 255, 0.08)",
                        borderRadius: "4px",
                        fontSize: "12px",
                        color: "#aaa8ba",
                      }}
                    >
                      <span style={{ color: "#e3262e", fontWeight: 600 }}>•</span> {n.message}
                    </div>
                  ))}
              </div>
            </div>

            <button
              onClick={() => setStatusModalReg(null)}
              className="secondary-button"
              style={{ width: "100%", padding: "10px", fontSize: "12px" }}
            >
              Close Status Inspector
            </button>
          </div>
        </div>
      )}
    </ArkhamShell>
  )
}
