# Entry Pass Backend

A standalone Express service for event registration, manual payment review, signed entry passes, and single-use venue check-in. It serves a plain HTML portal and JSON API from the same origin; the Next.js website in the parent directory also uses this API.

## Setup

Requires Node.js 20. A C++ build toolchain may be needed if `better-sqlite3` does not have a prebuilt binary for your platform.

```sh
cd entry-pass-backend
npm install
```

Copy `.env.example` to `.env`, configure the event name and two independent secrets, then use the admin page to set the date, timing, venue, and payment QR. Generate secrets with `openssl rand -hex 32`:

```sh
cp .env.example .env
openssl rand -hex 32
```

Use one generated value for `ENTRY_SECRET` and a different value for `ADMIN_KEY`. Do not commit `.env`. Keep `ENTRY_SECRET` stable: changing it invalidates previously issued passes. `ENTRY_FEE` is the fixed amount shown to delegates.

## Run

```sh
npm start
```

Open `http://localhost:3001` (or the configured `PORT`). For automatic restarts during development, use `npm run dev`. SQLite data is stored in `data/registrations.sqlite`; uploaded proof images are stored in `uploads/`. Both are excluded from version control.

### Existing Next.js frontend

The Arkham MUN frontend in the parent directory uses `NEXT_PUBLIC_API_URL` from the root `.env.example` (default `http://localhost:3001`). Copy that file to `.env.local` in the repository root and set the deployed API URL before building. Configure `FRONTEND_ORIGINS` here to include the exact origin serving Next.js, then run the frontend from the repository root with `npm run dev` (default `http://localhost:3000`).

## User Flow

1. An admin configures event details and uploads the payment QR in the Next.js admin page at `/admin`.
2. A user submits their full name, email, phone, school/organization, and committee before payment. The server creates a `pending_payment` registration.
3. The portal displays the uploaded payment QR. The user pays outside this service, then submits a UTR and optionally an image screenshot.
4. An admin reviews the submitted details and payment proof, then approves or rejects it.
5. Approval creates a signed entry QR and registration ID. The user can refresh their status to view the pass and event details. Email delivery is not configured yet.
6. At the venue, an admin scans the entry QR. A valid pass is marked used atomically and the scanner shows the delegate and payment details; a later scan returns `already_used`.

## API Reference

All request and response bodies are JSON unless the route is a multipart form or PNG. Admin routes require `x-admin-key: <ADMIN_KEY>`.

| Method and path | Access | Purpose |
| --- | --- | --- |
| `GET /api/event` | Public | Returns event details, fixed amount, payment QR URL, and whether registration is open. |
| `GET /api/payment-qr.png` | Public | Displays the payment QR uploaded by an admin. |
| `POST /api/registrations` | Public | JSON `{ name, email, phone, organization, committee }`; returns `{ id, amount }` with HTTP 201. All delegate fields are required. |
| `GET /api/registrations/:id` | Public | Returns only `{ id, amount, status }`; status is `pending_payment`, `payment_submitted`, `approved`, or `rejected`. |
| `POST /api/registrations/:id/payment-proof` | Public | Multipart fields `utr` (required) and `screenshot` (optional image, maximum 5 MB); moves a pending registration to `payment_submitted`. |
| `GET /api/registrations/:id/entry-qr` | Public | After approval, returns `{ payload, qr }`, where `qr` is a PNG data URL. |
| `GET /api/admin/registrations?status=payment_submitted` | Admin | Returns `{ registrations }`, including `screenshot_url`. Other supported statuses can be selected with `status`. |
| `GET /api/admin/settings` | Admin | Returns configured event details and whether a payment QR has been uploaded. |
| `PUT /api/admin/settings` | Admin | Saves event `name`, `date`, `time`, and `venue`. |
| `POST /api/admin/payment-qr` | Admin | Multipart image field `paymentQr`; uploads/replaces the public payment QR (maximum 5 MB). |
| `POST /api/admin/registrations/:id/approve` | Admin | Approves a submitted payment and stores its signed entry payload. |
| `POST /api/admin/registrations/:id/reject` | Admin | JSON `{ "reason": "..." }`; rejects a submitted payment. |
| `POST /api/entry/verify` | Admin | JSON `{ "payload": "..." }`; returns `{ valid: true, name }` once, `{ valid: false, reason: "invalid" }` for invalid passes, or HTTP 409 `{ valid: false, reason: "already_used", name }` for a repeat scan. |
| `GET /uploads/:filename` | Admin | Serves an uploaded screenshot. This route is protected by the same admin key. |

Invalid or missing IDs return HTTP 404. Invalid state transitions return HTTP 409. Uploads that exceed 5 MB return HTTP 413. Rejection requires a non-empty reason. Registration cannot open until an admin saves event details and uploads a payment QR. The signed entry QR contains the delegate's unique registration ID, name, issue time, and event details; the admin scanner uses that ID to retrieve the payment-confirmed delegate record. The payload is protected with an HMAC-SHA256 signature; the entry signing secret is never returned by the API.

## Before a Real Launch

### No payment-gateway integration

The service only stores the UTR and optional screenshot that a user self-reports. An admin must still eyeball the submitted details against the event's bank or UPI app before approving. An uploaded screenshot is not proof of settlement.

### Shared-key admin authentication

Admin API and screenshot access use one shared `ADMIN_KEY`. This is a temporary gate, not individual accounts, role management, or a revocable session system. The code marks the middleware with a reminder to replace it with real login/session authentication before launch.

### Camera scanning requires HTTPS in production

Browser camera access through `getUserMedia` requires a secure context. Localhost is allowed for development; deploy the portal over HTTPS for venue scanning.

Also plan operational backups for the SQLite database and uploads, rotate secrets deliberately, and review privacy/retention requirements for contact details and payment screenshots before collecting real users' data.