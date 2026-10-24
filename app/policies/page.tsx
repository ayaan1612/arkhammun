import { ArkhamShell, PageIntro } from '@/components/arkham-shell'
import { Award, FileText, Gavel, Scale, Shield, Sparkles } from 'lucide-react'

const detailedPolicies = [
  {
    num: "01",
    title: "Code of Conduct & Professional Integrity",
    summary: "Delegates must uphold the highest standards of honesty, respectful discourse, and professional integrity throughout the conference.",
    details: "Harassment, discrimination, derogatory remarks, or hostile behavior towards fellow delegates, executive board members, or conference staff will result in immediate disqualification and revocation of conference credentials."
  },
  {
    num: "02",
    title: "Decorum Expectations & Parliamentary Courtesy",
    summary: "Maintaining strict diplomatic decorum is essential in all committee sessions and unmoderated caucus discussions.",
    details: "Delegates must address the dais and peers through proper third-person diplomatic address. Shouting, interrupting speakers, or unparliamentary motions will be penalized under Executive Board discretion."
  },
  {
    num: "03",
    title: "Electronic Devices & Technology Policy",
    summary: "Use of laptops and electronic tablets is regulated as per individual committee Executive Board instructions.",
    details: "Laptops and tablets are permitted during unmoderated caucuses solely for the drafting of working papers and resolutions. Internet searches are prohibited during moderated caucuses. Pre-written resolutions are strictly disallowed."
  },
  {
    num: "04",
    title: "Official Delegate Credential Requirement",
    summary: "Official physical ID cards and approved digital entry passes must remain visible at all times.",
    details: "Only delegates wearing valid conference lanyards and verified digital entry passes will be admitted past venue security checkpoints and into assigned committee council chambers."
  },
  {
    num: "05",
    title: "Plagiarism & Pre-Drafting Prohibition",
    summary: "All working papers, draft resolutions, and press submissions must be formulated organically during the conference.",
    details: "Submitting pre-written clauses, copied UN documents without attribution, or utilizing AI text generators to formulate operative clauses is grounds for immediate nullification of the document and disciplinary review."
  },
  {
    num: "06",
    title: "Western Formal & Traditional Attire Standards",
    summary: "Delegates must adhere strictly to professional Western business formal or recognized national diplomatic attire.",
    details: "Day 1 requires Western formal suits, blazers, formal trousers, or professional traditional attire. Casual footwear, jeans, sneakers, and uncollared t-shirts are strictly prohibited inside committee halls."
  },
  {
    num: "07",
    title: "Executive Board Evaluation & Awards Criteria",
    summary: "Dais adjudications are governed by objective rubrics evaluating research, negotiation, and operative resolution crafting.",
    details: "Awards (Best Delegate, High Commendation, Special Mention) are determined by an aggregate score reflecting General Speakers List presence, moderated caucus substance, coalition leadership, and constructive diplomacy."
  },
  {
    num: "08",
    title: "Refunds & Registration Discretion",
    summary: "Registration fees are allocated toward conference logistics, delegate kits, and institutional arrangements upon receipt.",
    details: "Refunds are processed only under exceptional institutional circumstances prior to allocation confirmation, subject strictly to the Secretariat’s written discretion."
  }
]

export default function PoliciesPage() {
  return (
    <ArkhamShell>
      <main>
        <PageIntro eyebrow="07 / Policies" title={<>Carry the <em>standard.</em></>}>
          Clear expectations create room for sharper debate, stronger diplomacy and a better conference for everyone. Browse our established conference statutes below.
        </PageIntro>

        {/* Policy Directory Grid */}
        <section className="page-section policy-directory" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "18px" }}>
          {detailedPolicies.map((policy) => (
            <article
              key={policy.num}
              style={{
                padding: "26px",
                backgroundColor: "#0d0c18",
                border: "1px solid rgba(227, 38, 46, 0.22)",
                borderRadius: "8px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                gap: "14px",
              }}
            >
              <div>
                <span style={{ color: "#e3262e", fontFamily: "Georgia, serif", fontSize: "24px" }}>
                  {policy.num}
                </span>
                <h2 style={{ margin: "14px 0 8px", fontSize: "20px", fontWeight: 600, color: "#fff" }}>
                  {policy.title}
                </h2>
                <p style={{ margin: 0, color: "#e2e0ed", fontSize: "14px", lineHeight: 1.6, fontWeight: 500 }}>
                  {policy.summary}
                </p>
              </div>
              <p style={{ margin: 0, color: "#8f8b9e", fontSize: "12.5px", lineHeight: 1.6, borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "12px" }}>
                {policy.details}
              </p>
            </article>
          ))}
        </section>

        {/* Adjudication & Evaluation Framework */}
        <section className="page-section" style={{ borderTop: "1px solid rgba(160,150,205,.16)" }}>
          <div style={{ marginBottom: "36px" }}>
            <span className="section-kicker">CONFERENCE ADJUDICATION</span>
            <h2 style={{ margin: "8px 0 0", fontSize: "clamp(30px, 5vw, 48px)", fontWeight: 500 }}>
              The Evaluation <em>Framework.</em>
            </h2>
            <p style={{ color: "#aaa8ba", maxWidth: "600px", marginTop: "12px", lineHeight: 1.7 }}>
              How executive board members evaluate committee performance across both conference days.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "18px" }}>
            <div style={{ padding: "22px", backgroundColor: "#0c0b16", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "6px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "#e3262e", marginBottom: "10px" }}>
                <Scale size={18} />
                <strong style={{ color: "#fff", fontSize: "16px" }}>Foreign Policy Accuracy</strong>
              </div>
              <p style={{ margin: 0, color: "#8d8a9e", fontSize: "13px", lineHeight: 1.6 }}>
                Staying true to your allocated country&apos;s real-world geopolitical interests and treaty obligations without compromising character.
              </p>
            </div>

            <div style={{ padding: "22px", backgroundColor: "#0c0b16", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "6px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "#e3262e", marginBottom: "10px" }}>
                <FileText size={18} />
                <strong style={{ color: "#fff", fontSize: "16px" }}>Draft Resolution Substance</strong>
              </div>
              <p style={{ margin: 0, color: "#8d8a9e", fontSize: "13px", lineHeight: 1.6 }}>
                Authorship of well-structured preambulatory and operative clauses that propose concrete funding, monitoring, and implementation mechanisms.
              </p>
            </div>

            <div style={{ padding: "22px", backgroundColor: "#0c0b16", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "6px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "#e3262e", marginBottom: "10px" }}>
                <Award size={18} />
                <strong style={{ color: "#fff", fontSize: "16px" }}>Consensus Leadership</strong>
              </div>
              <p style={{ margin: 0, color: "#8d8a9e", fontSize: "13px", lineHeight: 1.6 }}>
                The ability to bridge polarized blocs during unmoderated caucuses, accept constructive amendments, and unite the chamber for final voting.
              </p>
            </div>
          </div>
        </section>
      </main>
    </ArkhamShell>
  )
}
