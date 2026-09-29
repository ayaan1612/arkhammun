"use client"

import Link from "next/link"
import { ArrowRight, Instagram, Mail, MapPin, Menu, X } from "lucide-react"
import { useState } from "react"

const logoUrl = "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/WhatsApp%20Image%202026-07-21%20at%209.49.19%20PM%20%281%29-TtjyOzah9Sj825Ttt0s8mJWmOeUncA.jpeg"

export function SiteNav() {
  const [open, setOpen] = useState(false)
  return <nav className="site-nav page-nav" aria-label="Primary navigation"><Link href="/" className="brand-mark" onClick={() => setOpen(false)}><img src={logoUrl} alt="Arkham MUN emblem" /><span><strong>ARKHAM</strong><small>MUN</small></span></Link><button className="menu-toggle" onClick={() => setOpen(!open)} aria-label="Toggle navigation" aria-expanded={open}>{open ? <X size={20} /> : <Menu size={20} />}</button><div className={`nav-links ${open ? "is-open" : ""}`}><Link href="/">Home</Link><Link href="/committees">Committees</Link><Link href="/about">About</Link><Link href="/contact">Contact</Link><Link href="/faq">FAQ</Link><Link className="nav-cta" href="/register">Register <ArrowRight size={15} /></Link></div></nav>
}

export function SiteFooter() {
  return <footer className="site-footer page-footer"><div className="footer-brand"><img src={logoUrl} alt="Arkham MUN emblem" /><strong>ARKHAM MUN</strong><p>See you at the dais.</p></div><div className="footer-details"><div><span>GET IN TOUCH</span><a href="mailto:hello@arkhammun.org"><Mail size={15} /> hello@arkhammun.org</a><a href="https://instagram.com" target="_blank" rel="noreferrer"><Instagram size={15} /> @arkhammun</a></div><div><span>THE CONFERENCE</span><p><MapPin size={15} /> Delhi, India</p><p>24—25 October</p></div></div><p className="copyright">© 2025 Arkham Model United Nations</p></footer>
}

export function PageShell({ children, title, intro }: { children: React.ReactNode; title: string; intro: string }) {
  return <main className="mun-site page-shell"><div className="site-wash" aria-hidden="true" /><SiteNav /><header className="page-hero"><span className="section-kicker">ARKHAM MUN / {title}</span><h1>{title}</h1><p>{intro}</p></header>{children}<SiteFooter /></main>
}

export { logoUrl }
