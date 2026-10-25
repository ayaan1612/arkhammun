"use client"

import { FormEvent, Suspense, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import {
  ArrowRight,
  Eye,
  EyeOff,
  KeyRound,
  LoaderCircle,
  Lock,
  Mail,
  Shield,
  ShieldAlert,
  User,
} from "lucide-react"
import { ArkhamShell, PageIntro } from "@/components/arkham-shell"
import { useAuth } from "@/lib/auth-context"
import { useTransitionNav } from "@/components/PageTransition"
import { GoogleAuthButton } from "@/components/google-auth-button"

type UserType = "delegate" | "admin"

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTarget = searchParams.get("redirect") || ""
  const paramRole = (searchParams.get("role") as UserType) || "delegate"

  const { login, loginWithGoogle, loginAdmin, user, isLoading: authLoading } = useAuth()
  const { go, activeTransition } = useTransitionNav()

  const initialRole: UserType = redirectTarget.includes("/admin") || paramRole === "admin" ? "admin" : "delegate"
  const [userType, setUserType] = useState<UserType>(initialRole)
  const [email, setEmail] = useState(initialRole === "admin" ? "arkhammun2026@gmail.com" : "")
  const [password, setPassword] = useState("")
  const [adminKey, setAdminKey] = useState("")
  const [showPassword, setShowPassword] = useState(false)

  // Status
  const [loading, setLoading] = useState(false)
  const isLoginTransitioning = activeTransition === "login"
  const isSubmitting = loading || isLoginTransitioning
  const [error, setError] = useState("")
  const [validationErrors, setValidationErrors] = useState<{
    email?: string
    password?: string
    adminKey?: string
  }>({})

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
    const errors: { email?: string; password?: string; adminKey?: string } = {}

    if (userType === "admin") {
      if (!adminKey.trim()) {
        errors.adminKey = "Secretariat Admin Key or PIN is required."
      }
      setValidationErrors(errors)
      return Object.keys(errors).length === 0
    }

    if (!email.trim()) {
      errors.email = "Please enter your email address."
    } else if (!email.includes("@") || !email.includes(".")) {
      errors.email = "Please enter a valid email address."
    }

    if (!password) {
      errors.password = "Password is required."
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function handleGoogleSuccess(credential: string) {
    setError("")
    try {
      await go({
        type: "login",
        label: "WELCOME BACK",
        action: async () => {
          const loggedInUser = await loginWithGoogle(credential)
          return loggedInUser
        },
        redirectTo: redirectTarget || "/dashboard",
      })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Google authentication failed. Please try again.")
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError("")
    if (!validate()) return

    const submitBtn = (e.currentTarget as HTMLFormElement).querySelector('button[type="submit"]') as HTMLElement | null

    try {
      await go({
        type: "login",
        label: "WELCOME BACK",
        originEl: submitBtn,
        action: async () => {
          let loggedInUser
          if (userType === "admin") {
            const activeAdminEmail = email.trim() || "arkhammun2026@gmail.com"
            loggedInUser = await loginAdmin(activeAdminEmail, adminKey.trim())
          } else {
            loggedInUser = await login(email.trim(), password)
          }
          return loggedInUser
        },
        redirectTo: userType === "admin" ? (redirectTarget || "/admin") : (redirectTarget || "/dashboard"),
      })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Authentication failed. Please verify your credentials."
      setError(msg)
    }
  }

  return (
    <>
      <PageIntro
        eyebrow="AUTHENTICATION PORTAL"
        title={
          <>
            Sign In to <em>Arkham MUN</em>
          </>
        }
      >
        Access your registered events, official venue entry passes, committee dockets, and conference communiqués.
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
          {/* USER TYPE SELECTOR (Delegate vs Secretariat Admin) */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "8px",
              marginBottom: "26px",
            }}
          >
            <div
              role="button"
              tabIndex={0}
              onClick={() => {
                setUserType("delegate")
                setError("")
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  setUserType("delegate")
                  setError("")
                }
              }}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                padding: "11px 14px",
                borderRadius: "6px",
                border: userType === "delegate" ? "1px solid #e3262e" : "1px solid rgba(255, 255, 255, 0.18)",
                background: userType === "delegate" ? "rgba(227, 38, 46, 0.16)" : "rgba(255, 255, 255, 0.03)",
                color: userType === "delegate" ? "#fff" : "#aaa8ba",
                cursor: "pointer",
                fontSize: "13px",
                fontWeight: 600,
                transition: "all 0.2s",
                userSelect: "none",
              }}
            >
              <User size={14} style={{ color: userType === "delegate" ? "#e3262e" : "#aaa8ba" }} />
              Delegate Access
            </div>

            <div
              role="button"
              tabIndex={0}
              onClick={() => {
                setUserType("admin")
                if (!email) setEmail("arkhammun2026@gmail.com")
                setError("")
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  setUserType("admin")
                  setError("")
                }
              }}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                padding: "11px 14px",
                borderRadius: "6px",
                border: userType === "admin" ? "1px solid #e3262e" : "1px solid rgba(255, 255, 255, 0.18)",
                background: userType === "admin" ? "rgba(227, 38, 46, 0.16)" : "rgba(255, 255, 255, 0.03)",
                color: userType === "admin" ? "#fff" : "#aaa8ba",
                cursor: "pointer",
                fontSize: "13px",
                fontWeight: 600,
                transition: "all 0.2s",
                userSelect: "none",
              }}
            >
              <Shield size={14} style={{ color: userType === "admin" ? "#e3262e" : "#aaa8ba" }} />
              Secretariat Admin
            </div>
          </div>

          {/* Heading description */}
          <div style={{ marginBottom: "22px" }}>
            <span className="section-kicker">
              {userType === "admin" ? "SECRETARIAT COMMAND DAIS" : "VERIFIED DELEGATE ACCESS"}
            </span>
            <h2 style={{ fontSize: "26px", margin: "6px 0 4px", fontWeight: 500 }}>
              {userType === "admin" ? "Secretariat Sign In" : "Delegate Sign In"}
            </h2>
            <p style={{ color: "#aaa8ba", fontSize: "13px", margin: 0, lineHeight: 1.5 }}>
              {userType === "admin"
                ? "Secretariat portal access is restricted. Authenticate with your designated Admin Email and Admin Secret Key."
                : "Sign in with your Google account or registered email and password to access your passes."}
            </p>
          </div>

          {/* Error Alert */}
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

          {/* DELEGATE GOOGLE SIGN-IN OPTION */}
          {userType === "delegate" && (
            <div style={{ marginBottom: "20px" }}>
              <GoogleAuthButton onSuccess={handleGoogleSuccess} disabled={isSubmitting} text="signin_with" />

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
                <span>Or sign in with email</span>
                <div style={{ flex: 1, height: "1px", background: "rgba(255, 255, 255, 0.12)" }} />
              </div>
            </div>
          )}

          {/* MAIN FORM */}
          <form onSubmit={handleSubmit} style={{ display: "grid", gap: "16px" }}>
            {/* Email Address */}
            <label style={{ display: "grid", gap: "6px", color: "#e8e4f3", fontSize: "12px" }}>
              <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <Mail size={13} style={{ color: "#e3262e" }} />
                {userType === "admin" ? "ADMINISTRATIVE EMAIL" : "EMAIL ADDRESS"}
              </span>
              <input
                type="email"
                placeholder={userType === "admin" ? "arkhammun2026@gmail.com" : "delegate@example.com"}
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

            {/* Delegate Password Field */}
            {userType === "delegate" && (
              <label style={{ display: "grid", gap: "6px", color: "#e8e4f3", fontSize: "12px" }}>
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
                    disabled={isSubmitting}
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
            )}

            {/* Secretariat Verification Key (Admin only - Required) */}
            {userType === "admin" && (
              <label style={{ display: "grid", gap: "6px", color: "#e8e4f3", fontSize: "12px" }}>
                <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <KeyRound size={13} style={{ color: "#e3262e" }} />
                  SECRETARIAT ADMIN KEY / PIN
                </span>
                <input
                  type="password"
                  placeholder="Enter Secretariat Admin PIN or Key"
                  value={adminKey}
                  onChange={(e) => {
                    setAdminKey(e.target.value)
                    if (validationErrors.adminKey) setValidationErrors({ ...validationErrors, adminKey: undefined })
                  }}
                  disabled={isSubmitting}
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    padding: "13px 14px",
                    color: "#fff",
                    backgroundColor: "#080808",
                    border: validationErrors.adminKey ? "1px solid #e3262e" : "1px solid rgba(255, 255, 255, 0.25)",
                    borderRadius: "4px",
                    outline: "none",
                    fontSize: "14px",
                  }}
                />
                {validationErrors.adminKey && (
                  <span style={{ color: "#ff424b", fontSize: "11px" }}>{validationErrors.adminKey}</span>
                )}
              </label>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="primary-button arkham-interactive-btn"
              data-transition="login"
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
                  <LoaderCircle size={16} className="animate-spin" /> SIGNING IN...
                </>
              ) : userType === "admin" ? (
                <>
                  ENTER SECRETARIAT DAIS <ArrowRight size={14} className="btn-icon" />
                </>
              ) : (
                <>
                  ENTER THE ASSEMBLY <ArrowRight size={14} className="btn-icon" />
                </>
              )}
            </button>
          </form>

          {/* Bottom Link to Sign Up */}
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
            {userType === "delegate" ? (
              <div>
                Don&apos;t have an account yet?{" "}
                <Link
                  href={`/signup${redirectTarget ? `?redirect=${encodeURIComponent(redirectTarget)}` : ""}`}
                  style={{
                    color: "#e3262e",
                    fontWeight: 700,
                    textDecoration: "underline",
                  }}
                >
                  Sign Up as Delegate
                </Link>
              </div>
            ) : (
              <div style={{ color: "#8d8a9e", fontSize: "12px" }}>
                Secretariat access is restricted. Contact the Secretariat Director if you need key authorization.
              </div>
            )}
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
