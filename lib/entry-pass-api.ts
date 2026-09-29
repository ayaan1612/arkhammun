export type RegistrationStatus = "pending_payment" | "payment_submitted" | "approved" | "rejected"

export type RegistrationStart = {
  id: string
  amount: number
  upiString: string
}

export type RegistrationStatusResponse = {
  id: string
  amount: number
  status: RegistrationStatus
}

export type EntryQrResponse = {
  payload: string
  qr: string
}

export type AdminRegistration = {
  id: string
  name: string
  contact: string
  amount: number
  status: RegistrationStatus
  utr: string | null
  screenshot_path: string | null
  screenshot_url: string | null
  created_at: string
  screenshotBlobUrl?: string
}

export type EntryVerification = { valid: true; name: string } | { valid: false; reason: "invalid" }

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
  createRegistration(name: string, contact: string) {
    return request<RegistrationStart>("/api/registrations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, contact }),
    })
  },

  paymentQrUrl(id: string) {
    return `${API_BASE_URL}/api/registrations/${encodeURIComponent(id)}/payment-qr.png`
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