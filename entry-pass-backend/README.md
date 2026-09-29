# Entry Pass Backend

A standalone Express service for event registration, manual UPI payment review, signed entry passes, and single-use venue check-in. It serves its plain HTML portal and JSON API from the same origin. The Next.js site in the parent directory is unchanged.

## Setup

Requires Node.js 20. A C++ build toolchain may be needed if `better-sqlite3` does not have a prebuilt binary for your platform.

```sh
cd entry-pass-backend
npm install
```

Copy `.env.example` to `.env`, then configure the event's payment details and two independent secrets. Generate secrets with `openssl rand -hex 32`:

```sh
cp .env.example .env
openssl rand -hex 32
```

Use one generated value for `ENTRY_SECRET` and a different value for `ADMIN_KEY`. Do not commit `.env`. Keep `ENTRY_SECRET` stable: changing it invalidates previously issued passes. Set `ENTRY_FEE`, `ADMIN_UPI_ID`, and `ADMIN_NAME` to the values shown to delegates.

## Run

```sh
npm start
```

Open `http://localhost:3001` (or the configured `PORT`). For automatic restarts during development, use `npm run dev`. SQLite data is stored in `data/registrations.sqlite`; uploaded proof images are stored in `uploads/`. Both are excluded from version control.

### Existing Next.js frontend

The Arkham MUN frontend in the parent directory uses `NEXT_PUBLIC_API_URL` from the root `.env.example` (default `http://localhost:3001`). Copy that file to `.env.local` in the repository root and set the deployed API URL before building. Configure `FRONTEND_ORIGINS` here to include the exact origin serving Next.js, then run the frontend from the repository root with `npm run dev` (default `http://localhost:3000`).

## User Flow

1. A user submits their name and contact. The server creates a `pending_payment` registration and returns the amount and UPI payment string.
2. The portal displays the admin's payment QR. The user pays outside this service, then submits a UTR and optionally an image screenshot.
3. An admin reviews the self-reported details and approves or rejects them.
4. Approval creates a signed entry QR. The user can refresh their status or wait for polling to display it.
5. At the venue, an admin scans the entry QR. A valid pass is marked used atomically; a later scan returns `already_used`.

## API Reference

All request and response bodies are JSON unless the route is a multipart form or PNG. Admin routes require `x-admin-key: <ADMIN_KEY>`.

| Method and path | Access | Purpose |
| --- | --- | --- |
| `POST /api/registrations` | Public | JSON `{ "name": "...", "contact": "..." }`; returns `{ id, amount, upiString }` with HTTP 201. |
| `GET /api/registrations/:id` | Public | Returns only `{ id, amount, status }`; status is `pending_payment`, `payment_submitted`, `approved`, or `rejected`. |
| `GET /api/registrations/:id/payment-qr.png` | Public | PNG for the admin's UPI payment deep link. |
| `POST /api/registrations/:id/payment-proof` | Public | Multipart fields `utr` (required) and `screenshot` (optional image, maximum 5 MB); moves a pending registration to `payment_submitted`. |
| `GET /api/registrations/:id/entry-qr` | Public | After approval, returns `{ payload, qr }`, where `qr` is a PNG data URL. |
| `GET /api/admin/registrations?status=payment_submitted` | Admin | Returns `{ registrations }`, including `screenshot_url`. Other supported statuses can be selected with `status`. |
| `POST /api/admin/registrations/:id/approve` | Admin | Approves a submitted payment and stores its signed entry payload. |
| `POST /api/admin/registrations/:id/reject` | Admin | JSON `{ "reason": "..." }`; rejects a submitted payment. |
| `POST /api/entry/verify` | Admin | JSON `{ "payload": "..." }`; returns `{ valid: true, name }` once, `{ valid: false, reason: "invalid" }` for invalid passes, or HTTP 409 `{ valid: false, reason: "already_used", name }` for a repeat scan. |
| `GET /uploads/:filename` | Admin | Serves an uploaded screenshot. This route is protected by the same admin key. |

Invalid or missing IDs return HTTP 404. Invalid state transitions return HTTP 409. Uploads that exceed 5 MB return HTTP 413. Rejection requires a non-empty reason. The signed QR contains a base64url JSON body (`id`, `name`, `issuedAt`) and an HMAC-SHA256 signature; the entry signing secret is never returned by the API.

## Before a Real Launch

### No payment-gateway integration

The service only stores the UTR and optional screenshot that a user self-reports. An admin must still eyeball the submitted details against the event's bank or UPI app before approving. An uploaded screenshot is not proof of settlement.

### Shared-key admin authentication

Admin API and screenshot access use one shared `ADMIN_KEY`. This is a temporary gate, not individual accounts, role management, or a revocable session system. The code marks the middleware with a reminder to replace it with real login/session authentication before launch.

### Camera scanning requires HTTPS in production

Browser camera access through `getUserMedia` requires a secure context. Localhost is allowed for development; deploy the portal over HTTPS for venue scanning.

Also plan operational backups for the SQLite database and uploads, rotate secrets deliberately, and review privacy/retention requirements for contact details and payment screenshots before collecting real users' data.