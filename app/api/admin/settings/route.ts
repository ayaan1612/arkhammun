import { NextResponse } from "next/server"
import { arkham } from "@/lib/arkham-data"

export const dynamic = "force-dynamic"

export async function GET() {
  return NextResponse.json({
    event: {
      name: "Arkham MUN 2027",
      date: arkham.dates,
      time: "09:00 AM – 05:00 PM",
      venue: arkham.venueNote,
    },
    amount: 2200,
    upiId: arkham.paymentUpi,
    registrationOpen: true,
    registrationNotice: "",
  })
}

export async function PUT(req: Request) {
  const body = await req.json().catch(() => ({}))
  return NextResponse.json({
    success: true,
    settings: body,
  })
}
