import { ArkhamShell, PageIntro } from '@/components/arkham-shell'
import { arkham } from '@/lib/arkham-data'
import { Calendar, Clock3, MapPin, ShieldAlert, Sparkles, Users } from 'lucide-react'

const dayOneSchedule = [
  { time: "08:30 — 09:45 AM", title: "Delegate Registration & Kit Distribution", place: "Main Conference Foyer", desc: "Collect physical conference badges, delegate kits, placards, and enjoy morning refreshments." },
  { time: "10:00 — 11:00 AM", title: "Grand Inaugural Ceremony", place: "Arkham Grand Auditorium", desc: "Welcome address by Founder Ayaan Shrivastava, keynote lecture by Chief Advisor Manya Munjal, and introduction of Executive Boards." },
  { time: "11:15 — 01:30 PM", title: "Committee Session I: Roll Call & Setting Agenda", place: "Individual Council Chambers", desc: "Formal roll call, establishment of quorum, opening of the General Speakers List, and preliminary moderated caucus debates." },
  { time: "01:30 — 02:30 PM", title: "Executive Networking Lunch", place: "Dining Pavilion", desc: "Full buffet lunch provided for all delegates, faculty advisors, and executive board members." },
  { time: "02:30 — 04:30 PM", title: "Committee Session II: Substantive Debate & Caucuses", place: "Individual Council Chambers", desc: "In-depth moderated caucuses, bloc consultations, and initial formulation of working paper frameworks." },
  { time: "04:30 — 05:00 PM", title: "Evening High Tea & Unmoderated Lobbying", place: "Central Courtyard", desc: "Evening tea, snacks, and informal diplomatic lobbying between emerging committee blocs." },
  { time: "05:00 — 06:30 PM", title: "Committee Session III: Crisis Update & Directives", place: "Individual Council Chambers", desc: "Emergency crisis freeze introduction, directive drafting, and Day 1 working paper submissions." },
  { time: "06:30 PM", title: "Day 1 Formal Adjournment", place: "Conference Chambers", desc: "Dais review, submission of working papers, and Day 1 debrief." }
]

const dayTwoSchedule = [
  { time: "09:00 — 09:30 AM", title: "Day 2 Arrival & Morning Roll Call", place: "Individual Council Chambers", desc: "Confirmation of quorum, verification of revised draft working papers, and dais consultations." },
  { time: "09:30 — 11:30 AM", title: "Committee Session IV: Working Paper Finalization", place: "Individual Council Chambers", desc: "Formulation of operative clauses, sponsorship verification, and formal submission of Draft Resolutions to the Dais." },
  { time: "11:30 — 01:00 PM", title: "Introduction of Draft Resolutions & Q&A", place: "Individual Council Chambers", desc: "Presentation of competing draft resolutions by author panels followed by questioning from the floor." },
  { time: "01:00 — 02:00 PM", title: "Executive Networking Lunch", place: "Dining Pavilion", desc: "Delegate lunch and final unmoderated negotiations on friendly amendments." },
  { time: "02:00 — 04:00 PM", title: "Committee Session V: Amendments & Final Voting", place: "Individual Council Chambers", desc: "Debating proposed amendments, closing debate, moving into voting procedure, and final adoption of resolutions." },
  { time: "04:00 — 04:45 PM", title: "High Tea & International Press Showcase", place: "Auditorium Foyer", desc: "Tea break and public exhibition of caricature portfolios, investigative newsletters, and photojournalism awards." },
  { time: "04:45 — 06:15 PM", title: "Grand Closing & Valedictory Awards Gala", place: "Arkham Grand Auditorium", desc: "Awarding of Best Delegate, High Commendation, Special Mention trophies, dais farewells, and conference closing gavel." }
]

