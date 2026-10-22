export type RegistrationStatus = "pending_payment" | "payment_submitted" | "approved" | "rejected"

export type RegistrationStart = {
  id: string
  amount: number
}

export type EventDetails = {
  name: string
  date: string
  time: string
  venue: string
}

export type FormSectionsConfig = {
  delegateDetails?: {
    title?: string
    description?: string
    instructions?: string
    gradeLabel?: string
    gradePlaceholder?: string
  }
  experience?: {
    title?: string
    description?: string
    tiers?: string[]
  }
  committees?: {
    title?: string
    description?: string
    items?: string[]
  }
  portfolioPreferences?: {
    title?: string
    description?: string
    flexiblePrompt?: string
  }
  references?: {
    title?: string
    description?: string
    caPrompt?: string
    caPlaceholder?: string
    label?: string
    placeholder?: string
  }
  paymentSection?: {
    title?: string
    instructions?: string
    note?: string
    upiNote?: string
    paymentQrUrl?: string | null
  }
  specialRequests?: {
    title?: string
    placeholder?: string
  }
}

export type PublicEvent = {
  event: EventDetails
  amount: number
  upiId?: string
  paymentQrUrl: string | null
  registrationOpen: boolean
  registrationNotice?: string
  formSections?: FormSectionsConfig
}

export type AdminEventSettings = {
  event: EventDetails
  amount: number
  upiId: string
  registrationOpen: boolean
  registrationNotice: string
  paymentQrConfigured: boolean
  paymentQrUrl: string | null
  formSections?: FormSectionsConfig
}

export type RegistrationStatusResponse = {
  id: string
  amount: number
  status: RegistrationStatus
  reject_reason?: string | null
  committee?: string | null
  organization?: string | null
  hasQr?: boolean
  event?: EventDetails
}

export type EntryQrResponse = {
  payload: string
  qr: string
  registrationId: string
  event: EventDetails
}

export type EmailStatus = "not_configured" | "pending" | "sent" | "failed"

export type EmailDeliveryResult = {
  status: EmailStatus | string
  sentAt?: string | null
  error?: string | null
}

export type AdminRegistration = {
  id: string
  name: string
  contact: string
  email: string | null
  phone: string | null
  organization: string | null
  committee: string | null
  amount: number
  status: RegistrationStatus
  utr: string | null
  screenshot_path: string | null
  screenshot_url: string | null
  reject_reason?: string | null
  created_at: string
  used_at?: string | null
  screenshotBlobUrl?: string
  email_status?: EmailStatus | null
  email_sent_at?: string | null
  email_error?: string | null
  event?: {
    id: string
    title: string
    date: string
    venue: string
  } | null
}

export type ContactQuery = {
  id: string
  name: string
  email: string
  phone: string | null
  subject: string
  message: string
  status: "pending" | "replied"
  reply_message: string | null
  replied_at: string | null
  created_at: string
}

export type NotificationAnnouncement = {
  registrationOpen: boolean
  registrationNotice: string
  conferenceDates: string
  conferenceVenue: string
  conferenceTimings: string
  conferenceName: string
  countdownTarget: string
}

export type NotificationRegistration = {
  id: string
  name: string
  email: string
  phone: string
  organization: string
  committee: string
  amount: number
  status: RegistrationStatus
  utr: string | null
  reject_reason: string | null
  hasQr: boolean
  qr?: string | null
  created_at: string
  event: EventDetails
}

export type NotificationsLookupResponse = {
  query: string
  registrations: NotificationRegistration[]
  queries: ContactQuery[]
  event: EventDetails
  announcements: NotificationAnnouncement
}

export type EntryVerification =
  | { valid: true; alreadyUsed?: boolean; registration: ScannedRegistration }
  | { valid: false; reason: "invalid" }

export type ScannedRegistration = {
  id: string
  name: string
  email: string
  phone: string
  organization: string
  committee: string
  amount: number
  utr: string | null
  paymentStatus: RegistrationStatus
  checkedInAt: string | null
  event: EventDetails
}

// -------------------------------------------------------------
// USER & PERSISTENT DATABASE TYPES
// -------------------------------------------------------------

export type UserRole = "user" | "admin"

export type UserProfile = {
  id: string
  name: string
  email: string
  role: UserRole
  createdAt?: string
}

export type AuthResponse = {
  token: string
  user: UserProfile
  message?: string
}

export type DbEvent = {
  _id: string
  title: string
  description: string
  date: string
  venue: string
  time: string
  entryFee: number
  upiId: string
  registrationOpen: boolean
  registrationNotice?: string
  paymentQrUrl?: string
  createdAt?: string
}

