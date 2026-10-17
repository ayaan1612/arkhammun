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
  paymentQrUrl: string | null
  registrationOpen: boolean
}

export type AdminEventSettings = {
  event: EventDetails
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
  created_at: string
  screenshotBlobUrl?: string
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

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001").replace(/\/+$/, "")

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, options)
  } catch {
    throw new Error("Could not reach the entry service. Check that the backend is running and the API URL is correct.")
  }

  const body = await response.json().catch(() => ({})) as Record<string, unknown>
  if (!response.ok) {
    throw new EntryPassApiError(typeof body.error === "string" ? body.error : "The request could not be completed.", response.status, body)
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
    return `${API_BASE_URL}${url}`
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

  getAdminRegistrations(adminKey: string) {
    return request<{ registrations: AdminRegistration[] }>("/api/admin/registrations?status=payment_submitted", {
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
    return request<{ id: string; status: "approved" }>(`/api/admin/registrations/${encodeURIComponent(id)}/approve`, {
      method: "POST",
      headers: adminHeaders(adminKey),
    })
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
    try {
      response = await fetch(`${API_BASE_URL}${url}`, { headers: adminHeaders(adminKey) })
    } catch {
      throw new Error("Could not reach the entry service while loading the payment screenshot.")
    }
    if (!response.ok) {
      const body = await response.json().catch(() => ({})) as { error?: string }
      throw new EntryPassApiError(body.error || "Unable to load payment screenshot.", response.status, body)
    }
    return response.blob()
  },
}