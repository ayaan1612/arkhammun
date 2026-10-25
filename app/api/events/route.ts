import { NextResponse } from "next/server"
import { arkham } from "@/lib/arkham-data"

export const dynamic = "force-dynamic"

export async function GET() {
  return NextResponse.json({
    events: [
      {
        _id: "default-event-2027",
        title: "Arkham MUN 2027",
        description: "Arkham Model United Nations — diplomacy, debate and ideas that move nations.",
        date: arkham.dates,
        venue: arkham.venueNote,
        time: "09:00 AM – 05:00 PM",
        entryFee: 2200,
        upiId: arkham.paymentUpi,
        registrationOpen: true,
        registrationNotice: "Registrations for Arkham MUN 2027 are live.",
      },
    ],
  })
}
