import { NextResponse } from "next/server"
import { proxyToBackend } from "@/lib/admin-proxy"

export const dynamic = "force-dynamic"

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const proxyRes = await proxyToBackend(req, `/api/admin/events/${encodeURIComponent(id)}/toggle-registration`)
  if (proxyRes) return proxyRes

  const body = await req.json().catch(() => ({}))
  return NextResponse.json({
    event: {
      _id: id,
      registrationOpen: body.registrationOpen ?? true,
    },
    message: "Registration status toggled successfully.",
  })
}
