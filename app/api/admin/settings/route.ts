import { NextResponse } from "next/server"
import { arkham } from "@/lib/arkham-data"
import { proxyToBackend } from "@/lib/admin-proxy"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  const proxyRes = await proxyToBackend(req, "/api/admin/settings")
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
    registrationOpen: true,
    registrationNotice: "",
    paymentQrConfigured: false,
    paymentQrUrl: null,
  })
}

export async function PUT(req: Request) {
  const proxyRes = await proxyToBackend(req, "/api/admin/settings")
  if (proxyRes) return proxyRes

  const body = await req.json().catch(() => ({}))
  return NextResponse.json({
    success: true,
    settings: body,
    ...body,
  })
}
