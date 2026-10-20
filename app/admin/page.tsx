"use client"

import { FormEvent, useEffect, useRef, useState } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  Camera,
  Check,
  CircleAlert,
  Clock3,
  Layers,
  LoaderCircle,
  LogOut,
  Mail,
  MessageSquare,
  RefreshCw,
  Search,
  Send,
  Settings,
  ShieldCheck,
  UserCheck,
  Users,
  X,
} from "lucide-react"
import jsQR from "jsqr"
import {
  AdminEventSettings,
  AdminRegistration,
  ContactQuery,
  EntryPassApiError,
  EventDetails,
  RegistrationStatus,
  ScannedRegistration,
  entryPassApi,
  setCustomBackendUrl,
} from "@/lib/entry-pass-api"
import styles from "./admin.module.css"

type AdminView = "overview" | "queue" | "delegates" | "scanner" | "queries" | "settings"
type ScanState = { type: "idle" | "valid" | "used" | "invalid" | "error"; message: string }

export default function AdminPage() {
  const [adminKey, setAdminKey] = useState("")
  const [keyInput, setKeyInput] = useState("")
  const [authenticated, setAuthenticated] = useState(false)
  const [activeView, setActiveView] = useState<AdminView>("overview")
  const [customBackend, setCustomBackend] = useState("")
  const [showBackendConfig, setShowBackendConfig] = useState(false)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("arkham_backend_url") || ""
      setCustomBackend(saved)
      if (window.location.hostname.includes("vercel.app") && !process.env.NEXT_PUBLIC_API_URL && !saved) {
        setShowBackendConfig(true)
      }
    }
  }, [])

  // Queue state
  const [queueFilter, setQueueFilter] = useState<RegistrationStatus>("payment_submitted")
  const [queueCounts, setQueueCounts] = useState<{ payment_submitted: number; approved: number; rejected: number }>({
    payment_submitted: 0,
    approved: 0,
    rejected: 0,
  })
  const [searchQuery, setSearchQuery] = useState("")
  const [registrations, setRegistrations] = useState<AdminRegistration[]>([])
  const [allApprovedRegistrations, setAllApprovedRegistrations] = useState<AdminRegistration[]>([])

  // Settings & event controls
  const [settings, setSettings] = useState<AdminEventSettings | null>(null)
  const [eventForm, setEventForm] = useState<EventDetails>({ name: "Arkham MUN", date: "", time: "", venue: "" })
  const [amountInput, setAmountInput] = useState<number>(2200)
  const [upiIdInput, setUpiIdInput] = useState<string>("chauhan5408k@okaxis")
  const [registrationOpenInput, setRegistrationOpenInput] = useState<boolean>(true)
  const [registrationNoticeInput, setRegistrationNoticeInput] = useState<string>("")
  const [settingsBusy, setSettingsBusy] = useState(false)

  // Inquiries / Helpdesk state
  const [queries, setQueries] = useState<ContactQuery[]>([])
  const [queryFilter, setQueryFilter] = useState<"all" | "pending" | "replied">("all")
  const [replyModalQuery, setReplyModalQuery] = useState<ContactQuery | null>(null)
  const [replyMessageText, setReplyMessageText] = useState("")
  const [replyBusy, setReplyBusy] = useState(false)

  // Venue scanner state (Admin only)
  const [manualPayload, setManualPayload] = useState("")
  const [manualBusy, setManualBusy] = useState(false)
  const [scannedRegistration, setScannedRegistration] = useState<ScannedRegistration | null>(null)
  const [cameraOn, setCameraOn] = useState(false)
  const [scanState, setScanState] = useState<ScanState>({ type: "idle", message: "Enter admin key to enable venue check-in." })
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const animationRef = useRef<number | null>(null)
  const scanBusyRef = useRef(false)
  const previousPayloadRef = useRef<string | null>(null)

  // General state
  const [loading, setLoading] = useState(false)
  const [busyId, setBusyId] = useState("")
  const [retryingId, setRetryingId] = useState("")
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const [rejectingId, setRejectingId] = useState("")
  const [rejectReason, setRejectReason] = useState("")
  const [screenshotModalUrl, setScreenshotModalUrl] = useState<string | null>(null)

  useEffect(() => () => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    if (animationRef.current !== null) cancelAnimationFrame(animationRef.current)
  }, [])

  useEffect(() => () => {
    registrations.forEach((registration) => {
      if (registration.screenshotBlobUrl) URL.revokeObjectURL(registration.screenshotBlobUrl)
    })
  }, [registrations])

  // Real-time auto-polling every 6 seconds
  useEffect(() => {
    if (!authenticated || !adminKey) return
    let active = true
    const pollTimer = window.setInterval(async () => {
      try {
        const [submittedRes, approvedRes, rejectedRes, queriesRes] = await Promise.all([
          entryPassApi.getAdminRegistrations(adminKey, "payment_submitted"),
          entryPassApi.getAdminRegistrations(adminKey, "approved"),
          entryPassApi.getAdminRegistrations(adminKey, "rejected"),
          entryPassApi.getAdminQueries(adminKey, "all"),
        ])
        if (!active) return
        setQueueCounts({
          payment_submitted: submittedRes.registrations.length,
          approved: approvedRes.registrations.length,
          rejected: rejectedRes.registrations.length,
        })
        setAllApprovedRegistrations(approvedRes.registrations)
        setQueries(queriesRes.queries)
      } catch {
        // Silently retry on next interval
      }
    }, 6000)
    return () => {
      active = false
      window.clearInterval(pollTimer)
    }
  }, [authenticated, adminKey])

  async function loadData(key = adminKey, successMessage?: string, filter = queueFilter) {
    setLoading(true)
    setError("")
    try {
      const [submittedRes, approvedRes, rejectedRes, currentSettings, queriesRes] = await Promise.all([
        entryPassApi.getAdminRegistrations(key, "payment_submitted"),
        entryPassApi.getAdminRegistrations(key, "approved"),
        entryPassApi.getAdminRegistrations(key, "rejected"),
        entryPassApi.getAdminSettings(key),
        entryPassApi.getAdminQueries(key, "all"),
      ])

      setQueueCounts({
        payment_submitted: submittedRes.registrations.length,
        approved: approvedRes.registrations.length,
        rejected: rejectedRes.registrations.length,
      })

      setAllApprovedRegistrations(approvedRes.registrations)
      setQueries(queriesRes.queries)

      const targetList = filter === "payment_submitted" ? submittedRes.registrations : filter === "approved" ? approvedRes.registrations : rejectedRes.registrations

      const next = await Promise.all(targetList.map(async (registration) => {
        if (!registration.screenshot_url) return registration
        try {
          const blob = await entryPassApi.getScreenshot(registration.screenshot_url, key)
          return { ...registration, screenshotBlobUrl: URL.createObjectURL(blob) }
        } catch {
          return registration
        }
      }))

      registrations.forEach((registration) => {
        if (registration.screenshotBlobUrl) URL.revokeObjectURL(registration.screenshotBlobUrl)
      })

      setRegistrations(next)
      setSettings(currentSettings)
      setEventForm(currentSettings.event)
      setAmountInput(currentSettings.amount)
      setUpiIdInput(currentSettings.upiId || "chauhan5408k@okaxis")
      setRegistrationOpenInput(currentSettings.registrationOpen)
      setRegistrationNoticeInput(currentSettings.registrationNotice || "")
      setAdminKey(key)
      setAuthenticated(true)
      setQueueFilter(filter)

      const count = next.length
      const filterLabel = filter === "payment_submitted" ? "submission" : filter === "approved" ? "approved pass" : filter === "rejected" ? "rejected submission" : "registration"
      setNotice(successMessage || `${count} ${filterLabel}${count === 1 ? "" : "s"} loaded.`)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load admin portal.")
      setAuthenticated(false)
    } finally {
      setLoading(false)
    }
  }

  async function handleKeySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (customBackend.trim()) {
      setCustomBackendUrl(customBackend.trim())
    }
    await loadData(keyInput)
  }

  async function approve(id: string) {
    setBusyId(id)
    setError("")
    try {
      const res = await entryPassApi.approveRegistration(id, adminKey)
      let msg = "Payment approved and signed entry pass issued."
      if (res.email?.status === "sent") {
        msg = "Payment approved and entry pass emailed to delegate."
      } else if (res.email?.status === "failed") {
        msg = `Payment approved, but email delivery failed: ${res.email.error || "delivery error"}. You can retry from Approved list.`
      } else if (res.email?.status === "not_configured") {
        msg = "Payment approved. Email delivery is not configured on the server."
      }
      await loadData(adminKey, msg, queueFilter)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to approve registration.")
    } finally {
      setBusyId("")
    }
  }

  async function handleRetryEmail(id: string, force = false) {
    setRetryingId(id)
    setError("")
    try {
      const res = await entryPassApi.retryEmail(id, adminKey, force)
      const msg = res.email.status === "sent" ? "Approval email sent successfully." : `Email status: ${res.email.status}`
      await loadData(adminKey, msg, queueFilter)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to send approval email.")
    } finally {
      setRetryingId("")
    }
  }

  async function reject(id: string) {
    if (!rejectReason.trim()) {
      setError("Enter a reason before rejecting this payment.")
      return
    }
    setBusyId(id)
    setError("")
    try {
      await entryPassApi.rejectRegistration(id, rejectReason.trim(), adminKey)
      setRejectingId("")
      setRejectReason("")
      await loadData(adminKey, "Payment submission rejected.", queueFilter)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to reject registration.")
    } finally {
      setBusyId("")
    }
  }

  async function saveAllSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSettingsBusy(true)
    setError("")
    try {
      const result = await entryPassApi.saveAdminSettings({
        event: eventForm,
        amount: Number(amountInput),
        upiId: upiIdInput.trim(),
        registrationOpen: registrationOpenInput,
        registrationNotice: registrationNoticeInput.trim(),
      }, adminKey)

      setSettings(result)
      setEventForm(result.event)
      setAmountInput(result.amount)
      setUpiIdInput(result.upiId)
      setRegistrationOpenInput(result.registrationOpen)
      setRegistrationNoticeInput(result.registrationNotice)
      setNotice("Registration and event controls updated successfully.")
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to save settings.")
    } finally {
      setSettingsBusy(false)
    }
  }

  async function uploadPaymentQr(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const fileInput = form.elements.namedItem("paymentQr")
    const file = fileInput instanceof HTMLInputElement ? fileInput.files?.[0] : undefined
    if (!file) {
      setError("Choose a payment QR poster image to upload.")
      return
    }
    setSettingsBusy(true)
    setError("")
    try {
      const result = await entryPassApi.uploadPaymentQr(file, adminKey)
      setSettings((current) => current ? { ...current, paymentQrConfigured: result.paymentQrConfigured, paymentQrUrl: result.paymentQrUrl } : current)
      form.reset()
      setNotice("Payment QR poster uploaded successfully.")
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to upload payment QR poster.")
    } finally {
      setSettingsBusy(false)
    }
  }

  async function handleSendReply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!replyModalQuery || !replyMessageText.trim()) return
    setReplyBusy(true)
    setError("")
    try {
      const res = await entryPassApi.replyAdminQuery(replyModalQuery.id, replyMessageText.trim(), adminKey)
      let msg = "Reply sent to user successfully via email."
      if (!res.emailSent) {
        msg = `Reply recorded in dashboard (${res.emailError || "SMTP not configured"}).`
      }
      setNotice(msg)
      setReplyModalQuery(null)
      setReplyMessageText("")
      await loadData(adminKey, msg, queueFilter)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send reply.")
    } finally {
      setReplyBusy(false)
    }
  }

  function logout() {
    setCameraOn(false)
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    registrations.forEach((registration) => {
      if (registration.screenshotBlobUrl) URL.revokeObjectURL(registration.screenshotBlobUrl)
    })
    setRegistrations([])
    setAllApprovedRegistrations([])
    setQueries([])
    setAdminKey("")
    setKeyInput("")
    setAuthenticated(false)
    setSettings(null)
    setScannedRegistration(null)
    setNotice("")
    setError("")
  }

  async function verifyPass(rawInput: string) {
    const input = rawInput.trim()
    if (!input) return
    scanBusyRef.current = true
    setScanState({ type: "idle", message: "Verifying pass at gate…" })
    setScannedRegistration(null)

    let payload = input
    try {
      if (!payload.includes(".") && payload.length > 8) {
        const pass = await entryPassApi.getEntryQr(payload)
        payload = pass.payload
      }

      const result = await entryPassApi.verifyEntry(payload, adminKey)
      if (result.valid) {
        setScannedRegistration(result.registration)
        setScanState({ type: "valid", message: `VALID PASS · ${result.registration.name} · entry cleared` })
        setNotice(`Delegate ${result.registration.name} checked in successfully.`)
        // Refresh approved list
        const approvedRes = await entryPassApi.getAdminRegistrations(adminKey, "approved")
        setAllApprovedRegistrations(approvedRes.registrations)
      } else {
        setScanState({ type: "invalid", message: "INVALID PASS · This is not a valid signed entry QR." })
      }
    } catch (requestError) {
      if (requestError instanceof EntryPassApiError && requestError.status === 409 && requestError.body.reason === "already_used") {
        setScanState({ type: "used", message: `ALREADY USED · ${String(requestError.body.name || "This pass")} was admitted earlier.` })
      } else if (requestError instanceof EntryPassApiError && requestError.status === 401) {
        setScanState({ type: "invalid", message: "INVALID · Admin key rejected." })
      } else if (requestError instanceof EntryPassApiError && requestError.status === 404) {
        setScanState({ type: "invalid", message: "INVALID · Registration ID not found." })
      } else {
        setScanState({ type: "error", message: requestError instanceof Error ? requestError.message : "Unable to verify this pass." })
      }
    } finally {
      scanBusyRef.current = false
    }
  }

  const verifyPassRef = useRef(verifyPass)
  useEffect(() => {
    verifyPassRef.current = verifyPass
  })

  async function handleManualVerify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!manualPayload.trim()) return
    setManualBusy(true)
    await verifyPass(manualPayload)
    setManualBusy(false)
  }

  useEffect(() => {
    if (!cameraOn) return
    let active = true
    let localStream: MediaStream | null = null

    async function begin() {
      if (!navigator.mediaDevices?.getUserMedia || !window.isSecureContext) {
        setScanState({ type: "error", message: "Camera scanning requires HTTPS in production (localhost is supported for testing)." })
        setCameraOn(false)
        return
      }
      try {
        localStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false })
        if (!active) {
          localStream.getTracks().forEach((track) => track.stop())
          return
        }
        streamRef.current = localStream
        if (videoRef.current) {
          videoRef.current.srcObject = localStream
          await videoRef.current.play()
        }
        setScanState({ type: "idle", message: "Camera is active. Frame the delegate's signed QR." })
        scanFrame()
      } catch (cameraError) {
        setScanState({ type: "error", message: cameraError instanceof Error && cameraError.name === "NotAllowedError" ? "Camera permission was denied." : "Unable to start camera on device." })
        setCameraOn(false)
      }
    }

    function scanFrame() {
      const video = videoRef.current
      const canvas = canvasRef.current
      if (!active || !video || !canvas || !localStream) return
      if (!scanBusyRef.current && video.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA && video.videoWidth > 0) {
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        const context = canvas.getContext("2d", { willReadFrequently: true })
        if (context) {
          context.drawImage(video, 0, 0, canvas.width, canvas.height)
          const frame = context.getImageData(0, 0, canvas.width, canvas.height)
          const decoded = jsQR(frame.data, frame.width, frame.height, { inversionAttempts: "dontInvert" })
          if (decoded?.data) {
            if (decoded.data !== previousPayloadRef.current) {
              previousPayloadRef.current = decoded.data
              void verifyPassRef.current(decoded.data)
            }
          } else {
            previousPayloadRef.current = null
          }
        }
      }
      animationRef.current = requestAnimationFrame(scanFrame)
    }

    void begin()

    return () => {
      active = false
      if (animationRef.current !== null) cancelAnimationFrame(animationRef.current)
      localStream?.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
  }, [cameraOn])

  // Computed metrics
  const totalApproved = queueCounts.approved
  const checkedInCount = allApprovedRegistrations.filter((r) => r.used_at).length
  const pendingInquiriesCount = queries.filter((q) => q.status === "pending").length

  const filteredRegistrations = registrations.filter((reg) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return (
      reg.name.toLowerCase().includes(q) ||
      (reg.email && reg.email.toLowerCase().includes(q)) ||
      (reg.utr && reg.utr.toLowerCase().includes(q)) ||
      (reg.committee && reg.committee.toLowerCase().includes(q)) ||
      (reg.organization && reg.organization.toLowerCase().includes(q))
    )
  })

  const filteredQueries = queries.filter((q) => {
    if (queryFilter === "all") return true
    return q.status === queryFilter
  })

  if (!authenticated) {
    return (
      <main className={styles.adminPage}>
        <div className={styles.loginPanel}>
          <ShieldCheck size={36} />
          <h2>Secretariat Control Center</h2>
          <p>
            Authenticate with your shared admin key to manage delegate registrations, payment approvals, venue gate check-in, and contact enquiries.
          </p>
          <form onSubmit={handleKeySubmit}>
            <label>
              Shared Admin Key
              <input
                type="password"
                required
                autoComplete="current-password"
                value={keyInput}
                onChange={(event) => setKeyInput(event.target.value)}
                placeholder="Enter admin authorization key"
              />
            </label>
            {showBackendConfig && (
              <label style={{ marginTop: 12 }}>
                Backend API URL (Render / Live Server)
                <input
                  type="url"
                  value={customBackend}
                  onChange={(event) => setCustomBackend(event.target.value)}
                  placeholder="https://your-backend.onrender.com"
                />
                <small style={{ color: "#aaa8ba", fontSize: 11, display: "block", marginTop: 4 }}>
                  Enter your deployed Render backend URL when using Vercel.
                </small>
              </label>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6, marginBottom: 14 }}>
              <button
                type="button"
                onClick={() => setShowBackendConfig(!showBackendConfig)}
                style={{ background: "none", border: "none", color: "#8d8a9e", fontSize: 11, cursor: "pointer", padding: 0, textDecoration: "underline" }}
              >
                {showBackendConfig ? "Hide backend server URL" : "Configure Backend Server URL"}
              </button>
            </div>
            <button className={styles.primaryButton} type="submit" disabled={loading}>
              {loading ? <LoaderCircle className={styles.spinner} size={16} /> : null}
              {loading ? "Verifying key…" : "Access Admin Center"}
            </button>
          </form>
          {error && <p className={styles.error}><CircleAlert size={14} />{error}</p>}
        </div>
      </main>
    )
  }

  return (
    <div className={styles.adminPage}>
      <header className={styles.header}>
        <Link className={styles.backLink} href="/">
          <ArrowLeft size={16} /> Public Website
        </Link>
        <div className={styles.headerTitle}>
          <span className={styles.kicker}>SECRETARIAT CONTROL CENTER</span>
          <h1>Arkham MUN Operations</h1>
        </div>
        <button className={styles.logoutButton} onClick={logout} type="button">
          <LogOut size={14} /> Log out
        </button>
      </header>

      {/* Main Tab Navigation */}
      <nav className={styles.tabs} aria-label="Admin work areas">
        <button
          className={activeView === "overview" ? styles.activeTab : ""}
          onClick={() => setActiveView("overview")}
          type="button"
        >
          <Layers size={15} /> Overview
        </button>

        <button
          className={activeView === "queue" ? styles.activeTab : ""}
          onClick={() => { setActiveView("queue"); void loadData(adminKey, undefined, queueFilter) }}
          type="button"
        >
          <Clock3 size={15} />
          Payment Approvals
          {queueCounts.payment_submitted > 0 && <span>{queueCounts.payment_submitted}</span>}
        </button>

        <button
          className={activeView === "delegates" ? styles.activeTab : ""}
          onClick={() => setActiveView("delegates")}
          type="button"
        >
          <Users size={15} /> Approved Passes <span>{queueCounts.approved}</span>
        </button>

        <button
          className={activeView === "scanner" ? styles.activeTab : ""}
          onClick={() => setActiveView("scanner")}
          type="button"
        >
          <Camera size={15} /> Venue Scanner (Admin Only)
        </button>

        <button
          className={activeView === "queries" ? styles.activeTab : ""}
          onClick={() => setActiveView("queries")}
          type="button"
        >
          <MessageSquare size={15} />
          Contact Inquiries
          {pendingInquiriesCount > 0 && <span>{pendingInquiriesCount}</span>}
        </button>

        <button
          className={activeView === "settings" ? styles.activeTab : ""}
          onClick={() => setActiveView("settings")}
          type="button"
        >
          <Settings size={15} /> Registration & Controls
        </button>
      </nav>

      {notice && <p className={styles.notice}><Check size={14} />{notice}</p>}
      {error && <p className={styles.error}><CircleAlert size={14} />{error}</p>}

      {/* VIEW 1: OVERVIEW / DASHBOARD */}
      {activeView === "overview" && (
        <section className={styles.queuePanel}>
          <div className={styles.sectionHeading}>
            <div>
              <span className={styles.kicker}>EXECUTIVE SUMMARY</span>
              <h2>Operations Dashboard</h2>
              <p>Live metrics across registration volume, payments, gate check-in, and communications.</p>
            </div>
            <button className={styles.iconButton} onClick={() => void loadData(adminKey, "Data refreshed.")} title="Refresh metrics">
              <RefreshCw size={15} />
            </button>
          </div>

          <div className={styles.metricsGrid}>
            <button
              type="button"
              className={`${styles.metricCard} ${queueCounts.payment_submitted > 0 ? styles.metricCardActive : ""}`}
              onClick={() => { setQueueFilter("payment_submitted"); setActiveView("queue"); void loadData(adminKey, undefined, "payment_submitted") }}
            >
              <div className={styles.metricLabel}>
                <span>Needs Review</span>
                <Clock3 size={16} />
              </div>
              <span className={styles.metricValue}>{queueCounts.payment_submitted}</span>
              <span className={styles.metricSubtext}>Awaiting Accept/Reject decision</span>
            </button>

            <button
              type="button"
              className={styles.metricCard}
              onClick={() => { setActiveView("delegates") }}
            >
              <div className={styles.metricLabel}>
                <span>Approved Passes</span>
                <UserCheck size={16} />
              </div>
              <span className={styles.metricValue}>{totalApproved}</span>
              <span className={styles.metricSubtext}>Signed entry passes issued</span>
            </button>

            <button
              type="button"
              className={styles.metricCard}
              onClick={() => { setActiveView("scanner") }}
            >
              <div className={styles.metricLabel}>
                <span>Venue Checked-In</span>
                <Camera size={16} />
              </div>
              <span className={styles.metricValue}>{checkedInCount} / {totalApproved}</span>
              <span className={styles.metricSubtext}>Delegates admitted at entrance</span>
            </button>

            <button
              type="button"
              className={styles.metricCard}
              onClick={() => { setActiveView("queries") }}
            >
              <div className={styles.metricLabel}>
                <span>Contact Inquiries</span>
                <MessageSquare size={16} />
              </div>
              <span className={styles.metricValue}>{pendingInquiriesCount}</span>
              <span className={styles.metricSubtext}>{queries.length} total messages received</span>
            </button>

            <div className={styles.metricCard}>
              <div className={styles.metricLabel}>
                <span>Registration Status</span>
                <Settings size={16} />
              </div>
              <span className={styles.metricValue} style={{ fontSize: 20, color: settings?.registrationOpen ? "#2ecc71" : "#e74c3c" }}>
                {settings?.registrationOpen ? "OPEN & ACTIVE" : "CLOSED / PAUSED"}
              </span>
              <span className={styles.metricSubtext}>Entry Fee: INR {Number(settings?.amount || 2200).toFixed(2)}</span>
            </div>
          </div>

          {/* Quick Setup Checklist */}
          <div className={styles.manualVerifyCard} style={{ marginTop: 12 }}>
            <h3>Secretariat Action Area</h3>
            <p>Click any button below to immediately access the respective control section.</p>
            <div className={styles.actions}>
              <button className={styles.primaryButton} onClick={() => { setActiveView("queue"); void loadData(adminKey, undefined, "payment_submitted") }}>
                <Clock3 size={14} /> Review Pending Payments ({queueCounts.payment_submitted})
              </button>
              <button className={styles.secondaryButton} onClick={() => setActiveView("scanner")}>
                <Camera size={14} /> Launch Venue Check-in Scanner
              </button>
              <button className={styles.secondaryButton} onClick={() => setActiveView("queries")}>
                <MessageSquare size={14} /> Respond to Contact Inquiries ({pendingInquiriesCount})
              </button>
              <button className={styles.secondaryButton} onClick={() => setActiveView("settings")}>
                <Settings size={14} /> Change Fee, QR & Sessions
              </button>
            </div>
          </div>
        </section>
      )}

      {/* VIEW 2: PAYMENT REVIEW & APPROVALS */}
      {activeView === "queue" && (
        <section className={styles.queuePanel}>
          <div className={styles.sectionHeading}>
            <div>
              <span className={styles.kicker}>PAYMENT VERIFICATION</span>
              <h2>Review Queue & Approvals</h2>
              <p>Verify submitted UTR references and payment proofs, then approve or reject.</p>
            </div>
            <button className={styles.iconButton} onClick={() => void loadData(adminKey, "Queue refreshed.", queueFilter)} title="Refresh review queue">
              <RefreshCw size={15} />
            </button>
          </div>

          {/* Live Notification Banner */}
          {queueCounts.payment_submitted > 0 && (
            <div className={styles.liveNotificationBanner}>
              <div className={styles.notificationHeader}>
                <span className={styles.livePulseDot} />
                <strong>Live Notification:</strong>
                <span className={styles.notificationTag}>Action Needed</span>
                <span>{queueCounts.payment_submitted} payment submission{queueCounts.payment_submitted === 1 ? "" : "s"} waiting for review</span>
              </div>
              <p className={styles.notificationSubtext}>
                When you click <strong>Accept</strong>, the delegate instantly receives their signed entry QR pass both on the website and via automated email.
              </p>
            </div>
          )}

          {/* Subtabs & Search */}
          <div className={styles.subtabs}>
            <button
              className={`${styles.subtab} ${queueFilter === "payment_submitted" ? styles.activeSubtab : ""}`}
              onClick={() => void loadData(adminKey, undefined, "payment_submitted")}
              type="button"
            >
              Needs Review ({queueCounts.payment_submitted})
            </button>
            <button
              className={`${styles.subtab} ${queueFilter === "approved" ? styles.activeSubtab : ""}`}
              onClick={() => void loadData(adminKey, undefined, "approved")}
              type="button"
            >
              Approved Passes ({queueCounts.approved})
            </button>
            <button
              className={`${styles.subtab} ${queueFilter === "rejected" ? styles.activeSubtab : ""}`}
              onClick={() => void loadData(adminKey, undefined, "rejected")}
              type="button"
            >
              Rejected ({queueCounts.rejected})
            </button>
          </div>

          <div className={styles.searchBar}>
            <Search size={15} color="#858094" />
            <input
              type="text"
              placeholder="Search submissions by delegate name, email, UTR reference, or committee…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className={styles.searchClear} onClick={() => setSearchQuery("")} title="Clear search">
                <X size={14} />
              </button>
            )}
          </div>

          {loading ? (
            <div className={styles.emptyState}>
              <LoaderCircle className={styles.spinner} size={18} /> Loading submissions…
            </div>
          ) : filteredRegistrations.length === 0 ? (
            <div className={styles.emptyState}>
              {searchQuery ? `No registrations match "${searchQuery}".` : "No registrations found in this category."}
            </div>
          ) : (
            <div className={styles.queueList}>
              {filteredRegistrations.map((registration) => (
                <article className={styles.registration} key={registration.id}>
                  <div className={styles.registrationTitle}>
                    <div>
                      <h3>{registration.name}</h3>
                      <p>
                        Registration ID: <code>{registration.id}</code> · Submitted {new Date(registration.created_at).toLocaleString()}
                      </p>
                    </div>
                    <span>INR {Number(registration.amount).toFixed(2)}</span>
                  </div>

                  {/* Confirmed Badge */}
                  <div className={styles.confirmedBadge}>
                    <Check size={13} /> Delegate confirmed UPI transfer
                  </div>

                  <dl className={styles.registrationDetails}>
                    <div><dt>Email</dt><dd>{registration.email || registration.contact}</dd></div>
                    <div><dt>Phone</dt><dd>{registration.phone || "Not provided"}</dd></div>
                    <div><dt>School / Organization</dt><dd>{registration.organization || "Not provided"}</dd></div>
                    <div><dt>Committee</dt><dd>{registration.committee || "Not provided"}</dd></div>
                    <div><dt>Transaction UTR</dt><dd><code>{registration.utr || "Not provided"}</code></dd></div>
                  </dl>

                  {/* Screenshot proof */}
                  {registration.screenshotBlobUrl && (
                    <div style={{ marginTop: 12 }}>
                      <span className={styles.subtle}>Submitted Screenshot:</span>
                      <img
                        className={styles.proofImage}
                        src={registration.screenshotBlobUrl}
                        alt={`Payment proof for ${registration.name}`}
                        onClick={() => setScreenshotModalUrl(registration.screenshotBlobUrl || null)}
                        style={{ cursor: "pointer" }}
                        title="Click to view full image"
                      />
                    </div>
                  )}

                  {/* Actions for Pending Review */}
                  {registration.status === "payment_submitted" && (
                    <div className={styles.actions}>
                      <button
                        className={styles.approveButton}
                        disabled={busyId === registration.id}
                        onClick={() => approve(registration.id)}
                        type="button"
                      >
                        {busyId === registration.id ? <LoaderCircle className={styles.spinner} size={14} /> : <Check size={14} />}
                        Accept & issue pass
                      </button>
                      <button
                        className={styles.rejectButton}
                        disabled={busyId === registration.id}
                        onClick={() => { setRejectingId(registration.id); setRejectReason("") }}
                        type="button"
                      >
                        <X size={14} /> Reject
                      </button>
                    </div>
                  )}

                  {/* Rejection Form Dialog */}
                  {rejectingId === registration.id && (
                    <div className={styles.rejectForm} style={{ marginTop: 14 }}>
                      <label>
                        Rejection reason (shown to delegate on website):
                        <textarea
                          rows={3}
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                          placeholder="e.g. UTR reference not found in bank statement, amount mismatch, etc."
                        />
                      </label>
                      <div className={styles.actions}>
                        <button
                          className={styles.rejectButton}
                          disabled={busyId === registration.id}
                          onClick={() => reject(registration.id)}
                          type="button"
                        >
                          Confirm Rejection
                        </button>
                        <button
                          className={styles.secondaryButton}
                          onClick={() => { setRejectingId(""); setRejectReason("") }}
                          type="button"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Approved Email Block */}
                  {registration.status === "approved" && (
                    <div className={styles.emailBlock}>
                      <div className={styles.emailInfo}>
                        <strong>Email Delivery:</strong>
                        <span className={`${styles.emailBadge} ${styles[registration.email_status || "pending"]}`}>
                          {registration.email_status === "sent" ? "Sent" : registration.email_status === "failed" ? "Failed" : registration.email_status === "not_configured" ? "Not configured" : "Pending"}
                        </span>
                        {registration.email_sent_at && <span>Sent {new Date(registration.email_sent_at).toLocaleTimeString()}</span>}
                        {registration.email_error && <span style={{ color: "#ffb5b8" }}>{registration.email_error}</span>}
                      </div>
                      <button
                        className={styles.retryButton}
                        disabled={retryingId === registration.id}
                        onClick={() => handleRetryEmail(registration.id, registration.email_status === "sent")}
                        type="button"
                      >
                        {retryingId === registration.id ? <LoaderCircle className={styles.spinner} size={12} /> : <Mail size={12} />}
                        {registration.email_status === "sent" ? "Resend email" : "Retry send"}
                      </button>
                    </div>
                  )}

                  {registration.status === "rejected" && registration.reject_reason && (
                    <p style={{ marginTop: 12, color: "#ffb5b8", fontSize: 12 }}>
                      <strong>Rejection reason:</strong> {registration.reject_reason}
                    </p>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {/* VIEW 3: APPROVED DELEGATES ROSTER */}
      {activeView === "delegates" && (
        <section className={styles.queuePanel}>
          <div className={styles.sectionHeading}>
            <div>
              <span className={styles.kicker}>CONFIRMED DELEGATES</span>
              <h2>Approved Passes Roster ({allApprovedRegistrations.length})</h2>
              <p>Roster of all approved delegates, venue admittance status, and email delivery records.</p>
            </div>
            <button className={styles.iconButton} onClick={() => void loadData(adminKey, "Roster refreshed.")} title="Refresh roster">
              <RefreshCw size={15} />
            </button>
          </div>

          <div className={styles.searchBar}>
            <Search size={15} color="#858094" />
            <input
              type="text"
              placeholder="Search approved delegates by name, email, committee, or school…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {allApprovedRegistrations.length === 0 ? (
            <div className={styles.emptyState}>No approved passes yet. Review submitted payments to issue passes.</div>
          ) : (
            <div className={styles.queueList}>
              {allApprovedRegistrations
                .filter((reg) => {
                  if (!searchQuery.trim()) return true
                  const q = searchQuery.toLowerCase()
                  return (
                    reg.name.toLowerCase().includes(q) ||
                    (reg.email && reg.email.toLowerCase().includes(q)) ||
                    (reg.committee && reg.committee.toLowerCase().includes(q)) ||
                    (reg.organization && reg.organization.toLowerCase().includes(q))
                  )
                })
                .map((reg) => (
                  <article className={styles.registration} key={reg.id}>
                    <div className={styles.registrationTitle}>
                      <div>
                        <h3>{reg.name}</h3>
                        <p>Registration ID: <code>{reg.id}</code> · Committee: <strong>{reg.committee || "Unassigned"}</strong></p>
                      </div>
                      <span className={`${styles.checkInBadge} ${reg.used_at ? styles.checked : styles.awaiting}`}>
                        {reg.used_at ? `✓ Checked in ${new Date(reg.used_at).toLocaleTimeString()}` : "⏳ Awaiting Venue Arrival"}
                      </span>
                    </div>

                    <dl className={styles.registrationDetails}>
                      <div><dt>Email</dt><dd>{reg.email || reg.contact}</dd></div>
                      <div><dt>Phone</dt><dd>{reg.phone || "Not provided"}</dd></div>
                      <div><dt>School / Organization</dt><dd>{reg.organization || "Not provided"}</dd></div>
                      <div><dt>Payment UTR</dt><dd><code>{reg.utr || "Verified"}</code></dd></div>
                    </dl>

                    <div className={styles.emailBlock}>
                      <div className={styles.emailInfo}>
                        <strong>Pass Email:</strong>
                        <span className={`${styles.emailBadge} ${styles[reg.email_status || "pending"]}`}>
                          {reg.email_status === "sent" ? "Sent" : reg.email_status === "failed" ? "Failed" : "Pending"}
                        </span>
                        {reg.email_sent_at && <span>Delivered {new Date(reg.email_sent_at).toLocaleTimeString()}</span>}
                      </div>
                      <button
                        className={styles.retryButton}
                        disabled={retryingId === reg.id}
                        onClick={() => handleRetryEmail(reg.id, true)}
                        type="button"
                      >
                        {retryingId === reg.id ? <LoaderCircle className={styles.spinner} size={12} /> : <Mail size={12} />}
                        Resend Pass Email
                      </button>
                    </div>
                  </article>
                ))}
            </div>
          )}
        </section>
      )}

      {/* VIEW 4: VENUE ACCESS SCANNER (ADMIN ONLY) */}
      {activeView === "scanner" && (
        <section className={styles.scannerPanel}>
          <div className={styles.sectionHeading}>
            <div>
              <span className={styles.kicker}>VENUE CHECK-IN SYSTEM</span>
              <h2>Gate Access Scanner</h2>
              <p>Strictly authorized gate staff tool. Validates entry passes and enforces single-use admittance.</p>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span className={styles.subtle}>Checked in: <strong>{checkedInCount} / {totalApproved}</strong></span>
            </div>
          </div>

          <div className={styles.scannerGrid}>
            <div>
              <div className={styles.videoFrame}>
                <video ref={videoRef} playsInline muted />
                <canvas ref={canvasRef} className={styles.hiddenCanvas} />
                {!cameraOn && (
                  <div className={styles.cameraPlaceholder}>
                    <Camera size={34} />
                    <span>Camera is currently stopped</span>
                  </div>
                )}
                {cameraOn && <div className={styles.scanFrame} />}
              </div>

              <div className={styles.actions} style={{ marginTop: 14 }}>
                <button
                  className={styles.primaryButton}
                  type="button"
                  onClick={() => setCameraOn(!cameraOn)}
                >
                  <Camera size={14} />
                  {cameraOn ? "Turn Camera Off" : "Start Entrance Camera"}
                </button>
              </div>
            </div>

            <div className={styles.scanControls}>
              <div className={`${styles.scanResult} ${styles[scanState.type]}`}>
                {scanState.message}
              </div>

              {scannedRegistration && (
                <dl className={styles.scanDetails}>
                  <div><dt>Delegate</dt><dd><strong>{scannedRegistration.name}</strong></dd></div>
                  <div><dt>Committee</dt><dd>{scannedRegistration.committee}</dd></div>
                  <div><dt>School / Org</dt><dd>{scannedRegistration.organization}</dd></div>
                  <div><dt>Payment UTR</dt><dd><code>{scannedRegistration.utr}</code></dd></div>
                  <div><dt>Admitted At</dt><dd>{new Date(scannedRegistration.checkedInAt).toLocaleTimeString()}</dd></div>
                </dl>
              )}

              {/* Manual code input */}
              <div className={styles.manualVerifyCard}>
                <h3>Manual Code Verification</h3>
                <p>If the camera cannot read a damaged screen, paste the signed QR payload or registration ID below:</p>
                <form className={styles.manualForm} onSubmit={handleManualVerify}>
                  <input
                    type="text"
                    placeholder="Enter payload string or Registration ID"
                    value={manualPayload}
                    onChange={(e) => setManualPayload(e.target.value)}
                  />
                  <button className={styles.secondaryButton} type="submit" disabled={manualBusy}>
                    {manualBusy ? <LoaderCircle className={styles.spinner} size={14} /> : <Check size={14} />}
                    Verify & Admit
                  </button>
                </form>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* VIEW 5: CONTACT INQUIRIES & HELPDESK */}
      {activeView === "queries" && (
        <section className={styles.queuePanel}>
          <div className={styles.sectionHeading}>
            <div>
              <span className={styles.kicker}>USER COMMUNICATIONS</span>
              <h2>Contact Inquiries & Helpdesk</h2>
              <p>Respond to questions submitted by delegates from the public Contact page.</p>
            </div>
            <button className={styles.iconButton} onClick={() => void loadData(adminKey, "Inquiries refreshed.")} title="Refresh inquiries">
              <RefreshCw size={15} />
            </button>
          </div>

          <div className={styles.subtabs}>
            <button
              className={`${styles.subtab} ${queryFilter === "all" ? styles.activeSubtab : ""}`}
              onClick={() => setQueryFilter("all")}
              type="button"
            >
              All Inquiries ({queries.length})
            </button>
            <button
              className={`${styles.subtab} ${queryFilter === "pending" ? styles.activeSubtab : ""}`}
              onClick={() => setQueryFilter("pending")}
              type="button"
            >
              Awaiting Reply ({pendingInquiriesCount})
            </button>
            <button
              className={`${styles.subtab} ${queryFilter === "replied" ? styles.activeSubtab : ""}`}
              onClick={() => setQueryFilter("replied")}
              type="button"
            >
              Replied ({queries.length - pendingInquiriesCount})
            </button>
          </div>

          {filteredQueries.length === 0 ? (
            <div className={styles.emptyState}>No inquiries found in this category.</div>
          ) : (
            <div className={styles.queriesList}>
              {filteredQueries.map((query) => (
                <article className={styles.queryCard} key={query.id}>
                  <div className={styles.queryHeader}>
                    <div className={styles.queryAuthor}>
                      <h4>{query.name}</h4>
                      <p>
                        <a href={`mailto:${query.email}`} style={{ color: "#a8dfb9", textDecoration: "none" }}>{query.email}</a>
                        {query.phone && ` · ${query.phone}`} · Received {new Date(query.created_at).toLocaleString()}
                      </p>
                    </div>
                    <span className={`${styles.queryStatusPill} ${styles[query.status]}`}>
                      {query.status === "pending" ? "Awaiting Reply" : "Replied"}
                    </span>
                  </div>

                  <div className={styles.querySubject}>Subject: {query.subject}</div>
                  <div className={styles.queryBody}>{query.message}</div>

                  {query.status === "replied" && query.reply_message && (
                    <div className={styles.replyHistory}>
                      <strong>Secretariat Response sent {query.replied_at ? new Date(query.replied_at).toLocaleString() : ""}:</strong>
                      {query.reply_message}
                    </div>
                  )}

                  <div className={styles.actions}>
                    <button
                      className={styles.secondaryButton}
                      onClick={() => {
                        setReplyModalQuery(query)
                        setReplyMessageText(query.reply_message || "")
                      }}
                      type="button"
                    >
                      <Send size={13} /> {query.status === "replied" ? "Send follow-up reply" : "Reply to delegate via email"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {/* VIEW 6: REGISTRATION & EVENT CONTROLS */}
      {activeView === "settings" && (
        <section className={styles.settingsPanel}>
          <div className={styles.sectionHeading}>
            <div>
              <span className={styles.kicker}>SECRETARIAT CONTROLS</span>
              <h2>Registration & Event Settings</h2>
              <p>Change registration fee amount, UPI ID, payment QR poster, session details, and availability.</p>
            </div>
          </div>

          {/* Registration Controls Form */}
          <form className={styles.settingsForm} onSubmit={saveAllSettings}>
            <h3 style={{ margin: "0 0 4px", fontSize: 16, color: "#fff" }}>Registration Fee & UPI Configuration</h3>
            <p className={styles.subtle}>Set the live entry amount in Rupees and the UPI ID shown on registration pages.</p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <label>
                Registration Fee / Amount (INR)
                <input
                  type="number"
                  min="0"
                  step="1"
                  required
                  value={amountInput}
                  onChange={(e) => setAmountInput(Number(e.target.value))}
                />
              </label>

              <label>
                Official UPI ID (Receiving Account)
                <input
                  type="text"
                  required
                  maxLength={100}
                  value={upiIdInput}
                  onChange={(e) => setUpiIdInput(e.target.value)}
                />
              </label>
            </div>

            {/* Registration Availability Toggle */}
            <div className={styles.controlCard} style={{ marginTop: 10 }}>
              <h4>Registration Status Toggle</h4>
              <p>Turn registration ON or OFF across the public website and modal flow.</p>
              <div className={styles.toggleContainer}>
                <button
                  type="button"
                  className={`${styles.toggleButton} ${registrationOpenInput ? styles.open : styles.closed}`}
                  onClick={() => setRegistrationOpenInput(!registrationOpenInput)}
                >
                  {registrationOpenInput ? "✓ Registration is OPEN" : "✕ Registration is CLOSED"}
                </button>
                <span className={styles.subtle}>
                  {registrationOpenInput ? "Delegates can submit new registrations." : "Registration form is disabled with a notice banner."}
                </span>
              </div>
            </div>

            <label style={{ marginTop: 10 }}>
              Custom Registration Banner Notice (shown when closed or special notice)
              <input
                type="text"
                maxLength={300}
                placeholder="e.g. Registration closes at 11:59 PM today. Priority seats filling fast."
                value={registrationNoticeInput}
                onChange={(e) => setRegistrationNoticeInput(e.target.value)}
              />
            </label>

            <h3 style={{ margin: "24px 0 4px", fontSize: 16, color: "#fff" }}>Event Session Details</h3>
            <p className={styles.subtle}>These details are signed into each approved pass and included in confirmation emails.</p>

            <label>
              Event Name
              <input
                required
                maxLength={160}
                value={eventForm.name}
                onChange={(e) => setEventForm({ ...eventForm, name: e.target.value })}
              />
            </label>

            <label>
              Event Dates
              <input
                required
                maxLength={120}
                placeholder="e.g. 24–25 October 2026"
                value={eventForm.date}
                onChange={(e) => setEventForm({ ...eventForm, date: e.target.value })}
              />
            </label>

            <label>
              Event Timing / Daily Schedule
              <input
                required
                maxLength={120}
                placeholder="e.g. 9:00 AM – 5:00 PM"
                value={eventForm.time}
                onChange={(e) => setEventForm({ ...eventForm, time: e.target.value })}
              />
            </label>

            <label>
              Venue / Conference Hall
              <input
                required
                maxLength={300}
                placeholder="e.g. Main Auditorium, Delhi"
                value={eventForm.venue}
                onChange={(e) => setEventForm({ ...eventForm, venue: e.target.value })}
              />
            </label>

            <button className={styles.primaryButton} type="submit" disabled={settingsBusy} style={{ marginTop: 12 }}>
              {settingsBusy ? <LoaderCircle className={styles.spinner} size={15} /> : <Check size={15} />}
              {settingsBusy ? "Saving controls…" : "Save All Registration & Event Settings"}
            </button>
          </form>

          {/* Payment QR Poster Upload Form */}
          <form className={styles.settingsForm} onSubmit={uploadPaymentQr}>
            <h3 style={{ margin: "0 0 4px", fontSize: 16, color: "#fff" }}>Payment QR Poster Upload</h3>
            <p className={styles.subtle}>Upload a new high-resolution UPI payment QR poster for the registration flow.</p>

            <label>
              Upload Poster Image (JPEG, PNG, WebP, GIF; max 5 MB)
              <input name="paymentQr" type="file" accept="image/jpeg,image/png,image/webp,image/gif" required />
            </label>

            {settings?.paymentQrUrl && (
              <div style={{ marginTop: 10 }}>
                <span className={styles.subtle}>Current payment QR poster:</span>
                <div style={{ marginTop: 8 }}>
                  <img
                    className={styles.paymentQrPreview}
                    src={entryPassApi.paymentQrUrl(settings.paymentQrUrl)}
                    alt="Active payment QR poster"
                    style={{ width: 180, height: 270, objectFit: "contain", background: "#000", border: "1px solid #454052", borderRadius: 6 }}
                  />
                </div>
              </div>
            )}

            <button className={styles.secondaryButton} type="submit" disabled={settingsBusy} style={{ marginTop: 12 }}>
              {settingsBusy ? <LoaderCircle className={styles.spinner} size={14} /> : <Check size={14} />}
              Upload New Payment Poster
            </button>
          </form>
        </section>
      )}

      {/* MODAL 1: REPLY TO USER INQUIRY */}
      {replyModalQuery && (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true">
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3>Reply to Delegate Enquiry</h3>
              <button className={styles.closeButton} onClick={() => setReplyModalQuery(null)}><X size={18} /></button>
            </div>

            <p style={{ margin: 0, fontSize: 13, color: "#b9b5c8" }}>
              Replying to: <strong>{replyModalQuery.name}</strong> (<a href={`mailto:${replyModalQuery.email}`} style={{ color: "#a8dfb9" }}>{replyModalQuery.email}</a>)
              <br />
              Subject: <em>{replyModalQuery.subject}</em>
            </p>

            <div style={{ padding: "10px 12px", background: "rgba(255, 255, 255, .04)", borderRadius: 4, fontSize: 12, color: "#908b9d" }}>
              Original query: {replyModalQuery.message}
            </div>

            <form onSubmit={handleSendReply} style={{ display: "grid", gap: 12 }}>
              <label style={{ fontSize: 12, color: "#fff", fontWeight: 600 }}>
                Secretariat Official Response:
                <textarea
                  rows={6}
                  required
                  maxLength={3000}
                  value={replyMessageText}
                  onChange={(e) => setReplyMessageText(e.target.value)}
                  placeholder="Type your response to the delegate here. This will be sent as an official Secretariat email to the user's address."
                  style={{ width: "100%", padding: 12, marginTop: 6, background: "#0c0b17", border: "1px solid #454052", color: "#fff", borderRadius: 4, outline: "none", resize: "vertical" }}
                />
              </label>

              <div className={styles.actions}>
                <button className={styles.primaryButton} type="submit" disabled={replyBusy}>
                  {replyBusy ? <LoaderCircle className={styles.spinner} size={14} /> : <Send size={14} />}
                  {replyBusy ? "Sending email…" : "Send Official Reply via Email"}
                </button>
                <button className={styles.secondaryButton} type="button" onClick={() => setReplyModalQuery(null)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: SCREENSHOT FULL VIEW ZOOM */}
      {screenshotModalUrl && (
        <div className={styles.modalOverlay} onClick={() => setScreenshotModalUrl(null)}>
          <div style={{ maxWidth: 800, maxHeight: "90vh", position: "relative" }} onClick={(e) => e.stopPropagation()}>
            <img
              src={screenshotModalUrl}
              alt="Payment proof zoom"
              style={{ width: "100%", height: "auto", maxHeight: "85vh", objectFit: "contain", borderRadius: 8, border: "1px solid #fff" }}
            />
            <button
              onClick={() => setScreenshotModalUrl(null)}
              style={{ position: "absolute", top: -12, right: -12, background: "#e3262e", border: 0, color: "#fff", width: 32, height: 32, borderRadius: "50%", cursor: "pointer", display: "grid", placeItems: "center" }}
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}