"use client"

import { FormEvent, useEffect, useRef, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { ArrowLeft, Camera, Check, CircleAlert, LoaderCircle, LogOut, Mail, RefreshCw, ShieldCheck, X } from "lucide-react"
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

  async function loadQueue(key = adminKey, successMessage?: string, filter = queueFilter) {
    setLoading(true)
    setError("")
    try {
      const [result, currentSettings] = await Promise.all([
        entryPassApi.getAdminRegistrations(key, filter),
        entryPassApi.getAdminSettings(key),
      ])
      const next = await Promise.all(result.registrations.map(async (registration) => {
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
      await loadQueue(adminKey, "Payment submission rejected.")
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
      setNotice("Event details saved.")
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

    async function verifyScan(payload: string) {
      scanBusyRef.current = true
      setScanState({ type: "idle", message: "Checking entry pass…" })
      setScannedRegistration(null)
      try {
        const result = await entryPassApi.verifyEntry(payload, adminKey)
        if (result.valid) {
          setScannedRegistration(result.registration)
          setScanState({ type: "valid", message: `VALID · ${result.registration.name} · entry recorded` })
        } else {
          setScanState({ type: "invalid", message: "INVALID · This is not an approved entry pass." })
        }
      } catch (requestError) {
        if (requestError instanceof EntryPassApiError && requestError.status === 409 && requestError.body.reason === "already_used") {
          setScanState({ type: "used", message: `ALREADY USED · ${String(requestError.body.name || "This pass")} was checked in earlier.` })
        } else if (requestError instanceof EntryPassApiError && requestError.status === 401) {
          setScanState({ type: "invalid", message: "INVALID · The admin key was rejected." })
        } else {
          setScanState({ type: "error", message: requestError instanceof Error ? requestError.message : "Unable to verify this entry pass." })
        }
      } finally {
        scanBusyRef.current = false
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
              void verifyScan(decoded.data)
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

  return (
    <main className={styles.adminPage}>
      <header className={styles.header}>
        <Link href="/" className={styles.backLink}><ArrowLeft size={16} /> Arkham MUN</Link>
        <div className={styles.headerTitle}><span className={styles.kicker}>EVENT OPERATIONS</span><h1>Entry desk</h1></div>
        {authenticated && <button className={styles.logoutButton} onClick={logout}><LogOut size={15} /> Sign out</button>}
      </header>
      {!authenticated ? (
        <section className={styles.loginPanel}>
          <ShieldCheck size={26} />
          <h2>Admin access</h2>
          <p>Enter the event admin key to review payment submissions and scan passes.</p>
          <form onSubmit={handleKeySubmit}>
            <label htmlFor="admin-key">Admin key</label>
            <input id="admin-key" type="password" value={keyInput} onChange={(event) => setKeyInput(event.target.value)} autoComplete="current-password" required />
            <button className={styles.primaryButton} disabled={loading || !keyInput}>{loading ? <LoaderCircle className={styles.spinner} size={16} /> : null}{loading ? "Checking access" : "Open entry desk"}</button>
          </form>
          {error && <p className={styles.error} role="alert"><CircleAlert size={15} />{error}</p>}
        </section>
      ) : (
        <>
          <nav className={styles.tabs} aria-label="Admin tools">
            <button className={activeView === "queue" ? styles.activeTab : ""} onClick={() => { if (activeView === "scanner") stopCamera(); setActiveView("queue"); void loadQueue() }}>Payment review <span>{registrations.length}</span></button>
            <button className={activeView === "scanner" ? styles.activeTab : ""} onClick={() => setActiveView("scanner")}>Venue scanner</button>
            <button className={activeView === "settings" ? styles.activeTab : ""} onClick={() => { if (activeView === "scanner") stopCamera(); setActiveView("settings") }}>Event setup</button>
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
                  Needs review
                </button>
                <button
                  type="button"
                  className={`${styles.subtab} ${queueFilter === "approved" ? styles.activeSubtab : ""}`}
                  onClick={() => loadQueue(adminKey, undefined, "approved")}
                  disabled={loading}
                >
                  Approved passes
                </button>
                <button
                  type="button"
                  className={`${styles.subtab} ${queueFilter === "rejected" ? styles.activeSubtab : ""}`}
                  onClick={() => loadQueue(adminKey, undefined, "rejected")}
                  disabled={loading}
                >
                  Rejected
                </button>
              </div>
              {loading && registrations.length === 0 ? (
                <p className={styles.emptyState}><LoaderCircle className={styles.spinner} size={18} />Loading submissions…</p>
              ) : registrations.length === 0 ? (
                <p className={styles.emptyState}>
                  {queueFilter === "payment_submitted" ? "No payment submissions are waiting for review." : queueFilter === "approved" ? "No registrations have been approved yet." : "No registrations have been rejected."}
                </p>
              ) : (
                <div className={styles.queueList}>
                  {registrations.map((registration) => (
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
                              {busyId === registration.id ? "Working" : "Approve & issue pass"}
                            </button>
                            <button className={styles.rejectButton} onClick={() => { setRejectingId(registration.id); setRejectReason(""); setError("") }} disabled={Boolean(busyId)}>Reject</button>
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
              <div className={styles.sectionHeading}><div><span className={styles.kicker}>SINGLE-USE CHECK-IN</span><h2>Scan entry pass</h2><p>First valid scan admits the guest. A second scan is rejected as already used.</p></div></div>
              <div className={styles.scannerGrid}>
                <div className={styles.videoFrame}>
                  <video ref={videoRef} playsInline muted aria-label="Venue QR scanner camera" />
                  {!cameraOn && <div className={styles.cameraPlaceholder}><Camera size={26} /><span>Camera is off</span></div>}
                  {cameraOn && <div className={styles.scanFrame} aria-hidden="true" />}
                  <canvas ref={canvasRef} className={styles.hiddenCanvas} />
                </div>
                <div className={styles.scanControls}>
                  <p className={`${styles.scanResult} ${styles[scanState.type]}`} role="status" aria-live="polite">{scanState.message}</p>
                  {scannedRegistration && <dl className={styles.scanDetails}>
                    <div><dt>Registration ID</dt><dd>{scannedRegistration.id}</dd></div>
                    <div><dt>Delegate</dt><dd>{scannedRegistration.name}</dd></div>
                    <div><dt>Email</dt><dd>{scannedRegistration.email}</dd></div>
                    <div><dt>Phone</dt><dd>{scannedRegistration.phone}</dd></div>
                    <div><dt>School / organization</dt><dd>{scannedRegistration.organization}</dd></div>
                    <div><dt>Committee</dt><dd>{scannedRegistration.committee}</dd></div>
                    <div><dt>Payment</dt><dd>Admin approved · INR {Number(scannedRegistration.amount).toFixed(2)}</dd></div>
                    <div><dt>UTR</dt><dd>{scannedRegistration.utr || "Not provided"}</dd></div>
                    <div><dt>Event</dt><dd>{scannedRegistration.event.name} · {scannedRegistration.event.date} · {scannedRegistration.event.time} · {scannedRegistration.event.venue}</dd></div>
                  </dl>}
                  {cameraOn ? <button className={styles.secondaryButton} onClick={stopCamera}><X size={15} /> Stop camera</button> : <button className={styles.primaryButton} onClick={() => { setScanState({ type: "idle", message: "Starting camera…" }); setCameraOn(true) }}><Camera size={16} /> Start camera</button>}
                  <p className={styles.subtle}>Camera access requires HTTPS in production. Localhost is supported for development.</p>
                </div>
              </div>
            </section>
          ) : (
            <section className={styles.settingsPanel}>
              <div className={styles.sectionHeading}><div><span className={styles.kicker}>DELEGATE REGISTRATION</span><h2>Event setup</h2><p>Set the event details and upload the payment QR shown before delegates submit payment proof.</p></div></div>
              <form className={styles.settingsForm} onSubmit={saveEventSettings}>
                <label>Event name<input required maxLength={160} value={eventForm.name} onChange={(event) => setEventForm({ ...eventForm, name: event.target.value })} /></label>
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
              <p className={styles.subtle}>Registration opens after the event details are saved and a payment QR is uploaded. Approval emails are not configured yet; delegates can view their entry QR in the registration flow after approval.</p>
            </section>
          )}
        </>
      )}
    </main>
  )
}