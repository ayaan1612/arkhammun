import { NextResponse } from "next/server"
import { proxyToBackend } from "@/lib/admin-proxy"

export const dynamic = "force-dynamic"

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const proxyRes = await proxyToBackend(req, `/api/admin/registrations/${encodeURIComponent(id)}/reject`)
  if (proxyRes) return proxyRes

  const body = (await req.json().catch(() => ({}))) as { reason?: string }
  return NextResponse.json({
    id,
    status: "rejected",
    reject_reason: body.reason || "Payment proof invalid",
    email: {
      status: "not_configured",
      sentAt: new Date().toISOString(),
      error: "Backend service unreachable; rejection marked locally.",
    },
  })
}
