import { NextResponse } from "next/server"
import { arkham } from "@/lib/arkham-data"
import { proxyToBackend } from "@/lib/admin-proxy"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  const proxyRes = await proxyToBackend(req, "/api/event")
  if (proxyRes) return proxyRes

  return NextResponse.json({
    event: {
      name: "Arkham MUN 2027",
      date: arkham.dates,
      time: "09:00 AM – 05:00 PM",
      venue: arkham.venueNote,
    },
    amount: 2300,
    upiId: arkham.paymentUpi,
    paymentQrUrl: null,
    registrationOpen: true,
    registrationNotice: "Registrations for Arkham MUN 2027 are live.",
  })
}
