"use client"

import { FormEvent, useEffect, useRef, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { ArrowLeft, Camera, Check, CircleAlert, Clock3, LoaderCircle, LogOut, Mail, RefreshCw, Search, ShieldCheck, UserCheck, X } from "lucide-react"
import jsQR from "jsqr"
import { AdminEventSettings, AdminRegistration, EntryPassApiError, EventDetails, RegistrationStatus, ScannedRegistration, entryPassApi } from "@/lib/entry-pass-api"
import styles from "./admin.module.css"

type ScanState = { type: "idle" | "valid" | "used" | "invalid" | "error"; message: string }

export default function AdminPage() {
  const [adminKey, setAdminKey] = useState("")
  const [keyInput, setKeyInput] = useState("")
  const [authenticated, setAuthenticated] = useState(false)
  const [activeView, setActiveView] = useState<"queue" | "scanner" | "settings">("queue")
  const [queueFilter, setQueueFilter] = useState<RegistrationStatus>("payment_submitted")
  const [queueCounts, setQueueCounts] = useState<{ payment_submitted: number; approved: number; rejected: number }>({
    payment_submitted: 0,
    approved: 0,
    rejected: 0,
  })
  const [searchQuery, setSearchQuery] = useState("")
  const [manualPayload, setManualPayload] = useState("")
  const [manualBusy, setManualBusy] = useState(false)
  const [registrations, setRegistrations] = useState<AdminRegistration[]>([])
  const [settings, setSettings] = useState<AdminEventSettings | null>(null)
  const [eventForm, setEventForm] = useState<EventDetails>({ name: "Arkham MUN", date: "", time: "", venue: "" })
  const [settingsBusy, setSettingsBusy] = useState(false)
  const [scannedRegistration, setScannedRegistration] = useState<ScannedRegistration | null>(null)
  const [loading, setLoading] = useState(false)
  const [busyId, setBusyId] = useState("")
  const [retryingId, setRetryingId] = useState("")
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const [rejectingId, setRejectingId] = useState("")
  const [rejectReason, setRejectReason] = useState("")
  const [cameraOn, setCameraOn] = useState(false)
  const [scanState, setScanState] = useState<ScanState>({ type: "idle", message: "Enter the admin key to enable venue check-in." })
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const animationRef = useRef<number | null>(null)
  const scanBusyRef = useRef(false)
  const previousPayloadRef = useRef<string | null>(null)

  useEffect(() => () => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    if (animationRef.current !== null) cancelAnimationFrame(animationRef.current)
  }, [])

  useEffect(() => () => {
    registrations.forEach((registration) => {
      if (registration.screenshotBlobUrl) URL.revokeObjectURL(registration.screenshotBlobUrl)
    })
  }, [registrations])

  useEffect(() => {
    if (!authenticated || !adminKey) return
    let active = true
    const pollTimer = window.setInterval(async () => {
      try {
        const [submittedRes, approvedRes, rejectedRes] = await Promise.all([
          entryPassApi.getAdminRegistrations(adminKey, "payment_submitted"),
          entryPassApi.getAdminRegistrations(adminKey, "approved"),
          entryPassApi.getAdminRegistrations(adminKey, "rejected"),
        ])
        if (!active) return
        setQueueCounts({
          payment_submitted: submittedRes.registrations.length,
          approved: approvedRes.registrations.length,
          rejected: rejectedRes.registrations.length,
        })
      } catch {
        // Silently retry on next interval
      }
    }, 6000)
    return () => {
      active = false
      window.clearInterval(pollTimer)
    }
  }, [authenticated, adminKey])

  async function loadQueue(key = adminKey, successMessage?: string, filter = queueFilter) {
    setLoading(true)
    setError("")
    try {
      const [submittedRes, approvedRes, rejectedRes, currentSettings] = await Promise.all([
        entryPassApi.getAdminRegistrations(key, "payment_submitted"),
        entryPassApi.getAdminRegistrations(key, "approved"),
        entryPassApi.getAdminRegistrations(key, "rejected"),
        entryPassApi.getAdminSettings(key),
      ])

      setQueueCounts({
        payment_submitted: submittedRes.registrations.length,
        approved: approvedRes.registrations.length,
        rejected: rejectedRes.registrations.length,
      })

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
      setAdminKey(key)
      setAuthenticated(true)
      setQueueFilter(filter)

      const count = next.length
      const filterLabel = filter === "payment_submitted" ? "submission" : filter === "approved" ? "approved pass" : filter === "rejected" ? "rejected submission" : "registration"
      setNotice(successMessage || `${count} ${filterLabel}${count === 1 ? "" : "s"} loaded.`)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load the review queue.")
      setAuthenticated(false)
    } finally {
      setLoading(false)
    }
  }

  async function handleKeySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await loadQueue(keyInput)
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
        msg = `Payment approved, but email failed: ${res.email.error || "delivery error"}. You can retry from the Approved list.`
      } else if (res.email?.status === "not_configured") {
        msg = "Payment approved. Email delivery is not configured on the server."
      }
      await loadQueue(adminKey, msg, queueFilter)
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
      await loadQueue(adminKey, msg, queueFilter)
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
      await loadQueue(adminKey, "Payment submission rejected.", queueFilter)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to reject registration.")
    } finally {
      setBusyId("")
    }
  }

  async function saveEventSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSettingsBusy(true)
    setError("")
    try {
      const result = await entryPassApi.saveAdminEvent(eventForm, adminKey)
      setEventForm(result.event)
      setSettings((current) => current ? { ...current, event: result.event } : current)
      setNotice("Event details saved successfully.")
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to save event details.")
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
      setError("Choose a payment QR image to upload.")
      return
    }
    setSettingsBusy(true)
    setError("")
    try {
      const result = await entryPassApi.uploadPaymentQr(file, adminKey)
      setSettings((current) => current ? { ...current, paymentQrConfigured: result.paymentQrConfigured, paymentQrUrl: result.paymentQrUrl } : current)
      form.reset()
      setNotice("Payment QR image uploaded.")
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to upload payment QR.")
    } finally {
      setSettingsBusy(false)
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
    setScanState({ type: "idle", message: "Checking entry pass…" })
    setScannedRegistration(null)

    let payload = input
    try {
      // If user typed or pasted a registration UUID/ID instead of the raw JWT payload
      if (!payload.includes(".") && payload.length > 8) {
        const pass = await entryPassApi.getEntryQr(payload)
        payload = pass.payload
      }

      const result = await entryPassApi.verifyEntry(payload, adminKey)
      if (result.valid) {
        setScannedRegistration(result.registration)
        setScanState({ type: "valid", message: `VALID PASS · ${result.registration.name} · entry recorded` })
        setNotice(`Delegate ${result.registration.name} checked in successfully.`)
      } else {
        setScanState({ type: "invalid", message: "INVALID · This is not an approved entry pass." })
      }
    } catch (requestError) {
      if (requestError instanceof EntryPassApiError && requestError.status === 409 && requestError.body.reason === "already_used") {
        setScanState({ type: "used", message: `ALREADY USED · ${String(requestError.body.name || "This pass")} was checked in earlier.` })
      } else if (requestError instanceof EntryPassApiError && requestError.status === 401) {
        setScanState({ type: "invalid", message: "INVALID · The admin key was rejected." })
      } else if (requestError instanceof EntryPassApiError && requestError.status === 404) {
        setScanState({ type: "invalid", message: "INVALID · Registration ID not found." })
      } else if (requestError instanceof EntryPassApiError && requestError.status === 409) {
        setScanState({ type: "invalid", message: "INVALID · This registration has not been approved for entry." })
      } else {
        setScanState({ type: "error", message: requestError instanceof Error ? requestError.message : "Unable to verify this entry pass." })
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
        setScanState({ type: "error", message: "Camera scanning requires HTTPS in production (localhost is supported for development)." })
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
        setScanState({ type: "idle", message: "Camera is ready. Center an entry QR in the frame." })
        scanFrame()
      } catch (cameraError) {
        setScanState({ type: "error", message: cameraError instanceof Error && cameraError.name === "NotAllowedError" ? "Camera permission was denied." : "Unable to start the device camera." })
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
      if (streamRef.current === localStream) streamRef.current = null
    }
  }, [cameraOn, adminKey])

  function stopCamera() {
    setCameraOn(false)
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    if (animationRef.current !== null) cancelAnimationFrame(animationRef.current)
    animationRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
  }

  // Registration gatekeeping readiness
  const isSetupComplete = Boolean(
    settings?.paymentQrConfigured &&
    eventForm.name &&
    eventForm.date &&
    eventForm.time &&
    eventForm.venue
  )

  // Filter registrations based on search query
  const query = searchQuery.trim().toLowerCase()
  const filteredRegistrations = registrations.filter((reg) => {
    if (!query) return true
    return (
      reg.name?.toLowerCase().includes(query) ||
      reg.email?.toLowerCase().includes(query) ||
      reg.phone?.toLowerCase().includes(query) ||
      reg.organization?.toLowerCase().includes(query) ||
      reg.committee?.toLowerCase().includes(query) ||
      reg.utr?.toLowerCase().includes(query) ||
      reg.id?.toLowerCase().includes(query)
    )
  })

  return (
    <main className={styles.adminPage}>
      <header className={styles.header}>
        <Link href="/" className={styles.backLink}><ArrowLeft size={16} /> Arkham MUN Home</Link>
        <div className={styles.headerTitle}><span className={styles.kicker}>SECRETARIAT OPERATIONS</span><h1>Admin Dashboard</h1></div>
        {authenticated && <button className={styles.logoutButton} onClick={logout}><LogOut size={15} /> Sign out</button>}
      </header>

      {!authenticated ? (
        <section className={styles.loginPanel}>
          <ShieldCheck size={26} />
          <h2>Secretariat Access</h2>
          <p>Enter the event admin key to review delegate payment submissions, scan entry passes, or configure conference settings.</p>
          <form onSubmit={handleKeySubmit}>
            <label htmlFor="admin-key">Admin key</label>
            <input id="admin-key" type="password" value={keyInput} onChange={(event) => setKeyInput(event.target.value)} autoComplete="current-password" required placeholder="Enter secretariat admin key" />
            <button className={styles.primaryButton} disabled={loading || !keyInput}>{loading ? <LoaderCircle className={styles.spinner} size={16} /> : null}{loading ? "Authenticating…" : "Open Secretariat Desk"}</button>
          </form>
          {error && <p className={styles.error} role="alert"><CircleAlert size={15} />{error}</p>}
        </section>
      ) : (
        <>
          {/* Operations Metrics / Quick-Switch Work Area */}
          <div className={styles.metricsGrid}>
            <button
              type="button"
              className={`${styles.metricCard} ${activeView === "queue" && queueFilter === "payment_submitted" ? styles.metricCardActive : ""}`}
              onClick={() => { if (activeView === "scanner") stopCamera(); setActiveView("queue"); void loadQueue(adminKey, undefined, "payment_submitted") }}
            >
              <div className={styles.metricLabel}>
                <span>Needs Review</span>
                <Clock3 size={15} color="#ffd19c" />
              </div>
              <span className={styles.metricValue}>{queueCounts.payment_submitted}</span>
              <span className={styles.metricSubtext}>Pending UTR review</span>
            </button>

            <button
              type="button"
              className={`${styles.metricCard} ${activeView === "queue" && queueFilter === "approved" ? styles.metricCardActive : ""}`}
              onClick={() => { if (activeView === "scanner") stopCamera(); setActiveView("queue"); void loadQueue(adminKey, undefined, "approved") }}
            >
              <div className={styles.metricLabel}>
                <span>Approved Passes</span>
                <Check size={15} color="#54bd80" />
              </div>
              <span className={styles.metricValue}>{queueCounts.approved}</span>
              <span className={styles.metricSubtext}>Issued signed entry QRs</span>
            </button>

            <button
              type="button"
              className={`${styles.metricCard} ${activeView === "queue" && queueFilter === "rejected" ? styles.metricCardActive : ""}`}
              onClick={() => { if (activeView === "scanner") stopCamera(); setActiveView("queue"); void loadQueue(adminKey, undefined, "rejected") }}
            >
              <div className={styles.metricLabel}>
                <span>Rejected</span>
                <X size={15} color="#e3262e" />
              </div>
              <span className={styles.metricValue}>{queueCounts.rejected}</span>
              <span className={styles.metricSubtext}>Declined submissions</span>
            </button>

            <button
              type="button"
              className={`${styles.metricCard} ${activeView === "settings" ? styles.metricCardActive : ""}`}
              onClick={() => { if (activeView === "scanner") stopCamera(); setActiveView("settings") }}
            >
              <div className={styles.metricLabel}>
                <span>Registration Gate</span>
                <ShieldCheck size={15} color={isSetupComplete ? "#54bd80" : "#ffd19c"} />
              </div>
              <span className={styles.metricValue} style={{ fontSize: 18, color: isSetupComplete ? "#b5ecc8" : "#ffd19c" }}>
                {isSetupComplete ? "LIVE / OPEN" : "INCOMPLETE"}
              </span>
              <span className={styles.metricSubtext}>
                {isSetupComplete ? "Public registrations active" : "Configure event setup"}
              </span>
            </button>
          </div>

          {/* Live Notification Banner when delegates submit payment proof */}
          {queueCounts.payment_submitted > 0 && (
            <div className={styles.liveNotificationBanner}>
              <div className={styles.notificationHeader}>
                <span className={styles.livePulseDot} />
                <strong>{queueCounts.payment_submitted} Payment Verification{queueCounts.payment_submitted === 1 ? "" : "s"} Received</strong>
                <span className={styles.notificationTag}>Action Required</span>
              </div>
              <p className={styles.notificationSubtext}>
                Delegates have completed UPI transfers to <code>chauhan5408k@okaxis</code> and confirmed payment submission. Review their UTR & screenshot below: click <strong>Accept & Issue Pass</strong> to issue their signed entry QR (both emailed and displayed on their screen) or <strong>Reject</strong> with reason.
              </p>
            </div>
          )}

          <nav className={styles.tabs} aria-label="Admin tools">
            <button className={activeView === "queue" ? styles.activeTab : ""} onClick={() => { if (activeView === "scanner") stopCamera(); setActiveView("queue"); void loadQueue() }}>
              Payment review <span>{registrations.length}</span>
            </button>
            <button className={activeView === "scanner" ? styles.activeTab : ""} onClick={() => setActiveView("scanner")}>
              Venue scanner & Check-in
            </button>
            <button className={activeView === "settings" ? styles.activeTab : ""} onClick={() => { if (activeView === "scanner") stopCamera(); setActiveView("settings") }}>
              Event setup & QR
            </button>
          </nav>

          {notice && <p className={styles.notice} role="status"><Check size={15} />{notice}</p>}
          {error && <p className={styles.error} role="alert"><CircleAlert size={15} />{error}</p>}

          {activeView === "queue" ? (
            <section className={styles.queuePanel}>
              <div className={styles.sectionHeading}>
                <div>
                  <span className={styles.kicker}>
                    {queueFilter === "payment_submitted" ? "PAYMENT-SUBMITTED REGISTRATIONS" : queueFilter === "approved" ? "APPROVED ENTRY PASSES" : "REJECTED SUBMISSIONS"}
                  </span>
                  <h2>{queueFilter === "payment_submitted" ? "Review queue" : queueFilter === "approved" ? "Approved passes" : "Rejected submissions"}</h2>
                </div>
                <button className={styles.iconButton} onClick={() => loadQueue()} disabled={loading} aria-label="Refresh queue" title="Refresh queue">
                  {loading ? <LoaderCircle className={styles.spinner} size={17} /> : <RefreshCw size={17} />}
                </button>
              </div>

              <div className={styles.subtabs} role="tablist" aria-label="Registration filter">
                <button
                  type="button"
                  className={`${styles.subtab} ${queueFilter === "payment_submitted" ? styles.activeSubtab : ""}`}
                  onClick={() => loadQueue(adminKey, undefined, "payment_submitted")}
                  disabled={loading}
                >
                  Needs review ({queueCounts.payment_submitted})
                </button>
                <button
                  type="button"
                  className={`${styles.subtab} ${queueFilter === "approved" ? styles.activeSubtab : ""}`}
                  onClick={() => loadQueue(adminKey, undefined, "approved")}
                  disabled={loading}
                >
                  Approved passes ({queueCounts.approved})
                </button>
                <button
                  type="button"
                  className={`${styles.subtab} ${queueFilter === "rejected" ? styles.activeSubtab : ""}`}
                  onClick={() => loadQueue(adminKey, undefined, "rejected")}
                  disabled={loading}
                >
                  Rejected ({queueCounts.rejected})
                </button>
              </div>

              {/* Work Area: Live Search Filter */}
              <div className={styles.searchBar}>
                <Search size={16} color="#858094" />
                <input
                  type="text"
                  placeholder="Filter by delegate name, email, phone, school, committee, UTR, or ID…"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                />
                {searchQuery && (
                  <button type="button" className={styles.searchClear} onClick={() => setSearchQuery("")} aria-label="Clear search">
                    <X size={14} />
                  </button>
                )}
              </div>

              {loading && registrations.length === 0 ? (
                <p className={styles.emptyState}><LoaderCircle className={styles.spinner} size={18} />Loading submissions…</p>
              ) : filteredRegistrations.length === 0 ? (
                <p className={styles.emptyState}>
                  {searchQuery ? `No registrations match "${searchQuery}".` : queueFilter === "payment_submitted" ? "No payment submissions are waiting for review." : queueFilter === "approved" ? "No registrations have been approved yet." : "No registrations have been rejected."}
                </p>
              ) : (
                <div className={styles.queueList}>
                  {filteredRegistrations.map((registration) => (
                    <article className={styles.registration} key={registration.id}>
                      <div className={styles.registrationTitle}>
                        <div>
                          <h3>{registration.name}</h3>
                          <p>{registration.email || registration.contact}</p>
                        </div>
                        <span>INR {Number(registration.amount).toFixed(2)}</span>
                      </div>
                      <dl className={styles.registrationDetails}>
                        <div><dt>Phone</dt><dd>{registration.phone || "Not provided"}</dd></div>
                        <div><dt>School / organization</dt><dd>{registration.organization || "Not provided"}</dd></div>
                        <div><dt>Committee</dt><dd>{registration.committee || "Not provided"}</dd></div>
                        <div><dt>UTR</dt><dd>{registration.utr || "Not provided"}</dd></div>
                        <div><dt>Submitted</dt><dd>{new Date(registration.created_at).toLocaleString()}</dd></div>
                        <div><dt>Registration ID</dt><dd>{registration.id}</dd></div>
                      </dl>
                      <div className={styles.confirmedBadge}>
                        <Check size={14} color="#54bd80" />
                        <span>Delegate Confirmed UPI Payment (Transferred to chauhan5408k@okaxis)</span>
                      </div>
                      {registration.screenshot_url && (
                        registration.screenshotBlobUrl ? (
                          <a href={registration.screenshotBlobUrl} target="_blank" rel="noreferrer">
                            <Image className={styles.proofImage} src={registration.screenshotBlobUrl} alt={`Payment screenshot from ${registration.name}`} width={420} height={320} unoptimized />
                          </a>
                        ) : (
                          <p className={styles.subtle}>Screenshot could not be loaded.</p>
                        )
                      )}
                      {registration.status === "approved" && (
                        <div className={styles.emailBlock}>
                          <div className={styles.emailInfo}>
                            <Mail size={13} />
                            <span>Email delivery:</span>
                            <span className={`${styles.emailBadge} ${styles[registration.email_status || "pending"]}`}>
                              {registration.email_status === "sent" ? "Sent" : registration.email_status === "failed" ? "Failed" : registration.email_status === "not_configured" ? "Not configured" : "Pending"}
                            </span>
                            {registration.email_sent_at && (
                              <span className={styles.subtle}>Sent {new Date(registration.email_sent_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                            )}
                            {registration.email_error && (
                              <span className={styles.subtle} title={registration.email_error}>
                                {registration.email_error.length > 55 ? `${registration.email_error.slice(0, 55)}…` : registration.email_error}
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            className={styles.retryButton}
                            onClick={() => handleRetryEmail(registration.id, registration.email_status === "sent")}
                            disabled={retryingId === registration.id}
                          >
                            {retryingId === registration.id ? <LoaderCircle className={styles.spinner} size={13} /> : null}
                            {retryingId === registration.id ? "Sending…" : registration.email_status === "sent" ? "Resend email" : registration.email_status === "not_configured" ? "Send email" : "Retry email"}
                          </button>
                        </div>
                      )}
                      {registration.status === "payment_submitted" && (
                        rejectingId === registration.id ? (
                          <div className={styles.rejectForm}>
                            <label htmlFor={`reject-${registration.id}`}>Reason for rejection</label>
                            <textarea id={`reject-${registration.id}`} value={rejectReason} onChange={(event) => setRejectReason(event.target.value)} maxLength={500} rows={2} />
                            <div className={styles.actions}>
                              <button className={styles.rejectButton} onClick={() => reject(registration.id)} disabled={busyId === registration.id}>
                                {busyId === registration.id ? "Saving…" : "Confirm rejection"}
                              </button>
                              <button className={styles.secondaryButton} onClick={() => { setRejectingId(""); setRejectReason("") }}>Cancel</button>
                            </div>
                          </div>
                        ) : (
                          <div className={styles.actions}>
                            <button className={styles.approveButton} onClick={() => approve(registration.id)} disabled={busyId === registration.id}>
                              {busyId === registration.id ? <LoaderCircle className={styles.spinner} size={15} /> : <Check size={15} />}
                              {busyId === registration.id ? "Working…" : "Accept & issue pass"}
                            </button>
                            <button className={styles.rejectButton} onClick={() => { setRejectingId(registration.id); setRejectReason(""); setError("") }} disabled={Boolean(busyId)}>
                              <X size={15} /> Reject
                            </button>
                          </div>
                        )
                      )}
                      {registration.status === "rejected" && (
                        <p className={styles.subtle}>Rejection reason: {registration.reject_reason || "No reason specified"}</p>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </section>
          ) : activeView === "scanner" ? (
            <section className={styles.scannerPanel}>
              <div className={styles.sectionHeading}>
                <div>
                  <span className={styles.kicker}>SINGLE-USE CHECK-IN</span>
                  <h2>Gate scanner & Check-in</h2>
                  <p>First valid scan admits the guest. Subsequent scans will be rejected as already used.</p>
                </div>
              </div>

              <div className={styles.scannerGrid}>
                <div className={styles.videoFrame}>
                  <video ref={videoRef} playsInline muted aria-label="Venue QR scanner camera" />
                  {!cameraOn && <div className={styles.cameraPlaceholder}><Camera size={26} /><span>Camera is off</span></div>}
                  {cameraOn && <div className={styles.scanFrame} aria-hidden="true" />}
                  <canvas ref={canvasRef} className={styles.hiddenCanvas} />
                </div>
                <div className={styles.scanControls}>
                  <p className={`${styles.scanResult} ${styles[scanState.type]}`} role="status" aria-live="polite">{scanState.message}</p>
                  {scannedRegistration && (
                    <dl className={styles.scanDetails}>
                      <div><dt>Registration ID</dt><dd>{scannedRegistration.id}</dd></div>
                      <div><dt>Delegate</dt><dd><strong>{scannedRegistration.name}</strong></dd></div>
                      <div><dt>Email</dt><dd>{scannedRegistration.email}</dd></div>
                      <div><dt>Phone</dt><dd>{scannedRegistration.phone}</dd></div>
                      <div><dt>School / organization</dt><dd>{scannedRegistration.organization}</dd></div>
                      <div><dt>Committee</dt><dd>{scannedRegistration.committee}</dd></div>
                      <div><dt>Payment</dt><dd>Admin approved · INR {Number(scannedRegistration.amount).toFixed(2)}</dd></div>
                      <div><dt>UTR</dt><dd>{scannedRegistration.utr || "Not provided"}</dd></div>
                      <div><dt>Event</dt><dd>{scannedRegistration.event.name} · {scannedRegistration.event.date} · {scannedRegistration.event.time} · {scannedRegistration.event.venue}</dd></div>
                    </dl>
                  )}
                  {cameraOn ? (
                    <button className={styles.secondaryButton} onClick={stopCamera}><X size={15} /> Stop camera</button>
                  ) : (
                    <button className={styles.primaryButton} onClick={() => { setScanState({ type: "idle", message: "Starting camera…" }); setCameraOn(true) }}>
                      <Camera size={16} /> Start camera
                    </button>
                  )}
                  <p className={styles.subtle}>Camera access requires HTTPS in production. Localhost is supported for development.</p>
                </div>
              </div>

              {/* Work Area: Manual Gate Check-in Backup */}
              <div className={styles.manualVerifyCard}>
                <h3>Manual Gate Check-In</h3>
                <p>If the delegate’s device cannot be scanned, enter their signed entry pass code or Registration ID directly below.</p>
                <form className={styles.manualForm} onSubmit={handleManualVerify}>
                  <input
                    type="text"
                    placeholder="Enter QR payload or Registration ID (e.g. 2566c72e-…)"
                    value={manualPayload}
                    onChange={(event) => setManualPayload(event.target.value)}
                    required
                  />
                  <button className={styles.primaryButton} type="submit" disabled={manualBusy || !manualPayload.trim()}>
                    {manualBusy ? <LoaderCircle className={styles.spinner} size={15} /> : <UserCheck size={15} />}
                    {manualBusy ? "Verifying…" : "Verify & Admit"}
                  </button>
                </form>
              </div>
            </section>
          ) : (
            <section className={styles.settingsPanel}>
              <div className={styles.sectionHeading}>
                <div>
                  <span className={styles.kicker}>CONFERENCE CONFIGURATION</span>
                  <h2>Event setup & Payment QR</h2>
                  <p>Configure conference schedule, venue, and the official UPI QR code delegates use to pay.</p>
                </div>
              </div>

              {/* Setup Readiness Banner */}
              <div className={`${styles.setupStatusBanner} ${isSetupComplete ? styles.open : styles.incomplete}`}>
                <div>
                  <strong>{isSetupComplete ? "Public Registration is Active" : "Registration Setup Incomplete"}</strong>
                  <p>
                    {isSetupComplete
                      ? "All required fields and payment QR are configured. Delegates can register and pay online."
                      : "Public registration remains paused until conference details and a payment QR code are uploaded."}
                  </p>
                </div>
                <span className={styles.emailBadge} style={{ background: isSetupComplete ? "rgba(84,189,128,.2)" : "rgba(230,165,74,.2)", color: isSetupComplete ? "#b5ecc8" : "#ffd19c" }}>
                  {isSetupComplete ? "Registration Open" : "Registration Closed"}
                </span>
              </div>

              {/* Work Area: Setup Checklist */}
              <div className={styles.checklist}>
                <div className={`${styles.checklistItem} ${eventForm.name ? styles.done : styles.todo}`}>
                  {eventForm.name ? <Check size={15} /> : <CircleAlert size={15} />}
                  <span>Conference Name: {eventForm.name || "Missing"}</span>
                </div>
                <div className={`${styles.checklistItem} ${eventForm.date && eventForm.time ? styles.done : styles.todo}`}>
                  {eventForm.date && eventForm.time ? <Check size={15} /> : <CircleAlert size={15} />}
                  <span>Dates & Timing: {eventForm.date && eventForm.time ? `${eventForm.date} · ${eventForm.time}` : "Missing"}</span>
                </div>
                <div className={`${styles.checklistItem} ${eventForm.venue ? styles.done : styles.todo}`}>
                  {eventForm.venue ? <Check size={15} /> : <CircleAlert size={15} />}
                  <span>Venue: {eventForm.venue || "Missing"}</span>
                </div>
                <div className={`${styles.checklistItem} ${settings?.paymentQrConfigured ? styles.done : styles.todo}`}>
                  {settings?.paymentQrConfigured ? <Check size={15} /> : <CircleAlert size={15} />}
                  <span>Payment QR Image: {settings?.paymentQrConfigured ? "Uploaded & Active" : "Not uploaded"}</span>
                </div>
              </div>

              <form className={styles.settingsForm} onSubmit={saveEventSettings}>
                <label>Conference name<input required maxLength={160} value={eventForm.name} onChange={(event) => setEventForm({ ...eventForm, name: event.target.value })} /></label>
                <label>Event date<input required maxLength={120} placeholder="e.g. 24–25 October 2026" value={eventForm.date} onChange={(event) => setEventForm({ ...eventForm, date: event.target.value })} /></label>
                <label>Event timing<input required maxLength={120} placeholder="e.g. 9:00 AM – 5:00 PM" value={eventForm.time} onChange={(event) => setEventForm({ ...eventForm, time: event.target.value })} /></label>
                <label>Venue<input required maxLength={300} value={eventForm.venue} onChange={(event) => setEventForm({ ...eventForm, venue: event.target.value })} /></label>
                <button className={styles.primaryButton} type="submit" disabled={settingsBusy}>{settingsBusy ? "Saving…" : "Save event details"}</button>
              </form>

              <form className={styles.settingsForm} onSubmit={uploadPaymentQr}>
                <label>Payment QR image<input required name="paymentQr" type="file" accept="image/jpeg,image/png,image/webp,image/gif" /></label>
                <p className={styles.subtle}>Upload a JPEG, PNG, WebP, or GIF image, up to 5 MB. The latest image replaces the previous payment QR.</p>
                <button className={styles.primaryButton} type="submit" disabled={settingsBusy}>{settingsBusy ? "Uploading…" : "Upload payment QR"}</button>
                {settings?.paymentQrConfigured && settings.paymentQrUrl && <Image className={styles.paymentQrPreview} src={entryPassApi.paymentQrUrl(settings.paymentQrUrl)} alt="Current event payment QR" width={180} height={180} unoptimized />}
              </form>

              <p className={styles.subtle}>
                Registration opens automatically once event details are saved and a payment QR is uploaded. When payments are approved, delegates receive an email with their signed entry QR code (or pass can be viewed/retried from the review queue).
              </p>
            </section>
          )}
        </>
      )}
    </main>
  )
}