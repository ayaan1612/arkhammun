import { NextResponse } from "next/server"
import { proxyToBackend } from "@/lib/admin-proxy"
import { getConferenceSettings } from "@/lib/conference-store"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  const proxyRes = await proxyToBackend(req, "/api/events")
  if (proxyRes) return proxyRes

  const settings = getConferenceSettings()
  return NextResponse.json({
    events: [
      {
        _id: "default-event-2027",
        title: settings.event.name,
        description: "Arkham Model United Nations — diplomacy, debate and ideas that move nations.",
        date: settings.event.date,
        venue: settings.event.venue,
        time: settings.event.time,
        entryFee: settings.amount,
        upiId: settings.upiId,
        registrationOpen: settings.registrationOpen,
        registrationNotice: settings.registrationNotice,
        paymentQrUrl: settings.paymentQrUrl,
      },
    ],
  })
}
