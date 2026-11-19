import { NextResponse } from "next/server"
import { arkham } from "@/lib/arkham-data"
import { proxyToBackend } from "@/lib/admin-proxy"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  const url = new URL(req.url)
  const proxyRes = await proxyToBackend(req, `/api/notifications/lookup${url.search}`)
  if (proxyRes) return proxyRes

  const query = url.searchParams.get("query") || ""
  return NextResponse.json({
    query,
    registrations: [],
    queries: [],
    event: {
      name: "Arkham MUN 2027",
      date: arkham.dates,
      time: "09:00 AM – 05:00 PM",
      venue: arkham.venueNote,
    },
    announcements: {
      registrationOpen: true,
      registrationNotice: "Registrations for Arkham MUN 2027 are live.",
      conferenceDates: arkham.dates,
      conferenceVenue: arkham.venueNote,
      conferenceTimings: "09:00 AM – 05:00 PM",
      conferenceName: "Arkham MUN 2027",
      countdownTarget: "2027-04-10T09:00:00+05:30",
    },
  })
}
