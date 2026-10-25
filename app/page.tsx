"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { AnimatePresence, motion } from "motion/react"
import { ArrowRight, CalendarDays, ChevronDown, ChevronLeft, ChevronRight, Clock3, Instagram, LayoutDashboard, LogIn, Mail, MapPin, Menu, ShieldCheck, Users, X } from "lucide-react"
import { LiquidButton } from "@/components/ui/liquid-glass-button"
import { useAuth } from "@/lib/auth-context"
import { ArkhamHeader } from "@/components/arkham-shell"
import { HeroLogo } from "@/components/HeroLogo"

const logoUrl = "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/WhatsApp%20Image%202026-07-21%20at%209.49.19%20PM%20%281%29-TtjyOzah9Sj825Ttt0s8mJWmOeUncA.jpeg"

const committees = [
  ["UNCSW", "Advancing Women's Protection, Leadership and Rights in Conflict Zones, with Special Emphasis on the Russia–Ukraine War.", "Specialized"],
  ["UNGA", "Strengthening Nuclear Weapon-Free Zones, with a Focus on the Middle East and South Asia.", "General Assembly"],
  ["Lok Sabha", "Indian parliamentary committee simulation.", "National"],
  ["IPL — Mega Auction", "Simulated IPL Mega Auction committee.", "Specialized"],
  ["IP — International Press", "Journalists, Caricaturists and Photographers to Cover Conference Proceedings.", "International Press"],
  ["UNODC", "Human Rights Implications of the Global War on Drugs.", "Advanced"],
  ["WHO", "Strengthening Global Preparedness for Future Pandemics and Ensuring Fair Access to Vaccines, Diagnostics and Treatments for All Countries.", "Specialized"],
  ["UNEP", "Protecting Global Biodiversity While Balancing Economic Growth and Environmental Sustainability.", "Specialized"],
  ["AIPPM", "Use of Central Agencies (ED/CBI): Law Enforcement Tool or Political Tool?", "National"],
  ["UNHRC", "Deliberating on safeguarding Political Leaders under International Human Rights Law", "Advanced"],
]

const schedule = [
  ["24 OCT", "Delegate registration", "Conference foyer"],
  ["24 OCT", "Inaugural ceremony", "Main hall"],
  ["24 OCT", "Committee session I", "Council rooms"],
  ["25 OCT", "Committee session II", "Council rooms"],
  ["25 OCT", "Closing ceremony", "Main hall"],
]

