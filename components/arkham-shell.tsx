import Link from 'next/link'
import { ArrowRight, Instagram, Mail, MapPin, Menu, Phone } from 'lucide-react'
import { arkham } from '@/lib/arkham-data'

export function ArkhamHeader() {
  return <header className="arkham-header"><Link href="/" className="arkham-brand"><img src={arkham.logo} alt="Arkham MUN emblem" /><span><strong>ARKHAM</strong><small>MUN</small></span></Link><nav aria-label="Primary navigation"><Link href="/">Home</Link><Link href="/committees">Committees</Link><Link href="/about">About</Link><Link href="/schedule">Schedule</Link><Link href="/faq">FAQ</Link><Link href="/contact">Contact</Link><Link href="/register" className="arkham-nav-cta">Register <ArrowRight size={14} /></Link></nav><button className="arkham-mobile-menu" aria-label="Open navigation"><Menu size={20} /></button></header>
}

export function ArkhamFooter() {
  return <footer className="arkham-footer"><div><Link href="/" className="arkham-brand"><img src={arkham.logo} alt="Arkham MUN emblem" /><span><strong>ARKHAM MUN</strong><small>SEE YOU AT THE DAIS.</small></span></Link><p>Diplomacy, debate and ideas that move nations.</p></div><div className="footer-links"><div><span>EXPLORE</span><Link href="/about">About Arkham</Link><Link href="/committees">Committees</Link><Link href="/schedule">Schedule</Link><Link href="/faq">FAQs</Link></div><div><span>GET IN TOUCH</span><a href={`mailto:${arkham.email}`}><Mail size={14} />{arkham.email}</a><a href={`tel:${arkham.phone}`}><Phone size={14} />{arkham.phone}</a><a href="https://instagram.com/arkhammun" target="_blank" rel="noreferrer"><Instagram size={14} />{arkham.instagram}</a></div><div><span>THE CONFERENCE</span><p><MapPin size={14} />{arkham.location}</p><p>{arkham.dates}</p></div></div><small className="footer-copyright">© Arkham Model United Nations. Conference details should be confirmed by the secretariat.</small></footer>
}

export function ArkhamShell({ children }: { children: React.ReactNode }) {
  return <div className="arkham-page"><ArkhamHeader />{children}<ArkhamFooter /></div>
}

export function PageIntro({ eyebrow, title, children }: { eyebrow: string; title: React.ReactNode; children: React.ReactNode }) {
  return <section className="page-intro"><span className="section-kicker">{eyebrow}</span><h1>{title}</h1><p>{children}</p></section>
}
