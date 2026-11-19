import { NextResponse } from "next/server"
import { proxyToBackend } from "@/lib/admin-proxy"

export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  const proxyRes = await proxyToBackend(req, "/api/admin/payment-qr")
  if (proxyRes) return proxyRes

  return NextResponse.json({
    paymentQrConfigured: true,
    paymentQrUrl: "/api/payment-qr.png",
  })
}
