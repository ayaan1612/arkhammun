"use client"

import { FormEvent, Suspense, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  LoaderCircle,
  Lock,
  LogIn,
  Mail,
  Shield,
  ShieldAlert,
  ShieldCheck,
  User,
  UserPlus,
} from "lucide-react"
import { ArkhamShell, PageIntro } from "@/components/arkham-shell"
import { useAuth } from "@/lib/auth-context"

type AuthMode = "signin" | "signup"
type UserType = "delegate" | "admin"

export function AuthPortalForm({ initialMode = "signin" }: { initialMode?: AuthMode }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTarget = searchParams.get("redirect") || ""
  const paramMode = (searchParams.get("mode") as AuthMode) || initialMode
  const paramRole = (searchParams.get("role") as UserType) || "delegate"

  const { login, signup, user, isLoading: authLoading } = useAuth()

  const [mode, setMode] = useState<AuthMode>(paramMode)
  const [userType, setUserType] = useState<UserType>(paramRole)

  // Form fields
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [adminKey, setAdminKey] = useState("")
  const [showPassword, setShowPassword] = useState(false)

  // Status
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [successNotice, setSuccessNotice] = useState("")
  const [validationErrors, setValidationErrors] = useState<{
    name?: string
    email?: string
    password?: string
    confirmPassword?: string
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
    const errors: {
      name?: string
      email?: string
      password?: string
      confirmPassword?: string
      adminKey?: string
    } = {}

    if (mode === "signup" && !name.trim()) {
      errors.name = "Please provide your full legal name."
    }

    // For admin sign-in, allow either email+password OR direct adminKey
    if (mode === "signin" && userType === "admin" && adminKey.trim() && !email.trim()) {
      // Key-only sign-in is allowed for admin
      return true
    }

    if (!email.trim()) {
      errors.email = "Please enter your email address."
    } else if (!email.includes("@") || !email.includes(".")) {
      errors.email = "Please enter a valid email address."
    }

    if (!password) {
      errors.password = "Password is required."
    } else if (mode === "signup" && password.length < 6) {
      errors.password = "Password must be at least 6 characters long."
    }

    if (mode === "signup" && password !== confirmPassword) {
      errors.confirmPassword = "Passwords do not match."
    }

    if (mode === "signup" && userType === "admin" && !adminKey.trim()) {
      errors.adminKey = "Secretariat Verification Key is required to create an administrator account."
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError("")
    setSuccessNotice("")
    if (!validate()) return

    setLoading(true)
    try {
      if (mode === "signin") {
        // Sign In
        const loggedInUser = await login(
          email.trim() || undefined,
          password || undefined,
          adminKey.trim() || undefined,
          userType === "admin" ? "admin" : "user"
        )

        if (loggedInUser.role === "admin") {
          router.push(redirectTarget || "/admin")
        } else {
          router.push(redirectTarget || "/dashboard")
        }
      } else {
        // Sign Up
        const createdUser = await signup(
          name.trim(),
          email.trim(),
          password,
          adminKey.trim() || undefined,
          userType === "admin" ? "admin" : "user"
        )

        if (createdUser.role === "admin") {
          router.push(redirectTarget || "/admin")
        } else {
          router.push(redirectTarget || "/dashboard")
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Authentication failed. Please verify your details."
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <PageIntro
        eyebrow="ARKHAM OPERATIONS PORTAL"
        title={
          <>
            {mode === "signin" ? "Portal" : "Registration"}{" "}
            <em>{userType === "admin" ? "Secretariat" : "Delegates"}</em>
          </>
        }
      >
        Access your committee allocations, cloud records, venue check-in verification, and official secretariat commands.
      </PageIntro>

      <div className="page-section" style={{ minHeight: "65vh", display: "flex", justifyContent: "center", paddingTop: "20px" }}>
        <div
          className="contact-card"
          style={{
            width: "100%",
            maxWidth: "520px",
            background: "rgba(12, 12, 12, 0.94)",
            border: "1px solid rgba(255, 255, 255, 0.16)",
            borderRadius: "10px",
            padding: "32px 30px",
            boxShadow: "0 20px 50px rgba(0, 0, 0, 0.5), 0 0 30px rgba(227, 38, 46, 0.1)",
          }}
        >
          {/* TOP MODE TOGGLE (Sign In vs Sign Up) */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "4px",
              background: "#080808",
              padding: "4px",
              borderRadius: "6px",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              marginBottom: "20px",
            }}
          >
            <button
              type="button"
              onClick={() => {
                setMode("signin")
                setError("")
              }}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                padding: "10px",
                borderRadius: "4px",
                border: 0,
                cursor: "pointer",
                fontSize: "13px",
                fontWeight: 700,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                background: mode === "signin" ? "#e3262e" : "transparent",
                color: mode === "signin" ? "#fff" : "#aaa8ba",
                transition: "all 0.2s",
              }}
            >
              <LogIn size={14} /> Sign In
            </button>

            <button
              type="button"
              onClick={() => {
                setMode("signup")
                setError("")
              }}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                padding: "10px",
                borderRadius: "4px",
                border: 0,
                cursor: "pointer",
                fontSize: "13px",
                fontWeight: 700,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                background: mode === "signup" ? "#e3262e" : "transparent",
                color: mode === "signup" ? "#fff" : "#aaa8ba",
                transition: "all 0.2s",
              }}
            >
              <UserPlus size={14} /> Sign Up
            </button>
          </div>

          {/* USER TYPE TOGGLE (Delegate vs Secretariat Admin) */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "8px",
              marginBottom: "24px",
            }}
          >
            <button
              type="button"
              onClick={() => {
                setUserType("delegate")
                setError("")
              }}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                padding: "10px 14px",
                borderRadius: "6px",
                border: userType === "delegate" ? "1px solid #e3262e" : "1px solid rgba(255, 255, 255, 0.15)",
                background: userType === "delegate" ? "rgba(227, 38, 46, 0.14)" : "rgba(255, 255, 255, 0.03)",
                color: userType === "delegate" ? "#fff" : "#aaa8ba",
                cursor: "pointer",
                fontSize: "12px",
                fontWeight: 600,
                transition: "all 0.2s",
              }}
            >
              <User size={14} style={{ color: userType === "delegate" ? "#e3262e" : "inherit" }} />
              Delegate Access
            </button>

            <button
              type="button"
              onClick={() => {
                setUserType("admin")
                setError("")
              }}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                padding: "10px 14px",
                borderRadius: "6px",
                border: userType === "admin" ? "1px solid #e3262e" : "1px solid rgba(255, 255, 255, 0.15)",
                background: userType === "admin" ? "rgba(227, 38, 46, 0.14)" : "rgba(255, 255, 255, 0.03)",
                color: userType === "admin" ? "#fff" : "#aaa8ba",
                cursor: "pointer",
                fontSize: "12px",
                fontWeight: 600,
                transition: "all 0.2s",
              }}
            >
              <Shield size={14} style={{ color: userType === "admin" ? "#e3262e" : "inherit" }} />
              Secretariat Admin
            </button>
          </div>

          {/* Heading description */}
          <div style={{ marginBottom: "22px" }}>
            <span className="section-kicker">
              {userType === "admin" ? "SECRETARIAT COMMAND DAIS" : "VERIFIED DELEGATE ACCESS"}
            </span>
            <h2 style={{ fontSize: "24px", margin: "6px 0 4px", fontWeight: 500 }}>
              {mode === "signin"
                ? userType === "admin"
                  ? "Admin Sign In"
                  : "Delegate Sign In"
                : userType === "admin"
                ? "Register Secretariat Admin"
                : "Create Delegate Account"}
            </h2>
            <p style={{ color: "#aaa8ba", fontSize: "13px", margin: 0, lineHeight: 1.5 }}>
              {mode === "signin"
                ? userType === "admin"
                  ? "Sign in with your administrator credentials or shared secretariat passkey."
                  : "Enter your registered email and password to access your dashboard and passes."
                : userType === "admin"
                ? "Create an administrator account. Requires the Secretariat Verification Key."
                : "Join Arkham MUN as an official delegate. All submissions are preserved in the cloud."}
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

          {/* Success Notice */}
          {successNotice && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "12px 14px",
                backgroundColor: "rgba(34, 197, 94, 0.12)",
                border: "1px solid rgba(34, 197, 94, 0.5)",
                borderRadius: "5px",
                color: "#4ade80",
                fontSize: "13px",
                marginBottom: "20px",
              }}
            >
              <CheckCircle2 size={16} />
              <div>{successNotice}</div>
            </div>
          )}

          {/* MAIN AUTH FORM */}
          <form onSubmit={handleSubmit} style={{ display: "grid", gap: "16px" }}>
            {/* Full Name (Sign Up only) */}
            {mode === "signup" && (
              <label style={{ display: "grid", gap: "6px", color: "#e8e4f3", fontSize: "12px" }}>
                <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <User size={13} style={{ color: "#e3262e" }} />
                  {userType === "admin" ? "ADMINISTRATOR FULL NAME" : "DELEGATE LEGAL NAME"}
                </span>
                <input
                  type="text"
                  placeholder={userType === "admin" ? "e.g. Secretariat Chair" : "e.g. Elena Rostova"}
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
            )}

            {/* Email Address */}
            <label style={{ display: "grid", gap: "6px", color: "#e8e4f3", fontSize: "12px" }}>
              <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <Mail size={13} style={{ color: "#e3262e" }} />
                {userType === "admin" ? "ADMINISTRATIVE EMAIL" : "EMAIL ADDRESS"}
              </span>
              <input
                type="email"
                placeholder={userType === "admin" ? "admin@arkhammun.org" : "delegate@example.com"}
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

            {/* Password Field */}
            <label style={{ display: "grid", gap: "6px", color: "#e8e4f3", fontSize: "12px" }}>
              <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <Lock size={13} style={{ color: "#e3262e" }} /> PASSWORD
              </span>
              <div style={{ position: "relative" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder={mode === "signup" ? "At least 6 characters" : "Enter your password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    if (validationErrors.password) setValidationErrors({ ...validationErrors, password: undefined })
                  }}
                  disabled={loading}
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
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

            {/* Confirm Password (Sign Up only) */}
            {mode === "signup" && (
              <label style={{ display: "grid", gap: "6px", color: "#e8e4f3", fontSize: "12px" }}>
                <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <CheckCircle2 size={13} style={{ color: "#e3262e" }} /> CONFIRM PASSWORD
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Re-enter password to verify"
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
                    border: validationErrors.confirmPassword
                      ? "1px solid #e3262e"
                      : "1px solid rgba(255, 255, 255, 0.25)",
                    borderRadius: "4px",
                    outline: "none",
                    fontSize: "14px",
                  }}
                />
                {validationErrors.confirmPassword && (
                  <span style={{ color: "#ff424b", fontSize: "11px" }}>{validationErrors.confirmPassword}</span>
                )}
              </label>
            )}

            {/* Secretariat Verification Key (Required for Admin Sign Up, Optional for Admin Sign In) */}
            {userType === "admin" && (
              <label style={{ display: "grid", gap: "6px", color: "#e8e4f3", fontSize: "12px" }}>
                <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <KeyRound size={13} style={{ color: "#e3262e" }} />
                  SECRETARIAT KEY {mode === "signin" ? "(OPTIONAL FOR DIRECT ACCESS)" : "(REQUIRED)"}
                </span>
                <input
                  type="password"
                  placeholder="Enter Secretariat Admin Passkey"
                  value={adminKey}
                  onChange={(e) => {
                    setAdminKey(e.target.value)
                    if (validationErrors.adminKey) setValidationErrors({ ...validationErrors, adminKey: undefined })
                  }}
                  disabled={loading}
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
                  <LoaderCircle size={16} className="animate-spin" /> VERIFYING ACCESS...
                </>
              ) : mode === "signin" ? (
                userType === "admin" ? (
                  <>
                    ENTER SECRETARIAT DAIS <ArrowRight size={14} />
                  </>
                ) : (
                  <>
                    SIGN IN TO DELEGATE PORTAL <ArrowRight size={14} />
                  </>
                )
              ) : userType === "admin" ? (
                <>
                  REGISTER SECRETARIAT ACCOUNT <ShieldCheck size={14} />
                </>
              ) : (
                <>
                  ENROLL AS DELEGATE <ArrowRight size={14} />
                </>
              )}
            </button>
          </form>

          {/* Bottom Switcher Footer */}
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
            {mode === "signin" ? (
              <div>
                Don&apos;t have an account yet?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setMode("signup")
                    setError("")
                  }}
                  style={{
                    background: "none",
                    border: 0,
                    color: "#e3262e",
                    fontWeight: 700,
                    cursor: "pointer",
                    textDecoration: "underline",
                  }}
                >
                  Create {userType === "admin" ? "Admin" : "Delegate"} Account
                </button>
              </div>
            ) : (
              <div>
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setMode("signin")
                    setError("")
                  }}
                  style={{
                    background: "none",
                    border: 0,
                    color: "#e3262e",
                    fontWeight: 700,
                    cursor: "pointer",
                    textDecoration: "underline",
                  }}
                >
                  Sign In to {userType === "admin" ? "Admin Dais" : "Delegate Portal"}
                </button>
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
        <AuthPortalForm initialMode="signin" />
      </Suspense>
    </ArkhamShell>
  )
}
