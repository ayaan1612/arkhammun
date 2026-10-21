"use client"

import { FormEvent, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Calendar,
  Camera,
  Check,
  CircleAlert,
  Clock3,
  Edit3,
  Eye,
  Image as ImageIcon,
  Layers,
  LoaderCircle,
  LogIn,
  LogOut,
  Mail,
  Megaphone,
  MessageSquare,
  Plus,
  RefreshCw,
  Search,
  Send,
  Settings,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UserCheck,
  Users,
  X,
} from "lucide-react"
import jsQR from "jsqr"
import {
  AdminEventSettings,
  AdminRegistration,
  ContactQuery,
  DbEvent,
  EntryPassApiError,
  EventDetails,
  RegistrationStatus,
  ScannedRegistration,
  entryPassApi,
} from "@/lib/entry-pass-api"
import { useAuth } from "@/lib/auth-context"
import styles from "./admin.module.css"

type AdminView =
  | "overview"
  | "queue"
  | "delegates"
  | "events"
  | "announcements"
  | "scanner"
  | "queries"
  | "settings"

type ScanState = { type: "idle" | "valid" | "used" | "invalid" | "error"; message: string }

export default function AdminPage() {
  const router = useRouter()
  const { user, token, isAdmin, isLoading: authLoading, logout: authLogout } = useAuth()

  const [adminKey, setAdminKey] = useState("")
  const [keyInput, setKeyInput] = useState("")
  const [authenticated, setAuthenticated] = useState(false)
  const [activeView, setActiveView] = useState<AdminView>("overview")

  // Queue state
  const [queueFilter, setQueueFilter] = useState<RegistrationStatus>("payment_submitted")
  const [selectedEventFilter, setSelectedEventFilter] = useState<string>("all")
  const [queueCounts, setQueueCounts] = useState<{
    payment_submitted: number
    approved: number
    rejected: number
  }>({
    payment_submitted: 0,
    approved: 0,
    rejected: 0,
  })
  const [searchQuery, setSearchQuery] = useState("")
  const [registrations, setRegistrations] = useState<AdminRegistration[]>([])
  const [allApprovedRegistrations, setAllApprovedRegistrations] = useState<AdminRegistration[]>([])

  // Cloud Events State
  const [eventsList, setEventsList] = useState<DbEvent[]>([])
  const [eventsLoading, setEventsLoading] = useState(false)
  const [editingEvent, setEditingEvent] = useState<DbEvent | null>(null)
  const [showCreateEventModal, setShowCreateEventModal] = useState(false)
  const [eventFormData, setEventFormData] = useState({
    title: "",
    description: "",
    date: "",
    time: "09:00 AM – 05:00 PM",
    venue: "",
    entryFee: 2200,
    upiId: "chauhan5408k@okaxis",
    registrationOpen: true,
    registrationNotice: "",
  })

  // Announcement State
  const [announcementEventId, setAnnouncementEventId] = useState<string>("all")
  const [announcementMessage, setAnnouncementMessage] = useState("")
  const [announcementSending, setAnnouncementSending] = useState(false)

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
  const [scannedPayload, setScannedPayload] = useState("")
  const [admitting, setAdmitting] = useState(false)
  const [cameraOn, setCameraOn] = useState(false)
  const [scanState, setScanState] = useState<ScanState>({
    type: "idle",
    message: "Point scanner at delegate QR or enter admin key.",
  })
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const animationRef = useRef<number | null>(null)
  const scanBusyRef = useRef(false)
  const previousPayloadRef = useRef<string | null>(null)
  const scannedRegistrationRef = useRef<ScannedRegistration | null>(null)

  useEffect(() => {
    scannedRegistrationRef.current = scannedRegistration
  }, [scannedRegistration])

  // General state
  const [loading, setLoading] = useState(false)
  const [busyId, setBusyId] = useState("")
  const [retryingId, setRetryingId] = useState("")
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const [rejectingId, setRejectingId] = useState("")
  const [rejectReason, setRejectReason] = useState("")
  const [screenshotModalUrl, setScreenshotModalUrl] = useState<string | null>(null)

  // Auto-login with JWT auth if user is admin
  useEffect(() => {
    if (!authLoading) {
      if (user && isAdmin && token) {
        setAdminKey(token)
        setAuthenticated(true)
        void loadData(token)
        void loadEvents()
      } else if (!user) {
        // Not logged in -> redirect to login page
        router.replace("/login?redirect=/admin")
      }
    }
  }, [user, isAdmin, token, authLoading])

  useEffect(() => () => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    if (animationRef.current !== null) cancelAnimationFrame(animationRef.current)
  }, [])

  useEffect(() => () => {
    registrations.forEach((registration) => {
      if (registration.screenshotBlobUrl) URL.revokeObjectURL(registration.screenshotBlobUrl)
    })
  }, [registrations])

  // Real-time auto-polling every 8 seconds
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
        setAllApprovedRegistrations((prev) =>
          approvedRes.registrations.map((newReg) => {
            const existing = prev.find((p) => p.id === newReg.id)
            return existing?.screenshotBlobUrl ? { ...newReg, screenshotBlobUrl: existing.screenshotBlobUrl } : newReg
          })
        )
        setQueries(queriesRes.queries)
      } catch {
        // Silently retry on next interval
      }
    }, 8000)
    return () => {
      active = false
      window.clearInterval(pollTimer)
    }
  }, [authenticated, adminKey])

  async function loadEvents() {
    setEventsLoading(true)
    try {
      const res = await entryPassApi.getEvents()
      setEventsList(res.events || [])
    } catch {
      // Fallback
    } finally {
      setEventsLoading(false)
    }
  }

  async function loadData(key = adminKey, successMessage?: string, filter = queueFilter) {
    setLoading(true)
    setError("")
    try {
      const [submittedRes, approvedRes, rejectedRes, currentSettings, queriesRes, eventsRes] = await Promise.all([
        entryPassApi.getAdminRegistrations(key, "payment_submitted"),
        entryPassApi.getAdminRegistrations(key, "approved"),
        entryPassApi.getAdminRegistrations(key, "rejected"),
        entryPassApi.getAdminSettings(key).catch(() => null),
        entryPassApi.getAdminQueries(key, "all").catch(() => ({ queries: [] })),
        entryPassApi.getEvents().catch(() => ({ events: [] })),
      ])

      setEventsList(eventsRes.events || [])

      setQueueCounts({
        payment_submitted: submittedRes.registrations.length,
        approved: approvedRes.registrations.length,
        rejected: rejectedRes.registrations.length,
      })

      const approvedWithBlobs = await Promise.all(
        approvedRes.registrations.map(async (reg) => {
          if (!reg.screenshot_url) return reg
          if (reg.screenshot_url.startsWith("data:")) {
            return { ...reg, screenshotBlobUrl: reg.screenshot_url }
          }
          try {
            const blob = await entryPassApi.getScreenshot(reg.screenshot_url, key)
            return { ...reg, screenshotBlobUrl: URL.createObjectURL(blob) }
          } catch {
            return reg
          }
        })
      )
      allApprovedRegistrations.forEach((reg) => {
        if (reg.screenshotBlobUrl && !reg.screenshotBlobUrl.startsWith("data:")) {
          URL.revokeObjectURL(reg.screenshotBlobUrl)
        }
      })
      setAllApprovedRegistrations(approvedWithBlobs)
      setQueries(queriesRes.queries)

      const targetList =
        filter === "payment_submitted"
          ? submittedRes.registrations
          : filter === "approved"
          ? approvedRes.registrations
          : rejectedRes.registrations

      const next = await Promise.all(
        targetList.map(async (registration) => {
          if (!registration.screenshot_url) return registration
          if (registration.screenshot_url.startsWith("data:")) {
            return { ...registration, screenshotBlobUrl: registration.screenshot_url }
          }
          try {
            const blob = await entryPassApi.getScreenshot(registration.screenshot_url, key)
            return { ...registration, screenshotBlobUrl: URL.createObjectURL(blob) }
          } catch {
            return registration
          }
        })
      )

      registrations.forEach((registration) => {
        if (registration.screenshotBlobUrl && !registration.screenshotBlobUrl.startsWith("data:")) {
          URL.revokeObjectURL(registration.screenshotBlobUrl)
        }
      })

      setRegistrations(next)
      if (currentSettings) {
        setSettings(currentSettings)
        setEventForm(currentSettings.event)
        setAmountInput(currentSettings.amount)
        setUpiIdInput(currentSettings.upiId || "chauhan5408k@okaxis")
        setRegistrationOpenInput(currentSettings.registrationOpen)
        setRegistrationNoticeInput(currentSettings.registrationNotice || "")
      }
      setAdminKey(key)
      setAuthenticated(true)
      setQueueFilter(filter)

      const count = next.length
      const filterLabel =
        filter === "payment_submitted"
          ? "submission"
          : filter === "approved"
          ? "approved pass"
          : filter === "rejected"
          ? "rejected submission"
          : "registration"
      setNotice(successMessage || `${count} ${filterLabel}${count === 1 ? "" : "s"} synchronized.`)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load admin portal.")
      setAuthenticated(false)
    } finally {
      setLoading(false)
    }
  }

  async function handleKeySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
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
        msg = "Payment approved. Pass is now available on delegate's dashboard."
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
      await loadData(adminKey, "Payment submission rejected and notification sent to user.", queueFilter)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to reject registration.")
    } finally {
      setBusyId("")
    }
  }

  // -------------------------------------------------------------
  // EVENT CRUD HANDLERS
  // -------------------------------------------------------------
  async function handleCreateEvent(e: FormEvent) {
    e.preventDefault()
    setSettingsBusy(true)
    setError("")
    try {
      await entryPassApi.createAdminEvent(eventFormData, adminKey)
      setShowCreateEventModal(false)
      setEventFormData({
        title: "",
        description: "",
        date: "",
        time: "09:00 AM – 05:00 PM",
        venue: "",
        entryFee: 2200,
        upiId: "chauhan5408k@okaxis",
        registrationOpen: true,
        registrationNotice: "",
      })
      await loadEvents()
      setNotice("New conference event created successfully in MongoDB Atlas.")
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create event.")
    } finally {
      setSettingsBusy(false)
    }
  }

  async function handleUpdateEvent(e: FormEvent) {
    e.preventDefault()
    if (!editingEvent) return
    setSettingsBusy(true)
    setError("")
    try {
      await entryPassApi.updateAdminEvent(editingEvent._id, editingEvent, adminKey)
      setEditingEvent(null)
      await loadEvents()
      setNotice("Conference event updated successfully.")
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update event.")
    } finally {
      setSettingsBusy(false)
    }
  }

  async function handleDeleteEvent(id: string, title: string) {
    if (!confirm(`Are you sure you want to permanently delete "${title}"? This will also remove all associated registrations and notifications from MongoDB Atlas.`)) {
      return
    }
    setSettingsBusy(true)
    setError("")
    try {
      await entryPassApi.deleteAdminEvent(id, adminKey)
      await loadEvents()
      await loadData(adminKey, `Event "${title}" and associated registrations deleted.`, queueFilter)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete event.")
    } finally {
      setSettingsBusy(false)
    }
  }

  // -------------------------------------------------------------
  // ANNOUNCEMENT DISPATCHER HANDLER
  // -------------------------------------------------------------
  async function handleSendAnnouncement(e: FormEvent) {
    e.preventDefault()
    if (!announcementMessage.trim()) {
      setError("Please write an announcement message.")
      return
    }
    setAnnouncementSending(true)
    setError("")
    try {
      const res = await entryPassApi.sendAdminAnnouncement(
        {
          eventId: announcementEventId === "all" ? undefined : announcementEventId,
          message: announcementMessage.trim(),
        },
        adminKey
      )
      setAnnouncementMessage("")
      setNotice(res.message || `Announcement sent to ${res.sentCount} delegate(s).`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to dispatch announcement.")
    } finally {
      setAnnouncementSending(false)
    }
  }

  async function saveAllSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSettingsBusy(true)
    setError("")
    try {
      const result = await entryPassApi.saveAdminSettings(
        {
          event: eventForm,
          amount: Number(amountInput),
          upiId: upiIdInput.trim(),
          registrationOpen: registrationOpenInput,
          registrationNotice: registrationNoticeInput.trim(),
        },
        adminKey
      )

      setSettings(result)
      setEventForm(result.event)
      setAmountInput(result.amount)
      setUpiIdInput(result.upiId)
      setRegistrationOpenInput(result.registrationOpen)
      setRegistrationNoticeInput(result.registrationNotice)
      setNotice("Configuration saved successfully.")
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to save configuration.")
    } finally {
      setSettingsBusy(false)
    }
  }

  async function uploadPaymentQr(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const fileInput = form.elements.namedItem("paymentQr") as HTMLInputElement | null
    const file = fileInput?.files?.[0]
    if (!file) {
      setError("Choose an image before uploading.")
      return
    }
    setSettingsBusy(true)
    setError("")
    try {
      const result = await entryPassApi.uploadPaymentQr(file, adminKey)
      setSettings((current) =>
        current ? { ...current, paymentQrConfigured: result.paymentQrConfigured, paymentQrUrl: result.paymentQrUrl } : current
      )
      form.reset()
      setNotice("Payment QR poster updated successfully.")
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to upload payment poster.")
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
      setReplyModalQuery(null)
      setReplyMessageText("")
      setNotice("Reply sent successfully and recorded in notifications.")
      await loadData(adminKey)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to send reply.")
    } finally {
      setReplyBusy(false)
    }
  }

  // Scanner logic
  async function verifyPass(payload: string) {
    if (scanBusyRef.current) return
    scanBusyRef.current = true
    setScanState({ type: "idle", message: "Verifying cryptographic signature with Secretariat key…" })
    try {
      const result = await entryPassApi.verifyEntry(payload, adminKey, false)
      if (result.valid) {
        setScannedPayload(payload)
        setScannedRegistration(result.registration)
        if (result.alreadyUsed || result.registration.checkedInAt) {
          setScanState({
            type: "used",
            message: `ALREADY ADMITTED · ${result.registration.name} was checked in earlier at ${new Date(
              result.registration.checkedInAt!
            ).toLocaleTimeString()}.`,
          })
        } else {
          setScanState({
            type: "valid",
            message: `PASS VALID · ${result.registration.name} · Review details below and click Confirm Venue Entry.`,
          })
        }
      } else {
        setScanState({ type: "invalid", message: "INVALID PASS · This is not a valid signed entry QR." })
      }
    } catch (requestError) {
      if (requestError instanceof EntryPassApiError && requestError.status === 409 && requestError.body.reason === "already_used") {
        setScanState({
          type: "used",
          message: `ALREADY USED · ${String(requestError.body.name || "This pass")} was admitted earlier.`,
        })
      } else {
        setScanState({
          type: "error",
          message: requestError instanceof Error ? requestError.message : "Unable to verify this pass.",
        })
      }
    } finally {
      scanBusyRef.current = false
    }
  }

  async function handleConfirmEntry(payloadToAdmit: string) {
    if (!payloadToAdmit) return
    setAdmitting(true)
    setError("")
    try {
      const res = await entryPassApi.verifyEntry(payloadToAdmit, adminKey, true)
      if (res.valid) {
        setScannedRegistration(res.registration)
        const checkinTime = res.registration.checkedInAt || new Date().toISOString()
        setScanState({
          type: "valid",
          message: `ENTRY CLEARED · ${res.registration.name} admitted at ${new Date(checkinTime).toLocaleTimeString()}!`,
        })
        setNotice(`Delegate ${res.registration.name} checked in successfully.`)
        setAllApprovedRegistrations((prev) =>
          prev.map((item) => (item.id === res.registration.id ? { ...item, used_at: checkinTime } : item))
        )
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to admit delegate.")
    } finally {
      setAdmitting(false)
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
        setScanState({
          type: "error",
          message: "Camera scanning requires HTTPS in production (localhost is supported for testing).",
        })
        setCameraOn(false)
        return
      }
      try {
        localStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        })
        if (!active) {
          localStream.getTracks().forEach((track) => track.stop())
          return
        }
        streamRef.current = localStream
        if (videoRef.current) {
          videoRef.current.srcObject = localStream
          videoRef.current.setAttribute("playsinline", "true")
          await videoRef.current.play()
        }
      } catch (cameraError) {
        setScanState({
          type: "error",
          message: cameraError instanceof Error ? cameraError.message : "Could not open camera.",
        })
        setCameraOn(false)
        return
      }

      function scanFrame() {
        if (!active) return
        const video = videoRef.current
        const canvas = canvasRef.current
        if (
          !scannedRegistrationRef.current &&
          !scanBusyRef.current &&
          video &&
          canvas &&
          video.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA &&
          video.videoWidth > 0
        ) {
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

  // Filter registrations by search query AND selected event
  const filteredRegistrations = registrations.filter((reg) => {
    if (selectedEventFilter !== "all") {
      const regEventId = reg.event?.id
      if (regEventId && regEventId !== selectedEventFilter) return false
    }
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

  // If user is logged in as regular delegate, show Access Denied
  if (user && !isAdmin) {
    return (
      <main className={styles.adminPage}>
        <div className={styles.loginPanel} style={{ textAlign: "center" }}>
          <ShieldAlert size={48} style={{ color: "#e3262e", margin: "0 auto 12px" }} />
          <h2>Access Denied</h2>
          <p style={{ marginBottom: "20px" }}>
            You are currently logged in as <strong>{user.email}</strong> (Delegate Role). Administrator privileges are
            required to access the Secretariat Control Center.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <Link href="/dashboard" className={styles.primaryButton} style={{ textDecoration: "none" }}>
              Return to Delegate Dashboard
            </Link>
            <button
              onClick={() => {
                authLogout()
                router.push("/login?redirect=/admin")
              }}
              className={styles.secondaryButton}
            >
              Log in with Admin Account
            </button>
          </div>
        </div>
      </main>
    )
  }

  // If not authenticated via token or key, show login panel
  if (!authenticated) {
    return (
      <main className={styles.adminPage}>
        <div className={styles.loginPanel}>
          <ShieldCheck size={36} />
          <h2>Secretariat Control Center</h2>
          <p>
            Authenticate with your administrator credentials or shared admin key to manage conference operations,
            payment approvals, venue check-in, and cloud data.
          </p>
          <form onSubmit={handleKeySubmit}>
            <label>
              Administrator Password / Key
              <input
                type="password"
                required
                autoComplete="current-password"
                value={keyInput}
                onChange={(event) => setKeyInput(event.target.value)}
                placeholder="Enter admin password or key"
              />
            </label>
            <button className={styles.primaryButton} type="submit" disabled={loading}>
              {loading ? <LoaderCircle className={styles.spinner} size={16} /> : null}
              {loading ? "Verifying key…" : "Access Admin Center"}
            </button>
          </form>

          <div style={{ marginTop: "20px", paddingTop: "16px", borderTop: "1px solid rgba(255,255,255,0.12)", textAlign: "center" }}>
            <Link
              href="/login?redirect=/admin"
              style={{ color: "#e3262e", fontSize: "13px", textDecoration: "none", fontWeight: 600 }}
            >
              Sign In with Admin Account <LogIn size={13} style={{ display: "inline", verticalAlign: "middle" }} />
            </Link>
          </div>

          {error && (
            <p className={styles.error}>
              <CircleAlert size={14} />
              {error}
            </p>
          )}
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
          <span className={styles.kicker}>SECRETARIAT CONTROL CENTER (CLOUD MONGODB)</span>
          <h1>Arkham MUN Operations</h1>
        </div>
        <button
          className={styles.logoutButton}
          onClick={() => {
            authLogout()
            setAuthenticated(false)
            setAdminKey("")
            router.push("/login")
          }}
          type="button"
        >
          <LogOut size={14} /> Log out
        </button>
      </header>

      {/* Main Tab Navigation */}
      <nav className={styles.tabs} aria-label="Admin work areas" style={{ flexWrap: "wrap" }}>
        <button
          className={activeView === "overview" ? styles.activeTab : ""}
          onClick={() => setActiveView("overview")}
          type="button"
        >
          <Layers size={15} /> Overview
        </button>

        <button
          className={activeView === "queue" ? styles.activeTab : ""}
          onClick={() => {
            setActiveView("queue")
            void loadData(adminKey, undefined, queueFilter)
          }}
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
          className={activeView === "events" ? styles.activeTab : ""}
          onClick={() => {
            setActiveView("events")
            void loadEvents()
          }}
          type="button"
        >
          <Calendar size={15} /> Event Manager <span>{eventsList.length}</span>
        </button>

        <button
          className={activeView === "announcements" ? styles.activeTab : ""}
          onClick={() => setActiveView("announcements")}
          type="button"
        >
          <Megaphone size={15} /> Send Announcements
        </button>

        <button
          className={activeView === "scanner" ? styles.activeTab : ""}
          onClick={() => setActiveView("scanner")}
          type="button"
        >
          <Camera size={15} /> Venue Scanner
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
          <Settings size={15} /> Conference Controls
        </button>
      </nav>

      {notice && (
        <p className={styles.notice}>
          <Check size={14} />
          {notice}
        </p>
      )}
      {error && (
        <p className={styles.error}>
          <CircleAlert size={14} />
          {error}
        </p>
      )}

      {/* VIEW 1: OVERVIEW / DASHBOARD */}
      {activeView === "overview" && (
        <section className={styles.queuePanel}>
          <div className={styles.sectionHeading}>
            <div>
              <span className={styles.kicker}>SECRETARIAT BRIEFING</span>
              <h2>Operations Overview</h2>
              <p>Key metrics synchronized with MongoDB Atlas cloud database.</p>
            </div>
            <button
              className={styles.secondaryButton}
              onClick={() => void loadData(adminKey, "Refreshed operational metrics.")}
              disabled={loading}
              type="button"
            >
              <RefreshCw className={loading ? styles.spinner : ""} size={14} /> Refresh
            </button>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
              gap: 16,
              margin: "20px 0 30px",
            }}
          >
            <div
              style={{
                padding: "20px",
                background: "rgba(234, 179, 8, 0.08)",
                border: "1px solid rgba(234, 179, 8, 0.25)",
                borderRadius: 8,
              }}
            >
              <span style={{ fontSize: 11, color: "#facc15", letterSpacing: "0.1em", fontWeight: 700 }}>
                PENDING PAYMENTS
              </span>
              <h3 style={{ fontSize: 32, margin: "8px 0 4px", color: "#fff" }}>{queueCounts.payment_submitted}</h3>
              <p style={{ fontSize: 12, color: "#aaa8ba", margin: 0 }}>Delegates awaiting review</p>
            </div>

            <div
              style={{
                padding: "20px",
                background: "rgba(34, 197, 94, 0.08)",
                border: "1px solid rgba(34, 197, 94, 0.25)",
                borderRadius: 8,
              }}
            >
              <span style={{ fontSize: 11, color: "#4ade80", letterSpacing: "0.1em", fontWeight: 700 }}>
                CLEARED PASSES
              </span>
              <h3 style={{ fontSize: 32, margin: "8px 0 4px", color: "#fff" }}>{queueCounts.approved}</h3>
              <p style={{ fontSize: 12, color: "#aaa8ba", margin: 0 }}>Verified conference delegates</p>
            </div>

            <div
              style={{
                padding: "20px",
                background: "rgba(59, 130, 246, 0.08)",
                border: "1px solid rgba(59, 130, 246, 0.25)",
                borderRadius: 8,
              }}
            >
              <span style={{ fontSize: 11, color: "#60a5fa", letterSpacing: "0.1em", fontWeight: 700 }}>
                VENUE CHECKED-IN
              </span>
              <h3 style={{ fontSize: 32, margin: "8px 0 4px", color: "#fff" }}>{checkedInCount}</h3>
              <p style={{ fontSize: 12, color: "#aaa8ba", margin: 0 }}>Admitted through security gate</p>
            </div>

            <div
              style={{
                padding: "20px",
                background: "rgba(227, 38, 46, 0.08)",
                border: "1px solid rgba(227, 38, 46, 0.25)",
                borderRadius: 8,
              }}
            >
              <span style={{ fontSize: 11, color: "#ff8288", letterSpacing: "0.1em", fontWeight: 700 }}>
                ACTIVE EVENTS
              </span>
              <h3 style={{ fontSize: 32, margin: "8px 0 4px", color: "#fff" }}>{eventsList.length}</h3>
              <p style={{ fontSize: 12, color: "#aaa8ba", margin: 0 }}>Conferences in database</p>
            </div>
          </div>

          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <button
              className={styles.primaryButton}
              onClick={() => {
                setQueueFilter("payment_submitted")
                setActiveView("queue")
                void loadData(adminKey, undefined, "payment_submitted")
              }}
            >
              Review Payment Queue ({queueCounts.payment_submitted})
            </button>
            <button className={styles.secondaryButton} onClick={() => setActiveView("events")}>
              Manage Conference Events
            </button>
            <button className={styles.secondaryButton} onClick={() => setActiveView("announcements")}>
              Dispatch Announcement
            </button>
            <button className={styles.secondaryButton} onClick={() => setActiveView("scanner")}>
              Open Venue Gate Scanner
            </button>
          </div>
        </section>
      )}

      {/* VIEW 2: PAYMENT QUEUE & APPROVALS */}
      {activeView === "queue" && (
        <section className={styles.queuePanel}>
          <div className={styles.sectionHeading}>
            <div>
              <span className={styles.kicker}>REGISTRATION QUEUE</span>
              <h2>Delegate Payment Submissions</h2>
              <p>Review submitted transaction proofs and verify admissions.</p>
            </div>

            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              {/* Event Filter Dropdown */}
              <select
                value={selectedEventFilter}
                onChange={(e) => setSelectedEventFilter(e.target.value)}
                style={{
                  background: "#080808",
                  color: "#fff",
                  border: "1px solid rgba(255,255,255,0.25)",
                  padding: "8px 12px",
                  borderRadius: 4,
                  fontSize: 12,
                }}
              >
                <option value="all">All Events</option>
                {eventsList.map((ev) => (
                  <option key={ev._id} value={ev._id}>
                    {ev.title}
                  </option>
                ))}
              </select>

              <button
                className={styles.secondaryButton}
                onClick={() => void loadData(adminKey, undefined, queueFilter)}
                disabled={loading}
              >
                <RefreshCw className={loading ? styles.spinner : ""} size={14} /> Refresh
              </button>
            </div>
          </div>

          {/* Filter Bar */}
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            <button
              className={queueFilter === "payment_submitted" ? styles.primaryButton : styles.secondaryButton}
              onClick={() => void loadData(adminKey, undefined, "payment_submitted")}
              type="button"
            >
              Pending Verification ({queueCounts.payment_submitted})
            </button>
            <button
              className={queueFilter === "approved" ? styles.primaryButton : styles.secondaryButton}
              onClick={() => void loadData(adminKey, undefined, "approved")}
              type="button"
            >
              Approved Passes ({queueCounts.approved})
            </button>
            <button
              className={queueFilter === "rejected" ? styles.primaryButton : styles.secondaryButton}
              onClick={() => void loadData(adminKey, undefined, "rejected")}
              type="button"
            >
              Rejected Submissions ({queueCounts.rejected})
            </button>
          </div>

          {/* Search bar */}
          <div className={styles.searchBar}>
            <Search size={15} color="#858094" />
            <input
              type="text"
              placeholder="Search by name, email, UTR, or committee…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {filteredRegistrations.length === 0 ? (
            <div className={styles.emptyState}>No registrations matching the selected filters.</div>
          ) : (
            <div className={styles.queueList}>
              {filteredRegistrations.map((reg) => (
                <article className={styles.registration} key={reg.id}>
                  <div className={styles.registrationTitle}>
                    <div>
                      <h3>{reg.name}</h3>
                      <p>
                        ID: <code>{reg.id}</code> · Committee: <strong>{reg.committee || "General Delegate"}</strong>
                        {reg.event && ` · Event: ${reg.event.title}`}
                      </p>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>₹{reg.amount}</span>
                  </div>

                  <dl className={styles.registrationDetails}>
                    <div>
                      <dt>Email</dt>
                      <dd>{reg.email || reg.contact}</dd>
                    </div>
                    <div>
                      <dt>Phone</dt>
                      <dd>{reg.phone || "Not provided"}</dd>
                    </div>
                    <div>
                      <dt>Institution</dt>
                      <dd>{reg.organization || "Independent"}</dd>
                    </div>
                    <div>
                      <dt>Payment UTR</dt>
                      <dd>
                        <code>{reg.utr || "Pending"}</code>
                      </dd>
                    </div>
                  </dl>

                  {/* Payment Screenshot Thumbnail */}
                  {reg.screenshotBlobUrl && (
                    <div style={{ marginTop: 10, marginBottom: 14 }}>
                      <span style={{ fontSize: 11, color: "#aaa8ba", display: "block", marginBottom: 6 }}>
                        Payment Proof Screenshot (Click to enlarge):
                      </span>
                      <img
                        src={reg.screenshotBlobUrl}
                        alt="Payment screenshot"
                        onClick={() => setScreenshotModalUrl(reg.screenshotBlobUrl || null)}
                        style={{
                          width: 80,
                          height: 80,
                          objectFit: "cover",
                          borderRadius: 6,
                          border: "1px solid rgba(255,255,255,0.25)",
                          cursor: "pointer",
                        }}
                      />
                    </div>
                  )}

                  {/* Actions */}
                  <div className={styles.actions}>
                    {reg.status === "payment_submitted" && (
                      <>
                        <button
                          className={styles.approveButton}
                          onClick={() => approve(reg.id)}
                          disabled={busyId === reg.id}
                        >
                          {busyId === reg.id ? <LoaderCircle className={styles.spinner} size={14} /> : <Check size={14} />}
                          Approve Payment &amp; Issue Pass
                        </button>

                        {rejectingId === reg.id ? (
                          <div style={{ display: "flex", gap: 8, alignItems: "center", width: "100%", marginTop: 8 }}>
                            <input
                              type="text"
                              placeholder="Reason for rejection (e.g. Invalid UTR, insufficient amount)…"
                              value={rejectReason}
                              onChange={(e) => setRejectReason(e.target.value)}
                              style={{
                                flex: 1,
                                padding: "8px 12px",
                                background: "#0c0b17",
                                border: "1px solid #e3262e",
                                color: "#fff",
                                borderRadius: 4,
                                fontSize: 12,
                              }}
                            />
                            <button
                              className={styles.rejectButton}
                              onClick={() => reject(reg.id)}
                              disabled={busyId === reg.id}
                            >
                              Confirm Rejection
                            </button>
                            <button
                              className={styles.secondaryButton}
                              onClick={() => {
                                setRejectingId("")
                                setRejectReason("")
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            className={styles.rejectButton}
                            onClick={() => {
                              setRejectingId(reg.id)
                              setRejectReason("")
                            }}
                          >
                            <X size={14} /> Reject
                          </button>
                        )}
                      </>
                    )}

                    {reg.status === "approved" && (
                      <span style={{ color: "#4ade80", fontSize: 12, fontWeight: 700 }}>✓ Pass Cleared</span>
                    )}

                    {reg.status === "rejected" && reg.reject_reason && (
                      <span style={{ color: "#f87171", fontSize: 12 }}>Reason: {reg.reject_reason}</span>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {/* VIEW 3: APPROVED PASSES & VENUE ARRIVALS */}
      {activeView === "delegates" && (
        <section className={styles.queuePanel}>
          <div className={styles.sectionHeading}>
            <div>
              <span className={styles.kicker}>CLEARED ATTENDEES</span>
              <h2>Approved Delegates ({allApprovedRegistrations.length})</h2>
              <p>Verified delegates with cryptographically signed passes.</p>
            </div>

            <select
              value={selectedEventFilter}
              onChange={(e) => setSelectedEventFilter(e.target.value)}
              style={{
                background: "#080808",
                color: "#fff",
                border: "1px solid rgba(255,255,255,0.25)",
                padding: "8px 12px",
                borderRadius: 4,
                fontSize: 12,
              }}
            >
              <option value="all">All Events</option>
              {eventsList.map((ev) => (
                <option key={ev._id} value={ev._id}>
                  {ev.title}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.searchBar}>
            <Search size={15} color="#858094" />
            <input
              type="text"
              placeholder="Search approved delegates…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className={styles.queueList}>
            {allApprovedRegistrations
              .filter((reg) => {
                if (selectedEventFilter !== "all" && reg.event?.id !== selectedEventFilter) return false
                if (!searchQuery.trim()) return true
                const q = searchQuery.toLowerCase()
                return (
                  reg.name.toLowerCase().includes(q) ||
                  (reg.email && reg.email.toLowerCase().includes(q)) ||
                  (reg.committee && reg.committee.toLowerCase().includes(q))
                )
              })
              .map((reg) => (
                <article className={styles.registration} key={reg.id}>
                  <div className={styles.registrationTitle}>
                    <div>
                      <h3>{reg.name}</h3>
                      <p>
                        Registration: <code>{reg.id}</code> · {reg.committee || "General Delegate"}
                        {reg.event && ` · ${reg.event.title}`}
                      </p>
                    </div>
                    <span
                      style={{
                        backgroundColor: reg.used_at ? "rgba(34, 197, 94, 0.15)" : "rgba(234, 179, 8, 0.15)",
                        color: reg.used_at ? "#4ade80" : "#facc15",
                        padding: "4px 10px",
                        borderRadius: 4,
                        fontSize: 11,
                        fontWeight: 700,
                      }}
                    >
                      {reg.used_at ? `✓ Checked in at ${new Date(reg.used_at).toLocaleTimeString()}` : "⏳ Awaiting Arrival"}
                    </span>
                  </div>

                  <dl className={styles.registrationDetails}>
                    <div>
                      <dt>Email</dt>
                      <dd>{reg.email || reg.contact}</dd>
                    </div>
                    <div>
                      <dt>Phone</dt>
                      <dd>{reg.phone || "Not provided"}</dd>
                    </div>
                    <div>
                      <dt>UTR</dt>
                      <dd>
                        <code>{reg.utr || "Verified"}</code>
                      </dd>
                    </div>
                  </dl>
                </article>
              ))}
          </div>
        </section>
      )}

      {/* VIEW 4: EVENT MANAGER (CLOUD MONGODB ATLAS) */}
      {activeView === "events" && (
        <section className={styles.queuePanel}>
          <div className={styles.sectionHeading}>
            <div>
              <span className={styles.kicker}>PERSISTENT DATABASE</span>
              <h2>Conference Event Manager</h2>
              <p>Create, update, or remove events permanently stored in MongoDB Atlas.</p>
            </div>
            <button
              className={styles.primaryButton}
              onClick={() => {
                setShowCreateEventModal(true)
                setEditingEvent(null)
              }}
              type="button"
            >
              <Plus size={15} /> Create New Event
            </button>
          </div>

          {eventsList.length === 0 ? (
            <div className={styles.emptyState}>No events in database. Click "Create New Event" to add one.</div>
          ) : (
            <div style={{ display: "grid", gap: 16 }}>
              {eventsList.map((ev) => (
                <div
                  key={ev._id}
                  style={{
                    padding: "20px 24px",
                    background: "rgba(6, 6, 15, 0.6)",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                    borderRadius: 6,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 16,
                  }}
                >
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <h3 style={{ margin: 0, color: "#fff", fontSize: 18 }}>{ev.title}</h3>
                      <span
                        style={{
                          backgroundColor: ev.registrationOpen ? "rgba(34, 197, 94, 0.15)" : "rgba(239, 68, 68, 0.15)",
                          color: ev.registrationOpen ? "#4ade80" : "#f87171",
                          fontSize: 10,
                          fontWeight: 700,
                          padding: "2px 8px",
                          borderRadius: 4,
                        }}
                      >
                        {ev.registrationOpen ? "REGISTRATION OPEN" : "CLOSED"}
                      </span>
                    </div>
                    <p style={{ margin: "6px 0", color: "#aaa8ba", fontSize: 13 }}>{ev.description}</p>
                    <div style={{ display: "flex", gap: 16, color: "#8d8a9e", fontSize: 12, flexWrap: "wrap" }}>
                      <span>📅 {ev.date}</span>
                      <span>⏰ {ev.time}</span>
                      <span>📍 {ev.venue}</span>
                      <span>💰 ₹{ev.entryFee}</span>
                      <span>UPI: {ev.upiId}</span>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      className={styles.secondaryButton}
                      onClick={() => setEditingEvent(ev)}
                      style={{ padding: "8px 12px", fontSize: 12 }}
                    >
                      <Edit3 size={13} /> Edit
                    </button>
                    <button
                      className={styles.rejectButton}
                      onClick={() => handleDeleteEvent(ev._id, ev.title)}
                      style={{ padding: "8px 12px", fontSize: 12 }}
                    >
                      <Trash2 size={13} /> Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* CREATE / EDIT EVENT MODAL */}
          {(showCreateEventModal || editingEvent) && (
            <div className={styles.modalOverlay}>
              <div className={styles.modalContent} style={{ maxWidth: 600 }}>
                <div className={styles.modalHeader}>
                  <h3>{editingEvent ? "Edit Conference Event" : "Create New Conference Event"}</h3>
                  <button
                    className={styles.closeButton}
                    onClick={() => {
                      setShowCreateEventModal(false)
                      setEditingEvent(null)
                    }}
                  >
                    <X size={18} />
                  </button>
                </div>

                <form
                  onSubmit={editingEvent ? handleUpdateEvent : handleCreateEvent}
                  style={{ display: "grid", gap: 14 }}
                >
                  <label style={{ display: "grid", gap: 6, color: "#e8e4f3", fontSize: 12 }}>
                    CONFERENCE TITLE
                    <input
                      type="text"
                      required
                      value={editingEvent ? editingEvent.title : eventFormData.title}
                      onChange={(e) =>
                        editingEvent
                          ? setEditingEvent({ ...editingEvent, title: e.target.value })
                          : setEventFormData({ ...eventFormData, title: e.target.value })
                      }
                      style={{
                        padding: 10,
                        background: "#080808",
                        border: "1px solid rgba(255,255,255,0.25)",
                        color: "#fff",
                        borderRadius: 4,
                      }}
                      placeholder="e.g. Arkham MUN Winter Summit 2026"
                    />
                  </label>

                  <label style={{ display: "grid", gap: 6, color: "#e8e4f3", fontSize: 12 }}>
                    DESCRIPTION
                    <textarea
                      rows={3}
                      value={editingEvent ? editingEvent.description : eventFormData.description}
                      onChange={(e) =>
                        editingEvent
                          ? setEditingEvent({ ...editingEvent, description: e.target.value })
                          : setEventFormData({ ...eventFormData, description: e.target.value })
                      }
                      style={{
                        padding: 10,
                        background: "#080808",
                        border: "1px solid rgba(255,255,255,0.25)",
                        color: "#fff",
                        borderRadius: 4,
                      }}
                      placeholder="Event briefing, theme, or delegate scope…"
                    />
                  </label>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <label style={{ display: "grid", gap: 6, color: "#e8e4f3", fontSize: 12 }}>
                      CONFERENCE DATES
                      <input
                        type="text"
                        required
                        value={editingEvent ? editingEvent.date : eventFormData.date}
                        onChange={(e) =>
                          editingEvent
                            ? setEditingEvent({ ...editingEvent, date: e.target.value })
                            : setEventFormData({ ...eventFormData, date: e.target.value })
                        }
                        style={{
                          padding: 10,
                          background: "#080808",
                          border: "1px solid rgba(255,255,255,0.25)",
                          color: "#fff",
                          borderRadius: 4,
                        }}
                        placeholder="e.g. 24–25 October 2026"
                      />
                    </label>

                    <label style={{ display: "grid", gap: 6, color: "#e8e4f3", fontSize: 12 }}>
                      TIMINGS
                      <input
                        type="text"
                        value={editingEvent ? editingEvent.time : eventFormData.time}
                        onChange={(e) =>
                          editingEvent
                            ? setEditingEvent({ ...editingEvent, time: e.target.value })
                            : setEventFormData({ ...eventFormData, time: e.target.value })
                        }
                        style={{
                          padding: 10,
                          background: "#080808",
                          border: "1px solid rgba(255,255,255,0.25)",
                          color: "#fff",
                          borderRadius: 4,
                        }}
                        placeholder="e.g. 9:00 AM – 5:00 PM"
                      />
                    </label>
                  </div>

                  <label style={{ display: "grid", gap: 6, color: "#e8e4f3", fontSize: 12 }}>
                    VENUE LOCATION
                    <input
                      type="text"
                      required
                      value={editingEvent ? editingEvent.venue : eventFormData.venue}
                      onChange={(e) =>
                        editingEvent
                          ? setEditingEvent({ ...editingEvent, venue: e.target.value })
                          : setEventFormData({ ...eventFormData, venue: e.target.value })
                      }
                      style={{
                        padding: 10,
                        background: "#080808",
                        border: "1px solid rgba(255,255,255,0.25)",
                        color: "#fff",
                        borderRadius: 4,
                      }}
                      placeholder="e.g. Arkham Assembly Hall, New Delhi"
                    />
                  </label>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <label style={{ display: "grid", gap: 6, color: "#e8e4f3", fontSize: 12 }}>
                      ENTRY FEE (₹ INR)
                      <input
                        type="number"
                        required
                        value={editingEvent ? editingEvent.entryFee : eventFormData.entryFee}
                        onChange={(e) =>
                          editingEvent
                            ? setEditingEvent({ ...editingEvent, entryFee: Number(e.target.value) })
                            : setEventFormData({ ...eventFormData, entryFee: Number(e.target.value) })
                        }
                        style={{
                          padding: 10,
                          background: "#080808",
                          border: "1px solid rgba(255,255,255,0.25)",
                          color: "#fff",
                          borderRadius: 4,
                        }}
                      />
                    </label>

                    <label style={{ display: "grid", gap: 6, color: "#e8e4f3", fontSize: 12 }}>
                      UPI ID FOR PAYMENTS
                      <input
                        type="text"
                        value={editingEvent ? editingEvent.upiId : eventFormData.upiId}
                        onChange={(e) =>
                          editingEvent
                            ? setEditingEvent({ ...editingEvent, upiId: e.target.value })
                            : setEventFormData({ ...eventFormData, upiId: e.target.value })
                        }
                        style={{
                          padding: 10,
                          background: "#080808",
                          border: "1px solid rgba(255,255,255,0.25)",
                          color: "#fff",
                          borderRadius: 4,
                        }}
                      />
                    </label>
                  </div>

                  <label style={{ display: "flex", alignItems: "center", gap: 10, color: "#fff", fontSize: 13 }}>
                    <input
                      type="checkbox"
                      checked={editingEvent ? editingEvent.registrationOpen : eventFormData.registrationOpen}
                      onChange={(e) =>
                        editingEvent
                          ? setEditingEvent({ ...editingEvent, registrationOpen: e.target.checked })
                          : setEventFormData({ ...eventFormData, registrationOpen: e.target.checked })
                      }
                      style={{ accentColor: "#e3262e", width: 16, height: 16 }}
                    />
                    Registration is currently open for this event
                  </label>

                  <div className={styles.actions} style={{ marginTop: 12 }}>
                    <button className={styles.primaryButton} type="submit" disabled={settingsBusy}>
                      {settingsBusy ? <LoaderCircle className={styles.spinner} size={14} /> : <Check size={14} />}
                      {editingEvent ? "Save Changes" : "Create Event in MongoDB Atlas"}
                    </button>
                    <button
                      className={styles.secondaryButton}
                      type="button"
                      onClick={() => {
                        setShowCreateEventModal(false)
                        setEditingEvent(null)
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </section>
      )}

      {/* VIEW 5: SEND ANNOUNCEMENTS */}
      {activeView === "announcements" && (
        <section className={styles.queuePanel}>
          <div className={styles.sectionHeading}>
            <div>
              <span className={styles.kicker}>SECRETARIAT DISPATCH</span>
              <h2>Send Delegate Announcements</h2>
              <p>Broadcast notices into delegates&apos; dashboards and persistent notification feeds.</p>
            </div>
          </div>

          <form onSubmit={handleSendAnnouncement} style={{ display: "grid", gap: 16, maxWidth: 640 }}>
            <label style={{ display: "grid", gap: 8, color: "#e8e4f3", fontSize: 12 }}>
              TARGET DELEGATE GROUP
              <select
                value={announcementEventId}
                onChange={(e) => setAnnouncementEventId(e.target.value)}
                style={{
                  padding: "12px 14px",
                  background: "#080808",
                  border: "1px solid rgba(255,255,255,0.25)",
                  color: "#fff",
                  borderRadius: 4,
                  fontSize: 13,
                }}
              >
                <option value="all">📢 All Registered Delegates (All Events)</option>
                {eventsList.map((ev) => (
                  <option key={ev._id} value={ev._id}>
                    Target Event: {ev.title} ({ev.date})
                  </option>
                ))}
              </select>
            </label>

            <label style={{ display: "grid", gap: 8, color: "#e8e4f3", fontSize: 12 }}>
              ANNOUNCEMENT MESSAGE
              <textarea
                rows={6}
                required
                placeholder="Type your official announcement here (e.g. Schedule release, dress code reminders, committee room allocations)…"
                value={announcementMessage}
                onChange={(e) => setAnnouncementMessage(e.target.value)}
                style={{
                  padding: "14px",
                  background: "#080808",
                  border: "1px solid rgba(255,255,255,0.25)",
                  color: "#fff",
                  borderRadius: 4,
                  fontSize: 14,
                  resize: "vertical",
                  outline: "none",
                }}
              />
            </label>

            <button
              className={styles.primaryButton}
              type="submit"
              disabled={announcementSending}
              style={{ padding: "14px", alignSelf: "flex-start" }}
            >
              {announcementSending ? <LoaderCircle className={styles.spinner} size={15} /> : <Send size={15} />}
              {announcementSending ? "Dispatching notices…" : "Broadcast Announcement to Dashboard"}
            </button>
          </form>
        </section>
      )}

      {/* VIEW 6: VENUE GATE SCANNER */}
      {activeView === "scanner" && (
        <section className={styles.scannerPanel}>
          <div className={styles.sectionHeading}>
            <div>
              <span className={styles.kicker}>SECURITY CHECKPOINT</span>
              <h2>Venue Entrance QR Scanner</h2>
              <p>Scan cryptographically signed passes presented on delegate dashboards.</p>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                className={cameraOn ? styles.rejectButton : styles.primaryButton}
                onClick={() => setCameraOn(!cameraOn)}
                type="button"
              >
                <Camera size={14} /> {cameraOn ? "Turn Camera Off" : "Enable Entrance Camera"}
              </button>
            </div>
          </div>

          <div className={styles.scannerGrid}>
            <div className={styles.videoFrame}>
              <video ref={videoRef} playsInline muted />
              <canvas ref={canvasRef} className={styles.hiddenCanvas} />
              {!cameraOn && (
                <div className={styles.cameraPlaceholder}>
                  <Camera size={44} />
                  <span>Camera paused. Click &quot;Enable Entrance Camera&quot; above.</span>
                </div>
              )}
            </div>

            <div className={styles.scanControls}>
              <div
                className={`${styles.scanResult} ${
                  scanState.type === "valid" ? styles.valid : scanState.type === "used" ? styles.used : ""
                }`}
              >
                {scanState.message}
              </div>

              {scannedRegistration && (
                <div
                  style={{
                    padding: 16,
                    background: "rgba(6, 6, 15, 0.75)",
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                    borderRadius: 6,
                  }}
                >
                  <h4 style={{ margin: "0 0 6px", color: "#fff" }}>{scannedRegistration.name}</h4>
                  <p style={{ margin: 0, fontSize: 12, color: "#aaa8ba" }}>
                    Committee: <strong>{scannedRegistration.committee || "General"}</strong>
                    <br />
                    Institution: {scannedRegistration.organization || "Independent"}
                  </p>

                  <button
                    className={styles.primaryButton}
                    onClick={() => handleConfirmEntry(scannedPayload)}
                    disabled={admitting || Boolean(scannedRegistration.checkedInAt)}
                    style={{ width: "100%", marginTop: 12 }}
                  >
                    {scannedRegistration.checkedInAt ? "✓ Already Checked In" : "Confirm Venue Entry"}
                  </button>
                </div>
              )}

              <form onSubmit={handleManualVerify} style={{ marginTop: 12 }}>
                <input
                  type="text"
                  placeholder="Paste payload manually…"
                  value={manualPayload}
                  onChange={(e) => setManualPayload(e.target.value)}
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    padding: 10,
                    background: "#080808",
                    border: "1px solid #454052",
                    color: "#fff",
                    borderRadius: 4,
                  }}
                />
                <button
                  className={styles.secondaryButton}
                  type="submit"
                  disabled={manualBusy}
                  style={{ width: "100%", marginTop: 8 }}
                >
                  Verify Payload
                </button>
              </form>
            </div>
          </div>
        </section>
      )}

      {/* VIEW 7: CONTACT INQUIRIES */}
      {activeView === "queries" && (
        <section className={styles.queuePanel}>
          <div className={styles.sectionHeading}>
            <div>
              <span className={styles.kicker}>SECRETARIAT HELPDESK</span>
              <h2>Delegate Enquiries ({filteredQueries.length})</h2>
              <p>Inquiries submitted through the contact form.</p>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                className={queryFilter === "all" ? styles.primaryButton : styles.secondaryButton}
                onClick={() => setQueryFilter("all")}
              >
                All
              </button>
              <button
                className={queryFilter === "pending" ? styles.primaryButton : styles.secondaryButton}
                onClick={() => setQueryFilter("pending")}
              >
                Pending ({pendingInquiriesCount})
              </button>
              <button
                className={queryFilter === "replied" ? styles.primaryButton : styles.secondaryButton}
                onClick={() => setQueryFilter("replied")}
              >
                Replied
              </button>
            </div>
          </div>

          <div className={styles.queueList}>
            {filteredQueries.map((q) => (
              <article className={styles.registration} key={q.id}>
                <div className={styles.registrationTitle}>
                  <div>
                    <h3>{q.subject}</h3>
                    <p>
                      From: <strong>{q.name}</strong> ({q.email})
                    </p>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: q.status === "replied" ? "#4ade80" : "#facc15" }}>
                    {q.status.toUpperCase()}
                  </span>
                </div>

                <p style={{ margin: "10px 0", color: "#d3cfdd", fontSize: 13, lineHeight: 1.6 }}>{q.message}</p>

                {q.reply_message && (
                  <div
                    style={{
                      padding: 10,
                      background: "rgba(34, 197, 94, 0.08)",
                      borderLeft: "3px solid #4ade80",
                      color: "#c8f1d5",
                      fontSize: 12,
                    }}
                  >
                    <strong>Secretariat Reply:</strong> {q.reply_message}
                  </div>
                )}

                <div className={styles.actions}>
                  <button
                    className={styles.primaryButton}
                    onClick={() => {
                      setReplyModalQuery(q)
                      setReplyMessageText(q.reply_message || "")
                    }}
                  >
                    <Send size={13} /> {q.status === "replied" ? "Edit Reply" : "Send Official Reply"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* VIEW 8: CONFERENCE SETTINGS */}
      {activeView === "settings" && (
        <section className={styles.settingsPanel}>
          <div className={styles.sectionHeading}>
            <div>
              <span className={styles.kicker}>CONFIGURATION</span>
              <h2>Global Registration Controls</h2>
            </div>
          </div>

          <form onSubmit={saveAllSettings} style={{ display: "grid", gap: 14, maxWidth: 580 }}>
            <label style={{ display: "grid", gap: 6, color: "#fff", fontSize: 12 }}>
              CONFERENCE NAME
              <input
                type="text"
                value={eventForm.name}
                onChange={(e) => setEventForm({ ...eventForm, name: e.target.value })}
                style={{ padding: 10, background: "#080808", border: "1px solid #454052", color: "#fff", borderRadius: 4 }}
              />
            </label>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <label style={{ display: "grid", gap: 6, color: "#fff", fontSize: 12 }}>
                CONFERENCE DATES
                <input
                  type="text"
                  value={eventForm.date}
                  onChange={(e) => setEventForm({ ...eventForm, date: e.target.value })}
                  style={{ padding: 10, background: "#080808", border: "1px solid #454052", color: "#fff", borderRadius: 4 }}
                />
              </label>
              <label style={{ display: "grid", gap: 6, color: "#fff", fontSize: 12 }}>
                TIMINGS
                <input
                  type="text"
                  value={eventForm.time}
                  onChange={(e) => setEventForm({ ...eventForm, time: e.target.value })}
                  style={{ padding: 10, background: "#080808", border: "1px solid #454052", color: "#fff", borderRadius: 4 }}
                />
              </label>
            </div>

            <label style={{ display: "grid", gap: 6, color: "#fff", fontSize: 12 }}>
              VENUE
              <input
                type="text"
                value={eventForm.venue}
                onChange={(e) => setEventForm({ ...eventForm, venue: e.target.value })}
                style={{ padding: 10, background: "#080808", border: "1px solid #454052", color: "#fff", borderRadius: 4 }}
              />
            </label>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <label style={{ display: "grid", gap: 6, color: "#fff", fontSize: 12 }}>
                ENTRY FEE (₹ INR)
                <input
                  type="number"
                  value={amountInput}
                  onChange={(e) => setAmountInput(Number(e.target.value))}
                  style={{ padding: 10, background: "#080808", border: "1px solid #454052", color: "#fff", borderRadius: 4 }}
                />
              </label>
              <label style={{ display: "grid", gap: 6, color: "#fff", fontSize: 12 }}>
                UPI ID
                <input
                  type="text"
                  value={upiIdInput}
                  onChange={(e) => setUpiIdInput(e.target.value)}
                  style={{ padding: 10, background: "#080808", border: "1px solid #454052", color: "#fff", borderRadius: 4 }}
                />
              </label>
            </div>

            <label style={{ display: "flex", alignItems: "center", gap: 8, color: "#fff", fontSize: 13, marginTop: 6 }}>
              <input
                type="checkbox"
                checked={registrationOpenInput}
                onChange={(e) => setRegistrationOpenInput(e.target.checked)}
                style={{ accentColor: "#e3262e", width: 16, height: 16 }}
              />
              Accept registrations on public site
            </label>

            <button className={styles.primaryButton} type="submit" disabled={settingsBusy} style={{ marginTop: 10 }}>
              {settingsBusy ? <LoaderCircle className={styles.spinner} size={15} /> : <Check size={15} />}
              Save Controls
            </button>
          </form>
        </section>
      )}

      {/* MODAL 1: REPLY TO INQUIRY */}
      {replyModalQuery && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3>Reply to Enquiry</h3>
              <button className={styles.closeButton} onClick={() => setReplyModalQuery(null)}>
                <X size={18} />
              </button>
            </div>

            <p style={{ margin: 0, fontSize: 13, color: "#b9b5c8" }}>
              Replying to: <strong>{replyModalQuery.name}</strong> ({replyModalQuery.email})
              <br />
              Subject: <em>{replyModalQuery.subject}</em>
            </p>

            <div style={{ padding: 10, background: "rgba(255,255,255,0.04)", borderRadius: 4, fontSize: 12 }}>
              {replyModalQuery.message}
            </div>

            <form onSubmit={handleSendReply} style={{ display: "grid", gap: 12 }}>
              <textarea
                rows={5}
                required
                value={replyMessageText}
                onChange={(e) => setReplyMessageText(e.target.value)}
                placeholder="Type response to delegate…"
                style={{
                  width: "100%",
                  padding: 10,
                  background: "#0c0b17",
                  border: "1px solid #454052",
                  color: "#fff",
                  borderRadius: 4,
                }}
              />
              <div className={styles.actions}>
                <button className={styles.primaryButton} type="submit" disabled={replyBusy}>
                  {replyBusy ? <LoaderCircle className={styles.spinner} size={14} /> : <Send size={14} />}
                  Send Official Response
                </button>
                <button className={styles.secondaryButton} type="button" onClick={() => setReplyModalQuery(null)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: SCREENSHOT FULL ZOOM */}
      {screenshotModalUrl && (
        <div className={styles.modalOverlay} onClick={() => setScreenshotModalUrl(null)}>
          <div style={{ maxWidth: 800, maxHeight: "90vh", position: "relative" }} onClick={(e) => e.stopPropagation()}>
            <img
              src={screenshotModalUrl}
              alt="Payment proof"
              style={{
                width: "100%",
                height: "auto",
                maxHeight: "85vh",
                objectFit: "contain",
                borderRadius: 8,
                border: "1px solid #fff",
              }}
            />
            <button
              onClick={() => setScreenshotModalUrl(null)}
              style={{
                position: "absolute",
                top: -12,
                right: -12,
                background: "#e3262e",
                border: 0,
                color: "#fff",
                width: 32,
                height: 32,
                borderRadius: "50%",
                cursor: "pointer",
                display: "grid",
                placeItems: "center",
              }}
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
