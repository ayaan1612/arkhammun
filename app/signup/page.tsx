"use client"

import { FormEvent, Suspense, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import {
  ArrowRight,
  Eye,
  EyeOff,
  LoaderCircle,
  Lock,
  Mail,
  ShieldAlert,
  UserCheck,
} from "lucide-react"
import { ArkhamShell, PageIntro } from "@/components/arkham-shell"
import { useAuth } from "@/lib/auth-context"
import { useTransitionNav } from "@/components/PageTransition"
import { GoogleAuthButton } from "@/components/google-auth-button"

function SignupForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTarget = searchParams.get("redirect") || ""
  const paramRole = searchParams.get("role") || ""

  const { signup, loginWithGoogle, user, isLoading: authLoading } = useAuth()
  const { go, activeTransition } = useTransitionNav()

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)

  // Status
  const [loading, setLoading] = useState(false)
  const isRegisterTransitioning = activeTransition === "register"
  const isSubmitting = loading || isRegisterTransitioning
  const [error, setError] = useState("")
  const [validationErrors, setValidationErrors] = useState<{
    name?: string
    email?: string
    password?: string
    confirmPassword?: string
  }>({})

  // If role=admin is requested, redirect directly to admin login (no admin signup exists)
  useEffect(() => {
    if (paramRole === "admin") {
      router.replace(
        `/login?role=admin${redirectTarget ? `&redirect=${encodeURIComponent(redirectTarget)}` : ""}`
      )
    }
  }, [paramRole, router, redirectTarget])

  // If already authenticated, redirect
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
      errors.name = "Please enter your full name."
    } else if (name.trim().length < 2) {
      errors.name = "Name must be at least 2 characters."
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

  async function handleGoogleSuccess(credential: string) {
    setError("")
    try {
      await go({
        type: "register",
        label: "WELCOME, DELEGATE",
        loadingText: "Creating account…",
        action: async () => {
          const loggedInUser = await loginWithGoogle(credential)
          return loggedInUser
        },
        redirectTo: redirectTarget || "/dashboard",
      })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Google registration failed. Please try again.")
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError("")
    if (!validate()) return

    const submitBtn = (e.currentTarget as HTMLFormElement).querySelector('button[type="submit"]') as HTMLElement | null

    try {
      await go({
        type: "register",
        label: "CREATING ACCOUNT",
        loadingText: "Creating account…",
        originEl: submitBtn,
        action: async () => {
          const createdUser = await signup(
            name.trim(),
            email.trim(),
            password,
            undefined,
            "user"
          )
          return createdUser
        },
        redirectTo: redirectTarget || "/dashboard",
      })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Registration failed. Please verify your details."
      setError(msg)
    }
  }

  return (
    <>
      <PageIntro
        eyebrow="DELEGATE ENROLLMENT"
        title={
          <>
            Create Your <em>Arkham MUN</em> Account
          </>
        }
      >
        Register for verified delegate credentials, conference committee allocations, and official entry passes.
      </PageIntro>

      <div
        className="page-section"
        style={{ minHeight: "60vh", display: "flex", justifyContent: "center", paddingTop: "20px" }}
      >
        <div
          className="contact-card"
          style={{
            width: "100%",
            maxWidth: "480px",
            background: "rgba(12, 12, 12, 0.94)",
            border: "1px solid rgba(255, 255, 255, 0.16)",
            borderRadius: "10px",
            padding: "36px 32px",
            boxShadow: "0 20px 50px rgba(0, 0, 0, 0.5), 0 0 30px rgba(227, 38, 46, 0.1)",
          }}
        >
          {/* Heading description */}
          <div style={{ marginBottom: "22px" }}>
            <span className="section-kicker">NEW DELEGATE REGISTRATION</span>
            <h2 style={{ fontSize: "26px", margin: "6px 0 4px", fontWeight: 500 }}>
              Delegate Sign Up
            </h2>
            <p style={{ color: "#aaa8ba", fontSize: "13px", margin: 0, lineHeight: 1.5 }}>
              Create your delegate account to register for events, claim entry passes, and view notifications.
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <div
              style={{
                display: "grid",
                gap: "8px",
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
              <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                <ShieldAlert size={16} style={{ flexShrink: 0, marginTop: "2px", color: "#e3262e" }} />
                <div>{error}</div>
              </div>
              {error.toLowerCase().includes("already exists") && (
                <Link
                  href={`/login?email=${encodeURIComponent(email)}`}
                  style={{
                    color: "#fff",
                    textDecoration: "underline",
                    fontSize: "12px",
                    fontWeight: 700,
                    marginLeft: "26px",
                  }}
                >
                  Sign in with this email instead →
                </Link>
              )}
            </div>
          )}

          {/* GOOGLE SIGN UP BUTTON */}
          <div style={{ marginBottom: "20px" }}>
            <GoogleAuthButton onSuccess={handleGoogleSuccess} disabled={isSubmitting} text="signup_with" />

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                margin: "20px 0 4px",
                color: "#6b667a",
                fontSize: "11px",
                fontWeight: 600,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
              }}
            >
              <div style={{ flex: 1, height: "1px", background: "rgba(255, 255, 255, 0.12)" }} />
              <span>Or sign up with email</span>
              <div style={{ flex: 1, height: "1px", background: "rgba(255, 255, 255, 0.12)" }} />
            </div>
          </div>

          {/* Informational Policy Badge */}
          <div
            style={{
              padding: "9px 12px",
              background: "rgba(255, 255, 255, 0.04)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              borderRadius: "5px",
              color: "#aaa8ba",
              fontSize: "12px",
              marginBottom: "16px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <UserCheck size={14} style={{ color: "#e3262e" }} />
            <span>Notice: Only one delegate account is permitted per email address.</span>
          </div>

          {/* MAIN FORM */}
          <form onSubmit={handleSubmit} style={{ display: "grid", gap: "16px" }}>
            {/* Full Name */}
            <label style={{ display: "grid", gap: "6px", color: "#e8e4f3", fontSize: "12px" }}>
              <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <UserCheck size={13} style={{ color: "#e3262e" }} /> FULL NAME
              </span>
              <input
                type="text"
                placeholder="e.g. Bruce Wayne"
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
                  if (validationErrors.name) setValidationErrors({ ...validationErrors, name: undefined })
                }}
                disabled={isSubmitting}
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

            {/* Email Address */}
            <label style={{ display: "grid", gap: "6px", color: "#e8e4f3", fontSize: "12px" }}>
              <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <Mail size={13} style={{ color: "#e3262e" }} /> EMAIL ADDRESS
              </span>
              <input
                type="email"
                placeholder="delegate@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (validationErrors.email) setValidationErrors({ ...validationErrors, email: undefined })
                }}
                disabled={isSubmitting}
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

            {/* Password Field */}
            <label style={{ display: "grid", gap: "6px", color: "#e8e4f3", fontSize: "12px" }}>
              <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <Lock size={13} style={{ color: "#e3262e" }} /> CREATE PASSWORD
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
                  disabled={isSubmitting}
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

            {/* Confirm Password Field */}
            <label style={{ display: "grid", gap: "6px", color: "#e8e4f3", fontSize: "12px" }}>
              <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <Lock size={13} style={{ color: "#e3262e" }} /> CONFIRM PASSWORD
              </span>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value)
                  if (validationErrors.confirmPassword)
                    setValidationErrors({ ...validationErrors, confirmPassword: undefined })
                }}
                disabled={isSubmitting}
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

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="primary-button arkham-interactive-btn"
              data-transition="register"
              style={{
                width: "100%",
                marginTop: "10px",
                padding: "14px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                opacity: isSubmitting ? 0.75 : 1,
                cursor: isSubmitting ? "not-allowed" : "pointer",
                pointerEvents: isSubmitting ? "none" : undefined,
              }}
            >
              <span className="arkham-btn-sheen" aria-hidden="true" />
              {isSubmitting ? (
                <>
                  <LoaderCircle size={16} className="animate-spin" /> CREATING ACCOUNT...
                </>
              ) : (
                <>
                  PROCEED TO ACCESS PASS <ArrowRight size={14} className="btn-icon" />
                </>
              )}
            </button>
          </form>

          {/* Bottom Link to Sign In */}
          <div
            style={{
              marginTop: "26px",
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
              Already have an account?{" "}
              <Link
                href={`/login${redirectTarget ? `?redirect=${encodeURIComponent(redirectTarget)}` : ""}`}
                style={{
                  color: "#e3262e",
                  fontWeight: 700,
                  textDecoration: "underline",
                }}
              >
                Sign In
              </Link>
            </div>
            <div>
              <Link href="/contact" style={{ color: "#8d8a9e", textDecoration: "none", fontSize: "12px" }}>
                Need technical assistance or credentials support? Contact Secretariat
              </Link>
            </div>
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
