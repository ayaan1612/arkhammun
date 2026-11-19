import fs from "fs"
import path from "path"
import { arkham } from "@/lib/arkham-data"
import { AdminEventSettings, FormSectionsConfig } from "@/lib/entry-pass-api"

export const defaultFormSections: FormSectionsConfig = {
  delegateDetails: {
    title: "Delegate details",
    instructions: "Enter your official delegate information for verification and certification.",
    gradeLabel: "Class / Year / Grade",
    gradePlaceholder: "e.g. 11th Grade / 2nd Year",
  },
  experience: {
    title: "Experience",
    tiers: ["0-5", "5-12", "12-20", "20+"],
  },
  committees: {
    title: "Committee preferences",
    items: [
      "UNCSW (Advancing Women's Protection, Leadership and Rights in Conflict Zones, with Special Emphasis on the Russia–Ukraine War.)",
      "UNGA (Strengthening Nuclear Weapon-Free Zones, with a Focus on the Middle East and South Asia.)",
      "Lok Sabha (Indian parliamentary committee simulation.)",
      "IPL — Mega Auction (Simulated IPL Mega Auction committee.)",
      "IP — International Press (Journalists, Caricaturists and Photographers to Cover Conference Proceedings.)",
      "UNODC (Human Rights Implications of the Global War on Drugs.)",
      "WHO (Strengthening Global Preparedness for Future Pandemics and Ensuring Fair Access to Vaccines, Diagnostics and Treatments for All Countries.)",
      "UNEP (Protecting Global Biodiversity While Balancing Economic Growth and Environmental Sustainability.)",
    ],
  },
  portfolioPreferences: {
    title: "Portfolio preferences",
    flexiblePrompt: "Are you open to being assigned to any committee or portfolio if your top preferences are full?",
  },
  references: {
    title: "References",
    caPrompt: "CA Reference (IF NO TYPE NIL)",
    caPlaceholder: "NIL",
    label: "CA Reference (IF NO TYPE NIL)",
    placeholder: "NIL",
  },
  paymentSection: {
    title: "Payment & Verification",
    instructions:
      "Scan the official Arkham MUN UPI QR poster below in any payment app (Google Pay, PhonePe, Paytm, etc.). Then enter the UPI Transaction Reference (UTR), upload your screenshot, and check the payment confirmation box.",
    note: "Official UPI Payment QR Poster",
    upiNote: "Official UPI Payment QR Poster",
    paymentQrUrl: "/payment-qr.jpeg",
  },
  specialRequests: {
    title: "Special requests / Notes",
    placeholder: "Any dietary restrictions, special accommodations, or notes for the secretariat",
  },
}

export type StoredConferenceSettings = AdminEventSettings & {
  formSections: FormSectionsConfig
}

const defaultSettings: StoredConferenceSettings = {
  event: {
    name: arkham.name ? `${arkham.name} 2027` : "Arkham MUN 2027",
    date: arkham.dates || "10–11 April 2027",
    time: "09:00 AM – 05:00 PM",
    venue: arkham.venueNote || "In Central Delhi",
  },
  amount: 2300,
  upiId: arkham.paymentUpi || "chauhan5408k@okaxis",
  registrationOpen: true,
  registrationNotice: "Registrations for Arkham MUN 2027 are live.",
  paymentQrConfigured: true,
  paymentQrUrl: "/payment-qr.jpeg",
  formSections: defaultFormSections,
}

// Global cache across serverless warm requests
declare global {
  // eslint-disable-next-line no-var
  var __arkhamConferenceSettings: StoredConferenceSettings | undefined
}

function getStoragePaths(): string[] {
  const paths: string[] = []
  try {
    paths.push(path.join(process.cwd(), "data", "conference-settings.json"))
  } catch {}
  try {
    paths.push(path.join("/tmp", "arkham-conference-settings.json"))
  } catch {}
  return paths
}

function loadFromDisk(): StoredConferenceSettings | null {
  for (const filePath of getStoragePaths()) {
    try {
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, "utf8")
        if (raw) {
          const parsed = JSON.parse(raw)
          if (parsed && typeof parsed === "object") {
            return {
              ...defaultSettings,
              ...parsed,
              event: { ...defaultSettings.event, ...(parsed.event || {}) },
              formSections: { ...defaultSettings.formSections, ...(parsed.formSections || {}) },
            }
          }
        }
      }
    } catch {
      // Ignore disk read error and check next path
    }
  }
  return null
}

function saveToDisk(settings: StoredConferenceSettings): void {
  const serialized = JSON.stringify(settings, null, 2)
  for (const filePath of getStoragePaths()) {
    try {
      const dir = path.dirname(filePath)
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }
      fs.writeFileSync(filePath, serialized, "utf8")
    } catch {
      // Ignore disk write failure in read-only environments
    }
  }
}

export function getConferenceSettings(): StoredConferenceSettings {
  if (globalThis.__arkhamConferenceSettings) {
    return globalThis.__arkhamConferenceSettings
  }

  const diskSettings = loadFromDisk()
  if (diskSettings) {
    globalThis.__arkhamConferenceSettings = diskSettings
    return diskSettings
  }

  globalThis.__arkhamConferenceSettings = { ...defaultSettings }
  return globalThis.__arkhamConferenceSettings
}

export function updateConferenceSettings(
  updates: Partial<StoredConferenceSettings> & {
    event?: Partial<StoredConferenceSettings["event"]>
    formSections?: Partial<FormSectionsConfig>
  }
): StoredConferenceSettings {
  const current = getConferenceSettings()

  const updated: StoredConferenceSettings = {
    ...current,
    ...updates,
    event: {
      ...current.event,
      ...(updates.event || {}),
    },
    amount: updates.amount !== undefined ? Number(updates.amount) : current.amount,
    upiId: updates.upiId !== undefined ? String(updates.upiId).trim() : current.upiId,
    registrationOpen:
      updates.registrationOpen !== undefined ? Boolean(updates.registrationOpen) : current.registrationOpen,
    registrationNotice:
      updates.registrationNotice !== undefined
        ? String(updates.registrationNotice).trim()
        : current.registrationNotice,
    paymentQrUrl:
      updates.paymentQrUrl !== undefined
        ? updates.paymentQrUrl === ""
          ? "/payment-qr.jpeg"
          : updates.paymentQrUrl
        : current.paymentQrUrl,
    paymentQrConfigured:
      updates.paymentQrUrl !== undefined ? Boolean(updates.paymentQrUrl) : current.paymentQrConfigured,
    formSections: {
      ...current.formSections,
      ...(updates.formSections || {}),
      committees: {
        ...current.formSections.committees,
        ...(updates.formSections?.committees || {}),
      },
      paymentSection: {
        ...current.formSections.paymentSection,
        ...(updates.formSections?.paymentSection || {}),
      },
    },
  }

  globalThis.__arkhamConferenceSettings = updated
  saveToDisk(updated)
  return updated
}

export function resetConferenceSettings(): StoredConferenceSettings {
  globalThis.__arkhamConferenceSettings = { ...defaultSettings }
  saveToDisk(defaultSettings)
  return defaultSettings
}
