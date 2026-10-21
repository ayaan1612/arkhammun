"use client"

import React, { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Bell,
  CheckCircle2,
  Clock,
  ExternalLink,
  MapPin,
  MessageSquare,
  QrCode,
  RefreshCw,
  Search,
  Sparkles,
  Ticket,
  X,
  XCircle,
  AlertTriangle,
  Download,
  Calendar,
  Building,
  User,
} from "lucide-react"
import {
  entryPassApi,
  NotificationsLookupResponse,
  NotificationRegistration,
  ContactQuery,
  EventDetails,
} from "@/lib/entry-pass-api"
import styles from "./notification-center.module.css"

export function NotificationSystem() {
  const pathname = usePathname()
  if (pathname?.startsWith("/admin")) return null

  const [isOpen, setIsOpen] = useState(false)
  const [isBarDismissed, setIsBarDismissed] = useState(false)
  const [data, setData] = useState<NotificationsLookupResponse | null>(null)
  const [queryInput, setQueryInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<"passes" | "replies" | "event">("passes")
  const [entryQrs, setEntryQrs] = useState<Record<string, string>>({})

  // Countdown timer
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 })

  const calculateTimeLeft = useCallback(() => {
    const target = new Date("2026-10-24T09:00:00+05:30").getTime()
    const now = new Date().getTime()
    const difference = target - now

    if (difference > 0) {
      setTimeLeft({
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
      })
    }
  }, [])

  useEffect(() => {
    calculateTimeLeft()
    const timer = setInterval(calculateTimeLeft, 1000)
    return () => clearInterval(timer)
  }, [calculateTimeLeft])

  // Fetch notifications
  const fetchNotifications = useCallback(async (searchQuery: string) => {
    setLoading(true)
    try {
      const res = await entryPassApi.lookupNotifications(searchQuery)
      setData(res)

      // Preload QR passes for approved registrations
      for (const reg of res.registrations) {
        if (reg.status === "approved" && !entryQrs[reg.id]) {
          try {
            const qrRes = await entryPassApi.getEntryQr(reg.id)
            setEntryQrs((prev) => ({ ...prev, [reg.id]: qrRes.qr }))
          } catch {
            // pass
          }
        }
      }
    } catch {
      // Silently fail or keep previous data
    } finally {
      setLoading(false)
    }
  }, [entryQrs])

  // Initial load from localStorage
  useEffect(() => {
    if (typeof window === "undefined") return
    const storedEmail = localStorage.getItem("arkham_delegate_email") || ""
    const storedRegId = localStorage.getItem("arkham_delegate_reg_id") || ""
    const initialQuery = storedEmail || storedRegId || ""
    if (initialQuery) {
      setQueryInput(initialQuery)
      fetchNotifications(initialQuery)
    } else {
      fetchNotifications("")
    }

    const handleUpdate = () => {
      const email = localStorage.getItem("arkham_delegate_email") || ""
      const regId = localStorage.getItem("arkham_delegate_reg_id") || ""
      const q = email || regId || ""
      if (q) {
        setQueryInput(q)
        fetchNotifications(q)
      }
    }

    window.addEventListener("arkham_notification_update", handleUpdate)
    return () => window.removeEventListener("arkham_notification_update", handleUpdate)
  }, [fetchNotifications])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!queryInput.trim()) return
    if (typeof window !== "undefined") {
      localStorage.setItem("arkham_delegate_email", queryInput.trim().toLowerCase())
    }
    fetchNotifications(queryInput.trim())
  }

  // Calculate notification badge count
  const approvedCount = data?.registrations.filter((r) => r.status === "approved").length || 0
  const rejectedCount = data?.registrations.filter((r) => r.status === "rejected").length || 0
  const repliedQueriesCount = data?.queries.filter((q) => q.status === "replied").length || 0
  const totalBadges = approvedCount + rejectedCount + repliedQueriesCount

  // Download pass helper
  const handleDownloadQr = (qrDataUrl: string, regId: string, delegateName: string) => {
    const link = document.createElement("a")
    link.href = qrDataUrl
    link.download = `ArkhamMUN_Pass_${delegateName.replace(/\s+/g, "_")}_${regId}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <>
      {/* FLOATING BELL BADGE (Visible if bar is dismissed or on scroll) */}
      <button
        type="button"
        className={styles.floatingBell}
        onClick={() => setIsOpen(true)}
        title="Open Notification Desk"
        aria-label="Open Arkham Notification Desk"
      >
        <Bell size={22} />
        {totalBadges > 0 && <span className={styles.floatingBadge}>{totalBadges}</span>}
      </button>

      {/* 3. NOTIFICATION & ENTRY PASS CENTER MODAL */}
      {isOpen && (
        <div className={styles.modalBackdrop} onClick={() => setIsOpen(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            {/* Modal Header */}
            <div className={styles.modalHeader}>
              <div className={styles.modalHeaderTitle}>
                <Bell className={styles.headerIcon} size={20} />
                <h2>Arkham Notification & Pass Desk</h2>
              </div>
              <button
                type="button"
                className={styles.closeModalBtn}
                onClick={() => setIsOpen(false)}
                aria-label="Close notification center"
              >
                <X size={16} />
              </button>
            </div>

            {/* Email / Reg ID Search Bar */}
            <div className={styles.searchSection}>
              <form onSubmit={handleSearchSubmit} className={styles.searchForm}>
                <div className={styles.searchInputWrapper}>
                  <Search className={styles.searchInputIcon} size={15} />
                  <input
                    type="text"
                    className={styles.searchInput}
                    placeholder="Enter your registered email or registration ID..."
                    value={queryInput}
                    onChange={(e) => setQueryInput(e.target.value)}
                  />
                </div>
                <button type="submit" className={styles.searchSubmitBtn} disabled={loading}>
                  {loading ? <RefreshCw className="animate-spin" size={14} /> : <Search size={14} />}
                  Check Status
                </button>
              </form>
            </div>

            {/* Tab Navigation */}
            <div className={styles.tabsList}>
              <button
                type="button"
                className={`${styles.tabButton} ${activeTab === "passes" ? styles.activeTab : ""}`}
                onClick={() => setActiveTab("passes")}
              >
                <Ticket size={15} />
                Passes & Status
                {data?.registrations && data.registrations.length > 0 && (
                  <span className={styles.tabBadge}>{data.registrations.length}</span>
                )}
              </button>

              <button
                type="button"
                className={`${styles.tabButton} ${activeTab === "replies" ? styles.activeTab : ""}`}
                onClick={() => setActiveTab("replies")}
              >
                <MessageSquare size={15} />
                Secretariat Inquiries
                {repliedQueriesCount > 0 && (
                  <span className={styles.tabBadge} style={{ background: "#22c55e", color: "#fff" }}>
                    {repliedQueriesCount} replied
                  </span>
                )}
              </button>

              <button
                type="button"
                className={`${styles.tabButton} ${activeTab === "event" ? styles.activeTab : ""}`}
                onClick={() => setActiveTab("event")}
              >
                <Calendar size={15} />
                Event & Venue
              </button>
            </div>

            {/* Modal Body */}
            <div className={styles.modalBody}>
              {/* TAB 1: PASSES & STATUS */}
              {activeTab === "passes" && (
                <>
                  {!data?.registrations || data.registrations.length === 0 ? (
                    <div className={styles.emptyState}>
                      <Ticket className={styles.emptyStateIcon} size={42} />
                      <h4>No registrations linked to this lookup</h4>
                      <p>
                        Enter the exact email address or Registration ID you used during registration to check payment approval, download your entry QR pass, or inspect review status.
                      </p>
                      <Link
                        href="/register"
                        onClick={() => setIsOpen(false)}
                        className={styles.resubmitBtn}
                        style={{ marginTop: 14, textDecoration: "none" }}
                      >
                        Register as Delegate
                      </Link>
                    </div>
                  ) : (
                    data.registrations.map((reg) => (
                      <article
                        key={reg.id}
                        className={`${styles.delegateCard} ${
                          reg.status === "approved"
                            ? styles.delegateCardApproved
                            : reg.status === "rejected"
                            ? styles.delegateCardRejected
                            : styles.delegateCardPending
                        }`}
                      >
                        {/* Header */}
                        <div className={styles.cardHeader}>
                          <div className={styles.cardHeaderTitle}>
                            <h3>{reg.name}</h3>
                            <span className={styles.cardHeaderSubtitle}>
                              ID: <code>{reg.id}</code> · {reg.organization || "Independent Delegate"}
                            </span>
                          </div>
                          <span
                            className={`${styles.statusPill} ${
                              reg.status === "approved"
                                ? styles.statusPillApproved
                                : reg.status === "rejected"
                                ? styles.statusPillRejected
                                : styles.statusPillPending
                            }`}
                          >
                            {reg.status === "approved" ? (
                              <>
                                <CheckCircle2 size={13} />
                                Approved Entry Pass
                              </>
                            ) : reg.status === "rejected" ? (
                              <>
                                <XCircle size={13} />
                                Payment Proof Rejected
                              </>
                            ) : (
                              <>
                                <Clock size={13} />
                                Under Secretariat Review
                              </>
                            )}
                          </span>
                        </div>

                        {/* Info Grid */}
                        <div className={styles.infoGrid}>
                          <div className={styles.infoField}>
                            <dt>Committee Allotted</dt>
                            <dd>
                              <strong>{reg.committee || "Pending Allotment"}</strong>
                            </dd>
                          </div>
                          <div className={styles.infoField}>
                            <dt>Email</dt>
                            <dd>{reg.email}</dd>
                          </div>
                          <div className={styles.infoField}>
                            <dt>Phone</dt>
                            <dd>{reg.phone || "Not provided"}</dd>
                          </div>
                          <div className={styles.infoField}>
                            <dt>Payment UTR</dt>
                            <dd>
                              <code>{reg.utr || "Verified"}</code>
                            </dd>
                          </div>
                        </div>

                        {/* 1A: APPROVED PASS WITH GENERATED QR & VENUE DETAILS */}
                        {reg.status === "approved" && (
                          <div className={styles.qrPassContainer}>
                            <div className={styles.qrImageWrapper}>
                              {(reg.qr || entryQrs[reg.id]) ? (
                                <img
                                  src={reg.qr || entryQrs[reg.id]}
                                  alt={`Gate check-in QR pass for ${reg.name}`}
                                  className={styles.qrImage}
                                />
                              ) : (
                                <div style={{ width: 140, height: 140, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                  <RefreshCw className="animate-spin text-gray-500" size={24} />
                                </div>
                              )}
                            </div>
                            <div className={styles.qrPassDetails}>
                              <div className={styles.qrPassTitle}>ARKHAM MUN OFFICIAL ENTRY PASS</div>
                              <div className={styles.qrPassMeta}>
                                <span>
                                  <Calendar size={13} /> {reg.event?.date || "24–25 October 2026"}
                                </span>
                                <span>
                                  <Clock size={13} /> {reg.event?.time || "9:00 AM – 5:00 PM (Reporting: 8:30 AM)"}
                                </span>
                                <span>
                                  <MapPin size={13} /> {reg.event?.venue || "Central Delhi, India"}
                                </span>
                                <span>
                                  <User size={13} /> Delegate: <strong>{reg.name}</strong> ({reg.committee})
                                </span>
                              </div>
                              <p className={styles.venueNotice}>
                                Present this signed QR code at the venue check-in desk. Each QR is single-use and verifiable offline.
                              </p>
                              {(reg.qr || entryQrs[reg.id]) && (
                                <button
                                  type="button"
                                  onClick={() => handleDownloadQr((reg.qr || entryQrs[reg.id])!, reg.id, reg.name)}
                                  className={styles.resubmitBtn}
                                  style={{ marginTop: 6, alignSelf: "flex-start", padding: "6px 12px", fontSize: "0.75rem" }}
                                >
                                  <Download size={13} />
                                  Download Entry QR Pass
                                </button>
                              )}
                            </div>
                          </div>
                        )}

                        {/* 1B: REJECTION NOTICE WITH REASON & RESUBMIT ACTION */}
                        {reg.status === "rejected" && (
                          <div className={styles.rejectionBox}>
                            <div className={styles.rejectionHeading}>
                              <AlertTriangle size={15} />
                              Payment Verification Notice from Secretariat
                            </div>
                            <div className={styles.rejectionReason}>
                              <strong>Rejection Reason: </strong>
                              {reg.reject_reason || "Payment proof could not be verified by Secretariat accounts."}
                            </div>
                            <div className={styles.resubmitActionRow}>
                              <span style={{ fontSize: "0.78rem", color: "rgba(255, 255, 255, 0.7)" }}>
                                Please review your UTR transaction reference and screenshot, then resubmit your corrected proof.
                              </span>
                              <Link
                                href="/register"
                                onClick={() => setIsOpen(false)}
                                className={styles.resubmitBtn}
                                style={{ textDecoration: "none" }}
                              >
                                Resubmit Payment Proof
                              </Link>
                            </div>
                          </div>
                        )}

                        {/* 1C: UNDER REVIEW */}
                        {reg.status === "payment_submitted" && (
                          <div
                            style={{
                              background: "rgba(234, 179, 8, 0.08)",
                              border: "1px solid rgba(234, 179, 8, 0.3)",
                              borderRadius: 8,
                              padding: "10px 14px",
                              fontSize: "0.8rem",
                              color: "#fde047",
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                            }}
                          >
                            <Clock size={15} />
                            <span>
                              Your payment reference is currently under review by the Secretariat. Once approved, your Entry Pass QR will be displayed here and delivered to <strong>{reg.email}</strong>.
                            </span>
                          </div>
                        )}
                      </article>
                    ))
                  )}
                </>
              )}

              {/* TAB 2: INQUIRIES & REPLIES */}
              {activeTab === "replies" && (
                <>
                  {!data?.queries || data.queries.length === 0 ? (
                    <div className={styles.emptyState}>
                      <MessageSquare className={styles.emptyStateIcon} size={42} />
                      <h4>No contact inquiries on record</h4>
                      <p>
                        Have a question regarding committees, allotment, or registration? Submit a query through our contact desk to receive official replies from the Secretariat.
                      </p>
                      <Link
                        href="/contact"
                        onClick={() => setIsOpen(false)}
                        className={styles.resubmitBtn}
                        style={{ marginTop: 14, textDecoration: "none" }}
                      >
                        Contact Secretariat
                      </Link>
                    </div>
                  ) : (
                    data.queries.map((q) => (
                      <article key={q.id} className={styles.queryCard}>
                        <div className={styles.querySubject}>
                          <span>{q.subject}</span>
                          <span
                            className={`${styles.statusPill} ${
                              q.status === "replied" ? styles.statusPillApproved : styles.statusPillPending
                            }`}
                          >
                            {q.status === "replied" ? "Secretariat Replied" : "Awaiting Reply"}
                          </span>
                        </div>

                        <div className={styles.queryUserMessage}>
                          <span style={{ display: "block", fontSize: "0.72rem", color: "rgba(255, 255, 255, 0.4)", marginBottom: 3 }}>
                            Your Inquiry ({new Date(q.created_at).toLocaleDateString()}):
                          </span>
                          {q.message}
                        </div>

                        {q.status === "replied" && q.reply_message ? (
                          <div className={styles.secretariatReplyBox}>
                            <div className={styles.replyAuthor}>
                              <span>Arkham MUN Secretariat Response:</span>
                              {q.replied_at && (
                                <span style={{ fontSize: "0.72rem", opacity: 0.8 }}>
                                  {new Date(q.replied_at).toLocaleDateString()} · {new Date(q.replied_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                </span>
                              )}
                            </div>
                            <div className={styles.replyText}>{q.reply_message}</div>
                          </div>
                        ) : (
                          <p style={{ margin: 0, fontSize: "0.75rem", color: "rgba(255, 255, 255, 0.45)" }}>
                            ⏳ The Secretariat is reviewing your query. Replies are delivered both here and to your registered email ({q.email}).
                          </p>
                        )}
                      </article>
                    ))
                  )}
                </>
              )}

              {/* TAB 3: UPCOMING & LIVE EVENT DETAILS */}
              {activeTab === "event" && (
                <div className={styles.eventTab}>
                  {/* Countdown */}
                  <div className={styles.countdownBox}>
                    <div className={styles.countdownTitle}>
                      <Sparkles size={13} style={{ display: "inline", marginRight: 5 }} />
                      Countdown to Arkham MUN 2026
                    </div>
                    <div className={styles.countdownGrid}>
                      <div className={styles.countdownUnit}>
                        <span className={styles.countdownNumber}>{timeLeft.days}</span>
                        <span className={styles.countdownLabel}>Days</span>
                      </div>
                      <div className={styles.countdownUnit}>
                        <span className={styles.countdownNumber}>{timeLeft.hours}</span>
                        <span className={styles.countdownLabel}>Hours</span>
                      </div>
                      <div className={styles.countdownUnit}>
                        <span className={styles.countdownNumber}>{timeLeft.minutes}</span>
                        <span className={styles.countdownLabel}>Minutes</span>
                      </div>
                      <div className={styles.countdownUnit}>
                        <span className={styles.countdownNumber}>{timeLeft.seconds}</span>
                        <span className={styles.countdownLabel}>Seconds</span>
                      </div>
                    </div>
                  </div>

                  {/* Event Details Card */}
                  <div className={styles.eventDetailsCard}>
                    <div className={styles.eventDetailRow}>
                      <Calendar className={styles.eventDetailIcon} size={18} />
                      <div className={styles.eventDetailCopy}>
                        <strong>Conference Dates</strong>
                        <p>{data?.announcements?.conferenceDates || "24–25 October 2026"}</p>
                      </div>
                    </div>

                    <div className={styles.eventDetailRow}>
                      <Clock className={styles.eventDetailIcon} size={18} />
                      <div className={styles.eventDetailCopy}>
                        <strong>Schedule & Timings</strong>
                        <p>{data?.announcements?.conferenceTimings || "9:00 AM – 5:00 PM IST (Delegate reporting at 8:30 AM)"}</p>
                      </div>
                    </div>

                    <div className={styles.eventDetailRow}>
                      <MapPin className={styles.eventDetailIcon} size={18} />
                      <div className={styles.eventDetailCopy}>
                        <strong>Official Venue</strong>
                        <p>{data?.announcements?.conferenceVenue || "In Central Delhi, India (Council Rooms & Main Hall)"}</p>
                      </div>
                    </div>

                    <div className={styles.eventDetailRow}>
                      <Building className={styles.eventDetailIcon} size={18} />
                      <div className={styles.eventDetailCopy}>
                        <strong>Secretariat Desk & Assistance</strong>
                        <p>
                          Helpline: <strong>9810110713</strong> · Email: <strong>hello@arkhammun.org</strong> · Instagram: <strong>@arkhammun</strong>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
