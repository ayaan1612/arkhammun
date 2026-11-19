import { NextResponse } from "next/server"
import { proxyToBackend } from "@/lib/admin-proxy"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  const url = new URL(req.url)
  const proxyRes = await proxyToBackend(req, `/api/admin/queries${url.search}`)
  if (proxyRes) return proxyRes

  return NextResponse.json({
    queries: [],
  })
}
