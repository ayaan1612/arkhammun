import { NextResponse } from "next/server"
import { proxyToBackend } from "@/lib/admin-proxy"

export const dynamic = "force-dynamic"

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const proxyRes = await proxyToBackend(req, `/api/admin/queries/${encodeURIComponent(id)}/reply`)
  if (proxyRes) return proxyRes

  return NextResponse.json({
    success: true,
    id,
    status: "replied",
    message: "Reply saved successfully.",
  })
}
