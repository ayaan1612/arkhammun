"use client"

import { FormEvent, useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { ArrowRight, Check, CircleAlert, Clock3, Copy, LoaderCircle, ShieldCheck } from "lucide-react"
import { ArkhamShell, PageIntro } from "@/components/arkham-shell"
import { EntryQrResponse, entryPassApi, PublicEvent, RegistrationStart, RegistrationStatus } from "@/lib/entry-pass-api"

const committees = [
  "UNCSW (Advancing women's protection, leadership and rights in conflict zone with special emphasis on women)",
  "UNGA (Strengthening Nuclear Weapon-Free Zones with Focus on the Middle East and South Asia.)",
  "AIPPM (Use of Central Agencies (ED/CBI): Law Enforcement or Political Tool?)",
  "UNODC (Human Rights Implications of the Global War on Drugs.)",
  "UNHRC (Deliberating on Safeguarding Political Leaders Under International Human Rights Law.)",
  "IP",
  "IPL (Mega Auction)",
]

function TextField({ label, name, type = "text", required = true, placeholder = "Short-answer text" }: { label: string; name: string; type?: string; required?: boolean; placeholder?: string }) {
  return (
    <label className="registration-field">
      {label}
      {required && <span aria-hidden="true"> *</span>}
      <input name={name} type={type} required={required} placeholder={placeholder} />
    </label>
  )
}

function CommitteeChoice({ title, name }: { title: string; name: string }) {
  return (
    <fieldset className="registration-choice-group">
      <legend>
        {title} <span aria-hidden="true">*</span>
      </legend>
      {committees.map((committee) => (
        <label key={committee} className="radio-row">
          <input type="radio" name={name} value={committee} required />
          <span>{committee}</span>
        </label>
      ))}
    </fieldset>
  )
}

export default function RegisterPage() {
  const [publicEvent, setPublicEvent] = useState<PublicEvent | null>(null)
  const [registration, setRegistration] = useState<RegistrationStart | null>(null)
  const [status, setStatus] = useState<RegistrationStatus | null>(null)
  const [entryQr, setEntryQr] = useState<EntryQrResponse | null>(null)
  const [paymentConfirmed, setPaymentConfirmed] = useState(false)
  const [copied, setCopied] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")


  useEffect(() => {
    let active = true
    entryPassApi.getPublicEvent().then((details) => {
      if (active) setPublicEvent(details)
    }).catch((requestError) => {
      if (active) setError(requestError instanceof Error ? requestError.message : "Unable to load event details.")
    })
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (!registration || !status || status === "approved" || status === "rejected") return
    let active = true
    const refresh = async () => {
      try {
        const result = await entryPassApi.getRegistration(registration.id)
        if (!active) return
        setStatus(result.status)
        if (result.status === "approved") {
          const qr = await entryPassApi.getEntryQr(registration.id)
          if (active) setEntryQr(qr)
        }
      } catch {
        // Polling failure can silently retry on next interval
      }
    }
    const timer = window.setInterval(refresh, 6000)
    return () => {
      active = false
      window.clearInterval(timer)
    }
  }, [registration, status])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)

    const name = String(data.get("name") || "").trim()
    const email = String(data.get("email") || "").trim()
    const phone = String(data.get("phone") || "").trim()
    const school = String(data.get("school") || "").trim()
    const committee = String(data.get("committee-one") || "").trim()
    const utr = String(data.get("transaction-id") || "").trim()
    const proofFile = data.get("payment-proof")

    if (!name || !email || !phone || !school || !committee) {
      setError("Please complete all required delegate details.")
      return
    }

    if (!utr) {
      setError("Please enter the payment transaction reference (UTR).")
      return
    }

    setBusy(true)
    setError("")
    setNotice("")

    try {
      // 1. Create registration record
      const created = await entryPassApi.createRegistration({
        name,
        email,
        phone,
        organization: school,
        committee,
      })
      setRegistration(created)

      // 2. Submit payment proof
      const file = proofFile instanceof File && proofFile.size > 0 ? proofFile : undefined
      await entryPassApi.submitPaymentProof(created.id, utr, file)

      setStatus("payment_submitted")
      setNotice("Registration and payment proof submitted! The secretariat will review your submission.")
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to complete registration. Please check your details and try again.")
    } finally {
      setBusy(false)
    }
  }

  function startOver() {
    setRegistration(null)
    setStatus(null)
    setEntryQr(null)
    setPaymentConfirmed(false)
    setCopied(false)
    setError("")
    setNotice("")
  }

  const upiId = publicEvent?.upiId || "chauhan5408k@okaxis"

  function copyUpi() {
    navigator.clipboard.writeText(upiId)
    setCopied(true)
    setTimeout(() => setCopied(false), 2200)
  }

  return (
    <ArkhamShell>
      <main>
        <PageIntro eyebrow="06 / Registration" title={<>Take your <em>seat.</em></>}>
          Complete your delegate registration and submit payment details. Once verified by the secretariat, your signed entry QR pass will be issued and emailed to you.
        </PageIntro>

        {publicEvent && !publicEvent.registrationOpen && (
          <div style={{ maxWidth: 980, margin: "0 auto 30px", padding: 20, border: "1px solid rgba(230, 165, 74, .4)", background: "rgba(230, 165, 74, .08)", borderRadius: 8 }}>
            <h3 style={{ color: "#ffd19c", margin: "0 0 6px", fontSize: 16 }}>Registration Notice</h3>
            <p style={{ margin: 0, color: "#d6d0e0", fontSize: 13, lineHeight: 1.6 }}>
              {publicEvent.registrationNotice || "The secretariat is finalizing conference dates, venue, or registration is temporarily closed. Please check back shortly."}
            </p>
            <Link href="/admin" style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 12, color: "#ff8289", fontWeight: 700, fontSize: 12, textDecoration: "none" }}>
              Open Admin Dashboard <ArrowRight size={14} />
            </Link>
          </div>
        )}

        {status === "payment_submitted" || status === "approved" ? (
          <section style={{ maxWidth: 980, margin: "0 auto 80px", padding: 32, border: "1px solid rgba(255,255,255,.16)", borderRadius: 12, background: "rgba(10,10,10,.86)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
              <ShieldCheck size={28} color="#e3262e" />
              <div>
                <h2 style={{ margin: 0, fontSize: 24, color: "#fff" }}>
                  {status === "approved" ? "Registration Approved & Verified" : "Payment Proof Under Review"}
                </h2>
                <p style={{ margin: "4px 0 0", color: "#aaa8ba", fontSize: 13 }}>
                  Registration ID: <strong>{registration?.id}</strong>
                </p>
              </div>
            </div>

            {notice && (
              <p style={{ padding: 12, background: "rgba(84, 189, 128, .1)", borderLeft: "3px solid #54bd80", color: "#b5ecc8", fontSize: 13, margin: "0 0 20px" }}>
                {notice}
              </p>
            )}

            {status === "payment_submitted" && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#ffd19c", fontSize: 13, padding: 14, background: "rgba(230, 165, 74, .08)", borderRadius: 6, marginBottom: 20 }}>
                <Clock3 size={18} />
                <span>Your payment reference is being verified by the secretariat. This page refreshes automatically.</span>
              </div>
            )}

            {status === "approved" && entryQr && (
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 24, padding: 20, border: "1px solid rgba(84, 189, 128, .35)", background: "rgba(84, 189, 128, .07)", borderRadius: 8, marginBottom: 20 }}>
                <Image src={entryQr.qr} alt="Signed Event Entry QR Code" width={160} height={160} unoptimized style={{ background: "#fff", padding: 8, borderRadius: 6 }} />
                <div style={{ display: "grid", gap: 6 }}>
                  <strong style={{ fontSize: 18, color: "#fff" }}>{entryQr.event.name} Entry Pass</strong>
                  <span style={{ color: "#b5ecc8", fontSize: 13, fontWeight: 700 }}>VERIFIED · READY FOR CHECK-IN</span>
                  <span style={{ color: "#aaa8ba", fontSize: 13 }}>{entryQr.event.date} · {entryQr.event.time}</span>
                  <span style={{ color: "#aaa8ba", fontSize: 13 }}>{entryQr.event.venue}</span>
                  <span style={{ color: "#ffd19c", fontSize: 12, marginTop: 4 }}>A copy of this signed pass has also been sent to your registered email address.</span>
                </div>
              </div>
            )}

            <button type="button" className="registration-submit" onClick={startOver}>
              Register another delegate
            </button>
          </section>
        ) : (
          <form className="registration-form" onSubmit={handleSubmit}>
            {error && (
              <p style={{ padding: 12, background: "rgba(227, 38, 46, .1)", borderLeft: "3px solid #e3262e", color: "#ffb5b8", fontSize: 13, margin: 0 }}>
                <CircleAlert size={16} style={{ display: "inline", marginRight: 6, verticalAlign: "middle" }} />
                {error}
              </p>
            )}

            <section className="registration-section">
              <div className="registration-section-heading">
                <span>01</span>
                <h2>Delegate details</h2>
              </div>
              <div className="registration-grid">
                <TextField label="Full name" name="name" placeholder="Your full name" />
                <TextField label="Email" name="email" type="email" placeholder="you@example.com" />
                <TextField label="Phone no." name="phone" type="tel" placeholder="+91 98765 43210" />
                <TextField label="School / College" name="school" placeholder="School or University name" />
                <TextField label="Class / Year / Grade" name="grade" placeholder="e.g. 11th Grade / 2nd Year" required={false} />
              </div>
            </section>

            <section className="registration-section">
              <div className="registration-section-heading">
                <span>02</span>
                <h2>Experience</h2>
              </div>
              <fieldset className="registration-choice-group">
                <legend>
                  Past MUN Experience <span aria-hidden="true">*</span>
                </legend>
                {["0-5", "5-12", "12-20", "20+"].map((item) => (
                  <label className="radio-row compact" key={item}>
                    <input type="radio" name="experience" value={item} defaultChecked={item === "0-5"} required />
                    <span>{item} conferences</span>
                  </label>
                ))}
              </fieldset>
            </section>

            <section className="registration-section">
              <div className="registration-section-heading">
                <span>03</span>
                <h2>Committee preferences</h2>
              </div>
              <CommitteeChoice title="Committee Preference 1" name="committee-one" />
              <CommitteeChoice title="Committee Preference 2" name="committee-two" />
            </section>

            <section className="registration-section">
              <div className="registration-section-heading">
                <span>04</span>
                <h2>Portfolio preferences</h2>
              </div>
              <div className="registration-grid">
                <TextField label="Portfolio Preference 1" name="portfolio-one" placeholder="Country / Portfolio 1" required={false} />
                <TextField label="Portfolio Preference 2" name="portfolio-two" placeholder="Country / Portfolio 2" required={false} />
              </div>
              <TextField label="Are you open to being assigned to any committee or portfolio if your top preferences are full?" name="flexible-assignment" placeholder="Yes / No" required={false} />
            </section>

            <section className="registration-section">
              <div className="registration-section-heading">
                <span>05</span>
                <h2>References</h2>
              </div>
              <TextField label="CA Reference (IF NO TYPE NIL)" name="ca-reference" required={false} placeholder="NIL" />
            </section>

            <section className="registration-section payment-section">
              <div className="registration-section-heading">
                <span>06</span>
                <h2>Payment & Verification</h2>
              </div>
              <p className="payment-note">
                <strong>Entry Fee: INR {publicEvent ? Number(publicEvent.amount).toFixed(2) : "2000.00"}</strong>
                <br />
                Scan the official Arkham MUN UPI QR poster below in any payment app (Google Pay, PhonePe, Paytm, etc.). Then enter the UPI Transaction Reference (UTR), upload your screenshot, and check the payment confirmation box.
              </p>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 28, alignItems: "start", marginTop: 18 }}>
                {/* Left Column: Full View QR Poster Card */}
                <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: 16, background: "rgba(5, 5, 12, .92)", border: "1px solid rgba(227, 38, 46, .4)", borderRadius: 10, boxShadow: "0 14px 40px rgba(0, 0, 0, .6), 0 0 24px rgba(227, 38, 46, .12)" }}>
                  <span style={{ color: "#e3262e", fontSize: 11, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase" }}>
                    Official UPI Payment QR
                  </span>
                  <Image
                    src={publicEvent?.paymentQrUrl ? entryPassApi.paymentQrUrl(publicEvent.paymentQrUrl) : "/payment-qr.jpeg"}
                    alt="Arkham MUN official UPI payment QR poster"
                    width={320}
                    height={480}
                    unoptimized
                    priority
                    style={{ width: "100%", height: "auto", aspectRatio: "2 / 3", objectFit: "contain", borderRadius: 8, background: "#000", border: "1px solid rgba(255, 255, 255, .15)" }}
                  />
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "10px 12px", background: "rgba(255, 255, 255, .05)", borderRadius: 5, fontSize: 12 }}>
                    <span>UPI ID: <code style={{ color: "#ffb5b8", fontFamily: "monospace", fontWeight: 700 }}>{upiId}</code></span>
                    <button type="button" onClick={copyUpi} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 10px", fontSize: 11, fontWeight: 700, background: "rgba(227, 38, 46, .2)", color: "#fff", border: "1px solid rgba(227, 38, 46, .5)", borderRadius: 3, cursor: "pointer" }}>
                      {copied ? <Check size={12} /> : <Copy size={12} />} {copied ? "Copied" : "Copy"}
                    </button>
                  </div>
                </div>

                {/* Right Column: UTR, Screenshot, and Confirmation Checkbox */}
                <div style={{ display: "grid", gap: 18 }}>
                  <div style={{ padding: "14px 16px", background: "rgba(255, 255, 255, .03)", border: "1px solid rgba(160, 150, 205, .16)", borderRadius: 8 }}>
                    <h3 style={{ margin: "0 0 6px", fontSize: 15, color: "#fff" }}>Transaction Reference & Proof</h3>
                    <p style={{ margin: 0, color: "#aaa8ba", fontSize: 12, lineHeight: 1.6 }}>
                      Once your UPI transfer is complete, submit your 12-digit UTR reference. The secretariat will review and approve your submission to issue your signed entry pass.
                    </p>
                  </div>

                  <TextField label="Transaction ID / UTR" name="transaction-id" placeholder="12-digit UPI transaction reference" />
                  
                  <label className="registration-field">
                    Screenshot of Payment <span>(optional, up to 5 MB)</span>
                    <input name="payment-proof" type="file" accept="image/jpeg,image/png,image/webp,image/gif,.pdf" />
                  </label>

                  <label style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "14px 16px", background: "rgba(227, 38, 46, .08)", border: "1px solid rgba(227, 38, 46, .35)", borderRadius: 6, cursor: "pointer", fontSize: 13, lineHeight: 1.5, color: "#e8e5f2" }}>
                    <input
                      type="checkbox"
                      name="paymentConfirmation"
                      required
                      checked={paymentConfirmed}
                      onChange={(event) => setPaymentConfirmed(event.target.checked)}
                      style={{ width: 18, height: 18, minHeight: 18, margin: "2px 0 0", accentColor: "#e3262e", cursor: "pointer", flex: "0 0 auto" }}
                    />
                    <span>
                      I confirm that I have transferred <strong>INR {publicEvent ? Number(publicEvent.amount).toFixed(2) : "2000.00"}</strong> via UPI to <code>{upiId}</code> and entered the genuine transaction reference (UTR) above.
                    </span>
                  </label>
                </div>
              </div>
            </section>

            <section className="registration-section">
              <div className="registration-section-heading">
                <span>07</span>
                <h2>Special requests / Notes</h2>
              </div>
              <label className="registration-field">
                <span className="sr-only">Message</span>
                <textarea name="message" placeholder="Any dietary restrictions, special accommodations, or notes for the secretariat" rows={4} />
              </label>
            </section>

            <button className="registration-submit" type="submit" disabled={busy || publicEvent?.registrationOpen !== true || !paymentConfirmed}>
              {busy ? (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                  <LoaderCircle className="spinner" size={16} /> Submitting registration…
                </span>
              ) : publicEvent?.registrationOpen === false ? (
                "Registration currently closed"
              ) : (
                "Submit registration & notify secretariat"
              )}
            </button>
          </form>
        )}
      </main>
    </ArkhamShell>
  )

}
