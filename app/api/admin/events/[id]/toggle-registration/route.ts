import { NextResponse } from "next/server"
import { proxyToBackend } from "@/lib/admin-proxy"
import { updateConferenceSettings, getConferenceSettings } from "@/lib/conference-store"

export const dynamic = "force-dynamic"

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const proxyRes = await proxyToBackend(req, `/api/admin/events/${encodeURIComponent(id)}/toggle-registration`)
  if (proxyRes) return proxyRes

  const body = await req.json().catch(() => ({}))
  const current = getConferenceSettings()
  const newStatus = body.registrationOpen !== undefined ? Boolean(body.registrationOpen) : !current.registrationOpen

  updateConferenceSettings({
    registrationOpen: newStatus,
  })

  return NextResponse.json({
    event: {
      _id: id,
      registrationOpen: newStatus,
    },
    message: `Registration is now ${newStatus ? "OPEN" : "CLOSED"}.`,
  })
}
