import { NextResponse } from "next/server"
import { proxyToBackend } from "@/lib/admin-proxy"

export const dynamic = "force-dynamic"

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const proxyRes = await proxyToBackend(req, `/api/admin/registrations/${encodeURIComponent(id)}/approve`)
  if (proxyRes) return proxyRes

  return NextResponse.json({
    id,
    status: "approved",
    email: {
      status: "not_configured",
      sentAt: new Date().toISOString(),
      error: "Backend service unreachable; approval marked locally.",
    },
  })
}