export default function SchedulePage() {
  return (
    <ArkhamShell>
      <main>
        <PageIntro eyebrow="03 / The rhythm" title={<>Two days. <em>Many voices.</em></>}>
          The complete sequence of diplomacy across both days of Arkham MUN. Plan your preparation, debate motions, and caucus strategies accordingly.
        </PageIntro>

        {/* Day 1 Schedule */}
        <section className="page-section" style={{ paddingBottom: "50px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "28px" }}>
            <span style={{ backgroundColor: "#e3262e", color: "#fff", padding: "4px 10px", borderRadius: "4px", fontSize: "11px", fontWeight: 800, letterSpacing: "0.08em" }}>
              DAY 01
            </span>
            <h2 style={{ margin: 0, fontSize: "24px", color: "#fff", fontWeight: 600 }}>
              Friday, 24 October · Opening &amp; Foundational Debate
            </h2>
          </div>

          <div className="schedule-directory" style={{ display: "grid", gap: "14px" }}>
            {dayOneSchedule.map((item) => (
              <article
                key={item.title}
                style={{
                  padding: "20px 22px",
                  backgroundColor: "#0d0c18",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  borderRadius: "8px",
                  display: "grid",
                  gap: "6px",
                  transition: "border-color 0.2s ease",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
                  <time style={{ color: "#e3262e", fontSize: "12px", fontWeight: 700, letterSpacing: "0.06em", display: "inline-flex", alignItems: "center", gap: "5px" }}>
                    <Clock3 size={13} /> {item.time}
                  </time>
                  <span style={{ color: "#8d8a9e", fontSize: "11px", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                    <MapPin size={12} /> {item.place}
                  </span>
                </div>
                <h3 style={{ margin: "4px 0 2px", fontSize: "17px", color: "#fff", fontWeight: 600 }}>
                  {item.title}
                </h3>
                <p style={{ margin: 0, color: "#aaa8ba", fontSize: "13px", lineHeight: 1.6 }}>
                  {item.desc}
                </p>
              </article>
            ))}
          </div>
        </section>

        {/* Day 2 Schedule */}
        <section className="page-section" style={{ borderTop: "1px solid rgba(160,150,205,.16)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "28px" }}>
            <span style={{ backgroundColor: "#22c55e", color: "#000", padding: "4px 10px", borderRadius: "4px", fontSize: "11px", fontWeight: 800, letterSpacing: "0.08em" }}>
              DAY 02
            </span>
            <h2 style={{ margin: 0, fontSize: "24px", color: "#fff", fontWeight: 600 }}>
              Saturday, 25 October · Resolution Formulation &amp; Awards
            </h2>
          </div>

          <div className="schedule-directory" style={{ display: "grid", gap: "14px" }}>
            {dayTwoSchedule.map((item) => (
              <article
                key={item.title}
                style={{
                  padding: "20px 22px",
                  backgroundColor: "#0d0c18",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  borderRadius: "8px",
                  display: "grid",
                  gap: "6px",
                  transition: "border-color 0.2s ease",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
                  <time style={{ color: "#4ade80", fontSize: "12px", fontWeight: 700, letterSpacing: "0.06em", display: "inline-flex", alignItems: "center", gap: "5px" }}>
                    <Clock3 size={13} /> {item.time}
                  </time>
                  <span style={{ color: "#8d8a9e", fontSize: "11px", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                    <MapPin size={12} /> {item.place}
                  </span>
                </div>
                <h3 style={{ margin: "4px 0 2px", fontSize: "17px", color: "#fff", fontWeight: 600 }}>
                  {item.title}
                </h3>
                <p style={{ margin: 0, color: "#aaa8ba", fontSize: "13px", lineHeight: 1.6 }}>
                  {item.desc}
                </p>
              </article>
            ))}
          </div>
        </section>

        {/* Delegate Punctuality & Security Protocol */}
        <section className="page-section" style={{ borderTop: "1px solid rgba(160,150,205,.16)" }}>
          <div style={{ padding: "26px", backgroundColor: "#0c0b16", border: "1px solid rgba(227,38,46,0.25)", borderRadius: "8px" }}>
            <span className="section-kicker" style={{ color: "#e3262e" }}>IMPORTANT NOTICE</span>
            <h3 style={{ margin: "8px 0 10px", fontSize: "19px", color: "#fff" }}>
              Punctuality &amp; Gate Admission Protocol
            </h3>
            <p style={{ margin: 0, color: "#aaa8ba", fontSize: "13.5px", lineHeight: 1.7 }}>
              Committee sessions commence promptly at the scheduled time. Delegates arriving after roll call must send a formal point of personal privilege note to the Dais through a conference page to be marked &apos;Present&apos;. Security gates close for general admission at 10:15 AM on both days.
            </p>
          </div>
        </section>
      </main>
    </ArkhamShell>
  )
}
