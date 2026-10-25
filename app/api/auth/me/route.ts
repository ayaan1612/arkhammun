import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization") || ""
  const token = authHeader.replace(/^Bearer\s+/i, "").trim()

  if (
    token &&
    (token.includes("admin") ||
      token.includes("arkham") ||
      token.length >= 4)
  ) {
    return NextResponse.json({
      user: {
        id: "admin-arkhammun",
        name: "Secretariat Administrator",
        email: "arkhammun2026@gmail.com",
        role: "admin",
      },
    })
  }

  return NextResponse.json({ error: "Unauthorized session." }, { status: 401 })
}
