"use client"

import { useEffect, useState } from "react"
import { AnimatePresence, motion } from "motion/react"
import { ArrowLeft, ArrowRight, CalendarDays, ChevronDown, ChevronLeft, ChevronRight, Clock3, Instagram, Mail, MapPin, Menu, ShieldCheck, Users, X } from "lucide-react"
import PulsingHexagonBackground from "@/components/pulsing-hexagon-background"
import { LiquidButton } from "@/components/ui/liquid-glass-button"

const logoUrl = "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/WhatsApp%20Image%202026-07-21%20at%209.49.19%20PM%20%281%29-TtjyOzah9Sj825Ttt0s8mJWmOeUncA.jpeg"

const committees = [
  ["UNODC", "Human Rights Implications on the global war on Drugs", "Advanced"],
  ["AIPPM", "Use of Central Agencies (ED/CBI): Law Enforcement Tool or Political Tool?", "National"],
  ["UNHRC", "Deliberating on safeguarding Political Leaders under International Human Rights Law", "Advanced"],
  ["UNGA", "Strengthening Nuclear Weapon-Free Zones with focus on the Middle East & South Asia", "General Assembly"],
  ["UNCSW", "Advancing women's protection, leadership & rights in conflict zones with special emphasis on the Russia-Ukraine war", "Specialized"],
  ["IP", "Journalists, Caricaturists & Photographers to cover conference proceedings", "International Press"],
]

