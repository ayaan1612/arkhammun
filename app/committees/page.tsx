import { ArkhamShell, PageIntro } from '@/components/arkham-shell'
import { arkham } from '@/lib/arkham-data'
import { ArrowUpRight, BookOpen, FileText, Gavel, HelpCircle, Layers, Lightbulb, Scale } from 'lucide-react'
import Link from 'next/link'

export default function CommitteesPage() {
  return (
    <ArkhamShell>
      <main>
        <PageIntro eyebrow="02 / The rooms" title={<>Choose your <em>arena.</em></>}>
          Eight committees, eight distinct rooms for research, negotiation and conviction. Browse the verified Arkham MUN agendas, study guides, and parliamentary frameworks below.
        </PageIntro>

        {/* Directory Grid */}
        <section className="page-section committee-directory">
          {arkham.committees.map((committee, index) => (
            <article className="directory-card" key={committee.acronym}>
              <div className="directory-number">{String(index + 1).padStart(2, '0')}</div>
              <div>
                <span className="card-label">{committee.level}</span>
                <h2>{committee.acronym}</h2>
                <p>{committee.agenda}</p>
              </div>
              <ArrowUpRight aria-hidden="true" />
            </article>
          ))}
        </section>

        {/* Delegate Research & Caucus Preparation Standards */}
        <section className="page-section" style={{ borderTop: "1px solid rgba(160,150,205,.16)" }}>
          <div style={{ marginBottom: "36px" }}>
            <span className="section-kicker">03 / COMMITTEE PREPARATION</span>
            <h2 style={{ margin: "10px 0 0", fontSize: "clamp(30px, 5vw, 46px)", fontWeight: 500 }}>
              Mastering Your <em>Portfolio.</em>
            </h2>
            <p style={{ color: "#aaa8ba", maxWidth: "620px", marginTop: "12px", lineHeight: 1.7 }}>
              Key expectations established by the Executive Board to ensure high-impact, evidence-based debate.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px" }}>
            <div style={{ padding: "26px", backgroundColor: "#0d0c18", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px" }}>
              <div style={{ width: "38px", height: "38px", borderRadius: "6px", backgroundColor: "rgba(227,38,46,0.15)", display: "grid", placeItems: "center", color: "#e3262e", marginBottom: "14px" }}>
                <BookOpen size={18} />
              </div>
              <h3 style={{ margin: "0 0 8px", fontSize: "18px", color: "#fff" }}>Treaty &amp; Legal Frameworks</h3>
              <p style={{ margin: 0, color: "#8d8a9e", fontSize: "13px", lineHeight: 1.65 }}>
                Base your speeches on verifiable UN resolutions, ICJ jurisprudence, and bilateral state pacts. Citing authentic conventions gives your arguments indisputable gravitas.
              </p>
            </div>

            <div style={{ padding: "26px", backgroundColor: "#0d0c18", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px" }}>
              <div style={{ width: "38px", height: "38px", borderRadius: "6px", backgroundColor: "rgba(227,38,46,0.15)", display: "grid", placeItems: "center", color: "#e3262e", marginBottom: "14px" }}>
                <Gavel size={18} />
              </div>
              <h3 style={{ margin: "0 0 8px", fontSize: "18px", color: "#fff" }}>Procedural Mastery</h3>
              <p style={{ margin: 0, color: "#8d8a9e", fontSize: "13px", lineHeight: 1.65 }}>
                Familiarize yourself with Points of Order, Points of Parliamentary Inquiry, and Motions for Unmoderated Caucuses. Controlling procedural flow is the hallmark of seasoned diplomats.
              </p>
            </div>

            <div style={{ padding: "26px", backgroundColor: "#0d0c18", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px" }}>
              <div style={{ width: "38px", height: "38px", borderRadius: "6px", backgroundColor: "rgba(227,38,46,0.15)", display: "grid", placeItems: "center", color: "#e3262e", marginBottom: "14px" }}>
                <FileText size={18} />
              </div>
              <h3 style={{ margin: "0 0 8px", fontSize: "18px", color: "#fff" }}>Position Paper Submissions</h3>
              <p style={{ margin: 0, color: "#8d8a9e", fontSize: "13px", lineHeight: 1.65 }}>
                Submitting a one-page position paper outlining your sovereign stance, past international actions, and proposed solutions qualifies delegates for Best Position Paper awards.
              </p>
            </div>
          </div>
        </section>

        {/* Call to Register */}
        <section className="page-section" style={{ borderTop: "1px solid rgba(160,150,205,.16)", textAlign: "center" }}>
          <div style={{ maxWidth: "600px", margin: "0 auto" }}>
            <span className="section-kicker">SECURE YOUR SEAT</span>
            <h2 style={{ fontSize: "clamp(28px, 5vw, 42px)", margin: "10px 0 14px", color: "#fff" }}>
              Ready to take the <em>floor?</em>
            </h2>
            <p style={{ color: "#aaa8ba", fontSize: "14.5px", lineHeight: 1.7, marginBottom: "24px" }}>
              Priority allocations for high-stakes councils including UNGA, UNCSW, and Lok Sabha are awarded on a rolling basis. Register your portfolio preferences today.
            </p>
            <Link href="/register" className="primary-button" style={{ padding: "12px 28px", fontSize: "14px", display: "inline-flex", alignItems: "center", gap: "8px" }}>
              Begin Delegate Registration →
            </Link>
          </div>
        </section>
      </main>
    </ArkhamShell>
  )
}