export type UserRegistration = {
  _id: string
  userId: string | UserProfile
  eventId: DbEvent
  name: string
  email: string
  phone?: string
  organization?: string
  committee?: string
  amount: number
  status: RegistrationStatus
  utr?: string
  screenshot_path?: string
  reject_reason?: string
  entry_payload?: string
  used_at?: string
  registeredAt: string
  email_status?: string
}

export type UserNotification = {
  _id: string
  userId: string
  message: string
  read: boolean
  eventId?: string
  type?: "system" | "registration" | "approval" | "rejection" | "announcement" | "reply"
  createdAt: string
}

export class EntryPassApiError extends Error {
  status: number
  body: Record<string, unknown>

  constructor(message: string, status: number, body: Record<string, unknown>) {
    super(message)
    this.name = "EntryPassApiError"
    this.status = status
    this.body = body
  }
}

export function getApiBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL.replace(/\/+$/, "")
  }
  if (typeof window !== "undefined") {
    // If running in browser and no external API URL specified, relative calls work
    // or fallback to localhost port 3001
    return ""
  }
  return "http://localhost:3001"
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  let response: Response
  const baseUrl = getApiBaseUrl()
  const primaryUrl = `${baseUrl}${endpoint}`

  try {
    response = await fetch(primaryUrl, options)
  } catch {
    const isLocal = typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
    if (isLocal && baseUrl !== "http://localhost:3001") {
      try {
        response = await fetch(`http://localhost:3001${endpoint}`, options)
      } catch {
        throw new Error("Could not reach backend service at http://localhost:3001. Ensure the local backend is running.")
      }
    } else {
      const isVercel = typeof window !== "undefined" && window.location.hostname.includes("vercel.app")
      if (isVercel) {
        throw new Error("Could not connect to backend. Please ensure NEXT_PUBLIC_API_URL is configured in your Vercel project settings.")
      }
      throw new Error("Could not reach the backend service. Check network connection and API URL.")
    }
  }

  const body = (await response.json().catch(() => ({}))) as Record<string, unknown>
  if (!response.ok) {
    let errorMessage = typeof body.error === "string" ? body.error : ""
    if (!errorMessage) {
      if (response.status === 401) {
        errorMessage = "Unauthorized access. Please log in again."
      } else if (response.status === 403) {
        errorMessage = "Access denied. Administrator privileges required."
      } else if (response.status === 409) {
        errorMessage = "Conflict: you may already be registered for this event."
      } else if (response.status === 404 || response.status === 502 || response.status === 503) {
        const isVercel = typeof window !== "undefined" && window.location.hostname.includes("vercel.app")
        if (isVercel) {
          errorMessage = "Backend service not connected. Please verify NEXT_PUBLIC_API_URL in Vercel settings."
        } else {
          errorMessage = `Backend service unavailable (${response.status}).`
        }
      } else {
        errorMessage = `The request could not be completed (${response.status}).`
      }
    }
    throw new EntryPassApiError(errorMessage, response.status, body)
  }
  return body as T
}

function authHeaders(tokenOrKey?: string, json = false): HeadersInit {
  const headers: Record<string, string> = {}
  if (json) headers["Content-Type"] = "application/json"
  if (tokenOrKey) {
    if (tokenOrKey.startsWith("Bearer ")) {
      headers["Authorization"] = tokenOrKey
    } else if (tokenOrKey.length > 40) {
      // Likely JWT token
      headers["Authorization"] = `Bearer ${tokenOrKey}`
    } else {
      // Legacy admin key
      headers["x-admin-key"] = tokenOrKey
      headers["Authorization"] = `Bearer ${tokenOrKey}`
    }
  }
  return headers
}

