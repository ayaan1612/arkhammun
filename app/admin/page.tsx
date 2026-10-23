"use client"

import { FormEvent, useEffect, useRef, useState } from "react"
import Image from "next/image"
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
  QrCode,
  Download,
  RefreshCw,
  Search,
  Send,
  Settings,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Upload,
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
  FormSectionsConfig,
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

const defaultFormSections: FormSectionsConfig = {
  delegateDetails: {
    title: "Delegate details",
    description: "Personal and institutional details for pass issuance.",
    gradeLabel: "Class / Year / Grade",
    gradePlaceholder: "e.g. 11th Grade / 2nd Year",
  },
  experience: {
    title: "Experience",
    description: "Past MUN experience level.",
    tiers: ["0-5", "5-12", "12-20", "20+"],
  },
  committees: {
    title: "Committee preferences",
    description: "Rank your preferred committee assignments.",
    items: [
      "UNCSW (Advancing women's protection, leadership and rights in conflict zone with special emphasis on women)",
      "UNGA (Strengthening Nuclear Weapon-Free Zones with Focus on the Middle East and South Asia.)",
      "AIPPM (Use of Central Agencies (ED/CBI): Law Enforcement or Political Tool?)",
      "UNODC (Human Rights Implications of the Global War on Drugs.)",
      "UNHRC (Deliberating on Safeguarding Political Leaders Under International Human Rights Law.)",
      "IP",
      "IPL (Mega Auction)",
    ],
  },
  portfolioPreferences: {
    title: "Portfolio preferences",
    description: "Specify your country or candidate allocations.",
    flexiblePrompt: "Are you open to being assigned to any committee or portfolio if your top preferences are full?",
  },
  references: {
    title: "References",
    description: "Campus Ambassador and referral identification.",
    caPrompt: "CA Reference (IF NO TYPE NIL)",
    caPlaceholder: "NIL",
  },
  paymentSection: {
    title: "Payment & Verification",
    instructions:
      "Scan the official Arkham MUN UPI QR poster below in any payment app (Google Pay, PhonePe, Paytm, etc.). Then enter the UPI Transaction Reference (UTR), upload your screenshot, and check the payment confirmation box.",
    upiNote: "Official UPI Payment QR",
    paymentQrUrl: "",
  },
  specialRequests: {
    title: "Special requests / Notes",
    placeholder: "Any dietary restrictions, special accommodations, or notes for the secretariat",
  },
}

