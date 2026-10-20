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

export type PublicEvent = {
  event: EventDetails
  amount: number
  upiId?: string
  paymentQrUrl: string | null
  registrationOpen: boolean
  registrationNotice?: string
}

export type AdminEventSettings = {
  event: EventDetails
  amount: number
  upiId: string
  registrationOpen: boolean
  registrationNotice: string
  paymentQrConfigured: boolean
  paymentQrUrl: string | null
}

export type RegistrationStatusResponse = {
  id: string
  amount: number
  status: RegistrationStatus
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

export type EntryVerification =
  | { valid: true; registration: ScannedRegistration }
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
  checkedInAt: string
  event: EventDetails
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
        throw new Error("Could not connect to backend. Please ensure your backend is deployed and NEXT_PUBLIC_API_URL is configured.")
      }
      throw new Error("Could not reach the entry service. Check that the backend is running and the API URL is correct.")
    }
  }

  const body = (await response.json().catch(() => ({}))) as Record<string, unknown>
  if (!response.ok) {
    let errorMessage = typeof body.error === "string" ? body.error : ""
    if (!errorMessage) {
      if (response.status === 401) {
        errorMessage = "Invalid admin authorization key. Please re-enter your password."
      } else if (response.status === 404 || response.status === 502 || response.status === 503) {
        const isVercel = typeof window !== "undefined" && window.location.hostname.includes("vercel.app")
        if (isVercel) {
          errorMessage = "Backend service is not connected. Please ensure your backend is deployed and NEXT_PUBLIC_API_URL is configured in Vercel."
        } else {
          errorMessage = `Backend service unavailable (${response.status}). Check backend status.`
        }
      } else {
        errorMessage = `The request could not be completed (${response.status}).`
      }
    }
    throw new EntryPassApiError(errorMessage, response.status, body)
  }
  return body as T
}

function adminHeaders(adminKey: string, json = false): HeadersInit {
  return {
    ...(json ? { "Content-Type": "application/json" } : {}),
    "x-admin-key": adminKey,
  }
}

export const entryPassApi = {
  getPublicEvent() {
    return request<PublicEvent>("/api/event")
  },

  createRegistration(details: { name: string; email: string; phone: string; organization: string; committee: string }) {
    return request<RegistrationStart>("/api/registrations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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

  getAdminRegistrations(adminKey: string, status: RegistrationStatus = "payment_submitted") {
    return request<{ registrations: AdminRegistration[] }>(`/api/admin/registrations?status=${encodeURIComponent(status)}`, {
      headers: adminHeaders(adminKey),
    })
  },

  getAdminSettings(adminKey: string) {
    return request<AdminEventSettings>("/api/admin/settings", {
      headers: adminHeaders(adminKey),
    })
  },

  saveAdminEvent(event: EventDetails, adminKey: string) {
    return request<{ event: EventDetails }>("/api/admin/settings", {
      method: "PUT",
      headers: adminHeaders(adminKey, true),
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
    },
    adminKey: string
  ) {
    return request<AdminEventSettings>("/api/admin/settings", {
      method: "PUT",
      headers: adminHeaders(adminKey, true),
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

  getAdminQueries(adminKey: string, status = "all") {
    return request<{ queries: ContactQuery[] }>(`/api/admin/queries?status=${encodeURIComponent(status)}`, {
      headers: adminHeaders(adminKey),
    })
  },

  replyAdminQuery(id: string, replyMessage: string, adminKey: string) {
    return request<{ success: boolean; query: ContactQuery; emailSent: boolean; emailError?: string | null }>(
      `/api/admin/queries/${encodeURIComponent(id)}/reply`,
      {
        method: "POST",
        headers: adminHeaders(adminKey, true),
        body: JSON.stringify({ replyMessage }),
      }
    )
  },

  uploadPaymentQr(file: File, adminKey: string) {
    const body = new FormData()
    body.set("paymentQr", file)
    return request<{ paymentQrConfigured: boolean; paymentQrUrl: string }>("/api/admin/payment-qr", {
      method: "POST",
      headers: adminHeaders(adminKey),
      body,
    })
  },

  approveRegistration(id: string, adminKey: string) {
    return request<{ id: string; status: "approved"; email?: EmailDeliveryResult }>(
      `/api/admin/registrations/${encodeURIComponent(id)}/approve`,
      {
        method: "POST",
        headers: adminHeaders(adminKey),
      }
    )
  },

  retryEmail(id: string, adminKey: string, force = false) {
    return request<{ id: string; email: EmailDeliveryResult }>(
      `/api/admin/registrations/${encodeURIComponent(id)}/retry-email`,
      {
        method: "POST",
        headers: adminHeaders(adminKey, true),
        body: JSON.stringify({ force }),
      }
    )
  },

  rejectRegistration(id: string, reason: string, adminKey: string) {
    return request<{ id: string; status: "rejected" }>(`/api/admin/registrations/${encodeURIComponent(id)}/reject`, {
      method: "POST",
      headers: adminHeaders(adminKey, true),
      body: JSON.stringify({ reason }),
    })
  },

  verifyEntry(payload: string, adminKey: string) {
    return request<EntryVerification>("/api/entry/verify", {
      method: "POST",
      headers: adminHeaders(adminKey, true),
      body: JSON.stringify({ payload }),
    })
  },

  async getScreenshot(url: string, adminKey: string) {
    let response: Response
    const primaryUrl = `${getApiBaseUrl()}${url}`
    try {
      response = await fetch(primaryUrl, { headers: adminHeaders(adminKey) })
    } catch {
      const fallbackUrl = `http://localhost:3001${url}`
      try {
        response = await fetch(fallbackUrl, { headers: adminHeaders(adminKey) })
      } catch {
        throw new Error("Could not reach the entry service while loading the payment screenshot.")
      }
    }
    if (!response.ok) {
      const body = await response.json().catch(() => ({})) as { error?: string }
      throw new EntryPassApiError(body.error || "Unable to load payment screenshot.", response.status, body)
    }
    return response.blob()
  },
}