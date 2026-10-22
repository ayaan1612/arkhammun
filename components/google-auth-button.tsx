"use client"

import { useEffect, useRef, useState } from "react"
import { LoaderCircle, ShieldAlert } from "lucide-react"

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string
            callback: (response: { credential: string }) => void
            auto_select?: boolean
            cancel_on_tap_outside?: boolean
          }) => void
          renderButton: (
            parent: HTMLElement,
            options: {
              theme?: "outline" | "filled_blue" | "filled_black"
              size?: "large" | "medium" | "small"
              text?: "signin_with" | "signup_with" | "continue_with" | "signin"
              shape?: "rectangular" | "pill" | "circle" | "square"
              width?: number | string
            }
          ) => void
          prompt: () => void
        }
      }
    }
  }
}

interface GoogleAuthButtonProps {
  onSuccess: (credential: string) => Promise<void>
  disabled?: boolean
  text?: "signin_with" | "signup_with" | "continue_with"
}

export function GoogleAuthButton({ onSuccess, disabled, text = "continue_with" }: GoogleAuthButtonProps) {
  const [loading, setLoading] = useState(false)
  const [errorNotice, setErrorNotice] = useState("")
  const [googleReady, setGoogleReady] = useState(false)
  const buttonContainerRef = useRef<HTMLDivElement>(null)

  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ""

  useEffect(() => {
    // Load Google Identity Services script
    if (typeof window === "undefined") return

    let isMounted = true

    const initGoogle = () => {
      if (!window.google?.accounts?.id || !clientId) return

      try {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: async (response) => {
            if (response.credential && isMounted) {
              setLoading(true)
              setErrorNotice("")
              try {
                await onSuccess(response.credential)
              } catch (err: unknown) {
                if (isMounted) {
                  setErrorNotice(err instanceof Error ? err.message : "Google sign in failed. Please try again.")
                }
              } finally {
                if (isMounted) setLoading(false)
              }
            }
          },
        })

        if (buttonContainerRef.current) {
          buttonContainerRef.current.innerHTML = ""
          window.google.accounts.id.renderButton(buttonContainerRef.current, {
            theme: "filled_black",
            size: "large",
            text: text,
            shape: "rectangular",
            width: "100%",
          })
        }
        if (isMounted) setGoogleReady(true)
      } catch (err) {
        console.warn("Failed to initialize Google Sign-In:", err)
      }
    }

    if (window.google?.accounts?.id) {
      initGoogle()
    } else {
      const existingScript = document.getElementById("google-gsi-script")
      if (!existingScript) {
        const script = document.createElement("script")
        script.id = "google-gsi-script"
        script.src = "https://accounts.google.com/gsi/client"
        script.async = true
        script.defer = true
        script.onload = initGoogle
        document.head.appendChild(script)
      } else {
        existingScript.addEventListener("load", initGoogle)
      }
    }

    return () => {
      isMounted = false
    }
  }, [clientId, onSuccess, text])

  function handleCustomButtonClick() {
    if (loading || disabled) return

    if (!clientId) {
      setErrorNotice(
        "Google Sign-In is enabled! To connect your Google Cloud account, please add NEXT_PUBLIC_GOOGLE_CLIENT_ID to your Vercel or .env settings."
      )
      return
    }

    if (window.google?.accounts?.id) {
      try {
        window.google.accounts.id.prompt()
      } catch (e) {
        console.warn("Prompt error:", e)
      }
    } else {
      setErrorNotice("Google authentication service is loading. Please try again in a moment.")
    }
  }

  return (
    <div style={{ width: "100%", display: "grid", gap: "8px" }}>
      {/* Hidden container where Google native button mounts if needed */}
      <div ref={buttonContainerRef} style={{ display: googleReady && clientId ? "block" : "none", width: "100%" }} />

      {/* Arkham Mun stylized Google button (shown if native iframe isn't active) */}
      {(!googleReady || !clientId) && (
        <button
          type="button"
          onClick={handleCustomButtonClick}
          disabled={disabled || loading}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "12px",
            padding: "12px 16px",
            backgroundColor: "#0d0d12",
            border: "1px solid rgba(255, 255, 255, 0.22)",
            borderRadius: "6px",
            color: "#ffffff",
            fontSize: "13px",
            fontWeight: 600,
            cursor: disabled || loading ? "not-allowed" : "pointer",
            transition: "all 0.2s ease",
            boxShadow: "0 2px 6px rgba(0, 0, 0, 0.4)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "#161622"
            e.currentTarget.style.borderColor = "rgba(227, 38, 46, 0.6)"
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "#0d0d12"
            e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.22)"
          }}
        >
          {loading ? (
            <LoaderCircle size={18} className="animate-spin" style={{ color: "#e3262e" }} />
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                fill="#EA4335"
              />
            </svg>
          )}
          <span>{loading ? "Authenticating with Google…" : text === "signup_with" ? "Sign up with Google" : "Continue with Google"}</span>
        </button>
      )}

      {errorNotice && (
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "8px",
            padding: "10px 12px",
            backgroundColor: "rgba(227, 38, 46, 0.12)",
            border: "1px solid rgba(227, 38, 46, 0.4)",
            borderRadius: "4px",
            color: "#ff8c90",
            fontSize: "12px",
            lineHeight: 1.4,
          }}
        >
          <ShieldAlert size={15} style={{ flexShrink: 0, marginTop: "2px", color: "#e3262e" }} />
          <span>{errorNotice}</span>
        </div>
      )}
    </div>
  )
}
