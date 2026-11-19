import { NextResponse } from "next/server"
import { proxyToBackend } from "@/lib/admin-proxy"
import { getConferenceSettings, updateConferenceSettings } from "@/lib/conference-store"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  const proxyRes = await proxyToBackend(req, "/api/admin/settings")
  if (proxyRes) return proxyRes

  const settings = getConferenceSettings()
  return NextResponse.json(settings)
}

export async function PUT(req: Request) {
  const proxyRes = await proxyToBackend(req, "/api/admin/settings")
  if (proxyRes) return proxyRes

  const body = await req.json().catch(() => ({}))
  const updated = updateConferenceSettings(body)

  return NextResponse.json({
    success: true,
    ...updated,
  })
}