export default function Home() {
  const { user } = useAuth()
  const [isMounted, setIsMounted] = useState(false)
  const [activeCommittee, setActiveCommittee] = useState(0)
  const [isCommitteePaused, setIsCommitteePaused] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  const moveCommittee = (direction: number) => {
    setActiveCommittee((current) => (current + direction + committees.length) % committees.length)
  }

  useEffect(() => {
    if (isCommitteePaused) return
    const autoplay = window.setInterval(() => moveCommittee(1), 4800)
    return () => window.clearInterval(autoplay)
  }, [isCommitteePaused])

  if (!isMounted) {
    return <main className="mun-site relative min-h-screen overflow-x-clip bg-transparent text-white" aria-busy="true" />
  }

  return (
    <main className="mun-site relative min-h-screen overflow-x-clip bg-transparent text-white">
      <div className="site-wash" aria-hidden="true" />
      <ArkhamHeader />

      <section id="top" className="hero-shell container-x">
        <div className="hero-copy">
          <div className="eyebrow"><span className="live-dot" /> 24—25 October · Central Delhi</div>
          <h1>Question.<br /><em>Negotiate.</em><br />Shape tomorrow.</h1>
          <p className="hero-intro">Arkham MUN is a Model United Nations conference built for voices ready to engage with diplomacy, challenge assumptions and turn ideas into action.</p>
          <div className="hero-actions">
            <LiquidButton href="/register" className="home-action-button" size="xl">Register now <ArrowRight size={17} /></LiquidButton>
            <a className="text-link" href="#about">Explore Arkham <ChevronDown size={16} /></a>
          </div>
        </div>
        <HeroLogo logoUrl={logoUrl} />
        <div className="hero-meta">
          <div className="hero-meta-item">
            <span>DATE</span>
            <p>24—25 OCTOBER</p>
          </div>
          <div className="hero-meta-item">
            <span>VENUE</span>
            <p>IN CENTRAL DELHI</p>
          </div>
          <div className="hero-meta-item">
            <span>DEADLINE</span>
            <p>01 OCTOBER</p>
          </div>
        </div>
        <a href="#about" className="scroll-cue" aria-label="Scroll to explore">
          <span>SCROLL TO EXPLORE</span>
          <div className="scroll-cue-line" />
        </a>
      </section>

      <section id="about" className="content-section about-section container-x">
        <div className="section-kicker">01 / The conference</div>
        <div className="two-column">
          <div><h2>Diplomacy,<br /><em>reimagined.</em></h2></div>
          <div className="section-copy">
            <p>Arkham MUN is designed with one clear intention: to give delegates an experience that goes beyond the ordinary. Young leaders should not merely read about diplomacy, but engage with it meaningfully.</p>
            <p className="muted">Across thoughtfully curated committees, delegates step into the shoes of world representatives, addressing real global challenges through research, negotiation and collaboration. Come ready to argue. Leave ready to lead.</p>
          </div>
        </div>
        <div className="stats-row">
          <div><strong>10</strong><span>committees</span></div>
          <div><strong>02</strong><span>days of dialogue</span></div>
          <div><strong>₹2300</strong><span>school delegation</span></div>
          <div><strong>∞</strong><span>possibilities</span></div>
        </div>
      </section>

      <section id="committees" className="content-section committee-section container-x">
        <div className="section-heading">
          <div>
            <div className="section-kicker">02 / The rooms</div>
            <h2>Choose your<br /><em>arena.</em></h2>
          </div>
          <p>Every committee has its own tempo, stakes and story. Find the room that makes you want to speak.</p>
        </div>
        <div className="committee-feature" onMouseEnter={() => setIsCommitteePaused(true)} onMouseLeave={() => setIsCommitteePaused(false)}>
          <div className="committee-rail" aria-label="Choose a committee">
            {committees.map((committee, index) => (
              <motion.button
                key={committee[0]}
                className={index === activeCommittee ? "committee-chip is-active" : "committee-chip"}
                onClick={() => setActiveCommittee(index)}
                animate={{
                  y: (index - activeCommittee) * 72,
                  opacity: index === activeCommittee ? 1 : Math.max(.25, 1 - Math.abs(index - activeCommittee) * .22),
                  scale: index === activeCommittee ? 1 : .92
                }}
                transition={{ type: "spring", stiffness: 110, damping: 18 }}
                aria-label={`Show ${committee[0]}`}
              >
                <span>{String(index + 1).padStart(2, "0")}</span>
                <strong>{committee[0]}</strong>
                <small>{committee[2]}</small>
              </motion.button>
            ))}
          </div>
          <div className="committee-spotlight">
            <button className="slider-arrow slider-arrow-left" onClick={() => moveCommittee(-1)} aria-label="Previous committee"><ChevronLeft /></button>
            <AnimatePresence mode="wait">
              <motion.article
                key={committees[activeCommittee][0]}
                className="spotlight-card"
                initial={{ opacity: 0, x: 70, rotate: 2 }}
                animate={{ opacity: 1, x: 0, rotate: 0 }}
                exit={{ opacity: 0, x: -70, rotate: -2 }}
                transition={{ type: "spring", stiffness: 210, damping: 24 }}
              >
                <div className="spotlight-glow" />
                <div className="card-top"><span>0{activeCommittee + 1} / 10</span><span>Arkham MUN</span></div>
                <div className="spotlight-copy">
                  <small>{committees[activeCommittee][2]}</small>
                  <h3>{committees[activeCommittee][0]}</h3>
                  <p>{committees[activeCommittee][1]}</p>
                </div>
                <div className="card-bottom"><span>Tap to explore</span><ArrowRight /></div>
              </motion.article>
            </AnimatePresence>
            <button className="slider-arrow slider-arrow-right" onClick={() => moveCommittee(1)} aria-label="Next committee"><ChevronRight /></button>
          </div>
        </div>
        <div className="slider-footer">
          <div className="slider-dots">
            {committees.map((committee, index) => (
              <button
                key={committee[0]}
                className={index === activeCommittee ? "is-active" : ""}
                onClick={() => setActiveCommittee(index)}
                aria-label={"Show " + committee[0]}
              />
            ))}
          </div>
          <span>{activeCommittee + 1} / {committees.length}</span>
        </div>
      </section>

      <section className="content-section advisor-section container-x">
        <div className="section-kicker">03 / A note from chief advisor</div>
        <div className="two-column">
          <div>
            <h2>Words have<br /><em>weight.</em></h2>
            <p className="quote">“Diplomacy is the art of letting somebody else have your way.”<span>— David Frost</span></p>
          </div>
          <div className="section-copy advisor-copy">
            <p>Model United Nations is a reflection of the world itself, turbulent yet hopeful, divided yet capable of dialogue. It teaches us that nations are not merely defined by borders, but by voices willing to negotiate beyond them.</p>
            <p>As the Chief Advisor, it gives me immense pride to witness students evolve into articulate diplomats, strategic negotiators and conscientious global citizens. True leadership lies not in speaking the loudest, but in understanding the quietest argument in the room.</p>
            <p>Step into committee rooms with courage in your voice, grace in disagreement and conviction in your ideas. May your resolutions carry wisdom and your speeches carry purpose.</p>
            <div className="advisor-signoff">
              <strong>Manya Munjal</strong>
              <small>Chief Advisor · Arkham MUN</small>
            </div>
          </div>
        </div>
      </section>

      <section className="content-section experience-section container-x">
        <div className="section-heading">
          <div>
            <div className="section-kicker">04 / The experience</div>
            <h2>What sets<br /><em>Arkham apart.</em></h2>
          </div>
          <p>Carefully engineered committee dynamics that challenge assumptions and prioritize substantive debate over theatrics.</p>
        </div>
        <div className="experience-grid">
          <div className="experience-card">
            <span className="experience-card-kicker">01 / RESEARCH</span>
            <h3>Empirical Policy Focus</h3>
            <p>Agendas constructed around real-world treaties, sovereign mandates, and international jurisprudence rather than generic talking points.</p>
          </div>
          <div className="experience-card">
            <span className="experience-card-kicker">02 / CRISIS</span>
            <h3>Dynamic In-Session Freezes</h3>
            <p>Real-time geopolitical updates, press conferences, and emergency directives that test diplomatic composure and rapid alliance formulation.</p>
          </div>
          <div className="experience-card">
            <span className="experience-card-kicker">03 / INTEGRITY</span>
            <h3>Unbiased Adjudications</h3>
            <p>Executive boards vetted for domain expertise who grade delegates on substantive consensus-building and constructive resolution drafting.</p>
          </div>
        </div>
      </section>

      <section id="schedule" className="content-section schedule-section container-x">
        <div className="section-kicker">05 / The rhythm</div>
        <div className="schedule-layout">
          <div>
            <h2>Two days.<br /><em>Many voices.</em></h2>
            <p className="section-copy">From your first moderated caucus to the final vote, every moment is designed to keep the conversation moving.</p>
          </div>
          <div className="timeline">
            {schedule.map(([date, title, place]) => (
              <div className="timeline-row" key={title}>
                <time>{date}</time>
                <div><strong>{title}</strong><span>{place}</span></div>
                <Clock3 size={16} />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="registration" className="content-section registration-section container-x">
        <div className="section-kicker">06 / Registration protocol</div>
        <div className="two-column registration-grid">
          <div>
            <h2>Take your<br /><em>seat.</em></h2>
            <p className="section-copy">Complete your registration online before 1 October. Payment is accepted online via UPI at <strong>9718884945@ptsbi</strong>.</p>
          </div>
          <div className="fee-card">
            <div><span>School delegation</span><strong>₹2300</strong><small>Per student for a school delegation</small></div>
            <div><span>Individual delegate</span><strong>₹2500</strong><small>Individual delegation · Online payment · Deadline: 1st October</small></div>
            <LiquidButton href="/register" className="home-action-button" size="xl">Begin registration <ArrowRight size={17} /></LiquidButton>
          </div>
        </div>
      </section>

      <footer id="contact" className="site-footer container-x">
        <div className="footer-brand"><img src={logoUrl} alt="Arkham MUN emblem" /><strong>ARKHAM MUN</strong><p>See you at the dais.</p></div>
        <div className="footer-details">
          <div>
            <span>GET IN TOUCH</span>
            <a href="tel:9810110713"><Users size={15} /> 9810110713</a>
            <a href="mailto:hello@arkhammun.org"><Mail size={15} /> hello@arkhammun.org</a>
            <a href="https://instagram.com" target="_blank" rel="noreferrer"><Instagram size={15} /> @arkhammun</a>
          </div>
          <div>
            <span>THE CONFERENCE</span>
            <p><MapPin size={15} /> In Central Delhi</p>
            <p><CalendarDays size={15} /> 24—25 October</p>
          </div>
          <div>
            <span>SECRETARIAT</span>
            {user ? (
              <Link href="/dashboard" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}><LayoutDashboard size={15} /> Dashboard Portal</Link>
            ) : (
              <Link href="/login" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}><LogIn size={15} /> Login Portal</Link>
            )}
            <Link href="/register"><ArrowRight size={15} /> Delegate Portal</Link>
          </div>
        </div>
      </footer>
    </main>
  )
}
