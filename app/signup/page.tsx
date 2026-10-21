"use client"

import { FormEvent, Suspense, useState, useEffect } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Eye, EyeOff, LoaderCircle, Lock, Mail, ShieldAlert, User, ArrowRight, CheckCircle2 } from "lucide-react"
import { ArkhamShell, PageIntro } from "@/components/arkham-shell"
import { useAuth } from "@/lib/auth-context"

function SignupForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTarget = searchParams.get("redirect") || ""

  const { signup, user, isLoading: authLoading } = useAuth()

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [validationErrors, setValidationErrors] = useState<{
    name?: string
    email?: string
    password?: string
    confirmPassword?: string
  }>({})

  // If already logged in, redirect immediately
  useEffect(() => {
    if (!authLoading && user) {
      if (user.role === "admin") {
        router.replace(redirectTarget || "/admin")
      } else {
        router.replace(redirectTarget || "/dashboard")
      }
    }
  }, [user, authLoading, router, redirectTarget])

  function validate() {
    const errors: {
      name?: string
      email?: string
      password?: string
      confirmPassword?: string
    } = {}

    if (!name.trim()) {
      errors.name = "Please provide your full legal name as it appears on your ID."
    }
    if (!email.trim()) {
      errors.email = "Please enter your email address."
    } else if (!email.includes("@") || !email.includes(".")) {
      errors.email = "Please enter a valid email address."
    }
    if (!password) {
      errors.password = "Password is required."
    } else if (password.length < 6) {
      errors.password = "Password must be at least 6 characters long."
    }
    if (password !== confirmPassword) {
      errors.confirmPassword = "Passwords do not match."
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError("")
    if (!validate()) return

    setLoading(true)
    try {
      const createdUser = await signup(name.trim(), email.trim(), password)
      if (createdUser.role === "admin") {
        router.push(redirectTarget || "/admin")
      } else {
        router.push(redirectTarget || "/dashboard")
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create account. Please try again."
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <PageIntro
        eyebrow="DELEGATE ENROLLMENT"
        title={
          <>
            Create Delegate <em>Account</em>
          </>
        }
      >
        Establish your persistent Arkham credentials to register for committees, submit delegate verification, and
        receive real-time updates.
      </PageIntro>

      <div className="page-section" style={{ minHeight: "60vh", display: "flex", justifyContent: "center" }}>
        <div
          className="contact-card"
          style={{
            width: "100%",
            maxWidth: "480px",
            background: "rgba(12, 12, 12, 0.94)",
            border: "1px solid rgba(255, 255, 255, 0.16)",
            borderRadius: "8px",
            padding: "36px 32px",
            boxShadow: "0 18px 48px rgba(0, 0, 0, 0.4)",
          }}
        >
          <div style={{ marginBottom: "26px" }}>
            <span className="section-kicker">SECURE CONFERENCE CREDENTIALS</span>
            <h2 style={{ fontSize: "28px", margin: "10px 0 6px", fontWeight: 500 }}>
              Join <em>Arkham MUN</em>
            </h2>
            <p style={{ color: "#aaa8ba", fontSize: "13px", margin: 0, lineHeight: 1.5 }}>
              Your account keeps your registrations, payment approvals, entry passes, and notifications permanently
              stored in the cloud.
            </p>
          </div>

          {error && (
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "10px",
                padding: "12px 14px",
                backgroundColor: "rgba(227, 38, 46, 0.12)",
                border: "1px solid rgba(227, 38, 46, 0.5)",
                borderRadius: "5px",
                color: "#ff8288",
                fontSize: "13px",
                marginBottom: "20px",
                lineHeight: 1.4,
              }}
            >
              <ShieldAlert size={16} style={{ flexShrink: 0, marginTop: "2px", color: "#e3262e" }} />
              <div>{error}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: "grid", gap: "16px" }}>
            <label style={{ display: "grid", gap: "8px", color: "#e8e4f3", fontSize: "12px" }}>
              <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <User size={13} style={{ color: "#e3262e" }} /> FULL NAME (AS ON ID)
              </span>
              <input
                type="text"
                placeholder="e.g. Elena Rostova"
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
                  if (validationErrors.name) setValidationErrors({ ...validationErrors, name: undefined })
                }}
                disabled={loading}
                autoComplete="name"
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: "13px 14px",
                  color: "#fff",
                  backgroundColor: "#080808",
                  border: validationErrors.name ? "1px solid #e3262e" : "1px solid rgba(255, 255, 255, 0.25)",
                  borderRadius: "4px",
                  outline: "none",
                  fontSize: "14px",
                }}
              />
              {validationErrors.name && (
                <span style={{ color: "#ff424b", fontSize: "11px" }}>{validationErrors.name}</span>
              )}
            </label>

            <label style={{ display: "grid", gap: "8px", color: "#e8e4f3", fontSize: "12px" }}>
              <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <Mail size={13} style={{ color: "#e3262e" }} /> OFFICIAL EMAIL ADDRESS
              </span>
              <input
                type="email"
                placeholder="delegate@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (validationErrors.email) setValidationErrors({ ...validationErrors, email: undefined })
                }}
                disabled={loading}
                autoComplete="email"
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: "13px 14px",
                  color: "#fff",
                  backgroundColor: "#080808",
                  border: validationErrors.email ? "1px solid #e3262e" : "1px solid rgba(255, 255, 255, 0.25)",
                  borderRadius: "4px",
                  outline: "none",
                  fontSize: "14px",
                }}
              />
              {validationErrors.email && (
                <span style={{ color: "#ff424b", fontSize: "11px" }}>{validationErrors.email}</span>
              )}
            </label>

            <label style={{ display: "grid", gap: "8px", color: "#e8e4f3", fontSize: "12px" }}>
              <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <Lock size={13} style={{ color: "#e3262e" }} /> CHOOSE PASSWORD
              </span>
              <div style={{ position: "relative" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    if (validationErrors.password) setValidationErrors({ ...validationErrors, password: undefined })
                  }}
                  disabled={loading}
                  autoComplete="new-password"
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    padding: "13px 44px 13px 14px",
                    color: "#fff",
                    backgroundColor: "#080808",
                    border: validationErrors.password ? "1px solid #e3262e" : "1px solid rgba(255, 255, 255, 0.25)",
                    borderRadius: "4px",
                    outline: "none",
                    fontSize: "14px",
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  style={{
                    position: "absolute",
                    right: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: 0,
                    color: "#8d8a9e",
                    cursor: "pointer",
                    padding: "4px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {validationErrors.password && (
                <span style={{ color: "#ff424b", fontSize: "11px" }}>{validationErrors.password}</span>
              )}
            </label>

            <label style={{ display: "grid", gap: "8px", color: "#e8e4f3", fontSize: "12px" }}>
              <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <CheckCircle2 size={13} style={{ color: "#e3262e" }} /> CONFIRM PASSWORD
              </span>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Re-type your password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value)
                  if (validationErrors.confirmPassword)
                    setValidationErrors({ ...validationErrors, confirmPassword: undefined })
                }}
                disabled={loading}
                autoComplete="new-password"
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: "13px 14px",
                  color: "#fff",
                  backgroundColor: "#080808",
                  border: validationErrors.confirmPassword ? "1px solid #e3262e" : "1px solid rgba(255, 255, 255, 0.25)",
                  borderRadius: "4px",
                  outline: "none",
                  fontSize: "14px",
                }}
              />
              {validationErrors.confirmPassword && (
                <span style={{ color: "#ff424b", fontSize: "11px" }}>{validationErrors.confirmPassword}</span>
              )}
            </label>

            <button
              type="submit"
              disabled={loading}
              className="primary-button"
              style={{
                width: "100%",
                marginTop: "12px",
                padding: "14px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                opacity: loading ? 0.75 : 1,
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              {loading ? (
                <>
                  <LoaderCircle size={16} className="animate-spin" /> CREATING DELEGATE ACCOUNT...
                </>
              ) : (
                <>
                  REGISTER DELEGATE ACCOUNT <ArrowRight size={14} />
                </>
              )}
            </button>
          </form>

          <div
            style={{
              marginTop: "24px",
              paddingTop: "20px",
              borderTop: "1px solid rgba(255, 255, 255, 0.12)",
              textAlign: "center",
              fontSize: "13px",
              color: "#aaa8ba",
            }}
          >
            Already have an account?{" "}
            <Link
              href={`/login${redirectTarget ? `?redirect=${encodeURIComponent(redirectTarget)}` : ""}`}
              style={{ color: "#e3262e", fontWeight: 600, textDecoration: "none" }}
            >
              Sign In to Portal
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}

export default function SignupPage() {
  return (
    <ArkhamShell>
      <Suspense
        fallback={
          <div style={{ minHeight: "60vh", display: "grid", placeItems: "center", color: "#aaa8ba" }}>
            <LoaderCircle size={32} className="animate-spin" style={{ color: "#e3262e" }} />
          </div>
        }
      >
        <SignupForm />
      </Suspense>
    </ArkhamShell>
  )
}
