"use client"

import { useState } from "react"
import { ArrowRight, CalendarDays, ChevronDown, Clock3, Instagram, Mail, MapPin, Menu, ShieldCheck, Sparkles, Users, X } from "lucide-react"
import PulsingHexagonBackground from "@/components/pulsing-hexagon-background"

const committees = [
  { code: "01", name: "United Nations Security Council", short: "UNSC", level: "Advanced", seats: "15 seats" },
  { code: "02", name: "United Nations Human Rights Council", short: "UNHRC", level: "Intermediate", seats: "47 seats" },
  { code: "03", name: "All India Political Parties Meet", short: "AIPPM", level: "Beginner friendly", seats: "National" },
  { code: "04", name: "International Press Corps", short: "IPC", level: "Open to all", seats: "Media desk" },
]

const logoUrl = "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/WhatsApp%20Image%202026-07-21%20at%209.49.19%20PM%20%281%29-TtjyOzah9Sj825Ttt0s8mJWmOeUncA.jpeg"

const schedule = [
  ["08:30", "Delegate registration", "Main foyer"],
  ["09:30", "Inaugural ceremony", "The Grand Hall"],
  ["11:00", "Committee session I", "Council rooms"],
  ["14:00", "Committee session II", "Council rooms"],
  ["17:30", "Closing ceremony", "The Grand Hall"],
]

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [showRegistration, setShowRegistration] = useState(false)

  return (
    <main className="mun-site relative min-h-screen overflow-hidden bg-[#080812] text-white">
      <PulsingHexagonBackground />
      <div className="site-wash" aria-hidden="true" />
      <nav className="site-nav" aria-label="Primary navigation">
        <a href="#top" className="brand-mark" aria-label="Arkham MUN home">
          <img src={logoUrl} alt="Arkham MUN bat and laurel emblem" />
          <span><strong>ARKHAM</strong><small>MUN 2025</small></span>
        </a>
        <button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu" aria-expanded={menuOpen}>{menuOpen ? <X size={20} /> : <Menu size={20} />}</button>
        <div className={`nav-links ${menuOpen ? "is-open" : ""}`}>
          <a href="#about" onClick={() => setMenuOpen(false)}>About</a>
          <a href="#committees" onClick={() => setMenuOpen(false)}>Committees</a>
          <a href="#schedule" onClick={() => setMenuOpen(false)}>Schedule</a>
          <a href="#contact" onClick={() => setMenuOpen(false)}>Contact</a>
          <button className="nav-cta" onClick={() => setShowRegistration(true)}>Register <ArrowRight size={15} /></button>
        </div>
      </nav>

      <section id="top" className="hero-shell">
        <div className="hero-copy">
          <div className="eyebrow"><span className="live-dot" /> The next generation of diplomacy</div>
          <h1>Question.<br /><em>Negotiate.</em><br />Shape tomorrow.</h1>
          <p className="hero-intro">Arkham MUN is a student-led simulation of the United Nations where ideas become resolutions and every voice has the power to move the room.</p>
          <div className="hero-actions"><button className="primary-button" onClick={() => setShowRegistration(true)}>Secure your seat <ArrowRight size={17} /></button><a className="text-link" href="#about">Explore the conference <ChevronDown size={16} /></a></div>
        </div>
        <div className="hero-emblem" aria-hidden="true"><div className="emblem-ring" /><img src={logoUrl} alt="" /></div>
        <div className="hero-meta"><div><span>01</span><p>DECEMBER<br /><b>2025</b></p></div><div className="meta-line" /><div><span>VENUE</span><p>THE GRAND HALL<br /><b>NEW DELHI</b></p></div></div>
        <div className="scroll-cue"><span /> Scroll to explore</div>
      </section>

      <section id="about" className="content-section about-section">
        <div className="section-kicker">01 / The conference</div>
        <div className="two-column"><div><h2>Ideas move<br /><em>nations.</em></h2></div><div className="section-copy"><p>Arkham MUN brings together curious, articulate and ambitious students for one immersive day of diplomacy. It is a space to challenge assumptions, build coalitions and find common ground.</p><p className="muted">Whether you are taking the floor for the first time or leading a crisis room, you will leave with sharper arguments, new allies and a bigger view of the world.</p></div></div>
        <div className="stats-row"><div><strong>250+</strong><span>delegates</span></div><div><strong>04</strong><span>committees</span></div><div><strong>01</strong><span>unforgettable day</span></div><div><strong>∞</strong><span>possibilities</span></div></div>
      </section>

      <section id="committees" className="content-section committee-section">
        <div className="section-heading"><div><div className="section-kicker">02 / The rooms</div><h2>Choose your<br /><em>arena.</em></h2></div><p>Every committee has its own tempo, stakes and story. Find the room that makes you want to speak.</p></div>
        <div className="committee-grid">{committees.map((committee) => <article className="committee-card" key={committee.code}><div className="card-top"><span>{committee.code}</span><span>{committee.level}</span></div><div><small>{committee.short}</small><h3>{committee.name}</h3></div><div className="card-bottom"><span>{committee.seats}</span><ArrowRight size={17} /></div></article>)}</div>
      </section>

      <section id="schedule" className="content-section schedule-section"><div className="section-kicker">03 / The rhythm</div><div className="schedule-layout"><div><h2>One day.<br /><em>Many voices.</em></h2><p className="section-copy">From your first moderated caucus to the final vote, every minute is designed to keep the conversation moving.</p></div><div className="timeline">{schedule.map(([time, title, place]) => <div className="timeline-row" key={time}><time>{time}</time><div><strong>{title}</strong><span>{place}</span></div><Clock3 size={16} /></div>)}</div></div></section>

      <section className="register-banner"><div><span className="section-kicker">04 / Your move</span><h2>Bring your<br /><em>point of view.</em></h2></div><button className="primary-button" onClick={() => setShowRegistration(true)}>Register as a delegate <ArrowRight size={17} /></button></section>

      <footer id="contact" className="site-footer"><div className="footer-brand"><img src={logoUrl} alt="Arkham MUN emblem" /><strong>ARKHAM MUN</strong><p>Diplomacy, reimagined.</p></div><div className="footer-details"><div><span>GET IN TOUCH</span><a href="mailto:hello@arkhammum.org"><Mail size={15} /> hello@arkhammum.org</a><a href="https://instagram.com" target="_blank" rel="noreferrer"><Instagram size={15} /> @arkhammun</a></div><div><span>THE GRAND HALL</span><p><MapPin size={15} /> New Delhi, India</p><p><CalendarDays size={15} /> 01 December 2025</p></div></div><p className="copyright">© 2025 Arkham Model United Nations</p></footer>

      {showRegistration && <div className="modal-backdrop" role="presentation" onClick={() => setShowRegistration(false)}><div className="registration-modal" role="dialog" aria-modal="true" aria-labelledby="registration-title" onClick={(event) => event.stopPropagation()}><button className="modal-close" onClick={() => setShowRegistration(false)} aria-label="Close registration"><X size={18} /></button><ShieldCheck size={30} className="modal-icon" /><h2 id="registration-title">Reserve your seat.</h2><p>Delegate registrations for Arkham MUN 2025 open soon. Leave your details and our secretariat will be in touch.</p><label>Name<input placeholder="Your full name" /></label><label>Email<input type="email" placeholder="you@example.com" /></label><button className="primary-button" onClick={() => setShowRegistration(false)}>Join the waitlist <ArrowRight size={17} /></button></div></div>}
    </main>
  )
}
