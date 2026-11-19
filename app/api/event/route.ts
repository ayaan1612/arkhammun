import { NextResponse } from "next/server"
import { proxyToBackend } from "@/lib/admin-proxy"
import { getConferenceSettings } from "@/lib/conference-store"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  const proxyRes = await proxyToBackend(req, "/api/event")
  if (proxyRes) return proxyRes

  const settings = getConferenceSettings()
  return NextResponse.json({
    event: settings.event,
    amount: settings.amount,
    upiId: settings.upiId,
    paymentQrUrl: settings.paymentQrUrl,
    registrationOpen: settings.registrationOpen,
    registrationNotice: settings.registrationNotice,
    formSections: settings.formSections,
  })
}
