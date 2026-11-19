import { NextResponse } from "next/server"
import { proxyToBackend } from "@/lib/admin-proxy"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  const proxyRes = await proxyToBackend(req, "/api/my-notifications")
  if (proxyRes) return proxyRes

  return NextResponse.json({
    notifications: [],
    unreadCount: 0,
  })
}
