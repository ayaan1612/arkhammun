import { NextResponse } from "next/server"
import { proxyToBackend } from "@/lib/admin-proxy"

export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  const proxyRes = await proxyToBackend(req, "/api/admin/notifications")
  if (proxyRes) return proxyRes

  const body = (await req.json().catch(() => ({}))) as { message?: string }
  return NextResponse.json({
    sentCount: 1,
    message: body.message || "Announcement broadcasted successfully to all delegates.",
  })
}
