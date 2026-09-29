"use client"

import { FormEvent, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Camera, Check, CircleAlert, LoaderCircle, LogOut, RefreshCw, ShieldCheck, X } from "lucide-react"
import jsQR from "jsqr"
import { AdminRegistration, EntryPassApiError, entryPassApi } from "@/lib/entry-pass-api"
import styles from "./admin.module.css"

type ScanState = { type: "idle" | "valid" | "used" | "invalid" | "error"; message: string }

export default function AdminPage() {
  const [adminKey, setAdminKey] = useState("")
  const [keyInput, setKeyInput] = useState("")
  const [authenticated, setAuthenticated] = useState(false)
  const [activeView, setActiveView] = useState<"queue" | "scanner">("queue")
  const [registrations, setRegistrations] = useState<AdminRegistration[]>([])
  const [loading, setLoading] = useState(false)
  const [busyId, setBusyId] = useState("")
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

  async function loadQueue(key = adminKey, successMessage?: string) {
    setLoading(true)
    setError("")
    try {
      const result = await entryPassApi.getAdminRegistrations(key)
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
      setAdminKey(key)
      setAuthenticated(true)
      setNotice(successMessage || `${next.length} payment ${next.length === 1 ? "submission" : "submissions"} loaded.`)
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
      await entryPassApi.approveRegistration(id, adminKey)
      await loadQueue(adminKey, "Payment approved and signed entry pass issued.")
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to approve registration.")
    } finally {
      setBusyId("")
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
      try {
        const result = await entryPassApi.verifyEntry(payload, adminKey)
        setScanState(result.valid
          ? { type: "valid", message: `VALID · ${result.name} · entry recorded` }
          : { type: "invalid", message: "INVALID · This is not an approved entry pass." })
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
          </nav>
          {notice && <p className={styles.notice} role="status"><Check size={15} />{notice}</p>}
          {error && <p className={styles.error} role="alert"><CircleAlert size={15} />{error}</p>}
          {activeView === "queue" ? (
            <section className={styles.queuePanel}>
              <div className={styles.sectionHeading}><div><span className={styles.kicker}>PAYMENT-SUBMITTED REGISTRATIONS</span><h2>Review queue</h2></div><button className={styles.iconButton} onClick={() => loadQueue()} disabled={loading} aria-label="Refresh queue" title="Refresh queue">{loading ? <LoaderCircle className={styles.spinner} size={17} /> : <RefreshCw size={17} />}</button></div>
              {loading && registrations.length === 0 ? <p className={styles.emptyState}><LoaderCircle className={styles.spinner} size={18} />Loading submissions…</p> : registrations.length === 0 ? <p className={styles.emptyState}>No payment submissions are waiting for review.</p> : <div className={styles.queueList}>
                {registrations.map((registration) => <article className={styles.registration} key={registration.id}>
                  <div className={styles.registrationTitle}><div><h3>{registration.name}</h3><p>{registration.contact}</p></div><span>INR {Number(registration.amount).toFixed(2)}</span></div>
                  <dl className={styles.registrationDetails}><div><dt>UTR</dt><dd>{registration.utr || "Not provided"}</dd></div><div><dt>Submitted</dt><dd>{new Date(registration.created_at).toLocaleString()}</dd></div></dl>
                  {registration.screenshot_url && (registration.screenshotBlobUrl ? <a href={registration.screenshotBlobUrl} target="_blank" rel="noreferrer"><img className={styles.proofImage} src={registration.screenshotBlobUrl} alt={`Payment screenshot from ${registration.name}`} /></a> : <p className={styles.subtle}>Screenshot could not be loaded.</p>)}
                  {rejectingId === registration.id ? <div className={styles.rejectForm}><label htmlFor={`reject-${registration.id}`}>Reason for rejection</label><textarea id={`reject-${registration.id}`} value={rejectReason} onChange={(event) => setRejectReason(event.target.value)} maxLength={500} rows={2} /><div className={styles.actions}><button className={styles.rejectButton} onClick={() => reject(registration.id)} disabled={busyId === registration.id}>{busyId === registration.id ? "Saving…" : "Confirm rejection"}</button><button className={styles.secondaryButton} onClick={() => { setRejectingId(""); setRejectReason("") }}>Cancel</button></div></div> : <div className={styles.actions}><button className={styles.approveButton} onClick={() => approve(registration.id)} disabled={busyId === registration.id}>{busyId === registration.id ? <LoaderCircle className={styles.spinner} size={15} /> : <Check size={15} />}{busyId === registration.id ? "Working" : "Approve & issue pass"}</button><button className={styles.rejectButton} onClick={() => { setRejectingId(registration.id); setRejectReason(""); setError("") }} disabled={Boolean(busyId)}>Reject</button></div>}
                </article>)}
              </div>}
            </section>
          ) : (
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
                  {cameraOn ? <button className={styles.secondaryButton} onClick={stopCamera}><X size={15} /> Stop camera</button> : <button className={styles.primaryButton} onClick={() => { setScanState({ type: "idle", message: "Starting camera…" }); setCameraOn(true) }}><Camera size={16} /> Start camera</button>}
                  <p className={styles.subtle}>Camera access requires HTTPS in production. Localhost is supported for development.</p>
                </div>
              </div>
            </section>
          )}
        </>
      )}
    </main>
  )
}