export const entryPassApi = {
  // -----------------------------------------------------------
  // AUTHENTICATION
  // -----------------------------------------------------------
  signup(data: { name: string; email: string; password: string; adminKey?: string; role?: "user" | "admin" }) {
    return request<AuthResponse>("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
  },

  login(data: { email?: string; password?: string; adminKey?: string; role?: "user" | "admin" }) {
    return request<AuthResponse>("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
  },

  loginWithGoogle(credential: string) {
    return request<AuthResponse>("/api/auth/google", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ credential }),
    })
  },

  adminLogin(data: { email: string; adminKey: string }) {
    return request<AuthResponse>("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
  },

  getMe(token: string) {
    return request<{ user: UserProfile }>("/api/auth/me", {
      headers: authHeaders(token),
    })
  },

  // -----------------------------------------------------------
  // EVENTS (MongoDB Atlas backed)
  // -----------------------------------------------------------
  getEvents() {
    return request<{ events: DbEvent[] }>("/api/events")
  },

  getEvent(id: string) {
    return request<{ event: DbEvent }>(`/api/events/${encodeURIComponent(id)}`)
  },

  getPublicEvent() {
    return request<PublicEvent>("/api/event")
  },

  // -----------------------------------------------------------
  // USER PROTECTED ENDPOINTS
  // -----------------------------------------------------------
  registerForEvent(
    eventId: string,
    details: {
      name?: string
      phone?: string
      organization?: string
      committee?: string
      utr?: string
      screenshot_path?: string
    },
    token: string
  ) {
    return request<{ registration: UserRegistration; message: string }>(
      `/api/events/${encodeURIComponent(eventId)}/register`,
      {
        method: "POST",
        headers: authHeaders(token, true),
        body: JSON.stringify(details),
      }
    )
  },

  getMyRegistrations(token: string) {
    return request<{ registrations: UserRegistration[] }>("/api/my-registrations", {
      headers: authHeaders(token),
    })
  },

  getMyNotifications(token: string) {
    return request<{ notifications: UserNotification[]; unreadCount: number }>("/api/my-notifications", {
      headers: authHeaders(token),
    })
  },

  markNotificationAsRead(id: string, token: string) {
    return request<{ notification: UserNotification }>(`/api/notifications/${encodeURIComponent(id)}/read`, {
      method: "PATCH",
      headers: authHeaders(token),
    })
  },

  // -----------------------------------------------------------
  // ADMIN PROTECTED ENDPOINTS
  // -----------------------------------------------------------
  createAdminEvent(data: Partial<DbEvent>, tokenOrKey: string) {
    return request<{ event: DbEvent }>("/api/admin/events", {
      method: "POST",
      headers: authHeaders(tokenOrKey, true),
      body: JSON.stringify(data),
    })
  },

  updateAdminEvent(id: string, data: Partial<DbEvent>, tokenOrKey: string) {
    return request<{ event: DbEvent }>(`/api/admin/events/${encodeURIComponent(id)}`, {
      method: "PUT",
      headers: authHeaders(tokenOrKey, true),
      body: JSON.stringify(data),
    })
  },

  toggleRegistrationOpen(id: string, tokenOrKey: string, registrationOpen?: boolean) {
    return request<{ event: DbEvent; message: string }>(
      `/api/admin/events/${encodeURIComponent(id)}/toggle-registration`,
      {
        method: "POST",
        headers: authHeaders(tokenOrKey, true),
        body: JSON.stringify({ registrationOpen }),
      }
    )
  },

  deleteAdminEvent(id: string, tokenOrKey: string) {
    return request<{ message: string }>(`/api/admin/events/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: authHeaders(tokenOrKey),
    })
  },

  getAdminRegistrations(
    adminKeyOrToken: string,
    status: RegistrationStatus | "all" = "all",
    eventId?: string,
    search?: string
  ) {
    const params = new URLSearchParams()
    if (status && status !== "all") params.set("status", status)
    if (eventId && eventId !== "all") params.set("eventId", eventId)
    if (search) params.set("search", search)
    const qs = params.toString() ? `?${params.toString()}` : ""
    return request<{ registrations: AdminRegistration[] }>(`/api/admin/registrations${qs}`, {
      headers: authHeaders(adminKeyOrToken),
    })
  },

  sendAdminAnnouncement(
    data: { eventId?: string; message: string },
    tokenOrKey: string
  ) {
    return request<{ sentCount: number; message: string }>("/api/admin/notifications", {
      method: "POST",
      headers: authHeaders(tokenOrKey, true),
      body: JSON.stringify(data),
    })
  },

  // -----------------------------------------------------------
  // REGISTRATION (Authenticated delegate registration)
  // -----------------------------------------------------------
  createRegistration(
    details: {
      name: string
      email: string
      phone: string
      organization: string
      committee: string
      eventId?: string
      utr?: string
    },
    token?: string
  ) {
    const headers: Record<string, string> = { "Content-Type": "application/json" }
    if (token) {
      headers["Authorization"] = `Bearer ${token}`
    }
    return request<RegistrationStart>("/api/registrations", {
      method: "POST",
      headers,
      body: JSON.stringify(details),
    })
  },

  paymentQrUrl(url: string) {
    const base = getApiBaseUrl()
    return base ? `${base}${url}` : url
  },

  submitPaymentProof(id: string, utr: string, screenshot?: File) {
    const body = new FormData()
    body.set("utr", utr)
    if (screenshot) body.set("screenshot", screenshot)
    return request<{ id: string; status: "payment_submitted" }>(`/api/registrations/${encodeURIComponent(id)}/payment-proof`, {
      method: "POST",
      body,
    })
  },

  getRegistration(id: string) {
    return request<RegistrationStatusResponse>(`/api/registrations/${encodeURIComponent(id)}`)
  },

  getEntryQr(id: string) {
    return request<EntryQrResponse>(`/api/registrations/${encodeURIComponent(id)}/entry-qr`)
  },

  getAdminSettings(adminKey: string) {
    return request<AdminEventSettings>("/api/admin/settings", {
      headers: authHeaders(adminKey),
    })
  },

  saveAdminEvent(event: EventDetails, adminKey: string) {
    return request<{ event: EventDetails }>("/api/admin/settings", {
      method: "PUT",
      headers: authHeaders(adminKey, true),
      body: JSON.stringify({ event }),
    })
  },

  saveAdminSettings(
    payload: {
      event: EventDetails
      amount?: number
      upiId?: string
      registrationOpen?: boolean
      registrationNotice?: string
      paymentQrUrl?: string | null
      formSections?: FormSectionsConfig
    },
    adminKey: string
  ) {
    return request<AdminEventSettings>("/api/admin/settings", {
      method: "PUT",
      headers: authHeaders(adminKey, true),
      body: JSON.stringify(payload),
    })
  },

  submitContactQuery(details: { name: string; email: string; phone?: string; subject: string; message: string }) {
    return request<{ success: boolean; id: string; message: string }>("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(details),
    })
  },

  getMyQueries(token: string) {
    return request<{ queries: ContactQuery[] }>("/api/my-queries", {
      headers: authHeaders(token),
    })
  },

  getAdminQueries(adminKey: string, status = "all") {
    return request<{ queries: ContactQuery[] }>(`/api/admin/queries?status=${encodeURIComponent(status)}`, {
      headers: authHeaders(adminKey),
    })
  },

  replyAdminQuery(id: string, reply: string, adminKey: string) {
    return request<{ success: boolean; id: string; status: string }>(
      `/api/admin/queries/${encodeURIComponent(id)}/reply`,
      {
        method: "POST",
        headers: authHeaders(adminKey, true),
        body: JSON.stringify({ reply }),
      }
    )
  },

  uploadPaymentQr(file: File, adminKey: string) {
    const body = new FormData()
    body.set("paymentQr", file)
    return request<{ paymentQrConfigured: boolean; paymentQrUrl: string }>("/api/admin/payment-qr", {
      method: "POST",
      headers: authHeaders(adminKey),
      body,
    })
  },

  approveRegistration(id: string, adminKey: string) {
    return request<{ id: string; status: "approved"; email?: EmailDeliveryResult }>(
      `/api/admin/registrations/${encodeURIComponent(id)}/approve`,
      {
        method: "POST",
        headers: authHeaders(adminKey),
      }
    )
  },

  retryEmail(id: string, adminKey: string, force = false) {
    return request<{ id: string; email: EmailDeliveryResult }>(
      `/api/admin/registrations/${encodeURIComponent(id)}/retry-email`,
      {
        method: "POST",
        headers: authHeaders(adminKey, true),
        body: JSON.stringify({ force }),
      }
    )
  },

  rejectRegistration(id: string, reason: string, adminKey: string) {
    return request<{ id: string; status: "rejected" }>(`/api/admin/registrations/${encodeURIComponent(id)}/reject`, {
      method: "POST",
      headers: authHeaders(adminKey, true),
      body: JSON.stringify({ reason }),
    })
  },

  verifyEntry(payload: string, adminKey: string, admit = true) {
    return request<EntryVerification>("/api/entry/verify", {
      method: "POST",
      headers: authHeaders(adminKey, true),
      body: JSON.stringify({ payload, admit }),
    })
  },

  lookupNotifications(query: string) {
    return request<NotificationsLookupResponse>(`/api/notifications/lookup?query=${encodeURIComponent(query)}`)
  },

  async getScreenshot(url: string, adminKey: string) {
    let response: Response
    const primaryUrl = `${getApiBaseUrl()}${url}`
    try {
      response = await fetch(primaryUrl, { headers: authHeaders(adminKey) })
    } catch {
      const fallbackUrl = `http://localhost:3001${url}`
      try {
        response = await fetch(fallbackUrl, { headers: authHeaders(adminKey) })
      } catch {
        throw new Error("Could not reach the entry service while loading the payment screenshot.")
      }
    }
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string }
      throw new EntryPassApiError(body.error || "Unable to load payment screenshot.", response.status, body)
    }
    return response.blob()
  },
}
