import { NextResponse } from "next/server"
import { proxyToBackend } from "@/lib/admin-proxy"

export const dynamic = "force-dynamic"

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const proxyRes = await proxyToBackend(req, `/api/admin/registrations/${encodeURIComponent(id)}/retry-email`)
  if (proxyRes) return proxyRes

  return NextResponse.json({
    id,
    email: {
      status: "failed",
      error: "Backend service unreachable. Please ensure SMTP backend is active.",
    },
  })
}
