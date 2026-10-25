import { ArkhamShell, PageIntro } from '@/components/arkham-shell'
import { arkham } from '@/lib/arkham-data'
import { HelpCircle, Mail, MessageSquare, Phone } from 'lucide-react'
import Link from 'next/link'

const questions = [
  [
    'Who is eligible to participate in Arkham MUN?',
    'Arkham MUN welcomes students from schools, colleges, and universities across India and internationally. Whether you are an experienced debater or a first-time delegate exploring diplomacy, our committee matrices are structured across foundational, specialized, and advanced tiers to ensure meaningful debate for all skill levels.'
  ],
  [
    'What are the registration fees and payment details?',
    `Institutional school delegations are priced at ${arkham.fees.school} per student delegate. Individual delegate registrations are priced at ${arkham.fees.individual}. Online payments are processed seamlessly via UPI at ${arkham.paymentUpi} with instant screenshot verification on our portal.`
  ],
  [
    'When does registration close and how are allocations handled?',
    'Registration remains open until committee capacity is reached. Allocations are processed on a rolling basis, so early registration is encouraged to secure your preferred committee and country assignments.'
  ],
  [
    'Where is the conference venue located?',
    `Arkham MUN is hosted at a premier institutional venue in ${arkham.location}. The exact venue campus address, metro connectivity routes, and entry gate instructions are communicated directly via your delegate dashboard and confirmation email.`
  ],
  [
    'How are committee allocations and portfolios determined?',
    'Allocations are processed on a combined basis of prior MUN experience, portfolio preferences submitted in the registration form, and timely fee verification. High-demand countries and specialized portfolios are assigned based on early registration.'
  ],
  [
    'Can first-time delegates (novices) participate without prior experience?',
    'Absolutely. We believe Model UN is the premier training ground for future leaders. Our Executive Board members conduct dedicated committee orientation sessions on Day 1 to guide delegates through points of order, moderated caucus motions, and resolution drafting.'
  ],
  [
    'Will background guides and study guides be provided?',
    'Yes. Comprehensive background guides authored by the Executive Board detailing agenda history, bloc stances, treaty baselines, and questions a resolution must answer (QARMAs) are released to delegates prior to the conference.'
  ],
  [
    'Are meals, high tea, and refreshments provided during the conference?',
    'Yes. All registered delegates receive access to morning refreshments, executive networking lunch, and evening high tea across both conference days (10—11 April 2027), fully covered within the registration fee.'
  ],
  [
    'What documents and materials must I bring on Day 1?',
    'Delegates must carry a valid institutional student ID card, a digital or printed copy of their verified Arkham Entry Pass (accessible on the Delegate Dashboard), a notepad/stationery, and a personal laptop or tablet for resolution drafting.'
  ],
  [
    'How does the International Press (IP) committee function?',
    'The International Press simulates a real-world press corps consisting of journalists, caricaturists, and photojournalists. IP members cover committee proceedings, interview delegates during lobbying sessions, and publish official conference bulletins throughout the two days.'
  ],
  [
    'What awards and certifications are presented at the conference?',
    'Every delegate who attends all mandatory committee sessions receives an official Certificate of Participation. Outstanding performers in each committee are awarded Best Delegate, High Commendation, and Special Mention trophies, along with cash prizes and commendation certificates.'
  ],
  [
    'How can delegates submit inquiries or report discrepancies?',
    'Delegates can submit real-time inquiries directly through the Contact page or use the Bell notifications helpdesk modal inside the Delegate Dashboard. Our Secretariat desk responds to all queries promptly.'
  ]
]

export default function FaqPage() {
  return (
    <ArkhamShell>
      <main>
        <PageIntro eyebrow="04 / Delegate information" title={<>Questions, <em>answered.</em></>}>
          A comprehensive guide to Arkham MUN rules, delegate registration, committee logistics, and conference protocols.
        </PageIntro>

        <section className="page-section faq-list">
          {questions.map(([question, answer], idx) => (
            <details
              key={question}
              style={{
                borderTop: idx === 0 ? "1px solid rgba(160,150,205,.2)" : "none",
                borderBottom: "1px solid rgba(160,150,205,.2)",
                padding: "20px 0",
              }}
            >
              <summary
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  cursor: "pointer",
                  fontSize: "18px",
                  fontWeight: 600,
                  color: "#fff",
                  userSelect: "none",
                }}
              >
                <span>{question}</span>
                <span style={{ color: "#e3262e", fontSize: "22px", marginLeft: "14px", flexShrink: 0 }}>+</span>
              </summary>
              <p style={{ marginTop: "14px", color: "#aaa8ba", lineHeight: 1.75, fontSize: "14.5px" }}>
                {answer}
              </p>
            </details>
          ))}
        </section>

        {/* Contact Callout */}
        <section className="page-section" style={{ borderTop: "1px solid rgba(160,150,205,.16)", textAlign: "center" }}>
          <div style={{ maxWidth: "580px", margin: "0 auto" }}>
            <span className="section-kicker">STILL HAVE QUESTIONS?</span>
            <h2 style={{ fontSize: "clamp(26px, 5vw, 40px)", margin: "10px 0 14px", color: "#fff" }}>
              Our Secretariat is ready to <em>assist.</em>
            </h2>
            <p style={{ color: "#aaa8ba", fontSize: "14px", lineHeight: 1.7, marginBottom: "24px" }}>
              Reach out to our delegate helpdesk for custom delegation packages, hotel accommodation recommendations, or agenda guidance.
            </p>
            <div style={{ display: "flex", justifyContent: "center", gap: "12px", flexWrap: "wrap" }}>
              <Link href="/contact" className="primary-button" style={{ padding: "10px 22px", fontSize: "13px" }}>
                Contact Secretariat Desk →
              </Link>
              <a href={`tel:${arkham.phone}`} className="secondary-button" style={{ padding: "10px 20px", fontSize: "13px", display: "inline-flex", alignItems: "center", gap: "6px" }}>
                <Phone size={14} /> Call Helpline: {arkham.phone}
              </a>
            </div>
          </div>
        </section>
      </main>
    </ArkhamShell>
  )
}
