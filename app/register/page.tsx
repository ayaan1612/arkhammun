"use client"

import { FormEvent, useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import {
  ArrowRight,
  Check,
  CheckCircle2,
  CircleAlert,
  Clock3,
  Copy,
  LoaderCircle,
  LogIn,
  Shield,
  ShieldCheck,
  User,
  UserCheck,
  UserPlus,
} from "lucide-react"
import { ArkhamShell, PageIntro } from "@/components/arkham-shell"
import {
  EntryQrResponse,
  entryPassApi,
  PublicEvent,
  RegistrationStart,
  RegistrationStatus,
  UserRegistration,
} from "@/lib/entry-pass-api"
import { useAuth } from "@/lib/auth-context"

const committees = [
  "UNCSW (Advancing women's protection, leadership and rights in conflict zone with special emphasis on women)",
  "UNGA (Strengthening Nuclear Weapon-Free Zones with Focus on the Middle East and South Asia.)",
  "AIPPM (Use of Central Agencies (ED/CBI): Law Enforcement or Political Tool?)",
  "UNODC (Human Rights Implications of the Global War on Drugs.)",
  "UNHRC (Deliberating on Safeguarding Political Leaders Under International Human Rights Law.)",
  "IP",
  "IPL (Mega Auction)",
]

function TextField({
  label,
  name,
  type = "text",
  required = true,
  placeholder = "Short-answer text",
  defaultValue = "",
  readOnly = false,
  helpText = "",
}: {
  label: string
  name: string
  type?: string
  required?: boolean
  placeholder?: string
  defaultValue?: string
  readOnly?: boolean
  helpText?: string
}) {
  return (
    <label className="registration-field">
      <span style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>
          {label}
          {required && <span aria-hidden="true"> *</span>}
        </span>
        {helpText && <span style={{ color: "#aaa8ba", fontSize: "11px", fontWeight: "normal" }}>{helpText}</span>}
      </span>
      <input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        defaultValue={defaultValue}
        readOnly={readOnly}
        style={
          readOnly
            ? {
                backgroundColor: "rgba(255, 255, 255, 0.04)",
                color: "#e8e5f2",
                borderColor: "rgba(255, 255, 255, 0.15)",
                cursor: "not-allowed",
              }
            : undefined
        }
      />
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

const DEFAULT_EVENT: PublicEvent = {
  event: {
    name: "Arkham MUN",
    date: "24–25 October 2026",
    time: "9:00 AM – 5:00 PM",
    venue: "Central Delhi, India",
  },
  amount: 2200,
  upiId: "chauhan5408k@okaxis",
  paymentQrUrl: "/api/payment-qr.png",
  registrationOpen: true,
}

export default function RegisterPage() {
  const { user, token, isLoading: authLoading } = useAuth()
  const [publicEvent, setPublicEvent] = useState<PublicEvent>(DEFAULT_EVENT)
  const [registration, setRegistration] = useState<RegistrationStart | null>(null)
  const [status, setStatus] = useState<RegistrationStatus | null>(null)
  const [entryQr, setEntryQr] = useState<EntryQrResponse | null>(null)
  const [existingRegistration, setExistingRegistration] = useState<UserRegistration | null>(null)
  const [checkingExisting, setCheckingExisting] = useState(false)
  const [paymentConfirmed, setPaymentConfirmed] = useState(false)
  const [copied, setCopied] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")

  // 1. Fetch public event settings
  useEffect(() => {
    let active = true
    entryPassApi
      .getPublicEvent()
      .then((details) => {
        if (active) setPublicEvent(details)
      })
      .catch(() => {
        // Backend default remains active
      })
    return () => {
      active = false
    }
  }, [])

  // 2. If user is authenticated, check if they already registered for an event
  useEffect(() => {
    if (!token || !user) return
    let active = true
    setCheckingExisting(true)

    entryPassApi
      .getMyRegistrations(token)
      .then((res) => {
        if (!active) return
        const regs = res.registrations || []
        if (regs.length > 0) {
          // Found existing registration for this user
          setExistingRegistration(regs[0])
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setCheckingExisting(false)
      })

    return () => {
      active = false
    }
  }, [token, user])

  // 3. Polling for live status updates after payment submission
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
        // Silently retry
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
    if (!user || !token) {
      setError("Please sign in or create an account first to complete your registration.")
      return
    }

    const form = event.currentTarget
    const data = new FormData(form)

    const name = String(data.get("name") || user.name || "").trim()
    const email = String(data.get("email") || user.email || "").trim()
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

    if (!paymentConfirmed) {
      setError("Please confirm your payment transfer by checking the payment confirmation box in section 06.")
      return
    }

    setBusy(true)
    setError("")
    setNotice("")

    try {
      // 1. Create registration record (with authentication token)
      const created = await entryPassApi.createRegistration(
        {
          name,
          email,
          phone,
          organization: school,
          committee,
        },
        token
      )
      setRegistration(created)

      // 2. Submit payment proof
      const file = proofFile instanceof File && proofFile.size > 0 ? proofFile : undefined
      await entryPassApi.submitPaymentProof(created.id, utr, file)

      setStatus("payment_submitted")
      setNotice("Registration and payment proof submitted! Stored persistently in cloud database.")
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to complete registration. Please check your details and try again."
      )
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
          Complete your delegate registration and submit payment details. Once verified by the secretariat, your signed
          entry QR pass will be issued and emailed to you.
        </PageIntro>

        {/* Closed or Notice Banner */}
        {publicEvent && !publicEvent.registrationOpen && (
          <div
            style={{
              maxWidth: 980,
              margin: "0 auto 30px",
              padding: 20,
              border: "1px solid rgba(230, 165, 74, .4)",
              background: "rgba(230, 165, 74, .08)",
              borderRadius: 8,
            }}
          >
            <h3 style={{ color: "#ffd19c", margin: "0 0 6px", fontSize: 16 }}>Registration Notice</h3>
            <p style={{ margin: 0, color: "#d6d0e0", fontSize: 13, lineHeight: 1.6 }}>
              {publicEvent.registrationNotice ||
                "The secretariat is finalizing conference dates, venue, or registration is temporarily closed. Please check back shortly."}
            </p>
          </div>
        )}

        {/* Loading Authentication State */}
        {authLoading ? (
          <div style={{ minHeight: "45vh", display: "grid", placeItems: "center" }}>
            <LoaderCircle size={32} className="animate-spin" style={{ color: "#e3262e" }} />
          </div>
        ) : !user ? (
          /* =========================================================================
             AUTHENTICATION GATE:
             1st-time delegates must Sign Up before registering.
             Returning delegates must Sign In.
             ========================================================================= */
          <div
            className="contact-card"
            style={{
              maxWidth: "580px",
              margin: "30px auto 70px",
              background: "rgba(12, 12, 12, 0.94)",
              border: "1px solid rgba(255, 255, 255, 0.16)",
              borderRadius: "10px",
              padding: "44px 34px",
              textAlign: "center",
              boxShadow: "0 20px 50px rgba(0, 0, 0, 0.5), 0 0 30px rgba(227, 38, 46, 0.12)",
            }}
          >
            <div
              style={{
                width: 62,
                height: 62,
                borderRadius: "50%",
                background: "rgba(227, 38, 46, 0.14)",
                border: "1px solid rgba(227, 38, 46, 0.5)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "22px",
              }}
            >
              <Shield size={30} style={{ color: "#e3262e" }} />
            </div>

            <span className="section-kicker">ENROLLMENT PROTOCOL</span>
            <h2 style={{ fontSize: "28px", margin: "10px 0 12px", color: "#fff", fontWeight: 500 }}>
              Account Required to Register
            </h2>
            <p style={{ color: "#aaa8ba", fontSize: "14px", margin: "0 auto 28px", maxWidth: "460px", lineHeight: 1.6 }}>
              1st-time delegates must <strong>Sign Up</strong> to create an account before registering for an event. Once
              enrolled, you will only need to <strong>Sign In</strong> for this and any subsequent event.
            </p>

            <div style={{ display: "grid", gap: "12px", maxWidth: "420px", margin: "0 auto" }}>
              {/* 1st Time Users: Sign Up First */}
              <Link
                href="/signup?redirect=/register"
                className="primary-button arkham-nav-cta"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "10px",
                  padding: "15px 22px",
                  borderRadius: "4px",
                  fontSize: "13px",
                  fontWeight: 700,
                  letterSpacing: "0.04em",
                  textDecoration: "none",
                  background: "#e3262e",
                  color: "#fff",
                  boxShadow: "0 4px 20px rgba(227, 38, 46, 0.4)",
                }}
              >
                <UserPlus size={16} /> 1ST TIME? SIGN UP TO REGISTER <ArrowRight size={14} />
              </Link>

              {/* Returning Users: Sign In */}
              <Link
                href="/login?redirect=/register"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "10px",
                  padding: "13px 20px",
                  borderRadius: "4px",
                  fontSize: "13px",
                  fontWeight: 600,
                  textDecoration: "none",
                  background: "rgba(255, 255, 255, 0.04)",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  color: "#e8e4f3",
                  transition: "all 0.2s",
                }}
              >
                <LogIn size={15} style={{ color: "#e3262e" }} /> ALREADY HAVE AN ACCOUNT? SIGN IN
              </Link>
            </div>

            <div
              style={{
                marginTop: "26px",
                paddingTop: "18px",
                borderTop: "1px solid rgba(255, 255, 255, 0.1)",
                color: "#8d8a9e",
                fontSize: "12px",
                lineHeight: 1.5,
              }}
            >
              <strong>Conference Note:</strong> Creating your account securely binds your committee seat allocations,
              payment reviews, notifications, and signed entry passes to your personal delegate profile.
            </div>
          </div>
        ) : existingRegistration && !registration ? (
          /* =========================================================================
             ALREADY REGISTERED VIEW:
             If returning user has already registered for this event.
             ========================================================================= */
          <div
            className="contact-card"
            style={{
              maxWidth: "760px",
              margin: "20px auto 60px",
              background: "rgba(12, 12, 12, 0.94)",
              border: "1px solid rgba(227, 38, 46, 0.4)",
              borderRadius: "10px",
              padding: "32px 30px",
              boxShadow: "0 20px 50px rgba(0, 0, 0, 0.5), 0 0 30px rgba(227, 38, 46, 0.15)",
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: "50%",
                  background: "rgba(84, 189, 128, 0.15)",
                  border: "1px solid rgba(84, 189, 128, 0.4)",
                  display: "grid",
                  placeItems: "center",
                  flexShrink: 0,
                }}
              >
                <CheckCircle2 size={24} style={{ color: "#54bd80" }} />
              </div>
              <div style={{ flex: 1 }}>
                <span className="section-kicker">ALLOCATION ACTIVE</span>
                <h2 style={{ fontSize: "24px", margin: "4px 0 8px", color: "#fff", fontWeight: 500 }}>
                  You Are Already Registered for This Event
                </h2>
                <p style={{ color: "#aaa8ba", fontSize: "14px", margin: "0 0 18px", lineHeight: 1.5 }}>
                  Delegate: <strong>{user.name}</strong> (<code>{user.email}</code>)
                  <br />
                  Registration Status:{" "}
                  <strong
                    style={{
                      color: existingRegistration.status === "approved" ? "#54bd80" : "#ffd19c",
                      textTransform: "uppercase",
                    }}
                  >
                    {existingRegistration.status.replace("_", " ")}
                  </strong>
                  {existingRegistration.committee && (
                    <>
                      {" "}
                      · Committee: <strong>{existingRegistration.committee}</strong>
                    </>
                  )}
                </p>

                <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                  <Link
                    href="/dashboard"
                    className="primary-button arkham-nav-cta"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "12px 20px",
                      fontSize: "13px",
                      textDecoration: "none",
                    }}
                  >
                    View Entry Pass &amp; Updates in Dashboard <ArrowRight size={14} />
                  </Link>

                  <button
                    type="button"
                    onClick={() => setExistingRegistration(null)}
                    style={{
                      padding: "11px 18px",
                      background: "transparent",
                      border: "1px solid rgba(255, 255, 255, 0.18)",
                      borderRadius: "4px",
                      color: "#aaa8ba",
                      cursor: "pointer",
                      fontSize: "12px",
                    }}
                  >
                    Register Additional Delegate
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : status === "payment_submitted" || status === "approved" ? (
          /* =========================================================================
             POST-SUBMISSION / APPROVAL PASS VIEW
             ========================================================================= */
          <section
            style={{
              maxWidth: 980,
              margin: "0 auto 80px",
              padding: 32,
              border: "1px solid rgba(255,255,255,.16)",
              borderRadius: 12,
              background: "rgba(10,10,10,.86)",
            }}
          >
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
              <p
                style={{
                  padding: 12,
                  background: "rgba(84, 189, 128, .1)",
                  borderLeft: "3px solid #54bd80",
                  color: "#b5ecc8",
                  fontSize: 13,
                  margin: "0 0 20px",
                }}
              >
                {notice}
              </p>
            )}

            {status === "payment_submitted" && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  color: "#ffd19c",
                  fontSize: 13,
                  padding: 14,
                  background: "rgba(230, 165, 74, .08)",
                  borderRadius: 6,
                  marginBottom: 20,
                }}
              >
                <Clock3 size={18} />
                <span>
                  Your payment reference is being verified by the secretariat. This registration is saved permanently in
                  your dashboard.
                </span>
              </div>
            )}

            {status === "approved" && entryQr && (
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  gap: 24,
                  padding: 20,
                  border: "1px solid rgba(84, 189, 128, .35)",
                  background: "rgba(84, 189, 128, .07)",
                  borderRadius: 8,
                  marginBottom: 20,
                }}
              >
                <Image
                  src={entryQr.qr}
                  alt="Signed Event Entry QR Code"
                  width={160}
                  height={160}
                  unoptimized
                  style={{ background: "#fff", padding: 8, borderRadius: 6 }}
                />
                <div style={{ display: "grid", gap: 6 }}>
                  <strong style={{ fontSize: 18, color: "#fff" }}>{entryQr.event.name} Entry Pass</strong>
                  <span style={{ color: "#b5ecc8", fontSize: 13, fontWeight: 700 }}>VERIFIED · READY FOR CHECK-IN</span>
                  <span style={{ color: "#aaa8ba", fontSize: 13 }}>
                    {entryQr.event.date} · {entryQr.event.time}
                  </span>
                  <span style={{ color: "#aaa8ba", fontSize: 13 }}>{entryQr.event.venue}</span>
                  <span style={{ color: "#ffd19c", fontSize: 12, marginTop: 4 }}>
                    A copy of this signed pass has also been sent to your registered email address.
                  </span>
                </div>
              </div>
            )}

            <div style={{ display: "flex", gap: 12, marginTop: 16, flexWrap: "wrap" }}>
              <Link href="/dashboard" className="primary-button" style={{ display: "inline-flex", gap: 6 }}>
                View in Delegate Dashboard <ArrowRight size={14} />
              </Link>
              <button
                type="button"
                className="secondary-button"
                onClick={startOver}
                style={{
                  padding: "12px 18px",
                  background: "transparent",
                  color: "#aaa8ba",
                  border: "1px solid rgba(255,255,255,0.2)",
                  borderRadius: 4,
                  cursor: "pointer",
                  fontSize: 13,
                }}
              >
                Register Another Delegate
              </button>
            </div>
          </section>
        ) : (
          /* =========================================================================
             AUTHENTICATED REGISTRATION FORM
             User is signed in; pre-fills verified credentials and takes event details.
             ========================================================================= */
          <form className="registration-form" onSubmit={handleSubmit}>
            {/* Authenticated user banner */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 16px",
                background: "rgba(227, 38, 46, 0.08)",
                border: "1px solid rgba(227, 38, 46, 0.3)",
                borderRadius: "6px",
                marginBottom: "20px",
                flexWrap: "wrap",
                gap: "10px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <UserCheck size={16} style={{ color: "#e3262e" }} />
                <span style={{ fontSize: "13px", color: "#e8e5f2" }}>
                  Authenticated Delegate: <strong>{user?.name}</strong> (<code>{user?.email}</code>)
                </span>
              </div>
              <Link href="/dashboard" style={{ fontSize: "12px", color: "#e3262e", textDecoration: "underline" }}>
                My Dashboard →
              </Link>
            </div>

            {error && (
              <p
                style={{
                  padding: 12,
                  background: "rgba(227, 38, 46, .1)",
                  borderLeft: "3px solid #e3262e",
                  color: "#ffb5b8",
                  fontSize: 13,
                  margin: "0 0 20px",
                }}
              >
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
                <TextField
                  label="Full name"
                  name="name"
                  defaultValue={user?.name || ""}
                  placeholder="Your full name"
                  readOnly={true}
                  helpText="Bound to account"
                />
                <TextField
                  label="Email"
                  name="email"
                  type="email"
                  defaultValue={user?.email || ""}
                  placeholder="you@example.com"
                  readOnly={true}
                  helpText="Bound to account"
                />
                <TextField label="Phone no." name="phone" type="tel" placeholder="+91 98765 43210" />
                <TextField label="School / College" name="school" placeholder="School or University name" />
                <TextField
                  label="Class / Year / Grade"
                  name="grade"
                  placeholder="e.g. 11th Grade / 2nd Year"
                  required={false}
                />
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
                <TextField
                  label="Portfolio Preference 1"
                  name="portfolio-one"
                  placeholder="Country / Portfolio 1"
                  required={false}
                />
                <TextField
                  label="Portfolio Preference 2"
                  name="portfolio-two"
                  placeholder="Country / Portfolio 2"
                  required={false}
                />
              </div>
              <TextField
                label="Are you open to being assigned to any committee or portfolio if your top preferences are full?"
                name="flexible-assignment"
                placeholder="Yes / No"
                required={false}
              />
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
                <strong>Entry Fee: INR {publicEvent ? Number(publicEvent.amount).toFixed(2) : "2200.00"}</strong>
                <br />
                Scan the official Arkham MUN UPI QR poster below in any payment app (Google Pay, PhonePe, Paytm, etc.).
                Then enter the UPI Transaction Reference (UTR), upload your screenshot, and check the payment
                confirmation box.
              </p>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                  gap: 28,
                  alignItems: "start",
                  marginTop: 18,
                }}
              >
                {/* Left Column: Full View QR Poster Card */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 12,
                    padding: 16,
                    background: "rgba(5, 5, 12, .92)",
                    border: "1px solid rgba(227, 38, 46, .4)",
                    borderRadius: 10,
                    boxShadow: "0 14px 40px rgba(0, 0, 0, .6), 0 0 24px rgba(227, 38, 46, .12)",
                  }}
                >
                  <span
                    style={{
                      color: "#e3262e",
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: ".12em",
                      textTransform: "uppercase",
                    }}
                  >
                    Official UPI Payment QR
                  </span>
                  <Image
                    src={publicEvent?.paymentQrUrl ? entryPassApi.paymentQrUrl(publicEvent.paymentQrUrl) : "/payment-qr.jpeg"}
                    alt="Arkham MUN official UPI payment QR poster"
                    width={320}
                    height={480}
                    unoptimized
                    priority
                    style={{
                      width: "100%",
                      height: "auto",
                      aspectRatio: "2 / 3",
                      objectFit: "contain",
                      borderRadius: 8,
                      background: "#000",
                      border: "1px solid rgba(255, 255, 255, .15)",
                    }}
                  />
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 8,
                      padding: "10px 12px",
                      background: "rgba(255, 255, 255, .05)",
                      borderRadius: 5,
                      fontSize: 12,
                    }}
                  >
                    <span>
                      UPI ID:{" "}
                      <code style={{ color: "#ffb5b8", fontFamily: "monospace", fontWeight: 700 }}>{upiId}</code>
                    </span>
                    <button
                      type="button"
                      onClick={copyUpi}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 5,
                        padding: "5px 10px",
                        fontSize: 11,
                        fontWeight: 700,
                        background: "rgba(227, 38, 46, .2)",
                        color: "#fff",
                        border: "1px solid rgba(227, 38, 46, .5)",
                        borderRadius: 3,
                        cursor: "pointer",
                      }}
                    >
                      {copied ? <Check size={12} /> : <Copy size={12} />} {copied ? "Copied" : "Copy"}
                    </button>
                  </div>
                </div>

                {/* Right Column: UTR, Screenshot, and Confirmation Checkbox */}
                <div style={{ display: "grid", gap: 18 }}>
                  <div
                    style={{
                      padding: "14px 16px",
                      background: "rgba(255, 255, 255, .03)",
                      border: "1px solid rgba(160, 150, 205, .16)",
                      borderRadius: 8,
                    }}
                  >
                    <h3 style={{ margin: "0 0 6px", fontSize: 15, color: "#fff" }}>Transaction Reference &amp; Proof</h3>
                    <p style={{ margin: 0, color: "#aaa8ba", fontSize: 12, lineHeight: 1.6 }}>
                      Once your UPI transfer is complete, submit your 12-digit UTR reference. The secretariat will review
                      and approve your submission to issue your signed entry pass.
                    </p>
                  </div>

                  <TextField
                    label="Transaction ID / UTR"
                    name="transaction-id"
                    placeholder="12-digit UPI transaction reference"
                  />

                  <label className="registration-field">
                    Screenshot of Payment <span>(optional, up to 5 MB)</span>
                    <input name="payment-proof" type="file" accept="image/jpeg,image/png,image/webp,image/gif,.pdf" />
                  </label>

                  <label
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 12,
                      padding: "14px 16px",
                      background: "rgba(227, 38, 46, .08)",
                      border: "1px solid rgba(227, 38, 46, .35)",
                      borderRadius: 6,
                      cursor: "pointer",
                      fontSize: 13,
                      lineHeight: 1.5,
                      color: "#e8e5f2",
                    }}
                  >
                    <input
                      type="checkbox"
                      name="paymentConfirmation"
                      required
                      checked={paymentConfirmed}
                      onChange={(event) => setPaymentConfirmed(event.target.checked)}
                      style={{
                        width: 18,
                        height: 18,
                        minHeight: 18,
                        margin: "2px 0 0",
                        accentColor: "#e3262e",
                        cursor: "pointer",
                        flex: "0 0 auto",
                      }}
                    />
                    <span>
                      I confirm that I have transferred{" "}
                      <strong>INR {publicEvent ? Number(publicEvent.amount).toFixed(2) : "2200.00"}</strong> via UPI to{" "}
                      <code>{upiId}</code> and entered the genuine transaction reference (UTR) above.
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
                <textarea
                  name="message"
                  placeholder="Any dietary restrictions, special accommodations, or notes for the secretariat"
                  rows={4}
                />
              </label>
            </section>

            <button
              className="registration-submit"
              type="submit"
              disabled={busy || publicEvent?.registrationOpen === false}
            >
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
