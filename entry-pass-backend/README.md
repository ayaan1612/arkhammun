# Entry Pass Backend

A standalone Express service for event registration, manual payment review, signed entry passes, automated delegate approval emails, and single-use venue check-in. It serves a plain HTML portal and JSON API from the same origin; the Next.js website in the parent directory also uses this API.

## Setup

Requires Node.js 20 or newer. A C++ build toolchain may be needed if `better-sqlite3` does not have a prebuilt binary for your platform.

```sh
cd entry-pass-backend
npm install
```

Copy `.env.example` to `.env`, configure the event name, two independent secrets, and server-side SMTP credentials. Generate secrets with `openssl rand -hex 32`:

```sh
cp .env.example .env
openssl rand -hex 32
```

Use one generated value for `ENTRY_SECRET` and a different value for `ADMIN_KEY`. Do not commit `.env`. Keep `ENTRY_SECRET` stable: changing it invalidates previously issued passes. `ENTRY_FEE` is the fixed amount shown to delegates.

### SMTP Email Configuration

Approval emails require server-side SMTP configuration in `.env`:

| Variable | Description | Example |
| --- | --- | --- |
| `SMTP_HOST` | Hostname of the SMTP server. If omitted or set to placeholder, email delivery is disabled gracefully without blocking approvals. | `smtp.gmail.com` / `smtp.mailgun.org` |
| `SMTP_PORT` | Port for SMTP transmission. Typically `587` (STARTTLS) or `465` (SSL). | `587` |
| `SMTP_SECURE` | Set to `true` for port 465 SSL; `false` for port 587 STARTTLS. | `false` |
| `SMTP_USER` | Username / email for SMTP authentication. | `secretariat@arkhammun.org` |
| `SMTP_PASS` | Password or app-specific password. Never commit this. | `your-smtp-password` |
| `SMTP_FROM` | Display name and sender address shown to delegates. | `"Arkham MUN Secretariat" <secretariat@arkhammun.org>` |

If `SMTP_HOST` is left blank, registrations can still be approved and entry passes issued; the admin UI displays `Email delivery: Not configured`. When SMTP is configured, delegate approval automatically emails the entry pass.

## Run

```sh
npm start
```

For automated tests:

```sh
npm test
```

Open `http://localhost:3001` (or the configured `PORT`). For automatic restarts during development, use `npm run dev`. SQLite data is stored in `data/registrations.sqlite`; uploaded proof images are stored in `uploads/`. Both are excluded from version control.

### Existing Next.js frontend

The Arkham MUN frontend in the parent directory uses `NEXT_PUBLIC_API_URL` from the root `.env.example` (default `http://localhost:3001`). Copy that file to `.env.local` in the repository root and set the deployed API URL before building. Configure `FRONTEND_ORIGINS` here to include the exact origin serving Next.js, then run the frontend from the repository root with `npm run dev` (default `http://localhost:3000`).

## User Flow

1. An admin configures event details (date, timing, venue) and uploads the payment QR in the admin interface (`/admin`).
2. A delegate submits their full name, email, phone, school/organization, and committee preference. The server creates a `pending_payment` registration.
3. The portal displays the uploaded payment QR. The user pays outside this service, then submits a transaction reference (UTR) and optionally a screenshot.
4. An admin reviews the submitted payment details and approves or rejects the submission.
5. On approval:
   - The server durably stores the approved status and cryptographically signed entry QR payload.
   - If SMTP is configured, an approval email is dispatched to the delegate containing:
     * Payment approval confirmation and amount paid.
     * The delegate's name and unique registration ID.
     * The event name, date, time, and venue snapshot locked to the pass when issued.
     * An inline embedded entry QR code image (`cid:entry-pass-qr`) and a downloadable PNG file attachment.
   - If SMTP is not configured or fails, approval and entry-pass issuance still succeed; the failure is logged and recorded in the database without rolling back approval.
   - Admins can view email delivery status (`sent`, `failed`, `not_configured`, `pending`) and trigger retries from the admin interface. Duplicate sends on retries are prevented unless explicitly forced.
6. At the venue, an admin scans the entry QR. A valid pass is marked used atomically and the scanner displays delegate and payment details; any repeat scan returns `already_used`.

