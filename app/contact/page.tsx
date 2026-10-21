"use client"

import { FormEvent, useState } from "react"
import { Check, CircleAlert, LoaderCircle, Send } from "lucide-react"
import { ArkhamShell, PageIntro } from "@/components/arkham-shell"
import { arkham } from "@/lib/arkham-data"
import { entryPassApi } from "@/lib/entry-pass-api"

export default function ContactPage() {
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [queryId, setQueryId] = useState("")
  const [error, setError] = useState("")

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)

    const name = String(data.get("name") || "").trim()
    const email = String(data.get("email") || "").trim()
    const phone = String(data.get("phone") || "").trim()
    const subject = String(data.get("subject") || "").trim()
    const message = String(data.get("message") || "").trim()

    if (!name || !email || !subject || !message) {
      setError("Please complete all required fields.")
      return
    }

    setBusy(true)
    setError("")

    try {
      const res = await entryPassApi.submitContactQuery({
        name,
        email,
        phone: phone || undefined,
        subject,
        message,
      })
      setQueryId(res.id)
      setSent(true)
      if (typeof window !== "undefined") {
        localStorage.setItem("arkham_delegate_email", email.toLowerCase())
        localStorage.setItem("arkham_last_query_id", res.id)
        window.dispatchEvent(new Event("arkham_notification_update"))
      }
      form.reset()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to deliver your enquiry. Please check your connection.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <ArkhamShell>
      <main>
        <PageIntro eyebrow="05 / Contact" title={<>Start a <em>conversation.</em></>}>
          Have a question about Arkham MUN registration, committees, or delegate logistics? Reach the secretariat directly below.
        </PageIntro>

        <section className="page-section contact-grid">
          <aside className="contact-card">
            <span className="section-kicker">Contact information</span>
            <h2>Find the <em>secretariat.</em></h2>
            <a href={`mailto:${arkham.email}`}>
              Email<br />
              <strong>{arkham.email}</strong>
            </a>
            <a href={`tel:${arkham.phone}`}>
              Phone<br />
              <strong>{arkham.phone}</strong>
            </a>
            <a href="https://instagram.com/arkhammun" target="_blank" rel="noreferrer">
              Social media<br />
              <strong>{arkham.instagram}</strong>
            </a>
            <p>
              Location<br />
              <strong>{arkham.location}</strong>
            </p>
          </aside>

          <div className="contact-form-container">
            {sent ? (
              <div
                style={{
                  padding: "36px 32px",
                  background: "rgba(5, 5, 12, 0.95)",
                  border: "1px solid rgba(46, 204, 113, 0.4)",
                  borderRadius: 12,
                  boxShadow: "0 18px 45px rgba(0, 0, 0, 0.6)",
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 56,
                    height: 56,
                    borderRadius: "50%",
                    background: "rgba(46, 204, 113, 0.15)",
                    color: "#2ecc71",
                    marginBottom: 16,
                  }}
                >
                  <Check size={28} />
                </div>
                <h3 style={{ margin: "0 0 8px", fontSize: 22, color: "#fff" }}>Enquiry Received</h3>
                <p style={{ margin: "0 0 16px", color: "#b5b0cd", fontSize: 14, lineHeight: 1.6 }}>
                  Thank you for reaching out. Your query has been logged in the Secretariat dashboard. A secretariat member will review your message and reply directly to your email address.
                </p>
                {queryId && (
                  <p style={{ fontSize: 12, color: "#8a85a4", fontFamily: "monospace", marginBottom: 24 }}>
                    Reference ID: {queryId}
                  </p>
                )}
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => setSent(false)}
                  style={{ margin: "0 auto" }}
                >
                  Send another message
                </button>
              </div>
            ) : (
              <form className="contact-form" onSubmit={submit}>
                <span className="section-kicker">Send us a message</span>
                <h2>What is on your <em>mind?</em></h2>

                {error && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "10px 14px",
                      background: "rgba(231, 76, 60, 0.15)",
                      border: "1px solid rgba(231, 76, 60, 0.4)",
                      borderRadius: 6,
                      color: "#ff7675",
                      fontSize: 13,
                      marginBottom: 14,
                    }}
                  >
                    <CircleAlert size={16} />
                    <span>{error}</span>
                  </div>
                )}

                <label>
                  Full name *
                  <input name="name" required maxLength={120} placeholder="Your full name" />
                </label>

                <label>
                  Email address *
                  <input name="email" type="email" required maxLength={200} placeholder="you@example.com" />
                </label>

                <label>
                  Contact phone number (optional)
                  <input name="phone" type="tel" maxLength={40} placeholder="+91 98765 43210" />
                </label>

                <label>
                  Subject *
                  <select name="subject" defaultValue="" required>
                    <option value="" disabled>Select a subject</option>
                    <option value="Registration & Payment">Registration & Payment</option>
                    <option value="Committee Allotment">Committee Allotment & Agendas</option>
                    <option value="Venue & Logistics">Venue, Dates & Logistics</option>
                    <option value="Delegation Bulk Registration">School / College Delegation</option>
                    <option value="General Enquiry">General Enquiry</option>
                  </select>
                </label>

                <label>
                  Message *
                  <textarea name="message" rows={5} required maxLength={2500} placeholder="How can the Secretariat assist you?" />
                </label>

                <button className="primary-button" type="submit" disabled={busy}>
                  {busy ? (
                    <>
                      <LoaderCircle className="spin" size={16} style={{ animation: "spin 1s linear infinite" }} />
                      Delivering enquiry…
                    </>
                  ) : (
                    <>
                      <Send size={15} />
                      Send message
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </section>
      </main>
    </ArkhamShell>
  )
}
