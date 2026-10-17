"use client"

import { FormEvent, useEffect, useState } from "react"
import Image from "next/image"
import { ArrowRight, Check, Copy, LoaderCircle, ShieldCheck, X } from "lucide-react"
import { EntryQrResponse, entryPassApi, PublicEvent, RegistrationStart, RegistrationStatus } from "@/lib/entry-pass-api"
import styles from "./entry-registration-flow.module.css"

type Props = {
  isOpen: boolean
  onClose: () => void
}

const statusLabels: Record<RegistrationStatus, string> = {
  pending_payment: "Payment not submitted",
  payment_submitted: "Payment under review",
  approved: "Approved for entry",
  rejected: "Payment proof rejected",
}

export function EntryRegistrationFlow({ isOpen, onClose }: Props) {
  const [registration, setRegistration] = useState<RegistrationStart | null>(null)
  const [status, setStatus] = useState<RegistrationStatus | null>(null)
  const [entryQr, setEntryQr] = useState<EntryQrResponse | null>(null)
  const [publicEvent, setPublicEvent] = useState<PublicEvent | null>(null)
  const [paymentConfirmed, setPaymentConfirmed] = useState(false)
  const [copied, setCopied] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")

  useEffect(() => {
    if (!isOpen || !registration || !status || status === "approved" || status === "rejected") return
    let active = true
    const refresh = async () => {
      try {
        const result = await entryPassApi.getRegistration(registration.id)
        if (!active) return
        setStatus(result.status)
        if (result.status === "approved") setEntryQr(await entryPassApi.getEntryQr(registration.id))
      } catch (requestError) {
        if (active) setError(requestError instanceof Error ? requestError.message : "Unable to refresh registration status.")
      }
    }
    const timer = window.setInterval(refresh, 8000)
    return () => {
      active = false
      window.clearInterval(timer)
    }
  }, [isOpen, registration, status])

  useEffect(() => {
    if (!isOpen) return
    let active = true
    entryPassApi.getPublicEvent().then((details) => {
      if (active) setPublicEvent(details)
    }).catch((requestError) => {
      if (active) setError(requestError instanceof Error ? requestError.message : "Unable to load event details.")
    })
    return () => { active = false }
  }, [isOpen])

  if (!isOpen) return null

  async function handleRegistration(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    setBusy(true)
    setError("")
    setNotice("")
    try {
      const created = await entryPassApi.createRegistration({
        name: String(data.get("name")),
        email: String(data.get("email")),
        phone: String(data.get("phone")),
        organization: String(data.get("organization")),
        committee: String(data.get("committee")),
      })
      setRegistration(created)
      setStatus("pending_payment")
      setNotice("Registration created. Pay using the QR below, then submit your UTR.")
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to create registration.")
    } finally {
      setBusy(false)
    }
  }

  async function handleProof(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!registration) return
    const form = event.currentTarget
    const data = new FormData(form)
    const file = data.get("screenshot")
    setBusy(true)
    setError("")
    setNotice("")
    try {
      await entryPassApi.submitPaymentProof(registration.id, String(data.get("utr")), file instanceof File && file.size ? file : undefined)
      setStatus("payment_submitted")
      setNotice("Payment reference received. The event team will review it shortly.")
      form.reset()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to submit payment proof.")
    } finally {
      setBusy(false)
    }
  }

  async function refreshStatus() {
    if (!registration) return
    setBusy(true)
    setError("")
    try {
      const result = await entryPassApi.getRegistration(registration.id)
      setStatus(result.status)
      if (result.status === "approved") setEntryQr(await entryPassApi.getEntryQr(registration.id))
      setNotice(`Status refreshed: ${statusLabels[result.status]}.`)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to refresh registration status.")
    } finally {
      setBusy(false)
    }
  }

  function startAgain() {
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
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section className={`registration-modal ${styles.modal} ${registration ? styles.modalWide : ""}`} role="dialog" aria-modal="true" aria-labelledby="entry-registration-title">
        <button className="modal-close" onClick={onClose} aria-label="Close registration"><X size={18} /></button>
        {!registration ? (
          <>
            <ShieldCheck size={30} className="modal-icon" />
            <h2 id="entry-registration-title">Reserve your seat.</h2>
            <p>Complete your delegate details before payment. Your signed entry pass will be issued after an admin verifies your payment.</p>
            {publicEvent?.registrationOpen && <p className={styles.eventSummary}><strong>{publicEvent.event.name}</strong><span>{publicEvent.event.date} · {publicEvent.event.time}</span><span>{publicEvent.event.venue}</span><span>Entry fee · INR {Number(publicEvent.amount).toFixed(2)}</span></p>}
            {publicEvent && !publicEvent.registrationOpen && (
              <div className={styles.setupNotice}>
                <strong>Registration Notice</strong>
                <p>{publicEvent.registrationNotice || "The secretariat is finalizing conference dates, venue, or registration is temporarily closed."}</p>
                <a href="/admin" className={styles.adminActionLink}>Open Admin Dashboard <ArrowRight size={14} /></a>
              </div>
            )}
            <form onSubmit={handleRegistration}>
              <label>Full name<input required name="name" autoComplete="name" maxLength={120} placeholder="Your full name" /></label>
              <label>Email address<input required type="email" name="email" autoComplete="email" maxLength={200} placeholder="you@example.com" /></label>
              <label>Phone number<input required type="tel" name="phone" autoComplete="tel" maxLength={40} placeholder="Your contact number" /></label>
              <label>School / organization<input required name="organization" maxLength={160} placeholder="Your school or organization" /></label>
              <label>Committee<input required name="committee" maxLength={160} placeholder="Committee preference" /></label>
              <button className="modal-submit" type="submit" disabled={busy || publicEvent?.registrationOpen !== true}>{busy ? <LoaderCircle className={styles.spinner} size={17} /> : null}{busy ? "Creating registration" : publicEvent ? publicEvent.registrationOpen ? "Continue registration" : "Registration unavailable" : "Loading event details"}<ArrowRight size={17} /></button>
            </form>
          </>
        ) : (
          <>
            <div className={styles.flowHeading}><span className="eyebrow">Entry registration</span><h2 id="entry-registration-title">{status === "approved" ? "You are cleared." : status === "rejected" ? "Let’s try again." : "Your payment pass."}</h2></div>
            <p className={styles.statusLine}><span className={`${styles.statusDot} ${status === "approved" ? styles.approved : status === "rejected" ? styles.rejected : ""}`} />{status ? statusLabels[status] : "Preparing registration"} · INR {Number(registration.amount).toFixed(2)}</p>
            {(status === "pending_payment" || status === "rejected") && (
              <div className={styles.paymentBlock}>
                <div>
                  <h3>{status === "rejected" ? "Submit corrected payment proof" : "Pay the entry fee"}</h3>
                  <p>Scan the official Arkham MUN UPI QR in any payment app. Then enter your UTR reference, confirm payment completion, and submit proof below.</p>
                </div>

                <div className={styles.paymentGrid}>
                  {/* Left Column: Full View QR Poster */}
                  <div className={styles.qrPosterCard}>
                    <Image
                      className={styles.fullViewPoster}
                      src={publicEvent?.paymentQrUrl ? entryPassApi.paymentQrUrl(publicEvent.paymentQrUrl) : "/payment-qr.jpeg"}
                      alt="Arkham MUN official UPI payment QR poster"
                      width={320}
                      height={480}
                      unoptimized
                      priority
                    />
                    <div className={styles.upiRow}>
                      <span>UPI ID: <code>{upiId}</code></span>
                      <button type="button" className={styles.copyButton} onClick={copyUpi} title="Copy UPI ID">
                        {copied ? <Check size={12} /> : <Copy size={12} />} {copied ? "Copied" : "Copy"}
                      </button>
                    </div>
                  </div>

                  {/* Right Column: UTR, Screenshot, and Checkbox besides the QR */}
                  <form className={styles.proofForm} onSubmit={handleProof}>
                    <label>
                      Transaction reference (UTR)
                      <input required name="utr" maxLength={120} autoComplete="off" placeholder="Enter 12-digit UPI transaction reference" />
                    </label>
                    <label>
                      Payment screenshot <span>(optional, up to 5 MB)</span>
                      <input type="file" name="screenshot" accept="image/jpeg,image/png,image/webp,image/gif" />
                    </label>

                    <label className={styles.checkboxRow}>
                      <input
                        type="checkbox"
                        required
                        checked={paymentConfirmed}
                        onChange={(event) => setPaymentConfirmed(event.target.checked)}
                      />
                      <span>
                        I confirm that I have transferred <strong>INR {Number(registration.amount).toFixed(2)}</strong> via UPI to <code>chauhan5408k@okaxis</code> and entered the genuine transaction reference (UTR) above.
                      </span>
                    </label>

                    <button className="modal-submit" type="submit" disabled={busy || !paymentConfirmed}>
                      {busy ? <LoaderCircle className={styles.spinner} size={17} /> : null}
                      {busy ? "Submitting proof…" : status === "rejected" ? "Resubmit payment proof" : "Submit payment proof & notify secretariat"}
                      <ArrowRight size={17} />
                    </button>
                  </form>
                </div>
              </div>
            )}
            {(status === "payment_submitted" || status === "approved") && <div className={styles.statusBlock}>
              <p>{status === "approved" ? "Your entry QR is ready and has also been emailed to you. Show it to the event team at the gate; it can only be scanned once." : "Your UTR is with the event team for review. This status refreshes automatically."}</p>
              {entryQr && <div className={styles.entryPass}><Image src={entryQr.qr} alt="Your signed event entry QR code" width={128} height={128} unoptimized /><div><strong>{entryQr.event.name} entry pass</strong><small>Registration ID: {entryQr.registrationId}</small><small>{entryQr.event.date} · {entryQr.event.time}</small><small>{entryQr.event.venue}</small><small>Keep this QR ready for venue check-in.</small></div></div>}
              {status === "approved" && <button type="button" className={styles.refreshButton} onClick={startAgain}>Register another delegate</button>}
              {status === "payment_submitted" && <button type="button" className={styles.refreshButton} disabled={busy} onClick={refreshStatus}>{busy ? "Refreshing…" : "Refresh status"}</button>}
            </div>}
            {status === "rejected" && <p className={styles.rejectedNote}>The previous proof was not approved. Submit the corrected UTR or screenshot above; the event team will review it again.</p>}
            {notice && <p className={styles.notice} role="status">{notice}</p>}
            {status === "rejected" && <button className={styles.textButton} type="button" onClick={startAgain}>Start a new registration instead</button>}
          </>
        )}
        {error && <p className={styles.error} role="alert">{error}</p>}
        {!registration && <a className={styles.adminLink} href="/admin">Admin dashboard <ArrowRight size={14} /></a>}
      </section>
    </div>
  )
}