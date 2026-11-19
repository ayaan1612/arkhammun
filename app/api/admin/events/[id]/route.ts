import { NextResponse } from "next/server"
import { proxyToBackend } from "@/lib/admin-proxy"

export const dynamic = "force-dynamic"

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const proxyRes = await proxyToBackend(req, `/api/admin/events/${encodeURIComponent(id)}`)
  if (proxyRes) return proxyRes

  const body = await req.json().catch(() => ({}))
  return NextResponse.json({
    event: {
      _id: id,
      ...body,
    },
  })
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const proxyRes = await proxyToBackend(req, `/api/admin/events/${encodeURIComponent(id)}`)
  if (proxyRes) return proxyRes

  return NextResponse.json({
    message: "Event deleted successfully.",
  })
}
