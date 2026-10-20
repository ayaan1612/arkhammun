"use client"

import { FormEvent, useState } from "react"
import { ArkhamShell, PageIntro } from "@/components/arkham-shell"
import { arkham } from "@/lib/arkham-data"

const committees = [
  "UNCSW (Advancing women's protection, leadership and rights in conflict zone with special emphasis on women)",
  "UNGA (Strengthening Nuclear Weapon-Free Zones with Focus on the Middle East and South Asia.)",
  "AIPPM (Use of Central Agencies (ED/CBI): Law Enforcement or Political Tool?)",
  "UNODC (Human Rights Implications of the Global War on Drugs.)",
  "UNHRC (Deliberating on Safeguarding Political Leaders Under International Human Rights Law.)",
  "IP",
  "IPL (Mega Auction)",
]

function TextField({ label, name, type = "text", required = true }: { label: string; name: string; type?: string; required?: boolean }) {
  return <label className="registration-field">{label}{required && <span aria-hidden="true"> *</span>}<input name={name} type={type} required={required} placeholder="Short-answer text" /></label>
}

function CommitteeChoice({ title, name }: { title: string; name: string }) {
  return <fieldset className="registration-choice-group"><legend>{title} <span aria-hidden="true">*</span></legend>{committees.map((committee) => <label key={committee} className="radio-row"><input type="radio" name={name} value={committee} required /> <span>{committee}</span></label>)}</fieldset>
}

export default function RegisterPage() {
  const [submitted, setSubmitted] = useState(false)
  const submit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); setSubmitted(true) }

  return <ArkhamShell><main>
    <PageIntro eyebrow="06 / Registration" title={<>Take your <em>seat.</em></>}>Choose the route that fits you. Complete every required field before submitting your delegate registration.</PageIntro>
    <form className="registration-form" onSubmit={submit}>
      <section className="registration-section"><div className="registration-section-heading"><span>01</span><h2>Delegate details</h2></div><div className="registration-grid"><TextField label="Name" name="name" /><TextField label="Email" name="email" type="email" /><TextField label="Phone no." name="phone" type="tel" /><TextField label="School / College" name="school" /><TextField label="Class / Year / Grade" name="grade" /></div></section>
      <section className="registration-section"><div className="registration-section-heading"><span>02</span><h2>Experience</h2></div><fieldset className="registration-choice-group"><legend>Past MUN Experience <span aria-hidden="true">*</span></legend>{["0-5", "5-12", "12-20", "20+"].map((item) => <label className="radio-row compact" key={item}><input type="radio" name="experience" value={item} required /> <span>{item}</span></label>)}</fieldset></section>
      <section className="registration-section"><div className="registration-section-heading"><span>03</span><h2>Committee preferences</h2></div><CommitteeChoice title="Committee Preference 1" name="committee-one" /><CommitteeChoice title="Committee Preference 2" name="committee-two" /></section>
      <section className="registration-section"><div className="registration-section-heading"><span>04</span><h2>Portfolio preferences</h2></div><div className="registration-grid"><TextField label="Portfolio Preference 1" name="portfolio-one" /><TextField label="Portfolio Preference 2" name="portfolio-two" /></div><TextField label="Are you open to being assigned to any committee or portfolio if your top preferences are full?" name="flexible-assignment" /></section>
      <section className="registration-section"><div className="registration-section-heading"><span>05</span><h2>References</h2></div><TextField label="CA Reference (IF NO TYPE NIL)" name="ca-reference" required={false} /></section>
      <section className="registration-section payment-section"><div className="registration-section-heading"><span>06</span><h2>Payment</h2></div><p className="payment-note"><strong>Registration fees</strong><br />School delegation: ₹2,300 per student<br />Individual delegation: ₹2,500<br /><small>Payment method: Online · Deadline: 1 October · UPI: 9718884945@ptsbi</small></p><div className="qr-panel"><span>QR code</span><img src="/payment-qr.jpeg" alt="Arkham MUN registration payment QR code" /></div><div className="registration-grid"><TextField label="Transaction ID" name="transaction-id" /><label className="registration-field">Screenshot of the Payment <span aria-hidden="true">*</span><input name="payment-proof" type="file" accept="image/*,.pdf" required /></label></div></section>
      <section className="registration-section"><div className="registration-section-heading"><span>07</span><h2>Anything else?</h2></div><label className="registration-field"><span className="sr-only">Message</span><textarea name="message" placeholder="Short-answer text" rows={5} /></label></section>
      <button className="registration-submit" type="submit">{submitted ? "Registration draft prepared" : "Submit registration"}</button>{submitted && <p className="form-note">Your details are ready as a draft. Connect the official endpoint before accepting live submissions.</p>}
    </form>
  </main></ArkhamShell>
}