const schedule = [
  ["24 OCT", "Delegate registration", "Conference foyer"],
  ["24 OCT", "Inaugural ceremony", "Main hall"],
  ["24 OCT", "Committee session I", "Council rooms"],
  ["25 OCT", "Committee session II", "Council rooms"],
  ["25 OCT", "Closing ceremony", "Main hall"],
]

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [showRegistration, setShowRegistration] = useState(false)
  const [registrationType, setRegistrationType] = useState<"individual" | "school">("individual")
  const [registrationSubmitted, setRegistrationSubmitted] = useState(false)
  const [activeCommittee, setActiveCommittee] = useState(0)
  const [isCommitteePaused, setIsCommitteePaused] = useState(false)


  const moveCommittee = (direction: number) => {
    setActiveCommittee((current) => (current + direction + committees.length) % committees.length)
  }

  useEffect(() => {
    if (isCommitteePaused) return
    const autoplay = window.setInterval(() => moveCommittee(1), 4800)
    return () => window.clearInterval(autoplay)
  }, [isCommitteePaused])


  return (
    <main className="mun-site relative min-h-screen overflow-hidden bg-[#080812] text-white">
      <PulsingHexagonBackground />
      <div className="site-wash" aria-hidden="true" />
      <nav className="site-nav" aria-label="Primary navigation">
        <a href="/" className="brand-mark" aria-label="Arkham MUN home"><img src={logoUrl} alt="Arkham MUN bat and laurel emblem" /><span><strong>ARKHAM</strong><small>MUN</small></span></a>
        <button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu" aria-expanded={menuOpen}>{menuOpen ? <X size={20} /> : <Menu size={20} />}</button>
        <div className={`nav-links ${menuOpen ? "is-open" : ""}`}>
          <a href="/about" onClick={() => setMenuOpen(false)}>About</a><a href="/committees" onClick={() => setMenuOpen(false)}>Committees</a><a href="/policies" onClick={() => setMenuOpen(false)}>Policies</a><a href="/faq" onClick={() => setMenuOpen(false)}>FAQ</a><a href="/contact" onClick={() => setMenuOpen(false)}>Contact</a><a className="nav-cta home-action-button" href="/register">Register <ArrowRight size={15} /></a>
        </div>
      </nav>

      <section id="top" className="hero-shell">
        <div className="hero-copy"><div className="eyebrow"><span className="live-dot" /> 24—25 October · New Delhi</div><h1>Question.<br /><em>Negotiate.</em><br />Shape tomorrow.</h1><p className="hero-intro">Arkham MUN is a Model United Nations conference built for voices ready to engage with diplomacy, challenge assumptions and turn ideas into action.</p><div className="hero-actions"><LiquidButton className="home-action-button" size="xl" onClick={() => setShowRegistration(true)}>Register now <ArrowRight size={17} /></LiquidButton><a className="text-link" href="#about">Explore Arkham <ChevronDown size={16} /></a></div></div>
        <div className="hero-emblem" aria-hidden="true"><div className="emblem-ring" /><img src={logoUrl} alt="" /></div>
        <div className="hero-meta"><div><span>DATE</span><p>24—25<br /><b>OCTOBER</b></p></div><div className="meta-line" /><div><span>VENUE</span><p>IN<br /><b>DELHI</b></p></div><div className="meta-line" /><div><span>DEADLINE</span><p>01<br /><b>OCTOBER</b></p></div></div><div className="scroll-cue"><span /> Scroll to explore</div>
      </section>

      <section id="about" className="content-section about-section"><div className="section-kicker">01 / The conference</div><div className="two-column"><div><h2>Diplomacy,<br /><em>reimagined.</em></h2></div><div className="section-copy"><p>Arkham MUN is designed with one clear intention: to give delegates an experience that goes beyond the ordinary. Young leaders should not merely read about diplomacy, but engage with it meaningfully.</p><p className="muted">Across thoughtfully curated committees, delegates step into the shoes of world representatives, addressing real global challenges through research, negotiation and collaboration. Come ready to argue. Leave ready to lead.</p></div></div><div className="stats-row"><div><strong>06</strong><span>committees</span></div><div><strong>02</strong><span>days of dialogue</span></div><div><strong>₹2000</strong><span>school delegate offer</span></div><div><strong>∞</strong><span>possibilities</span></div></div></section>

      <section id="committees" className="content-section committee-section"><div className="section-heading"><div><div className="section-kicker">02 / The rooms</div><h2>Choose your<br /><em>arena.</em></h2></div><p>Every committee has its own tempo, stakes and story. Find the room that makes you want to speak.</p></div><div className="committee-feature" onMouseEnter={() => setIsCommitteePaused(true)} onMouseLeave={() => setIsCommitteePaused(false)}><div className="committee-rail" aria-label="Choose a committee">{committees.map((committee, index) => <motion.button key={committee[0]} className={index === activeCommittee ? "committee-chip is-active" : "committee-chip"} onClick={() => setActiveCommittee(index)} animate={{ y: (index - activeCommittee) * 72, opacity: index === activeCommittee ? 1 : Math.max(.25, 1 - Math.abs(index - activeCommittee) * .22), scale: index === activeCommittee ? 1 : .92 }} transition={{ type: "spring", stiffness: 110, damping: 18 }} aria-label={`Show ${committee[0]}`}><span>{String(index + 1).padStart(2, "0")}</span><strong>{committee[0]}</strong><small>{committee[2]}</small></motion.button>)}</div><div className="committee-spotlight"><button className="slider-arrow slider-arrow-left" onClick={() => moveCommittee(-1)} aria-label="Previous committee"><ChevronLeft /></button><AnimatePresence mode="wait"><motion.article key={committees[activeCommittee][0]} className="spotlight-card" initial={{ opacity: 0, x: 70, rotate: 2 }} animate={{ opacity: 1, x: 0, rotate: 0 }} exit={{ opacity: 0, x: -70, rotate: -2 }} transition={{ type: "spring", stiffness: 210, damping: 24 }}><div className="spotlight-glow" /><div className="card-top"><span>0{activeCommittee + 1} / 06</span><span>Arkham MUN</span></div><div className="spotlight-copy"><small>{committees[activeCommittee][2]}</small><h3>{committees[activeCommittee][0]}</h3><p>{committees[activeCommittee][1]}</p></div><div className="card-bottom"><span>Tap to explore</span><ArrowRight /></div></motion.article></AnimatePresence><button className="slider-arrow slider-arrow-right" onClick={() => moveCommittee(1)} aria-label="Next committee"><ChevronRight /></button></div></div><div className="slider-footer"><div className="slider-dots">{committees.map((committee, index) => <button key={committee[0]} className={index === activeCommittee ? "is-active" : ""} onClick={() => setActiveCommittee(index)} aria-label={"Show " + committee[0]} />)}</div><span>{activeCommittee + 1} / {committees.length}</span></div></section>

      <section className="content-section advisor-section"><div className="section-kicker">03 / A note from chief advisor</div><div className="two-column"><div><h2>Words have<br /><em>weight.</em></h2><p className="quote">“Diplomacy is the art of letting somebody else have your way.”<span>— David Frost</span></p></div><div className="section-copy advisor-copy"><p>Model United Nations is a reflection of the world itself, turbulent yet hopeful, divided yet capable of dialogue. It teaches us that nations are not merely defined by borders, but by voices willing to negotiate beyond them.</p><p>As the Chief Advisor, it gives me immense pride to witness students evolve into articulate diplomats, strategic negotiators and conscientious global citizens. True leadership lies not in speaking the loudest, but in understanding the quietest argument in the room.</p><p>Step into committee rooms with courage in your voice, grace in disagreement and conviction in your ideas. May your resolutions carry wisdom and your speeches carry purpose.</p><strong>Manya Munjal</strong><small>Chief Advisor · Arkham MUN</small></div></div></section>

      <section id="schedule" className="content-section schedule-section"><div className="section-kicker">04 / The rhythm</div><div className="schedule-layout"><div><h2>Two days.<br /><em>Many voices.</em></h2><p className="section-copy">From your first moderated caucus to the final vote, every moment is designed to keep the conversation moving.</p></div><div className="timeline">{schedule.map(([date, title, place]) => <div className="timeline-row" key={title}><time>{date}</time><div><strong>{title}</strong><span>{place}</span></div><Clock3 size={16} /></div>)}</div></div></section>

      <section id="registration" className="content-section registration-section"><div className="section-kicker">05 / Registration protocol</div><div className="two-column registration-grid"><div><h2>Take your<br /><em>seat.</em></h2><p className="section-copy">Scan the QR code on the official brochure to register. All registrations are completed online before 01 October.</p></div><div className="fee-card"><div><span>School delegation</span><strong>₹2000</strong><small>₹1800 per student for schools registering 50 or more students</small></div><div><span>Individual delegate</span><strong>₹2200</strong><small>Online payment · Registration deadline: 1st October</small></div><LiquidButton className="home-action-button" size="xl" onClick={() => setShowRegistration(true)}>Begin registration <ArrowRight size={17} /></LiquidButton></div></div></section>


      <footer id="contact" className="site-footer"><div className="footer-brand"><img src={logoUrl} alt="Arkham MUN emblem" /><strong>ARKHAM MUN</strong><p>See you at the dais.</p></div><div className="footer-details"><div><span>GET IN TOUCH</span><a href="tel:9810110713"><Users size={15} /> 9810110713</a><a href="mailto:hello@arkhammun.org"><Mail size={15} /> hello@arkhammun.org</a><a href="https://instagram.com" target="_blank" rel="noreferrer"><Instagram size={15} /> @arkhammun</a></div><div><span>THE CONFERENCE</span><p><MapPin size={15} /> Delhi, India</p><p><CalendarDays size={15} /> 24—25 October</p></div></div><p className="copyright">© 2025 Arkham Model United Nations · An Aarush Chaudhary Design</p></footer>
      {showRegistration && <div className="modal-backdrop" role="presentation" onClick={() => setShowRegistration(false)}><div className="registration-modal" role="dialog" aria-modal="true" aria-labelledby="registration-title" onClick={(event) => event.stopPropagation()}><button className="modal-close" onClick={() => setShowRegistration(false)} aria-label="Close registration"><X size={18} /></button>{registrationSubmitted ? <div className="registration-success"><ShieldCheck size={34} className="modal-icon" /><h2 id="registration-title">You are on the list.</h2><p>The Arkham secretariat will contact you with payment and allocation details.</p><button className="modal-secondary" onClick={() => { setRegistrationSubmitted(false); setShowRegistration(false) }}>Close</button></div> : <><ShieldCheck size={30} className="modal-icon" /><h2 id="registration-title">Reserve your seat.</h2><p>Choose your path into the conference. Every field helps the secretariat place you well.</p><div className="registration-tabs" role="tablist" aria-label="Registration type"><button className={registrationType === "individual" ? "is-active" : ""} role="tab" aria-selected={registrationType === "individual"} onClick={() => setRegistrationType("individual")}>Individual delegate</button><button className={registrationType === "school" ? "is-active" : ""} role="tab" aria-selected={registrationType === "school"} onClick={() => setRegistrationType("school")}>School delegation</button></div><form onSubmit={(event) => { event.preventDefault(); setRegistrationSubmitted(true) }}><label>{registrationType === "school" ? "Teacher / coordinator name" : "Delegate name"}<input required name="name" placeholder={registrationType === "school" ? "Coordinator full name" : "Your full name"} /></label><label>Email address<input required type="email" name="email" placeholder="you@example.com" /></label>{registrationType === "school" ? <><label>School / institution<input required name="school" placeholder="School name" /></label><label>Number of delegates<input required type="number" min="1" name="delegates" placeholder="e.g. 50" /></label></> : <label>Preferred committee<select required name="committee" defaultValue=""><option value="" disabled>Select a committee</option>{committees.map(([name]) => <option key={name} value={name}>{name}</option>)}</select></label>}<button className="modal-submit" type="submit">Continue registration <ArrowRight size={17} /></button></form></>}</div></div>}
    </main>
  )
}