export default function AdminPage() {
  const router = useRouter()
  const { user, token, isAdmin, isLoading: authLoading, logout: authLogout, loginAdmin } = useAuth()

  const [adminKey, setAdminKey] = useState("")
  const [adminEmailInput, setAdminEmailInput] = useState("")
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
  const [paymentQrUrl, setPaymentQrUrl] = useState<string>("")
  const [formSections, setFormSections] = useState<FormSectionsConfig>(defaultFormSections)
  const [qrUploadBusy, setQrUploadBusy] = useState(false)
  const [newCommitteeName, setNewCommitteeName] = useState("")
  const [newTierName, setNewTierName] = useState("")
  const [settingsBusy, setSettingsBusy] = useState(false)

  // Inquiries / Helpdesk state
  const [queries, setQueries] = useState<ContactQuery[]>([])
  const [queryFilter, setQueryFilter] = useState<"all" | "pending" | "replied">("all")
  const [replyModalQuery, setReplyModalQuery] = useState<ContactQuery | null>(null)
  const [replyMessageText, setReplyMessageText] = useState("")
  const [replyBusy, setReplyBusy] = useState(false)

  // Venue scanner state (Admin only)
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
  const [adminPassModalReg, setAdminPassModalReg] = useState<AdminRegistration | null>(null)
  const [adminPassModalData, setAdminPassModalData] = useState<EntryQrResponse | null>(null)
  const [adminPassLoading, setAdminPassLoading] = useState(false)
  const [emailErrorModalText, setEmailErrorModalText] = useState<string | null>(null)

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

  // Auto-dismiss notice after 6 seconds
  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(() => setNotice(""), 6000)
    return () => window.clearTimeout(timer)
  }, [notice])

  // Auto-dismiss error after 8 seconds
  useEffect(() => {
    if (!error) return
    const timer = window.setTimeout(() => setError(""), 8000)
    return () => window.clearTimeout(timer)
  }, [error])

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
        if (currentSettings.paymentQrUrl) {
          setPaymentQrUrl(currentSettings.paymentQrUrl)
        }
        if (currentSettings.formSections) {
          setFormSections({
            ...defaultFormSections,
            ...currentSettings.formSections,
            delegateDetails: { ...defaultFormSections.delegateDetails, ...currentSettings.formSections.delegateDetails },
            experience: {
              ...defaultFormSections.experience,
              ...currentSettings.formSections.experience,
              tiers: currentSettings.formSections.experience?.tiers || defaultFormSections.experience?.tiers,
            },
            committees: {
              ...defaultFormSections.committees,
              ...currentSettings.formSections.committees,
              items: currentSettings.formSections.committees?.items || defaultFormSections.committees?.items,
            },
            portfolioPreferences: {
              ...defaultFormSections.portfolioPreferences,
              ...currentSettings.formSections.portfolioPreferences,
            },
            references: { ...defaultFormSections.references, ...currentSettings.formSections.references },
            paymentSection: { ...defaultFormSections.paymentSection, ...currentSettings.formSections.paymentSection },
            specialRequests: { ...defaultFormSections.specialRequests, ...currentSettings.formSections.specialRequests },
          })
        }
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
    if (!adminEmailInput.trim() || !keyInput.trim()) {
      setError("Both Administrative Email and Secretariat Admin Key are required to access this portal.")
      return
    }

    setLoading(true)
    setError("")
    try {
      const adminUser = await loginAdmin(adminEmailInput.trim(), keyInput.trim())
      const activeToken = localStorage.getItem("arkham_auth_token") || keyInput.trim()
      setAdminKey(activeToken)
      setAuthenticated(true)
      await loadData(activeToken)
      await loadEvents()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Invalid Admin Email or Secretariat Admin Key.")
      setAuthenticated(false)
    } finally {
      setLoading(false)
    }
  }

  async function approve(id: string) {
    setBusyId(id)
    setError("")
    try {
      const res = await entryPassApi.approveRegistration(id, adminKey)
      let msg = "✓ Payment approved and signed entry pass issued."
      if (res.email?.status === "sent") {
        msg = "✓ Payment approved! Entry pass QR has been automatically emailed to the delegate."
      } else if (res.email?.status === "failed") {
        msg = `✓ Payment approved! Pass issued to dashboard (auto-email note: ${res.email.error || "delivery error"}).`
      } else if (res.email?.status === "not_configured") {
        msg = "✓ Payment approved. Pass is now available on delegate's dashboard."
      }
      setNotice(msg)
      await loadData(adminKey, msg, queueFilter)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to approve registration.")
    } finally {
      setBusyId("")
    }
  }

  async function handleOpenAdminPass(reg: AdminRegistration) {
    setAdminPassModalReg(reg)
    setAdminPassModalData(null)
    setAdminPassLoading(true)
    try {
      const data = await entryPassApi.getEntryQr(reg.id)
      setAdminPassModalData(data)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load entry pass.")
    } finally {
      setAdminPassLoading(false)
    }
  }

  function handleDownloadAdminPass(dataUrl: string, name: string, id: string) {
    const link = document.createElement("a")
    link.href = dataUrl
    link.download = `arkham-mun-pass-${name.toLowerCase().replace(/[^a-z0-9]/g, "-")}-${id.slice(-6)}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  async function handleRetryEmail(id: string, force = false) {
    setRetryingId(id)
    setError("")
    try {
      const res = await entryPassApi.retryEmail(id, adminKey, force)
      if (res.email.status === "sent") {
        setNotice("Entry pass QR email sent successfully to delegate!")
      } else {
        setError(`Email delivery failed: ${res.email.error || res.email.status}`)
      }
      await loadData(adminKey)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to send approval email.")
    } finally {
      setRetryingId(null)
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
      const res = await entryPassApi.rejectRegistration(id, rejectReason.trim(), adminKey)
      setRejectingId("")
      setRejectReason("")
      const noticeMsg = res.email?.status === "sent"
        ? "Payment rejected. Rejection reason has been emailed to the delegate and posted to their dashboard."
        : res.email?.status === "failed"
        ? `Payment rejected. User notified on dashboard (email delivery note: ${res.email.error || "delivery failed"}).`
        : "Payment rejected and notice posted to user dashboard."
      await loadData(adminKey, noticeMsg, queueFilter)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to reject registration.")
    } finally {
      setBusyId("")
    }
  }

  async function handleToggleRegistration(eventId: string, currentStatus: boolean) {
    setLoading(true)
    setError("")
    try {
      const res = await entryPassApi.toggleRegistrationOpen(eventId, adminKey, !currentStatus)
      setNotice(res.message || `Registration is now ${!currentStatus ? "OPEN" : "CLOSED"}.`)
      await loadEvents()
      await loadData(adminKey, undefined, queueFilter)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to toggle registration status.")
    } finally {
      setLoading(false)
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
          paymentQrUrl: paymentQrUrl || undefined,
          formSections: formSections,
        },
        adminKey
      )

      setSettings(result)
      setEventForm(result.event)
      setAmountInput(result.amount)
      setUpiIdInput(result.upiId)
      setRegistrationOpenInput(result.registrationOpen)
      setRegistrationNoticeInput(result.registrationNotice)
      if (result.paymentQrUrl) setPaymentQrUrl(result.paymentQrUrl)
      if (result.formSections) setFormSections(result.formSections)
      setNotice("Conference settings & registration form updated successfully.")
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to save configuration.")
    } finally {
      setSettingsBusy(false)
    }
  }

  async function handleQrPosterUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setQrUploadBusy(true)
    setError("")
    try {
      const result = await entryPassApi.uploadPaymentQr(file, adminKey)
      setPaymentQrUrl(result.paymentQrUrl)
      setSettings((current) =>
        current ? { ...current, paymentQrConfigured: result.paymentQrConfigured, paymentQrUrl: result.paymentQrUrl } : current
      )
      setNotice("Official UPI QR poster uploaded and updated live!")
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to upload payment QR poster.")
    } finally {
      setQrUploadBusy(false)
      e.target.value = ""
    }
  }

  function handleResetPaymentQr() {
    setPaymentQrUrl("")
    setNotice("Reset payment QR poster to default. Click 'Save Conference & Form Studio' to persist.")
  }

  function handleAddCommittee() {
    if (!newCommitteeName.trim()) return
    const currentItems = formSections.committees?.items || []
    setFormSections({
      ...formSections,
      committees: {
        ...formSections.committees,
        items: [...currentItems, newCommitteeName.trim()],
      },
    })
    setNewCommitteeName("")
  }

  function handleRemoveCommittee(index: number) {
    const currentItems = formSections.committees?.items || []
    setFormSections({
      ...formSections,
      committees: {
        ...formSections.committees,
        items: currentItems.filter((_, i) => i !== index),
      },
    })
  }

  function handleUpdateCommittee(index: number, val: string) {
    const currentItems = [...(formSections.committees?.items || [])]
    currentItems[index] = val
    setFormSections({
      ...formSections,
      committees: {
        ...formSections.committees,
        items: currentItems,
      },
    })
  }

  function handleAddTier() {
    if (!newTierName.trim()) return
    const currentTiers = formSections.experience?.tiers || []
    setFormSections({
      ...formSections,
      experience: {
        ...formSections.experience,
        tiers: [...currentTiers, newTierName.trim()],
      },
    })
    setNewTierName("")
  }

  function handleRemoveTier(index: number) {
    const currentTiers = formSections.experience?.tiers || []
    setFormSections({
      ...formSections,
      experience: {
        ...formSections.experience,
        tiers: currentTiers.filter((_, i) => i !== index),
      },
    })
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
    const targetQueryId = replyModalQuery.id || (replyModalQuery as any)._id
    if (!targetQueryId) {
      setError("Enquiry ID is missing. Please refresh the page and try again.")
      return
    }
    setReplyBusy(true)
    setError("")
    try {
      const res = await entryPassApi.replyAdminQuery(targetQueryId, replyMessageText.trim(), adminKey)
      setReplyModalQuery(null)
      setReplyMessageText("")
      setNotice("Reply sent successfully and recorded in delegate dashboard.")
      await loadData(adminKey)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to send reply.")
    } finally {
      setReplyBusy(false)
    }
  }

  // Scanner logic: scans QR, turns off camera, and displays full-page delegate info review
  async function verifyPass(payload: string) {
    if (scanBusyRef.current) return
    scanBusyRef.current = true

    // Immediately stop camera upon scanning QR
    setCameraOn(false)
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }

    setScanState({ type: "idle", message: "Verifying pass cryptographic signature…" })

    try {
      // Check pass validity without admitting yet (admit: false)
      const result = await entryPassApi.verifyEntry(payload, adminKey, false)
      if (result.valid) {
        setScannedPayload(payload)
        setScannedRegistration(result.registration)
        const isAlreadyUsed = Boolean(result.registration.checkedInAt || result.alreadyUsed)

        if (isAlreadyUsed) {
          setScanState({
            type: "used",
            message: `⚠️ QR EXPIRED & ALREADY USED · Admitted earlier at ${new Date(
              result.registration.checkedInAt || Date.now()
            ).toLocaleTimeString()}.`,
          })
        } else {
          setScanState({
            type: "valid",
            message: `✓ VALID ENTRY PASS · Review details below and click Grant Entry.`,
          })
        }
      } else {
        setScanState({ type: "invalid", message: "INVALID PASS · This is not a valid signed Arkham MUN entry QR." })
        setTimeout(() => {
          setScanState({ type: "idle", message: "Point camera at delegate QR code." })
          setCameraOn(true)
          scanBusyRef.current = false
        }, 2500)
      }
    } catch (requestError) {
      setScanState({
        type: "error",
        message: requestError instanceof Error ? requestError.message : "Unable to verify this pass.",
      })
      setTimeout(() => {
        setScanState({ type: "idle", message: "Point camera at delegate QR code." })
        setCameraOn(true)
        scanBusyRef.current = false
      }, 2500)
    } finally {
      scanBusyRef.current = false
    }
  }

  async function handleConfirmEntry(payloadToAdmit: string) {
    if (!payloadToAdmit || admitting) return
    setAdmitting(true)
    setError("")
    try {
      const res = await entryPassApi.verifyEntry(payloadToAdmit, adminKey, true)
      if (res.valid) {
        const checkinTime = res.registration.checkedInAt || new Date().toISOString()
        setNotice(`✓ ENTRY GRANTED: ${res.registration.name} has been admitted and checked in! Pass is now expired.`)
        setAllApprovedRegistrations((prev) =>
          prev.map((item) => (item.id === res.registration.id ? { ...item, used_at: checkinTime } : item))
        )
        setScannedRegistration(null)
        setScannedPayload("")
        previousPayloadRef.current = null
        setScanState({ type: "idle", message: "Point camera at delegate QR code." })

        // Automatically re-open the camera scanner for the next delegate in line
        setTimeout(() => {
          setCameraOn(true)
        }, 400)
      } else {
        setError("Could not grant entry. The pass may be invalid or already consumed.")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to admit delegate.")
    } finally {
      setAdmitting(false)
    }
  }

  function handleCancelOrNext() {
    setScannedRegistration(null)
    setScannedPayload("")
    previousPayloadRef.current = null
    setScanState({ type: "idle", message: "Point camera at delegate QR code." })
    setTimeout(() => {
      setCameraOn(true)
    }, 300)
  }

  const verifyPassRef = useRef(verifyPass)
  useEffect(() => {
    verifyPassRef.current = verifyPass
  })

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
            Admin portal login is strictly restricted. Authenticate with your designated Administrative Email and Secretariat Admin Key only.
          </p>
          <form onSubmit={handleKeySubmit} style={{ display: "grid", gap: "14px" }}>
            <label style={{ display: "grid", gap: "6px" }}>
              Administrative Email
              <input
                type="email"
                required
                autoComplete="email"
                value={adminEmailInput}
                onChange={(event) => setAdminEmailInput(event.target.value)}
                placeholder="admin@arkhammun.org"
              />
            </label>
            <label style={{ display: "grid", gap: "6px" }}>
              Secretariat Admin Key
              <input
                type="password"
                required
                autoComplete="current-password"
                value={keyInput}
                onChange={(event) => setKeyInput(event.target.value)}
                placeholder="Enter secret admin key"
              />
            </label>
            <button className={styles.primaryButton} type="submit" disabled={loading} style={{ marginTop: "6px" }}>
              {loading ? <LoaderCircle className={styles.spinner} size={16} /> : null}
              {loading ? "Authenticating Secretariat…" : "Authenticate with Admin Key"}
            </button>
          </form>

          {error && (
            <p className={styles.error} style={{ marginTop: "14px" }}>
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
          onClick={() => {
            setActiveView("scanner")
            setScannedRegistration(null)
            setCameraOn(true)
          }}
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
        <div
          className={styles.notice}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
          }}
        >
          <div style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
            <Check size={14} style={{ flexShrink: 0 }} />
            <span>{notice}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotice("")}
            style={{
              background: "transparent",
              border: 0,
              color: "inherit",
              cursor: "pointer",
              padding: "2px 4px",
              display: "flex",
              alignItems: "center",
              opacity: 0.85,
            }}
            title="Dismiss notice"
          >
            <X size={15} />
          </button>
        </div>
      )}
      {error && (
        <div
          className={styles.error}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
          }}
        >
          <div style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
            <CircleAlert size={14} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => setError("")}
            style={{
              background: "transparent",
              border: 0,
              color: "inherit",
              cursor: "pointer",
              padding: "2px 4px",
              display: "flex",
              alignItems: "center",
              opacity: 0.85,
            }}
            title="Dismiss error"
          >
            <X size={15} />
          </button>
        </div>
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
            <button
              className={styles.secondaryButton}
              onClick={() => {
                setActiveView("scanner")
                setScannedRegistration(null)
                setCameraOn(true)
              }}
            >
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
                          <div style={{ display: "grid", gap: 8, width: "100%", marginTop: 10, padding: "12px", background: "rgba(227, 38, 46, 0.08)", border: "1px solid rgba(227, 38, 46, 0.35)", borderRadius: 6 }}>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                              <span style={{ fontSize: 11, color: "#8d8a9e", fontWeight: 600 }}>Quick Presets:</span>
                              {[
                                "Invalid 12-digit UPI UTR reference",
                                "Payment proof screenshot is blurry/unreadable",
                                "Payment amount does not match delegate fee",
                                "Duplicate transaction reference submitted",
                              ].map((preset) => (
                                <button
                                  key={preset}
                                  type="button"
                                  onClick={() => setRejectReason(preset)}
                                  style={{
                                    background: rejectReason === preset ? "rgba(227, 38, 46, 0.3)" : "rgba(255, 255, 255, 0.06)",
                                    border: rejectReason === preset ? "1px solid #e3262e" : "1px solid rgba(255, 255, 255, 0.15)",
                                    borderRadius: 4,
                                    padding: "3px 8px",
                                    fontSize: 11,
                                    color: "#fff",
                                    cursor: "pointer",
                                  }}
                                >
                                  {preset}
                                </button>
                              ))}
                            </div>
                            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                              <input
                                type="text"
                                placeholder="Enter or select rejection reason (delivered to delegate's email & notification bell)…"
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
                                {busyId === reg.id ? "Rejecting..." : "Confirm Rejection"}
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

                  {/* Payment Screenshot Thumbnail for Approved Delegates */}
                  {(reg.screenshotBlobUrl || reg.screenshot_url) && (
                    <div style={{ marginTop: 12, marginBottom: 14 }}>
                      <span style={{ fontSize: 11, color: "#aaa8ba", display: "block", marginBottom: 6 }}>
                        Verified Payment Proof (Click to enlarge):
                      </span>
                      <img
                        src={reg.screenshotBlobUrl || reg.screenshot_url}
                        alt="Verified payment screenshot"
                        onClick={() => setScreenshotModalUrl(reg.screenshotBlobUrl || reg.screenshot_url || null)}
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

                  {/* Email Delivery Control & Status for Approved Delegate */}
                  <div
                    style={{
                      marginTop: 14,
                      paddingTop: 12,
                      borderTop: "1px dashed rgba(255, 255, 255, 0.1)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      flexWrap: "wrap",
                      gap: 10,
                    }}
                  >
                    <div style={{ fontSize: 12 }}>
                      <span style={{ color: "#aaa8ba" }}>Email Delivery: </span>
                      {reg.email_status === "sent" ? (
                        <strong style={{ color: "#4ade80", display: "inline-flex", alignItems: "center", gap: 4 }}>
                          <Check size={13} /> Automatically Sent to {reg.email || reg.contact}
                        </strong>
                      ) : reg.email_status === "failed" ? (
                        <button
                          type="button"
                          onClick={() => setEmailErrorModalText(reg.email_error || "Email delivery failed")}
                          style={{
                            background: "transparent",
                            border: 0,
                            color: "#f87171",
                            cursor: "pointer",
                            fontSize: 12,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                            padding: 0,
                            textDecoration: "underline",
                          }}
                          title="Click to view detailed error & fix"
                        >
                          <CircleAlert size={13} /> Delivery Issue (Click details)
                        </button>
                      ) : (
                        <span style={{ color: "#facc15" }}>⏳ Not sent yet</span>
                      )}
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <button
                        type="button"
                        className={styles.secondaryButton}
                        onClick={() => handleOpenAdminPass(reg)}
                        style={{
                          padding: "6px 12px",
                          fontSize: 11,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          background: "rgba(255, 255, 255, 0.08)",
                          color: "#fff",
                          border: "1px solid rgba(255, 255, 255, 0.2)",
                          cursor: "pointer",
                        }}
                      >
                        <QrCode size={13} /> View Pass QR
                      </button>

                      <button
                        type="button"
                        className={styles.secondaryButton}
                        disabled={retryingId === reg.id}
                        onClick={() => handleRetryEmail(reg.id, true)}
                        style={{
                          padding: "6px 14px",
                          fontSize: 11,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          backgroundColor: reg.email_status === "sent" ? "rgba(255, 255, 255, 0.06)" : "#e3262e",
                          color: "#fff",
                          borderColor: reg.email_status === "sent" ? "rgba(255, 255, 255, 0.2)" : "#e3262e",
                          cursor: "pointer",
                        }}
                        title="Pass is emailed automatically on approval. Click to send another copy."
                      >
                        {retryingId === reg.id ? <LoaderCircle size={13} className={styles.spinner} /> : <Mail size={13} />}
                        {reg.email_status === "sent" ? "Resend Email Copy" : "Send Entry Pass to Email"}
                      </button>
                    </div>
                  </div>
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

                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <button
                      type="button"
                      onClick={() => handleToggleRegistration(ev._id, ev.registrationOpen)}
                      style={{
                        padding: "8px 12px",
                        fontSize: 12,
                        fontWeight: 700,
                        borderRadius: 4,
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        backgroundColor: ev.registrationOpen ? "rgba(227, 38, 46, 0.15)" : "rgba(34, 197, 94, 0.15)",
                        border: ev.registrationOpen ? "1px solid #e3262e" : "1px solid #22c55e",
                        color: ev.registrationOpen ? "#ff8288" : "#4ade80",
                      }}
                    >
                      {ev.registrationOpen ? "🔒 Close Registration" : "🔓 Re-open Registration"}
                    </button>
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
          {scannedRegistration ? (
            /* FULL-PAGE DELEGATE ADMISSION VERIFICATION SCREEN */
            <div
              style={{
                backgroundColor: "#0d0b18",
                border: scannedRegistration.checkedInAt
                  ? "1px solid rgba(239, 68, 68, 0.5)"
                  : "1px solid rgba(34, 197, 94, 0.5)",
                borderRadius: 12,
                padding: "26px 30px",
                display: "grid",
                gap: 22,
                boxShadow: scannedRegistration.checkedInAt
                  ? "0 20px 50px rgba(239, 68, 68, 0.2)"
                  : "0 20px 50px rgba(34, 197, 94, 0.2)",
              }}
            >
              {/* Top Status Header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "14px 20px",
                  borderRadius: 8,
                  backgroundColor: scannedRegistration.checkedInAt
                    ? "rgba(239, 68, 68, 0.15)"
                    : "rgba(34, 197, 94, 0.15)",
                  border: scannedRegistration.checkedInAt
                    ? "1px solid #ef4444"
                    : "1px solid #22c55e",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  {scannedRegistration.checkedInAt ? (
                    <CircleAlert size={26} color="#ef4444" />
                  ) : (
                    <CheckCircle2 size={26} color="#22c55e" />
                  )}
                  <div>
                    <strong
                      style={{
                        fontSize: 16,
                        color: scannedRegistration.checkedInAt ? "#fca5a5" : "#86efac",
                        display: "block",
                      }}
                    >
                      {scannedRegistration.checkedInAt
                        ? "⛔ PASS EXPIRED / ALREADY ADMITTED"
                        : "✓ VALID ENTRY PASS · READY FOR GATE ADMISSION"}
                    </strong>
                    <span style={{ fontSize: 12, color: "#aaa8ba" }}>
                      {scannedRegistration.checkedInAt
                        ? `Entry was already granted at ${new Date(scannedRegistration.checkedInAt).toLocaleTimeString()} on ${new Date(scannedRegistration.checkedInAt).toLocaleDateString()}. Repeat entry is strictly rejected.`
                        : "Cryptographic signature verified. Review delegate information below and click Grant Venue Entry."}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleCancelOrNext}
                  style={{
                    background: "rgba(255, 255, 255, 0.08)",
                    border: 0,
                    color: "#aaa8ba",
                    cursor: "pointer",
                    padding: 6,
                    borderRadius: "50%",
                    display: "flex",
                  }}
                  title="Close & Scan Next"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Delegate Profile Card */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 18,
                  paddingBottom: 18,
                  borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
                }}
              >
                <div
                  style={{
                    width: 60,
                    height: 60,
                    borderRadius: "50%",
                    backgroundColor: scannedRegistration.checkedInAt ? "#ef4444" : "#22c55e",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#fff",
                    fontSize: 24,
                    fontWeight: 700,
                    boxShadow: "0 6px 18px rgba(0,0,0,0.4)",
                  }}
                >
                  {scannedRegistration.name.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <h2 style={{ margin: "0 0 6px", fontSize: 24, color: "#fff", fontWeight: 700 }}>
                    {scannedRegistration.name}
                  </h2>
                  <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                    <span
                      style={{
                        fontFamily: "monospace",
                        fontSize: 12,
                        backgroundColor: "rgba(255, 255, 255, 0.08)",
                        padding: "3px 10px",
                        borderRadius: 4,
                        color: "#d1d5db",
                      }}
                    >
                      Registration ID: {scannedRegistration.id}
                    </span>
                    <span
                      style={{
                        fontSize: 12,
                        backgroundColor: "rgba(227, 38, 46, 0.2)",
                        color: "#ff8289",
                        padding: "3px 10px",
                        borderRadius: 4,
                        fontWeight: 600,
                      }}
                    >
                      {scannedRegistration.committee || "Delegate"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Comprehensive Details Grid */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
                  gap: 16,
                }}
              >
                <div
                  style={{
                    background: "rgba(255, 255, 255, 0.03)",
                    padding: 14,
                    borderRadius: 8,
                    border: "1px solid rgba(255, 255, 255, 0.06)",
                  }}
                >
                  <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", color: "#8f8b9e", display: "block", marginBottom: 4 }}>
                    Committee / Council
                  </span>
                  <strong style={{ fontSize: 14, color: "#fff" }}>
                    {scannedRegistration.committee || "General Delegate"}
                  </strong>
                </div>

                <div
                  style={{
                    background: "rgba(255, 255, 255, 0.03)",
                    padding: 14,
                    borderRadius: 8,
                    border: "1px solid rgba(255, 255, 255, 0.06)",
                  }}
                >
                  <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", color: "#8f8b9e", display: "block", marginBottom: 4 }}>
                    School / Institution
                  </span>
                  <strong style={{ fontSize: 14, color: "#fff" }}>
                    {scannedRegistration.organization || "Independent Delegate"}
                  </strong>
                </div>

                <div
                  style={{
                    background: "rgba(255, 255, 255, 0.03)",
                    padding: 14,
                    borderRadius: 8,
                    border: "1px solid rgba(255, 255, 255, 0.06)",
                  }}
                >
                  <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", color: "#8f8b9e", display: "block", marginBottom: 4 }}>
                    Email Address
                  </span>
                  <strong style={{ fontSize: 13, color: "#fff", wordBreak: "break-all" }}>
                    {scannedRegistration.email}
                  </strong>
                </div>

                <div
                  style={{
                    background: "rgba(255, 255, 255, 0.03)",
                    padding: 14,
                    borderRadius: 8,
                    border: "1px solid rgba(255, 255, 255, 0.06)",
                  }}
                >
                  <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", color: "#8f8b9e", display: "block", marginBottom: 4 }}>
                    Phone Number
                  </span>
                  <strong style={{ fontSize: 14, color: "#fff" }}>
                    {scannedRegistration.phone || "Not provided"}
                  </strong>
                </div>

                <div
                  style={{
                    background: "rgba(255, 255, 255, 0.03)",
                    padding: 14,
                    borderRadius: 8,
                    border: "1px solid rgba(255, 255, 255, 0.06)",
                  }}
                >
                  <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", color: "#8f8b9e", display: "block", marginBottom: 4 }}>
                    Fee &amp; Payment Reference
                  </span>
                  <strong style={{ fontSize: 13, color: "#fff" }}>
                    ₹ {scannedRegistration.amount || 2300} · <span style={{ fontFamily: "monospace", color: "#a5b4fc" }}>UTR: {scannedRegistration.utr || "Verified"}</span>
                  </strong>
                </div>

                <div
                  style={{
                    background: "rgba(255, 255, 255, 0.03)",
                    padding: 14,
                    borderRadius: 8,
                    border: "1px solid rgba(255, 255, 255, 0.06)",
                  }}
                >
                  <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", color: "#8f8b9e", display: "block", marginBottom: 4 }}>
                    Venue &amp; Dates
                  </span>
                  <strong style={{ fontSize: 13, color: "#fff" }}>
                    {scannedRegistration.event?.venue || "Arkham Assembly Hall, New Delhi"}
                  </strong>
                </div>
              </div>

              {/* Verified Payment Proof Thumbnail (if present) */}
              {scannedRegistration.screenshot_path && (
                <div
                  style={{
                    padding: "12px 16px",
                    background: "rgba(255, 255, 255, 0.02)",
                    borderRadius: 8,
                    border: "1px solid rgba(255, 255, 255, 0.06)",
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                  }}
                >
                  <img
                    src={scannedRegistration.screenshot_path}
                    alt="Payment Proof"
                    onClick={() => setScreenshotModalUrl(scannedRegistration.screenshot_path || null)}
                    style={{
                      width: 50,
                      height: 50,
                      objectFit: "cover",
                      borderRadius: 6,
                      cursor: "pointer",
                      border: "1px solid rgba(255, 255, 255, 0.2)",
                    }}
                    title="Click to enlarge"
                  />
                  <div style={{ fontSize: 12 }}>
                    <span style={{ color: "#fff", display: "block", fontWeight: 600 }}>Verified Payment Screenshot</span>
                    <span style={{ color: "#8f8b9e" }}>Click thumbnail to view full payment verification proof</span>
                  </div>
                </div>
              )}

              {/* Bottom Admission Actions */}
              <div style={{ display: "grid", gap: 12, marginTop: 10 }}>
                {!scannedRegistration.checkedInAt ? (
                  <>
                    <button
                      type="button"
                      onClick={() => handleConfirmEntry(scannedPayload)}
                      disabled={admitting}
                      style={{
                        width: "100%",
                        padding: "18px 24px",
                        fontSize: 16,
                        fontWeight: 700,
                        letterSpacing: "0.04em",
                        backgroundColor: "#22c55e",
                        color: "#052e16",
                        border: "none",
                        borderRadius: 8,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 10,
                        boxShadow: "0 8px 24px rgba(34, 197, 94, 0.45)",
                        transition: "all 0.2s ease",
                      }}
                    >
                      {admitting ? <LoaderCircle size={22} className={styles.spinner} /> : <CheckCircle2 size={22} />}
                      GRANT VENUE ENTRY &amp; CHECK IN
                    </button>

                    <button
                      type="button"
                      onClick={handleCancelOrNext}
                      disabled={admitting}
                      style={{
                        width: "100%",
                        padding: "11px 16px",
                        fontSize: 13,
                        color: "#aaa8ba",
                        background: "transparent",
                        border: "1px solid rgba(255, 255, 255, 0.15)",
                        borderRadius: 6,
                        cursor: "pointer",
                      }}
                    >
                      Cancel &amp; Scan Next Delegate
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={handleCancelOrNext}
                    style={{
                      width: "100%",
                      padding: "16px 20px",
                      fontSize: 15,
                      fontWeight: 600,
                      backgroundColor: "#e3262e",
                      color: "#fff",
                      border: "none",
                      borderRadius: 8,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                    }}
                  >
                    <X size={18} /> Pass Expired · Scan Next Delegate
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* LIVE GATE SCANNER VIEWPORT */
            <div>
              <div className={styles.sectionHeading}>
                <div>
                  <span className={styles.kicker}>GATE SECURITY CHECKPOINT</span>
                  <h2>Venue Entrance Scanner</h2>
                  <p>Point camera directly at a delegate&apos;s Entry QR code to verify identity &amp; admission.</p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div
                    style={{
                      padding: "6px 14px",
                      borderRadius: 20,
                      background: "rgba(34, 197, 94, 0.1)",
                      border: "1px solid rgba(34, 197, 94, 0.3)",
                      color: "#86efac",
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    Checked In: {checkedInCount} / {allApprovedRegistrations.length}
                  </div>
                  <button
                    className={cameraOn ? styles.rejectButton : styles.primaryButton}
                    onClick={() => setCameraOn(!cameraOn)}
                    type="button"
                  >
                    <Camera size={14} /> {cameraOn ? "Turn Camera Off" : "Enable Entrance Camera"}
                  </button>
                </div>
              </div>

              <div
                style={{
                  maxWidth: 620,
                  margin: "18px auto 0",
                  display: "grid",
                  gap: 16,
                }}
              >
                <div className={styles.videoFrame} style={{ minHeight: 380, borderRadius: 10 }}>
                  <video ref={videoRef} playsInline muted style={{ width: "100%", borderRadius: 10 }} />
                  <canvas ref={canvasRef} className={styles.hiddenCanvas} />
                  {!cameraOn ? (
                    <div className={styles.cameraPlaceholder}>
                      <Camera size={52} />
                      <span style={{ fontSize: 14, color: "#d1d5db", fontWeight: 500 }}>Camera is Paused</span>
                      <button
                        type="button"
                        className={styles.primaryButton}
                        onClick={() => setCameraOn(true)}
                        style={{ marginTop: 8 }}
                      >
                        <Camera size={14} /> Enable Entrance Camera
                      </button>
                    </div>
                  ) : (
                    <div
                      style={{
                        position: "absolute",
                        top: 16,
                        left: 16,
                        right: 16,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        pointerEvents: "none",
                      }}
                    >
                      <span
                        style={{
                          backgroundColor: "rgba(0,0,0,0.75)",
                          color: "#22c55e",
                          padding: "4px 12px",
                          borderRadius: 20,
                          fontSize: 11,
                          fontWeight: 600,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          border: "1px solid rgba(34,197,94,0.4)",
                        }}
                      >
                        <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#22c55e", display: "inline-block" }} />
                        Scanner Live · Ready
                      </span>
                    </div>
                  )}
                </div>

                <div
                  className={`${styles.scanResult} ${
                    scanState.type === "valid" ? styles.valid : scanState.type === "used" ? styles.used : ""
                  }`}
                  style={{ textAlign: "center", justifyContent: "center" }}
                >
                  {scanState.message}
                </div>
              </div>
            </div>
          )}
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
              <article className={styles.registration} key={q.id || q._id || q.email + q.created_at}>
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

      {/* VIEW 8: CONFERENCE & REGISTRATION FORM STUDIO */}
      {activeView === "settings" && (
        <section className={styles.settingsPanel} style={{ maxWidth: 960 }}>
          <div className={styles.sectionHeading}>
            <div>
              <span className={styles.kicker}>SECRETARIAT STUDIO</span>
              <h2>Conference &amp; Registration Form Studio</h2>
              <p>Configure live conference details, upload payment QR posters, and customize every section of the delegate registration form.</p>
            </div>
          </div>

          <form onSubmit={saveAllSettings} style={{ display: "grid", gap: 28 }}>
            {/* SUB-SECTION 1: CORE LOGISTICS */}
            <div
              style={{
                padding: 20,
                background: "rgba(8, 8, 18, 0.6)",
                border: "1px solid rgba(160, 150, 205, 0.18)",
                borderRadius: 8,
                display: "grid",
                gap: 16,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, borderBottom: "1px solid rgba(160, 150, 205, 0.14)", paddingBottom: 10 }}>
                <Calendar size={18} style={{ color: "#e3262e" }} />
                <h3 style={{ margin: 0, fontSize: 16, color: "#fff" }}>Conference Core Logistics &amp; Gate</h3>
              </div>

              <label style={{ display: "grid", gap: 6, color: "#aaa8ba", fontSize: 11, fontWeight: 600 }}>
                CONFERENCE NAME
                <input
                  type="text"
                  value={eventForm.name}
                  onChange={(e) => setEventForm({ ...eventForm, name: e.target.value })}
                  style={{ padding: 10, background: "#080808", border: "1px solid #454052", color: "#fff", borderRadius: 4 }}
                />
              </label>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <label style={{ display: "grid", gap: 6, color: "#aaa8ba", fontSize: 11, fontWeight: 600 }}>
                  CONFERENCE DATES
                  <input
                    type="text"
                    value={eventForm.date}
                    onChange={(e) => setEventForm({ ...eventForm, date: e.target.value })}
                    style={{ padding: 10, background: "#080808", border: "1px solid #454052", color: "#fff", borderRadius: 4 }}
                  />
                </label>
                <label style={{ display: "grid", gap: 6, color: "#aaa8ba", fontSize: 11, fontWeight: 600 }}>
                  TIMINGS
                  <input
                    type="text"
                    value={eventForm.time}
                    onChange={(e) => setEventForm({ ...eventForm, time: e.target.value })}
                    style={{ padding: 10, background: "#080808", border: "1px solid #454052", color: "#fff", borderRadius: 4 }}
                  />
                </label>
              </div>

              <label style={{ display: "grid", gap: 6, color: "#aaa8ba", fontSize: 11, fontWeight: 600 }}>
                VENUE
                <input
                  type="text"
                  value={eventForm.venue}
                  onChange={(e) => setEventForm({ ...eventForm, venue: e.target.value })}
                  style={{ padding: 10, background: "#080808", border: "1px solid #454052", color: "#fff", borderRadius: 4 }}
                />
              </label>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <label style={{ display: "grid", gap: 6, color: "#aaa8ba", fontSize: 11, fontWeight: 600 }}>
                  ENTRY FEE (₹ INR)
                  <input
                    type="number"
                    value={amountInput}
                    onChange={(e) => setAmountInput(Number(e.target.value))}
                    style={{ padding: 10, background: "#080808", border: "1px solid #454052", color: "#fff", borderRadius: 4 }}
                  />
                </label>
                <label style={{ display: "grid", gap: 6, color: "#aaa8ba", fontSize: 11, fontWeight: 600 }}>
                  UPI ID
                  <input
                    type="text"
                    value={upiIdInput}
                    onChange={(e) => setUpiIdInput(e.target.value)}
                    style={{ padding: 10, background: "#080808", border: "1px solid #454052", color: "#fff", borderRadius: 4 }}
                  />
                </label>
              </div>

              <label style={{ display: "flex", alignItems: "center", gap: 10, color: "#fff", fontSize: 13, cursor: "pointer", marginTop: 4 }}>
                <input
                  type="checkbox"
                  checked={registrationOpenInput}
                  onChange={(e) => setRegistrationOpenInput(e.target.checked)}
                  style={{ accentColor: "#e3262e", width: 18, height: 18 }}
                />
                <span>Accept registrations on public site (Registration Gate Open)</span>
              </label>

              {!registrationOpenInput && (
                <label style={{ display: "grid", gap: 6, color: "#ffd19c", fontSize: 11, fontWeight: 600 }}>
                  REGISTRATION CLOSED NOTICE BANNER
                  <textarea
                    rows={2}
                    value={registrationNoticeInput}
                    onChange={(e) => setRegistrationNoticeInput(e.target.value)}
                    placeholder="Notice displayed on registration page when closed..."
                    style={{ padding: 10, background: "#080808", border: "1px solid #e6a54a", color: "#fff", borderRadius: 4 }}
                  />
                </label>
              )}
            </div>

            {/* SUB-SECTION 2: SECTION 06 PAYMENT & QR POSTER */}
            <div
              style={{
                padding: 20,
                background: "rgba(8, 8, 18, 0.6)",
                border: "1px solid rgba(227, 38, 46, 0.3)",
                borderRadius: 8,
                display: "grid",
                gap: 16,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(227, 38, 46, 0.2)", paddingBottom: 10, flexWrap: "wrap", gap: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <ImageIcon size={18} style={{ color: "#e3262e" }} />
                  <h3 style={{ margin: 0, fontSize: 16, color: "#fff" }}>Section 06: Payment &amp; Official QR Poster</h3>
                </div>
                <span style={{ fontSize: 11, color: paymentQrUrl ? "#4ade80" : "#aaa8ba", fontWeight: 700 }}>
                  {paymentQrUrl ? "✓ CUSTOM QR POSTER ACTIVE" : "DEFAULT QR ACTIVE"}
                </span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "minmax(240px, 300px) 1fr", gap: 20, alignItems: "start" }}>
                {/* QR Poster Preview & Uploader */}
                <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "center", padding: 14, background: "#05050c", border: "1px solid rgba(255, 255, 255, 0.12)", borderRadius: 6 }}>
                  <span style={{ color: "#aaa8ba", fontSize: 11, fontWeight: 600 }}>LIVE QR POSTER PREVIEW</span>
                  <div style={{ position: "relative", width: 200, height: 280, background: "#000", border: "1px solid rgba(227, 38, 46, 0.4)", borderRadius: 6, overflow: "hidden" }}>
                    <Image
                      src={paymentQrUrl ? entryPassApi.paymentQrUrl(paymentQrUrl) : "/payment-qr.jpeg"}
                      alt="Current Payment QR Poster"
                      fill
                      unoptimized
                      style={{ objectFit: "contain" }}
                    />
                  </div>

                  <label
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      width: "100%",
                      padding: "9px 12px",
                      background: qrUploadBusy ? "rgba(227, 38, 46, 0.3)" : "rgba(227, 38, 46, 0.2)",
                      border: "1px solid rgba(227, 38, 46, 0.5)",
                      borderRadius: 4,
                      color: "#fff",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: qrUploadBusy ? "wait" : "pointer",
                      textAlign: "center",
                    }}
                  >
                    {qrUploadBusy ? <LoaderCircle size={14} className={styles.spinner} /> : <Upload size={14} />}
                    {qrUploadBusy ? "Uploading Poster…" : "Upload New QR Poster"}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      disabled={qrUploadBusy}
                      onChange={handleQrPosterUpload}
                      style={{ display: "none" }}
                    />
                  </label>

                  {paymentQrUrl && (
                    <button
                      type="button"
                      onClick={handleResetPaymentQr}
                      style={{
                        background: "transparent",
                        border: "1px solid rgba(255, 255, 255, 0.2)",
                        color: "#aaa8ba",
                        borderRadius: 4,
                        padding: "6px 10px",
                        fontSize: 11,
                        cursor: "pointer",
                        width: "100%",
                      }}
                    >
                      Reset to Default Poster
                    </button>
                  )}
                </div>

                {/* Section 06 Text Controls */}
                <div style={{ display: "grid", gap: 14 }}>
                  <label style={{ display: "grid", gap: 6, color: "#aaa8ba", fontSize: 11, fontWeight: 600 }}>
                    SECTION 06 TITLE
                    <input
                      type="text"
                      value={formSections.paymentSection?.title || "Payment & Verification"}
                      onChange={(e) =>
                        setFormSections({
                          ...formSections,
                          paymentSection: {
                            ...formSections.paymentSection,
                            title: e.target.value,
                          },
                        })
                      }
                      style={{ padding: 10, background: "#080808", border: "1px solid #454052", color: "#fff", borderRadius: 4 }}
                    />
                  </label>

                  <label style={{ display: "grid", gap: 6, color: "#aaa8ba", fontSize: 11, fontWeight: 600 }}>
                    DELEGATE PAYMENT INSTRUCTIONS
                    <textarea
                      rows={3}
                      value={
                        formSections.paymentSection?.instructions ||
                        "Scan the official Arkham MUN UPI QR poster below in any payment app (Google Pay, PhonePe, Paytm, etc.). Then enter the UPI Transaction Reference (UTR), upload your screenshot, and check the payment confirmation box."
                      }
                      onChange={(e) =>
                        setFormSections({
                          ...formSections,
                          paymentSection: {
                            ...formSections.paymentSection,
                            instructions: e.target.value,
                          },
                        })
                      }
                      style={{ padding: 10, background: "#080808", border: "1px solid #454052", color: "#fff", borderRadius: 4 }}
                    />
                  </label>

                  <label style={{ display: "grid", gap: 6, color: "#aaa8ba", fontSize: 11, fontWeight: 600 }}>
                    UPI POSTER HEADER NOTE
                    <input
                      type="text"
                      value={formSections.paymentSection?.upiNote || "Official UPI Payment QR"}
                      onChange={(e) =>
                        setFormSections({
                          ...formSections,
                          paymentSection: {
                            ...formSections.paymentSection,
                            upiNote: e.target.value,
                          },
                        })
                      }
                      style={{ padding: 10, background: "#080808", border: "1px solid #454052", color: "#fff", borderRadius: 4 }}
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* SUB-SECTION 3: SECTION 01 DELEGATE DETAILS */}
            <div
              style={{
                padding: 20,
                background: "rgba(8, 8, 18, 0.6)",
                border: "1px solid rgba(160, 150, 205, 0.18)",
                borderRadius: 8,
                display: "grid",
                gap: 14,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, borderBottom: "1px solid rgba(160, 150, 205, 0.14)", paddingBottom: 10 }}>
                <span style={{ color: "#e3262e", fontWeight: 700, fontSize: 13 }}>01</span>
                <h3 style={{ margin: 0, fontSize: 16, color: "#fff" }}>Section 01: Delegate Details Customizer</h3>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <label style={{ display: "grid", gap: 6, color: "#aaa8ba", fontSize: 11, fontWeight: 600 }}>
                  SECTION TITLE
                  <input
                    type="text"
                    value={formSections.delegateDetails?.title || "Delegate details"}
                    onChange={(e) =>
                      setFormSections({
                        ...formSections,
                        delegateDetails: {
                          ...formSections.delegateDetails,
                          title: e.target.value,
                        },
                      })
                    }
                    style={{ padding: 10, background: "#080808", border: "1px solid #454052", color: "#fff", borderRadius: 4 }}
                  />
                </label>
                <label style={{ display: "grid", gap: 6, color: "#aaa8ba", fontSize: 11, fontWeight: 600 }}>
                  SECTION SUBTITLE / HINT
                  <input
                    type="text"
                    value={formSections.delegateDetails?.description || "Personal and institutional details for pass issuance."}
                    onChange={(e) =>
                      setFormSections({
                        ...formSections,
                        delegateDetails: {
                          ...formSections.delegateDetails,
                          description: e.target.value,
                        },
                      })
                    }
                    style={{ padding: 10, background: "#080808", border: "1px solid #454052", color: "#fff", borderRadius: 4 }}
                  />
                </label>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <label style={{ display: "grid", gap: 6, color: "#aaa8ba", fontSize: 11, fontWeight: 600 }}>
                  CLASS / GRADE FIELD LABEL
                  <input
                    type="text"
                    value={formSections.delegateDetails?.gradeLabel || "Class / Year / Grade"}
                    onChange={(e) =>
                      setFormSections({
                        ...formSections,
                        delegateDetails: {
                          ...formSections.delegateDetails,
                          gradeLabel: e.target.value,
                        },
                      })
                    }
                    style={{ padding: 10, background: "#080808", border: "1px solid #454052", color: "#fff", borderRadius: 4 }}
                  />
                </label>
                <label style={{ display: "grid", gap: 6, color: "#aaa8ba", fontSize: 11, fontWeight: 600 }}>
                  CLASS / GRADE FIELD PLACEHOLDER
                  <input
                    type="text"
                    value={formSections.delegateDetails?.gradePlaceholder || "e.g. 11th Grade / 2nd Year"}
                    onChange={(e) =>
                      setFormSections({
                        ...formSections,
                        delegateDetails: {
                          ...formSections.delegateDetails,
                          gradePlaceholder: e.target.value,
                        },
                      })
                    }
                    style={{ padding: 10, background: "#080808", border: "1px solid #454052", color: "#fff", borderRadius: 4 }}
                  />
                </label>
              </div>
            </div>

            {/* SUB-SECTION 4: SECTION 02 EXPERIENCE TIERS */}
            <div
              style={{
                padding: 20,
                background: "rgba(8, 8, 18, 0.6)",
                border: "1px solid rgba(160, 150, 205, 0.18)",
                borderRadius: 8,
                display: "grid",
                gap: 14,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, borderBottom: "1px solid rgba(160, 150, 205, 0.14)", paddingBottom: 10 }}>
                <span style={{ color: "#e3262e", fontWeight: 700, fontSize: 13 }}>02</span>
                <h3 style={{ margin: 0, fontSize: 16, color: "#fff" }}>Section 02: Experience Tiers Customizer</h3>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <label style={{ display: "grid", gap: 6, color: "#aaa8ba", fontSize: 11, fontWeight: 600 }}>
                  SECTION TITLE
                  <input
                    type="text"
                    value={formSections.experience?.title || "Experience"}
                    onChange={(e) =>
                      setFormSections({
                        ...formSections,
                        experience: {
                          ...formSections.experience,
                          title: e.target.value,
                        },
                      })
                    }
                    style={{ padding: 10, background: "#080808", border: "1px solid #454052", color: "#fff", borderRadius: 4 }}
                  />
                </label>
                <label style={{ display: "grid", gap: 6, color: "#aaa8ba", fontSize: 11, fontWeight: 600 }}>
                  SUBTITLE / FIELDSET LEGEND
                  <input
                    type="text"
                    value={formSections.experience?.description || "Past MUN Experience"}
                    onChange={(e) =>
                      setFormSections({
                        ...formSections,
                        experience: {
                          ...formSections.experience,
                          description: e.target.value,
                        },
                      })
                    }
                    style={{ padding: 10, background: "#080808", border: "1px solid #454052", color: "#fff", borderRadius: 4 }}
                  />
                </label>
              </div>

              <div>
                <span style={{ display: "block", color: "#aaa8ba", fontSize: 11, fontWeight: 600, marginBottom: 8 }}>
                  EXPERIENCE TIERS
                </span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
                  {(formSections.experience?.tiers || ["0-5", "5-12", "12-20", "20+"]).map((tier, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "6px 12px",
                        background: "rgba(227, 38, 46, 0.12)",
                        border: "1px solid rgba(227, 38, 46, 0.4)",
                        borderRadius: 4,
                        fontSize: 12,
                        color: "#fff",
                      }}
                    >
                      <span>{tier} conferences</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveTier(idx)}
                        style={{
                          background: "transparent",
                          border: 0,
                          color: "#ff8589",
                          cursor: "pointer",
                          padding: 0,
                          display: "flex",
                          alignItems: "center",
                        }}
                      >
                        <X size={13} />
                      </button>
                    </div>
                  ))}
                </div>

                <div style={{ display: "flex", gap: 8, maxWidth: 360 }}>
                  <input
                    type="text"
                    placeholder="e.g. 25+ or Specialist"
                    value={newTierName}
                    onChange={(e) => setNewTierName(e.target.value)}
                    style={{ flex: 1, padding: 8, background: "#080808", border: "1px solid #454052", color: "#fff", borderRadius: 4, fontSize: 12 }}
                  />
                  <button
                    type="button"
                    onClick={handleAddTier}
                    className={styles.secondaryButton}
                    style={{ minHeight: 36, padding: "0 14px", fontSize: 11 }}
                  >
                    <Plus size={13} /> Add Tier
                  </button>
                </div>
              </div>
            </div>

            {/* SUB-SECTION 5: SECTION 03 COMMITTEES */}
            <div
              style={{
                padding: 20,
                background: "rgba(8, 8, 18, 0.6)",
                border: "1px solid rgba(160, 150, 205, 0.18)",
                borderRadius: 8,
                display: "grid",
                gap: 14,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, borderBottom: "1px solid rgba(160, 150, 205, 0.14)", paddingBottom: 10 }}>
                <span style={{ color: "#e3262e", fontWeight: 700, fontSize: 13 }}>03</span>
                <h3 style={{ margin: 0, fontSize: 16, color: "#fff" }}>Section 03: Committee Choices &amp; Agendas</h3>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <label style={{ display: "grid", gap: 6, color: "#aaa8ba", fontSize: 11, fontWeight: 600 }}>
                  SECTION TITLE
                  <input
                    type="text"
                    value={formSections.committees?.title || "Committee preferences"}
                    onChange={(e) =>
                      setFormSections({
                        ...formSections,
                        committees: {
                          ...formSections.committees,
                          title: e.target.value,
                        },
                      })
                    }
                    style={{ padding: 10, background: "#080808", border: "1px solid #454052", color: "#fff", borderRadius: 4 }}
                  />
                </label>
                <label style={{ display: "grid", gap: 6, color: "#aaa8ba", fontSize: 11, fontWeight: 600 }}>
                  SUBTITLE / INSTRUCTION
                  <input
                    type="text"
                    value={formSections.committees?.description || "Rank your preferred committee assignments."}
                    onChange={(e) =>
                      setFormSections({
                        ...formSections,
                        committees: {
                          ...formSections.committees,
                          description: e.target.value,
                        },
                      })
                    }
                    style={{ padding: 10, background: "#080808", border: "1px solid #454052", color: "#fff", borderRadius: 4 }}
                  />
                </label>
              </div>

              <div style={{ display: "grid", gap: 8 }}>
                <span style={{ color: "#aaa8ba", fontSize: 11, fontWeight: 600 }}>
                  ACTIVE COMMITTEES LIST ({(formSections.committees?.items || []).length})
                </span>
                {(formSections.committees?.items || []).map((comm, idx) => (
                  <div key={idx} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 11, color: "#e3262e", fontWeight: 700, width: 28 }}>#{idx + 1}</span>
                    <input
                      type="text"
                      value={comm}
                      onChange={(e) => handleUpdateCommittee(idx, e.target.value)}
                      style={{ flex: 1, padding: 8, background: "#080808", border: "1px solid #454052", color: "#fff", borderRadius: 4, fontSize: 12 }}
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveCommittee(idx)}
                      style={{
                        padding: 8,
                        background: "rgba(227, 38, 46, 0.1)",
                        border: "1px solid rgba(227, 38, 46, 0.3)",
                        borderRadius: 4,
                        color: "#ff8589",
                        cursor: "pointer",
                      }}
                      title="Remove Committee"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}

                <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                  <input
                    type="text"
                    placeholder="New Committee Name &amp; Agenda in parentheses..."
                    value={newCommitteeName}
                    onChange={(e) => setNewCommitteeName(e.target.value)}
                    style={{ flex: 1, padding: 9, background: "#080808", border: "1px solid #454052", color: "#fff", borderRadius: 4, fontSize: 12 }}
                  />
                  <button
                    type="button"
                    onClick={handleAddCommittee}
                    className={styles.secondaryButton}
                    style={{ minHeight: 38, padding: "0 14px", fontSize: 12 }}
                  >
                    <Plus size={14} /> Add Committee
                  </button>
                </div>
              </div>
            </div>

            {/* SUB-SECTION 6: SECTION 04 PORTFOLIO PREFERENCES */}
            <div
              style={{
                padding: 20,
                background: "rgba(8, 8, 18, 0.6)",
                border: "1px solid rgba(160, 150, 205, 0.18)",
                borderRadius: 8,
                display: "grid",
                gap: 14,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, borderBottom: "1px solid rgba(160, 150, 205, 0.14)", paddingBottom: 10 }}>
                <span style={{ color: "#e3262e", fontWeight: 700, fontSize: 13 }}>04</span>
                <h3 style={{ margin: 0, fontSize: 16, color: "#fff" }}>Section 04: Portfolio Preferences Customizer</h3>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <label style={{ display: "grid", gap: 6, color: "#aaa8ba", fontSize: 11, fontWeight: 600 }}>
                  SECTION TITLE
                  <input
                    type="text"
                    value={formSections.portfolioPreferences?.title || "Portfolio preferences"}
                    onChange={(e) =>
                      setFormSections({
                        ...formSections,
                        portfolioPreferences: {
                          ...formSections.portfolioPreferences,
                          title: e.target.value,
                        },
                      })
                    }
                    style={{ padding: 10, background: "#080808", border: "1px solid #454052", color: "#fff", borderRadius: 4 }}
                  />
                </label>
                <label style={{ display: "grid", gap: 6, color: "#aaa8ba", fontSize: 11, fontWeight: 600 }}>
                  SECTION SUBTITLE
                  <input
                    type="text"
                    value={formSections.portfolioPreferences?.description || "Specify your country or candidate allocations."}
                    onChange={(e) =>
                      setFormSections({
                        ...formSections,
                        portfolioPreferences: {
                          ...formSections.portfolioPreferences,
                          description: e.target.value,
                        },
                      })
                    }
                    style={{ padding: 10, background: "#080808", border: "1px solid #454052", color: "#fff", borderRadius: 4 }}
                  />
                </label>
              </div>

              <label style={{ display: "grid", gap: 6, color: "#aaa8ba", fontSize: 11, fontWeight: 600 }}>
                FLEXIBLE ALLOCATION PROMPT QUESTION
                <input
                  type="text"
                  value={
                    formSections.portfolioPreferences?.flexiblePrompt ||
                    "Are you open to being assigned to any committee or portfolio if your top preferences are full?"
                  }
                  onChange={(e) =>
                    setFormSections({
                      ...formSections,
                      portfolioPreferences: {
                        ...formSections.portfolioPreferences,
                        flexiblePrompt: e.target.value,
                      },
                    })
                  }
                  style={{ padding: 10, background: "#080808", border: "1px solid #454052", color: "#fff", borderRadius: 4 }}
                />
              </label>
            </div>

            {/* SUB-SECTION 7: SECTION 05 REFERENCES */}
            <div
              style={{
                padding: 20,
                background: "rgba(8, 8, 18, 0.6)",
                border: "1px solid rgba(160, 150, 205, 0.18)",
                borderRadius: 8,
                display: "grid",
                gap: 14,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, borderBottom: "1px solid rgba(160, 150, 205, 0.14)", paddingBottom: 10 }}>
                <span style={{ color: "#e3262e", fontWeight: 700, fontSize: 13 }}>05</span>
                <h3 style={{ margin: 0, fontSize: 16, color: "#fff" }}>Section 05: References &amp; CA Customizer</h3>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <label style={{ display: "grid", gap: 6, color: "#aaa8ba", fontSize: 11, fontWeight: 600 }}>
                  SECTION TITLE
                  <input
                    type="text"
                    value={formSections.references?.title || "References"}
                    onChange={(e) =>
                      setFormSections({
                        ...formSections,
                        references: {
                          ...formSections.references,
                          title: e.target.value,
                        },
                      })
                    }
                    style={{ padding: 10, background: "#080808", border: "1px solid #454052", color: "#fff", borderRadius: 4 }}
                  />
                </label>
                <label style={{ display: "grid", gap: 6, color: "#aaa8ba", fontSize: 11, fontWeight: 600 }}>
                  SECTION SUBTITLE
                  <input
                    type="text"
                    value={formSections.references?.description || "Campus Ambassador and referral identification."}
                    onChange={(e) =>
                      setFormSections({
                        ...formSections,
                        references: {
                          ...formSections.references,
                          description: e.target.value,
                        },
                      })
                    }
                    style={{ padding: 10, background: "#080808", border: "1px solid #454052", color: "#fff", borderRadius: 4 }}
                  />
                </label>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <label style={{ display: "grid", gap: 6, color: "#aaa8ba", fontSize: 11, fontWeight: 600 }}>
                  CA REFERENCE PROMPT
                  <input
                    type="text"
                    value={formSections.references?.caPrompt || "CA Reference (IF NO TYPE NIL)"}
                    onChange={(e) =>
                      setFormSections({
                        ...formSections,
                        references: {
                          ...formSections.references,
                          caPrompt: e.target.value,
                        },
                      })
                    }
                    style={{ padding: 10, background: "#080808", border: "1px solid #454052", color: "#fff", borderRadius: 4 }}
                  />
                </label>
                <label style={{ display: "grid", gap: 6, color: "#aaa8ba", fontSize: 11, fontWeight: 600 }}>
                  CA REFERENCE PLACEHOLDER
                  <input
                    type="text"
                    value={formSections.references?.caPlaceholder || "NIL"}
                    onChange={(e) =>
                      setFormSections({
                        ...formSections,
                        references: {
                          ...formSections.references,
                          caPlaceholder: e.target.value,
                        },
                      })
                    }
                    style={{ padding: 10, background: "#080808", border: "1px solid #454052", color: "#fff", borderRadius: 4 }}
                  />
                </label>
              </div>
            </div>

            {/* SUB-SECTION 8: SECTION 07 SPECIAL REQUESTS */}
            <div
              style={{
                padding: 20,
                background: "rgba(8, 8, 18, 0.6)",
                border: "1px solid rgba(160, 150, 205, 0.18)",
                borderRadius: 8,
                display: "grid",
                gap: 14,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, borderBottom: "1px solid rgba(160, 150, 205, 0.14)", paddingBottom: 10 }}>
                <span style={{ color: "#e3262e", fontWeight: 700, fontSize: 13 }}>07</span>
                <h3 style={{ margin: 0, fontSize: 16, color: "#fff" }}>Section 07: Special Requests &amp; Notes</h3>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <label style={{ display: "grid", gap: 6, color: "#aaa8ba", fontSize: 11, fontWeight: 600 }}>
                  SECTION TITLE
                  <input
                    type="text"
                    value={formSections.specialRequests?.title || "Special requests / Notes"}
                    onChange={(e) =>
                      setFormSections({
                        ...formSections,
                        specialRequests: {
                          ...formSections.specialRequests,
                          title: e.target.value,
                        },
                      })
                    }
                    style={{ padding: 10, background: "#080808", border: "1px solid #454052", color: "#fff", borderRadius: 4 }}
                  />
                </label>
                <label style={{ display: "grid", gap: 6, color: "#aaa8ba", fontSize: 11, fontWeight: 600 }}>
                  NOTES TEXTAREA PLACEHOLDER
                  <input
                    type="text"
                    value={
                      formSections.specialRequests?.placeholder ||
                      "Any dietary restrictions, special accommodations, or notes for the secretariat"
                    }
                    onChange={(e) =>
                      setFormSections({
                        ...formSections,
                        specialRequests: {
                          ...formSections.specialRequests,
                          placeholder: e.target.value,
                        },
                      })
                    }
                    style={{ padding: 10, background: "#080808", border: "1px solid #454052", color: "#fff", borderRadius: 4 }}
                  />
                </label>
              </div>
            </div>

            {/* SAVE ALL SETTINGS ACTION BAR */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, paddingTop: 10, borderTop: "1px solid rgba(160, 150, 205, 0.2)", flexWrap: "wrap" }}>
              <p style={{ margin: 0, fontSize: 12, color: "#908b9d" }}>
                All updates are saved persistently to MongoDB Atlas and will update the public registration form instantly.
              </p>
              <button
                className={styles.primaryButton}
                type="submit"
                disabled={settingsBusy || qrUploadBusy}
                style={{ padding: "12px 24px", fontSize: 13 }}
              >
                {settingsBusy ? <LoaderCircle className={styles.spinner} size={16} /> : <Check size={16} />}
                Save Conference &amp; Form Studio Settings
              </button>
            </div>
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

      {/* MODAL 3: ADMIN PASS INSPECTOR & DIRECT DOWNLOAD/SHARE */}
      {adminPassModalReg && (
        <div className={styles.modalOverlay} onClick={() => setAdminPassModalReg(null)}>
          <div
            style={{
              maxWidth: 480,
              width: "90%",
              backgroundColor: "#0c0b16",
              border: "1px solid rgba(227, 38, 46, 0.5)",
              borderRadius: 10,
              padding: 24,
              boxShadow: "0 24px 60px rgba(0, 0, 0, 0.95)",
              display: "grid",
              gap: 16,
              textAlign: "center",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ textAlign: "left" }}>
                <span style={{ fontSize: 11, color: "#e3262e", fontWeight: 700, letterSpacing: "0.1em" }}>
                  DELEGATE ENTRY PASS
                </span>
                <h3 style={{ margin: "2px 0 0", color: "#fff", fontSize: 18 }}>{adminPassModalReg.name}</h3>
              </div>
              <button
                onClick={() => setAdminPassModalReg(null)}
                style={{
                  background: "rgba(255, 255, 255, 0.08)",
                  border: 0,
                  color: "#aaa8ba",
                  cursor: "pointer",
                  padding: 6,
                  borderRadius: "50%",
                  display: "flex",
                }}
              >
                <X size={18} />
              </button>
            </div>

            {adminPassLoading ? (
              <div style={{ padding: 40, color: "#aaa8ba" }}>
                <LoaderCircle size={28} className="animate-spin" style={{ margin: "0 auto 8px", color: "#e3262e" }} />
                <span>Generating Cryptographic Pass...</span>
              </div>
            ) : adminPassModalData ? (
              <>
                <div
                  style={{
                    backgroundColor: "#fff",
                    padding: 14,
                    borderRadius: 8,
                    display: "inline-block",
                    margin: "0 auto",
                    boxShadow: "0 8px 24px rgba(0,0,0,0.6)",
                  }}
                >
                  <img
                    src={adminPassModalData.qr}
                    alt="Entry Pass QR"
                    style={{ width: 220, height: 220, display: "block" }}
                  />
                </div>

                <div style={{ fontSize: 12, color: "#4ade80", fontWeight: 700 }}>
                  ✓ CRYPTOGRAPHICALLY SIGNED ENTRY PASS
                </div>

                <p style={{ margin: 0, color: "#8d8a9e", fontSize: 12, lineHeight: 1.5 }}>
                  Registration ID: <code style={{ color: "#fff" }}>{adminPassModalReg.id}</code>
                  <br />
                  Committee: <strong style={{ color: "#fff" }}>{adminPassModalReg.committee || "General Delegate"}</strong>
                  <br />
                  Email: <span style={{ color: "#fff" }}>{adminPassModalReg.email || adminPassModalReg.contact}</span>
                </p>

                <div style={{ display: "grid", gap: 10, marginTop: 6 }}>
                  <button
                    onClick={() =>
                      handleDownloadAdminPass(adminPassModalData.qr, adminPassModalReg.name, adminPassModalReg.id)
                    }
                    className={styles.primaryButton}
                    style={{
                      width: "100%",
                      padding: 10,
                      fontSize: 12,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                      backgroundColor: "#22c55e",
                      borderColor: "#22c55e",
                    }}
                  >
                    <Download size={15} /> Download Pass Image (PNG)
                  </button>

                  <button
                    type="button"
                    disabled={retryingId === adminPassModalReg.id}
                    onClick={() => handleRetryEmail(adminPassModalReg.id, true)}
                    className={styles.secondaryButton}
                    style={{
                      width: "100%",
                      padding: 10,
                      fontSize: 12,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      backgroundColor: "#e3262e",
                      borderColor: "#e3262e",
                      color: "#fff",
                      cursor: "pointer",
                    }}
                  >
                    {retryingId === adminPassModalReg.id ? <LoaderCircle size={14} className={styles.spinner} /> : <Mail size={14} />}
                    Send Entry Pass to Delegate's Email ({adminPassModalReg.email || adminPassModalReg.contact})
                  </button>
                </div>
              </>
            ) : (
              <div style={{ color: "#f87171", fontSize: 13, padding: 20 }}>
                Could not load pass. Please ensure the backend is running.
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 4: EMAIL DELIVERY ISSUE DIAGNOSTICS & FIX GUIDE */}
      {emailErrorModalText && (
        <div className={styles.modalOverlay} onClick={() => setEmailErrorModalText(null)}>
          <div
            style={{
              maxWidth: 520,
              width: "90%",
              backgroundColor: "#0c0b16",
              border: "1px solid rgba(239, 68, 68, 0.5)",
              borderRadius: 10,
              padding: 24,
              boxShadow: "0 24px 60px rgba(0, 0, 0, 0.95)",
              display: "grid",
              gap: 16,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#f87171" }}>
                <CircleAlert size={20} />
                <h3 style={{ margin: 0, fontSize: 18, color: "#fff" }}>Email Delivery Status</h3>
              </div>
              <button
                onClick={() => setEmailErrorModalText(null)}
                style={{
                  background: "rgba(255, 255, 255, 0.08)",
                  border: 0,
                  color: "#aaa8ba",
                  cursor: "pointer",
                  padding: 6,
                  borderRadius: "50%",
                  display: "flex",
                }}
              >
                <X size={18} />
              </button>
            </div>

            <div
              style={{
                padding: 12,
                backgroundColor: "rgba(239, 68, 68, 0.1)",
                borderLeft: "3px solid #ef4444",
                borderRadius: 4,
                color: "#ffc8c8",
                fontSize: 12,
                fontFamily: "monospace",
                lineHeight: 1.5,
                wordBreak: "break-word",
              }}
            >
              {emailErrorModalText}
            </div>

            <div style={{ fontSize: 12, color: "#aaa8ba", lineHeight: 1.6 }}>
              <strong style={{ color: "#fff", display: "block", marginBottom: 6 }}>
                💡 Solution for 100% Free Email Delivery to Any Delegate:
              </strong>
              Resend Free Tier only sends to the email you signed up with. To send to <strong>ANY delegate email</strong> with no domain verification:
              <ol style={{ paddingLeft: 18, margin: "8px 0" }}>
                <li>Go to <strong>brevo.com</strong> (100% free, 300 emails/day to any email).</li>
                <li>Go to <strong>SMTP &amp; API</strong> -&gt; <strong>Generate API Key</strong>.</li>
                <li>In your <strong>Render Dashboard</strong> -&gt; <strong>Environment</strong>, add <code>BREVO_API_KEY</code>.</li>
              </ol>
              Alternatively, you can click <strong>View Pass QR</strong> to preview the pass or download the official pass image.
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => setEmailErrorModalText(null)}
                style={{ padding: "8px 16px", fontSize: 12 }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
