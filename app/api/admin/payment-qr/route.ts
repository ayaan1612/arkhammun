import { NextResponse } from "next/server"
import path from "path"
import fs from "fs"
import { proxyToBackend } from "@/lib/admin-proxy"
import { updateConferenceSettings } from "@/lib/conference-store"

export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  const proxyRes = await proxyToBackend(req, "/api/admin/payment-qr")
  if (proxyRes) return proxyRes

  try {
    const formData = await req.formData()
    const file = formData.get("paymentQr") as File | null
    if (file && typeof file === "object" && file.size > 0) {
      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)

      // Convert to Base64 data URL so it displays instantly with zero 404 risk on any serverless platform
      const mimeType = file.type || "image/jpeg"
      const base64 = buffer.toString("base64")
      const dataUrl = `data:${mimeType};base64,${base64}`

      // Also attempt to save locally if filesystem is writable
      try {
        const publicDir = path.join(process.cwd(), "public", "uploads")
        if (!fs.existsSync(publicDir)) {
          fs.mkdirSync(publicDir, { recursive: true })
        }
        const ext = path.extname(file.name || "") || ".jpeg"
        const filename = `payment-qr-${Date.now()}${ext}`
        fs.writeFileSync(path.join(publicDir, filename), buffer)
      } catch {}

      updateConferenceSettings({
        paymentQrUrl: dataUrl,
        paymentQrConfigured: true,
      })

      return NextResponse.json({
        paymentQrConfigured: true,
        paymentQrUrl: dataUrl,
      })
    }
  } catch {}

  return NextResponse.json({
    paymentQrConfigured: false,
    paymentQrUrl: "/payment-qr.jpeg",
  })
}
