"use client"

import { FormEvent, Suspense, useState, useEffect } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Eye, EyeOff, LoaderCircle, Lock, Mail, ShieldAlert, ArrowRight } from "lucide-react"
import { ArkhamShell, PageIntro } from "@/components/arkham-shell"
import { useAuth } from "@/lib/auth-context"

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTarget = searchParams.get("redirect") || ""

  const { login, user, isLoading: authLoading } = useAuth()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [validationErrors, setValidationErrors] = useState<{ email?: string; password?: string }>({})

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
    const errors: { email?: string; password?: string } = {}
    if (!email.trim()) {
      errors.email = "Please enter your registered email address."
    } else if (!email.includes("@") || !email.includes(".")) {
      errors.email = "Please enter a valid email address."
    }
    if (!password) {
      errors.password = "Please enter your account password."
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
      const loggedInUser = await login(email.trim(), password)
      if (loggedInUser.role === "admin") {
        router.push(redirectTarget || "/admin")
      } else {
        router.push(redirectTarget || "/dashboard")
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to sign in. Please verify your credentials."
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <PageIntro
        eyebrow="AUTHENTICATION PORTAL"
        title={
          <>
            Delegate &amp; <em>Admin</em> Login
          </>
        }
      >
        Sign in to access your registered events, official venue entry passes, committee assignments, and conference
        announcements.
      </PageIntro>

      <div className="page-section" style={{ minHeight: "60vh", display: "flex", justifyContent: "center" }}>
        <div
          className="contact-card"
          style={{
            width: "100%",
            maxWidth: "460px",
            background: "rgba(12, 12, 12, 0.94)",
            border: "1px solid rgba(255, 255, 255, 0.16)",
            borderRadius: "8px",
            padding: "36px 32px",
            boxShadow: "0 18px 48px rgba(0, 0, 0, 0.4)",
          }}
        >
          <div style={{ marginBottom: "26px" }}>
            <span className="section-kicker">SECURE DELEGATE DAIS</span>
            <h2 style={{ fontSize: "28px", margin: "10px 0 6px", fontWeight: 500 }}>
              Access <em>Portal</em>
            </h2>
            <p style={{ color: "#aaa8ba", fontSize: "13px", margin: 0, lineHeight: 1.5 }}>
              Use your registered credentials to sign in. Administrators will be automatically redirected to the Command Dais.
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

          <form onSubmit={handleSubmit} style={{ display: "grid", gap: "18px" }}>
            <label style={{ display: "grid", gap: "8px", color: "#e8e4f3", fontSize: "12px" }}>
              <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <Mail size={13} style={{ color: "#e3262e" }} /> EMAIL ADDRESS
              </span>
              <input
                type="email"
                placeholder="delegate@arkhammun.org"
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
                <Lock size={13} style={{ color: "#e3262e" }} /> PASSWORD
              </span>
              <div style={{ position: "relative" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    if (validationErrors.password) setValidationErrors({ ...validationErrors, password: undefined })
                  }}
                  disabled={loading}
                  autoComplete="current-password"
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

            <button
              type="submit"
              disabled={loading}
              className="primary-button"
              style={{
                width: "100%",
                marginTop: "10px",
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
                  <LoaderCircle size={16} className="animate-spin" /> VERIFYING CREDENTIALS...
                </>
              ) : (
                <>
                  SIGN IN TO PORTAL <ArrowRight size={14} />
                </>
              )}
            </button>
          </form>

          <div
            style={{
              marginTop: "24px",
              paddingTop: "20px",
              borderTop: "1px solid rgba(255, 255, 255, 0.12)",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
              textAlign: "center",
              fontSize: "13px",
              color: "#aaa8ba",
            }}
          >
            <div>
              Don&apos;t have an account yet?{" "}
              <Link
                href={`/signup${redirectTarget ? `?redirect=${encodeURIComponent(redirectTarget)}` : ""}`}
                style={{ color: "#e3262e", fontWeight: 600, textDecoration: "none" }}
              >
                Sign Up as Delegate
              </Link>
            </div>
            <div>
              <Link href="/contact" style={{ color: "#8d8a9e", textDecoration: "none", fontSize: "12px" }}>
                Need help accessing your pass or account? Contact Secretariat
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default function LoginPage() {
  return (
    <ArkhamShell>
      <Suspense
        fallback={
          <div style={{ minHeight: "60vh", display: "grid", placeItems: "center", color: "#aaa8ba" }}>
            <LoaderCircle size={32} className="animate-spin" style={{ color: "#e3262e" }} />
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </ArkhamShell>
  )
}
