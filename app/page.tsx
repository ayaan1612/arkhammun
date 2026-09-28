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
  const [activeCommittee, setActiveCommittee] = useState(0)
  const [isCommitteePaused, setIsCommitteePaused] = useState(false)
  const [activePolicy, setActivePolicy] = useState(0)
  const [isPolicyPaused, setIsPolicyPaused] = useState(false)

  const policies = [
    ["I", "Code of conduct", "Delegates are expected to uphold honesty, integrity, respect and professionalism at all times."],
    ["II", "Decorum expectations", "Maintaining decorum is essential. Disruptive behavior or disrespect will not be tolerated."],
    ["III", "Device policy", "The use of electronic devices is strictly regulated as per committee guidelines."],
    ["IV", "ID card requirement", "All delegates must wear their official ID cards at all times within the conference premises."],
    ["V", "Refund policy", "Refunds will be processed only under exceptional circumstances as per the conference's discretion."],
  ]

  const moveCommittee = (direction: number) => {
    setActiveCommittee((current) => (current + direction + committees.length) % committees.length)
  }

  useEffect(() => {
    if (isCommitteePaused) return
    const autoplay = window.setInterval(() => moveCommittee(1), 4800)
    return () => window.clearInterval(autoplay)
  }, [isCommitteePaused])

  useEffect(() => {
    if (isPolicyPaused) return
    const autoplay = window.setInterval(() => setActivePolicy((current) => (current + 1) % policies.length), 4200)
    return () => window.clearInterval(autoplay)
  }, [isPolicyPaused, policies.length])

  return (
    <main className="mun-site relative min-h-screen overflow-hidden bg-[#080812] text-white">
      <PulsingHexagonBackground />
      <div className="site-wash" aria-hidden="true" />
      <nav className="site-nav" aria-label="Primary navigation">
        <a href="#top" className="brand-mark" aria-label="Arkham MUN home"><img src={logoUrl} alt="Arkham MUN bat and laurel emblem" /><span><strong>ARKHAM</strong><small>MUN </small></span></a>
        <button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu" aria-expanded={menuOpen}>{menuOpen ? <X size={20} /> : <Menu size={20} />}</button>
        <div className={`nav-links ${menuOpen ? "is-open" : ""}`}>
          <a href="#about" onClick={() => setMenuOpen(false)}>About</a><a href="#committees" onClick={() => setMenuOpen(false)}>Committees</a><a href="#registration" onClick={() => setMenuOpen(false)}>Register</a><a href="#policies" onClick={() => setMenuOpen(false)}>Policies</a><button className="nav-cta" onClick={() => setShowRegistration(true)}>Register <ArrowRight size={15} /></button>
        </div>
      </nav>

      <section id="top" className="hero-shell">
        <div className="hero-copy"><div className="eyebrow"><span className="live-dot" /> 24—25 October · New Delhi</div><h1>Question.<br /><em>Negotiate.</em><br />Shape tomorrow.</h1><p className="hero-intro">Arkham MUN is a Model United Nations conference built for voices ready to engage with diplomacy, challenge assumptions and turn ideas into action.</p><div className="hero-actions"><LiquidButton size="xl" onClick={() => setShowRegistration(true)}>Register now <ArrowRight size={17} /></LiquidButton><a className="text-link" href="#about">Explore Arkham <ChevronDown size={16} /></a></div></div>
        <div className="hero-emblem" aria-hidden="true"><div className="emblem-ring" /><img src={logoUrl} alt="" /></div>
        <div className="hero-meta"><div><span>DATE</span><p>24—25<br /><b>OCTOBER</b></p></div><div className="meta-line" /><div><span>VENUE</span><p>IN<br /><b>DELHI</b></p></div><div className="meta-line" /><div><span>DEADLINE</span><p>01<br /><b>OCTOBER</b></p></div></div><div className="scroll-cue"><span /> Scroll to explore</div>
      </section>

      <section id="about" className="content-section about-section"><div className="section-kicker">01 / The conference</div><div className="two-column"><div><h2>Diplomacy,<br /><em>reimagined.</em></h2></div><div className="section-copy"><p>Arkham MUN is designed with one clear intention: to give delegates an experience that goes beyond the ordinary. Young leaders should not merely read about diplomacy, but engage with it meaningfully.</p><p className="muted">Across thoughtfully curated committees, delegates step into the shoes of world representatives, addressing real global challenges through research, negotiation and collaboration. Come ready to argue. Leave ready to lead.</p></div></div><div className="stats-row"><div><strong>06</strong><span>committees</span></div><div><strong>02</strong><span>days of dialogue</span></div><div><strong>₹2000</strong><span>school delegate offer</span></div><div><strong>∞</strong><span>possibilities</span></div></div></section>

      <section id="committees" className="content-section committee-section"><div className="section-heading"><div><div className="section-kicker">02 / The rooms</div><h2>Choose your<br /><em>arena.</em></h2></div><p>Every committee has its own tempo, stakes and story. Find the room that makes you want to speak.</p></div><div className="committee-feature" onMouseEnter={() => setIsCommitteePaused(true)} onMouseLeave={() => setIsCommitteePaused(false)}><div className="committee-rail" aria-label="Choose a committee">{committees.map((committee, index) => <motion.button key={committee[0]} className={index === activeCommittee ? "committee-chip is-active" : "committee-chip"} onClick={() => setActiveCommittee(index)} animate={{ y: (index - activeCommittee) * 72, opacity: index === activeCommittee ? 1 : Math.max(.25, 1 - Math.abs(index - activeCommittee) * .22), scale: index === activeCommittee ? 1 : .92 }} transition={{ type: "spring", stiffness: 110, damping: 18 }} aria-label={`Show ${committee[0]}`}><span>{String(index + 1).padStart(2, "0")}</span><strong>{committee[0]}</strong><small>{committee[2]}</small></motion.button>)}</div><div className="committee-spotlight"><button className="slider-arrow slider-arrow-left" onClick={() => moveCommittee(-1)} aria-label="Previous committee"><ChevronLeft /></button><AnimatePresence mode="wait"><motion.article key={committees[activeCommittee][0]} className="spotlight-card" initial={{ opacity: 0, x: 70, rotate: 2 }} animate={{ opacity: 1, x: 0, rotate: 0 }} exit={{ opacity: 0, x: -70, rotate: -2 }} transition={{ type: "spring", stiffness: 210, damping: 24 }}><div className="spotlight-glow" /><div className="card-top"><span>0{activeCommittee + 1} / 06</span><span>Arkham MUN</span></div><div className="spotlight-copy"><small>{committees[activeCommittee][2]}</small><h3>{committees[activeCommittee][0]}</h3><p>{committees[activeCommittee][1]}</p></div><div className="card-bottom"><span>Tap to explore</span><ArrowRight /></div></motion.article></AnimatePresence><button className="slider-arrow slider-arrow-right" onClick={() => moveCommittee(1)} aria-label="Next committee"><ChevronRight /></button></div></div><div className="slider-footer"><div className="slider-dots">{committees.map((committee, index) => <button key={committee[0]} className={index === activeCommittee ? "is-active" : ""} onClick={() => setActiveCommittee(index)} aria-label={"Show " + committee[0]} />)}</div><span>{activeCommittee + 1} / {committees.length}</span></div></section>

      <section className="content-section advisor-section"><div className="section-kicker">03 / A note from chief advisor</div><div className="two-column"><div><h2>Words have<br /><em>weight.</em></h2><p className="quote">“Diplomacy is the art of letting somebody else have your way.”<span>— David Frost</span></p></div><div className="section-copy advisor-copy"><p>Model United Nations is a reflection of the world itself, turbulent yet hopeful, divided yet capable of dialogue. It teaches us that nations are not merely defined by borders, but by voices willing to negotiate beyond them.</p><p>As the Chief Advisor, it gives me immense pride to witness students evolve into articulate diplomats, strategic negotiators and conscientious global citizens. True leadership lies not in speaking the loudest, but in understanding the quietest argument in the room.</p><p>Step into committee rooms with courage in your voice, grace in disagreement and conviction in your ideas. May your resolutions carry wisdom and your speeches carry purpose.</p><strong>Manya Munjal</strong><small>Chief Advisor · Arkham MUN</small></div></div></section>

      <section id="schedule" className="content-section schedule-section"><div className="section-kicker">04 / The rhythm</div><div className="schedule-layout"><div><h2>Two days.<br /><em>Many voices.</em></h2><p className="section-copy">From your first moderated caucus to the final vote, every moment is designed to keep the conversation moving.</p></div><div className="timeline">{schedule.map(([date, title, place]) => <div className="timeline-row" key={title}><time>{date}</time><div><strong>{title}</strong><span>{place}</span></div><Clock3 size={16} /></div>)}</div></div></section>

      <section id="registration" className="content-section registration-section"><div className="section-kicker">05 / Registration protocol</div><div className="two-column registration-grid"><div><h2>Take your<br /><em>seat.</em></h2><p className="section-copy">Scan the QR code on the official brochure to register. All registrations are completed online before 01 October.</p></div><div className="fee-card"><div><span>School delegation</span><strong>₹2000</strong><small>₹1800 per student for schools registering 50 or more students</small></div><div><span>Individual delegate</span><strong>₹2200</strong><small>Online payment · Registration deadline: 1st October</small></div><LiquidButton size="xl" onClick={() => setShowRegistration(true)}>Begin registration <ArrowRight size={17} /></LiquidButton></div></div></section>

      <section id="policies" className="content-section policies-section"><div className="section-heading policy-heading"><div><div className="section-kicker">06 / Rules & policies</div><h2>Carry the<br /><em>standard.</em></h2></div><p>Clear expectations create the room for sharper debate, stronger diplomacy and a better conference for everyone.</p></div><div className="policy-slider" onMouseEnter={() => setIsPolicyPaused(true)} onMouseLeave={() => setIsPolicyPaused(false)}><button className="slider-arrow policy-arrow" onClick={() => setActivePolicy((current) => (current - 1 + policies.length) % policies.length)} aria-label="Previous policy"><ChevronLeft /></button><div className="policy-viewport"><div className="policy-track">{policies.map(([number, title, text], index) => <motion.article className={`policy-card ${index === activePolicy ? "is-active" : ""}`} key={number} animate={{ x: `${(index - activePolicy) * 100}%`, scale: 1, opacity: index === activePolicy ? 1 : 0 }} transition={{ type: "spring", stiffness: 62, damping: 22, mass: 1.15 }} onClick={() => setActivePolicy(index)}><span>{number}</span><div><h3>{title}</h3><p>{text}</p></div><small>{index === activePolicy ? "Current policy" : "Tap to inspect"}</small></motion.article>)}</div></div><button className="slider-arrow policy-arrow" onClick={() => setActivePolicy((current) => (current + 1) % policies.length)} aria-label="Next policy"><ChevronRight /></button></div><div className="policy-progress" aria-label="Policy slides">{policies.map(([number], index) => <button key={number} className={index === activePolicy ? "is-active" : ""} onClick={() => setActivePolicy(index)} aria-label={`Show policy ${number}`} />)}</div></section>

      <section className="register-banner"><div><span className="section-kicker">07 / Your move</span><h2>Bring your<br /><em>point of view.</em></h2></div><LiquidButton size="xl" onClick={() => setShowRegistration(true)}>Register as a delegate <ArrowRight size={17} /></LiquidButton></section>
      <footer id="contact" className="site-footer"><div className="footer-brand"><img src={logoUrl} alt="Arkham MUN emblem" /><strong>ARKHAM MUN</strong><p>See you at the dais.</p></div><div className="footer-details"><div><span>GET IN TOUCH</span><a href="tel:9810110713"><Users size={15} /> 9810110713</a><a href="mailto:hello@arkhammun.org"><Mail size={15} /> hello@arkhammun.org</a><a href="https://instagram.com" target="_blank" rel="noreferrer"><Instagram size={15} /> @arkhammun</a></div><div><span>THE CONFERENCE</span><p><MapPin size={15} /> Delhi, India</p><p><CalendarDays size={15} /> 24—25 October</p></div></div><p className="copyright">© 2025 Arkham Model United Nations · An Aarush Chaudhary Design</p></footer>
      {showRegistration && <div className="modal-backdrop" role="presentation" onClick={() => setShowRegistration(false)}><div className="registration-modal" role="dialog" aria-modal="true" aria-labelledby="registration-title" onClick={(event) => event.stopPropagation()}><button className="modal-close" onClick={() => setShowRegistration(false)} aria-label="Close registration"><X size={18} /></button><ShieldCheck size={30} className="modal-icon" /><h2 id="registration-title">Reserve your seat.</h2><p>Registration is online. Leave your details and the Arkham secretariat will share the next steps.</p><label>Name<input placeholder="Your full name" /></label><label>Email<input type="email" placeholder="you@example.com" /></label><LiquidButton size="lg" onClick={() => setShowRegistration(false)}>Join the waitlist <ArrowRight size={17} /></LiquidButton></div></div>}
    </main>
  )
}
