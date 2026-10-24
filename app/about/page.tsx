import { ArkhamShell, PageIntro } from '@/components/arkham-shell'
import { Award, BookOpen, Compass, Globe2, ShieldCheck, Users } from 'lucide-react'

export default function AboutPage() {
  return (
    <ArkhamShell>
      <main>
        <PageIntro eyebrow="01 / The conference" title={<>Diplomacy, <em>reimagined.</em></>}>
          Arkham MUN is designed to give delegates an experience that goes beyond the ordinary: a space to research deeply, negotiate meaningfully and leave ready to lead.
        </PageIntro>

        {/* Note from Chief Advisor */}
        <section className="page-section about-story">
          <div>
            <span className="section-kicker">A note from the chief advisor</span>
            <h2>Words have <em>weight.</em></h2>
          </div>
          <div>
            <blockquote>
              “Diplomacy is the art of letting somebody else have your way.”
              <cite>— David Frost</cite>
            </blockquote>
            <p>
              Model United Nations is a reflection of the world itself, turbulent yet hopeful, divided yet capable of dialogue. It teaches us that nations are not merely defined by borders, but by voices willing to negotiate beyond them.
            </p>
            <p style={{ marginTop: "14px", color: "#aaa8ba", lineHeight: 1.8 }}>
              In an era defined by rapid geopolitical transformations, the youth must not only critique world affairs but formulate actionable frameworks to resolve them. Whether debating international humanitarian law or macroeconomic reform, your arguments should resonate with conviction, research, and respect.
            </p>
            <p style={{ marginTop: "14px", color: "#aaa8ba", lineHeight: 1.8 }}>
              Step into committee rooms with courage in your voice, grace in disagreement and conviction in your ideas. May your resolutions carry wisdom and your speeches carry purpose.
            </p>
            <strong style={{ display: "block", marginTop: "20px" }}>Manya Munjal</strong>
            <small className="person-role">Chief Advisor · Arkham MUN</small>
          </div>
        </section>

        {/* Note from Founder */}
        <section className="page-section founder-note" style={{ borderTop: "1px solid rgba(160,150,205,.16)" }}>
          <div className="two-column">
            <div>
              <span className="section-kicker">A note from the founder</span>
              <h2>Built for <em>dialogue.</em></h2>
            </div>
            <div>
              <p>
                It is my immense pleasure to welcome you to ARKHAM MUN, a platform dedicated to diplomacy, debate and meaningful discourse. This conference gives young minds the space to collaborate, challenge perspectives and develop solutions to global issues through constructive dialogue.
              </p>
              <p style={{ marginTop: "14px", color: "#aaa8ba", lineHeight: 1.8 }}>
                Arkham was founded upon a single guiding thesis: delegate experience comes first. From fair and transparent executive board evaluations to thought-provoking background agendas, every detail has been curated to create an intellectually demanding yet supportive environment.
              </p>
              <p style={{ marginTop: "14px", color: "#aaa8ba", lineHeight: 1.8 }}>
                Beyond resolutions and speeches, Arkham MUN is an opportunity to build lifelong friendships, exchange ideas with peers from top institutions across the nation, and experience the timeless spirit of international cooperation.
              </p>
              <strong style={{ display: "block", marginTop: "20px" }}>Ayaan Shrivastava</strong>
              <small className="person-role">Founder · Arkham MUN</small>
            </div>
          </div>
        </section>

        {/* The Three Pillars of Arkham MUN */}
        <section className="page-section" style={{ borderTop: "1px solid rgba(160,150,205,.16)" }}>
          <div style={{ marginBottom: "40px" }}>
            <span className="section-kicker">03 / CORE PHILOSOPHY</span>
            <h2 style={{ margin: "10px 0 0", fontSize: "clamp(34px, 5vw, 54px)", fontWeight: 500 }}>
              The Pillars of <em>Arkham.</em>
            </h2>
            <p style={{ color: "#aaa8ba", maxWidth: "600px", marginTop: "12px", lineHeight: 1.7 }}>
              Our pedagogical approach bridges theoretical international law with real-time caucus negotiations.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px" }}>
            <div style={{ padding: "28px", backgroundColor: "#0c0b16", border: "1px solid rgba(227,38,46,0.25)", borderRadius: "8px" }}>
              <div style={{ width: "42px", height: "42px", borderRadius: "8px", backgroundColor: "rgba(227,38,46,0.15)", display: "grid", placeItems: "center", color: "#e3262e", marginBottom: "16px" }}>
                <BookOpen size={20} />
              </div>
              <h3 style={{ margin: "0 0 10px", fontSize: "20px", color: "#fff" }}>Empirical Research</h3>
              <p style={{ margin: 0, color: "#aaa8ba", fontSize: "14px", lineHeight: 1.7 }}>
                Committees demand deep understanding of primary treaty baselines, sovereign foreign policy mandates, and legal precedents rather than superficial oratorical posturing.
              </p>
            </div>

            <div style={{ padding: "28px", backgroundColor: "#0c0b16", border: "1px solid rgba(227,38,46,0.25)", borderRadius: "8px" }}>
              <div style={{ width: "42px", height: "42px", borderRadius: "8px", backgroundColor: "rgba(227,38,46,0.15)", display: "grid", placeItems: "center", color: "#e3262e", marginBottom: "16px" }}>
                <Users size={20} />
              </div>
              <h3 style={{ margin: "0 0 10px", fontSize: "20px", color: "#fff" }}>Coalition Diplomacy</h3>
              <p style={{ margin: 0, color: "#aaa8ba", fontSize: "14px", lineHeight: 1.7 }}>
                True power in international relations lies in multilateral consensus. Delegates learn unmoderated negotiation, compromise formulation, and bloc leadership dynamics.
              </p>
            </div>

            <div style={{ padding: "28px", backgroundColor: "#0c0b16", border: "1px solid rgba(227,38,46,0.25)", borderRadius: "8px" }}>
              <div style={{ width: "42px", height: "42px", borderRadius: "8px", backgroundColor: "rgba(227,38,46,0.15)", display: "grid", placeItems: "center", color: "#e3262e", marginBottom: "16px" }}>
                <ShieldCheck size={20} />
              </div>
              <h3 style={{ margin: "0 0 10px", fontSize: "20px", color: "#fff" }}>Executive Board Integrity</h3>
              <p style={{ margin: 0, color: "#aaa8ba", fontSize: "14px", lineHeight: 1.7 }}>
                Our dais panels are appointed strictly based on domain expertise and past adjudicating excellence, upholding strict neutrality, active guidance, and comprehensive delegate feedback.
              </p>
            </div>
          </div>
        </section>

        {/* Visual Story Placeholder */}
        <section className="photo-story" aria-label="Arkham conference visual">
          <div className="photo-placeholder">
            <span>ARKHAM / 01</span>
            <strong>Every voice<br /><em>matters.</em></strong>
          </div>
          <div className="photo-placeholder photo-offset">
            <span>ARKHAM / 02</span>
            <strong>Every room<br /><em>moves.</em></strong>
          </div>
        </section>
      </main>
    </ArkhamShell>
  )
}