## API Reference

All request and response bodies are JSON unless the route is a multipart form or PNG. Admin routes require `x-admin-key: <ADMIN_KEY>`.

| Method and path | Access | Purpose |
| --- | --- | --- |
| `GET /api/event` | Public | Returns event details, fixed amount, payment QR URL, and whether registration is open. |
| `GET /api/payment-qr.png` | Public | Displays the payment QR uploaded by an admin. |
| `POST /api/registrations` | Public | JSON `{ name, email, phone, organization, committee }`; returns `{ id, amount }` with HTTP 201. All delegate fields are required. |
| `GET /api/registrations/:id` | Public | Returns only `{ id, amount, status }`; status is `pending_payment`, `payment_submitted`, `approved`, or `rejected`. |
| `POST /api/registrations/:id/payment-proof` | Public | Multipart fields `utr` (required) and `screenshot` (optional image, maximum 5 MB); moves a pending registration to `payment_submitted`. |
| `GET /api/registrations/:id/entry-qr` | Public | After approval, returns `{ payload, qr, registrationId, event }`, where `qr` is a PNG data URL. |
| `GET /api/admin/registrations?status=<status>` | Admin | Returns `{ registrations }`, including payment proof screenshot URL, delegate details, and email delivery status (`email_status`, `email_sent_at`, `email_error`). Status filter defaults to `payment_submitted`. |
| `GET /api/admin/settings` | Admin | Returns configured event details and whether a payment QR has been uploaded. |
| `PUT /api/admin/settings` | Admin | Saves event `name`, `date`, `time`, and `venue`. |
| `POST /api/admin/payment-qr` | Admin | Multipart image field `paymentQr`; uploads/replaces the public payment QR (maximum 5 MB). |
| `POST /api/admin/registrations/:id/approve` | Admin | Approves a submitted payment, stores signed entry payload, and dispatches approval email. Returns `{ id, status: "approved", email: { status, sentAt, error } }`. |
| `POST /api/admin/registrations/:id/retry-email` | Admin | Retries sending the approval email for an approved registration. Returns 409 if already sent (unless `{ force: true }` is provided). Returns 502/503 on send failure without altering approval state. |
| `POST /api/admin/registrations/:id/reject` | Admin | JSON `{ "reason": "..." }`; rejects a submitted payment. |
| `POST /api/entry/verify` | Admin | JSON `{ "payload": "..." }`; returns `{ valid: true, registration }` once, `{ valid: false, reason: "invalid" }` for invalid passes, or HTTP 409 `{ valid: false, reason: "already_used", name }` for a repeat scan. |
| `GET /uploads/:filename` | Admin | Serves an uploaded screenshot. Protected by `x-admin-key`. |

## Reliability & Security

- **Database Migrations**: Automatic PRAGMA schema inspection adds `email_status`, `email_sent_at`, and `email_error` columns to older SQLite databases without data loss.
- **Outage Protection**: If the SMTP provider times out or throws an error, the database preserves the approved registration and pass; the admin interface shows the sanitized error and permits email retries.
- **Credential Safety**: SMTP credentials, signing keys, and admin keys are never exposed in logs, responses, or client-side bundles. Error messages sanitize sensitive tokens and passwords before storage.
- **Pass Immutability**: Event details in the entry pass QR and approval email are frozen to the snapshot at the time the pass was issued. Subsequent modifications to event settings in the admin panel do not alter already-issued passes.
- **Duplicate Prevention**: Email retry checks confirm whether an email was previously marked `sent`, blocking unintentional duplicate emails unless an admin explicitly supplies `{ force: true }`.

## Before a Real Launch

1. **Supply Production SMTP Credentials**: Real credentials for your mail provider must be configured as environment variables on the production server.
2. **Configure Event Settings & Payment QR**: An admin must log into `/admin`, set the actual conference date, timings, venue, and upload the official UPI payment QR code before opening delegate registration.
3. **Admin Authentication**: Replace the shared `ADMIN_KEY` header with session-based administrative user accounts and two-factor authentication for production deployments.
4. **HTTPS Enforcement**: Venue camera scanning via `getUserMedia` requires a secure HTTPS origin in production.