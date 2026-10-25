import Link from "next/link"
import { ShieldAlert, ArrowLeft } from "lucide-react"

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#0a0608",
        color: "#ffffff",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        textAlign: "center",
      }}
    >
      <div
        style={{
          width: "72px",
          height: "72px",
          borderRadius: "50%",
          backgroundColor: "rgba(227, 38, 46, 0.12)",
          border: "1px solid rgba(227, 38, 46, 0.4)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: "24px",
          boxShadow: "0 0 30px rgba(227, 38, 46, 0.3)",
        }}
      >
        <ShieldAlert size={36} color="#e3262e" />
      </div>

      <span
        style={{
          fontSize: "12px",
          letterSpacing: "0.28em",
          color: "#e3262e",
          fontWeight: 700,
          marginBottom: "8px",
          fontFamily: "'Cinzel', serif",
        }}
      >
        404 · CLASSIFIED SECTOR
      </span>

      <h1
        style={{
          fontSize: "clamp(24px, 4vw, 36px)",
          fontWeight: 700,
          fontFamily: "'Cinzel', serif",
          letterSpacing: "0.08em",
          marginBottom: "16px",
          color: "#ffffff",
        }}
      >
        LOST IN THE SHADOWS OF ARKHAM
      </h1>

      <p
        style={{
          maxWidth: "480px",
          color: "rgba(244, 241, 241, 0.72)",
          fontSize: "15px",
          lineHeight: 1.6,
          marginBottom: "32px",
        }}
      >
        The requested diplomatic docket, committee chamber, or administrative terminal does not exist or has been restricted by Secretariat command.
      </p>

      <Link
        href="/"
        className="primary-button arkham-interactive-btn"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          padding: "12px 24px",
          textDecoration: "none",
        }}
      >
        <ArrowLeft size={16} /> Return to Public Assembly
      </Link>
    </div>
  )
}
