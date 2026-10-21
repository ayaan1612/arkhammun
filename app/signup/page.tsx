"use client"

import { Suspense } from "react"
import { LoaderCircle } from "lucide-react"
import { ArkhamShell } from "@/components/arkham-shell"
import { AuthPortalForm } from "@/app/login/page"

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
        <AuthPortalForm initialMode="signup" />
      </Suspense>
    </ArkhamShell>
  )
}
