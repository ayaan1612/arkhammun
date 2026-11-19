import { NextResponse } from "next/server"
import { proxyToBackend } from "@/lib/admin-proxy"
import { arkham } from "@/lib/arkham-data"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  const proxyRes = await proxyToBackend(req, "/api/events")
  if (proxyRes) return proxyRes

  return NextResponse.json({
    events: [
      {
        _id: "default-event-2027",
        title: "Arkham MUN 2027",
        description: "Arkham Model United Nations — diplomacy, debate and ideas that move nations.",
        date: arkham.dates,
        venue: arkham.venueNote,
        time: "09:00 AM – 05:00 PM",
        entryFee: 2300,
        upiId: arkham.paymentUpi,
        registrationOpen: true,
        registrationNotice: "Registrations for Arkham MUN 2027 are live.",
      },
    ],
  })
}

export async function POST(req: Request) {
  const proxyRes = await proxyToBackend(req, "/api/admin/events")
  if (proxyRes) return proxyRes

  const body = await req.json().catch(() => ({}))
  const newEvent = {
    _id: `evt-${Date.now()}`,
    title: body.title || "Arkham MUN 2027",
    description: body.description || "",
    date: body.date || arkham.dates,
    venue: body.venue || arkham.venueNote,
    time: body.time || "09:00 AM – 05:00 PM",
    entryFee: Number(body.entryFee || 2300),
    upiId: body.upiId || arkham.paymentUpi,
    registrationOpen: body.registrationOpen ?? true,
    registrationNotice: body.registrationNotice || "",
    createdAt: new Date().toISOString(),
  }

  return NextResponse.json({ event: newEvent })
}
