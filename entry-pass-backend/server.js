const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

require("dotenv").config();

const express = require("express");
const multer = require("multer");
const QRCode = require("qrcode");
const Database = require("better-sqlite3");
const mailer = require("./mailer");

const app = express();
const port = Number(process.env.PORT || 3001);
const frontendOrigins = new Set((process.env.FRONTEND_ORIGINS || "http://localhost:3000,http://127.0.0.1:3000").split(",").map((origin) => origin.trim()).filter(Boolean));
const entryFee = Number(process.env.ENTRY_FEE);
const publicDirectory = path.join(__dirname, "public");
const uploadsDirectory = process.env.UPLOADS_DIRECTORY || path.join(__dirname, "uploads");
const dataDirectory = process.env.DATA_DIRECTORY || path.join(__dirname, "data");
const dbPath = process.env.DB_PATH || path.join(dataDirectory, "registrations.sqlite");

for (const variable of ["ENTRY_FEE", "ENTRY_SECRET", "ADMIN_KEY"]) {
  if (!process.env[variable]) throw new Error(`Missing required environment variable: ${variable}`);
}
if (!Number.isFinite(entryFee) || entryFee <= 0) throw new Error("ENTRY_FEE must be a positive number");

fs.mkdirSync(uploadsDirectory, { recursive: true });
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const database = new Database(dbPath);
database.pragma("journal_mode = WAL");
database.exec(`
  CREATE TABLE IF NOT EXISTS registrations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    contact TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    organization TEXT,
    committee TEXT,
    amount REAL NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending_payment', 'payment_submitted', 'approved', 'rejected')),
    utr TEXT,
    screenshot_path TEXT,
    reject_reason TEXT,
    entry_payload TEXT,
    used_at TEXT,
    created_at TEXT NOT NULL,
    email_status TEXT,
    email_sent_at TEXT,
    email_error TEXT
  );
  CREATE TABLE IF NOT EXISTS event_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    event_name TEXT NOT NULL,
    event_date TEXT NOT NULL DEFAULT '',
    event_time TEXT NOT NULL DEFAULT '',
    venue TEXT NOT NULL DEFAULT '',
    payment_qr_filename TEXT,
    entry_fee REAL,
    upi_id TEXT DEFAULT 'chauhan5408k@okaxis',
    registration_open INTEGER DEFAULT 1,
    registration_notice TEXT DEFAULT ''
  );
  CREATE TABLE IF NOT EXISTS contact_queries (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'replied')),
    reply_message TEXT,
    replied_at TEXT,
    created_at TEXT NOT NULL
  );
`);

const registrationColumns = new Set(database.prepare("PRAGMA table_info(registrations)").all().map((column) => column.name));
for (const [name, type] of [
  ["email", "TEXT"],
  ["phone", "TEXT"],
  ["organization", "TEXT"],
  ["committee", "TEXT"],
  ["email_status", "TEXT"],
  ["email_sent_at", "TEXT"],
  ["email_error", "TEXT"],
]) {
  if (!registrationColumns.has(name)) database.exec(`ALTER TABLE registrations ADD COLUMN ${name} ${type}`);
}

const eventSettingsColumns = new Set(database.prepare("PRAGMA table_info(event_settings)").all().map((column) => column.name));
for (const [name, type, defaultVal] of [
  ["entry_fee", "REAL", `${entryFee}`],
  ["upi_id", "TEXT", "'chauhan5408k@okaxis'"],
  ["registration_open", "INTEGER", "1"],
  ["registration_notice", "TEXT", "''"],
]) {
  if (!eventSettingsColumns.has(name)) database.exec(`ALTER TABLE event_settings ADD COLUMN ${name} ${type} DEFAULT ${defaultVal}`);
}

database.prepare("INSERT OR IGNORE INTO event_settings (id, event_name, event_date, event_time, venue, entry_fee, upi_id, registration_open) VALUES (1, ?, ?, ?, ?, ?, ?, 1)").run(
  process.env.EVENT_NAME || "Arkham MUN",
  process.env.EVENT_DATE || "24–25 October 2026",
  process.env.EVENT_TIME || "9:00 AM – 5:00 PM",
  process.env.EVENT_VENUE || "Central Delhi, India",
  entryFee,
  "chauhan5408k@okaxis"
);

database.prepare(`
  UPDATE event_settings
  SET event_date = CASE WHEN event_date IS NULL OR TRIM(event_date) = '' THEN ? ELSE event_date END,
      event_time = CASE WHEN event_time IS NULL OR TRIM(event_time) = '' THEN ? ELSE event_time END,
      venue = CASE WHEN venue IS NULL OR TRIM(venue) = '' THEN ? ELSE venue END
  WHERE id = 1
`).run(
  process.env.EVENT_DATE || "24–25 October 2026",
  process.env.EVENT_TIME || "9:00 AM – 5:00 PM",
  process.env.EVENT_VENUE || "Central Delhi, India"
);

const statements = {
  create: database.prepare(`
    INSERT INTO registrations (id, name, contact, email, phone, organization, committee, amount, status, created_at)
    VALUES (@id, @name, @email, @email, @phone, @organization, @committee, @amount, 'pending_payment', @created_at)
  `),
  byId: database.prepare("SELECT * FROM registrations WHERE id = ?"),
  eventSettings: database.prepare("SELECT * FROM event_settings WHERE id = 1"),
  updateEventSettings: database.prepare(`
    UPDATE event_settings
    SET event_name = @event_name, event_date = @event_date, event_time = @event_time, venue = @venue
    WHERE id = 1
  `),
  updateEventControls: database.prepare(`
    UPDATE event_settings
    SET entry_fee = @entry_fee, upi_id = @upi_id, registration_open = @registration_open, registration_notice = @registration_notice
    WHERE id = 1
  `),
  updatePaymentQr: database.prepare("UPDATE event_settings SET payment_qr_filename = ? WHERE id = 1"),
  proof: database.prepare(`
    UPDATE registrations SET utr = ?, screenshot_path = ?, reject_reason = NULL, status = 'payment_submitted'
    WHERE id = ? AND status IN ('pending_payment', 'rejected')
  `),
  queue: database.prepare(`
    SELECT id, name, contact, email, phone, organization, committee, amount, status, utr, screenshot_path, reject_reason, created_at,
           email_status, email_sent_at, email_error, used_at
    FROM registrations WHERE status = ? ORDER BY created_at ASC
  `),
  approve: database.prepare(`
    UPDATE registrations SET status = 'approved', entry_payload = ?
    WHERE id = ? AND status = 'payment_submitted'
  `),
  updateEmailStatus: database.prepare(`
    UPDATE registrations
    SET email_status = @status, email_sent_at = @sent_at, email_error = @error
    WHERE id = @id
  `),
  reject: database.prepare(`
    UPDATE registrations SET status = 'rejected', reject_reason = ?
    WHERE id = ? AND status = 'payment_submitted'
  `),
  markUsed: database.prepare(`
    UPDATE registrations SET used_at = ?
    WHERE id = ? AND status = 'approved' AND entry_payload = ? AND used_at IS NULL
  `),
  createContactQuery: database.prepare(`
    INSERT INTO contact_queries (id, name, email, phone, subject, message, status, created_at)
    VALUES (@id, @name, @email, @phone, @subject, @message, 'pending', @created_at)
  `),
  contactQueryById: database.prepare("SELECT * FROM contact_queries WHERE id = ?"),
  allContactQueries: database.prepare("SELECT * FROM contact_queries ORDER BY created_at DESC"),
  contactQueriesByStatus: database.prepare("SELECT * FROM contact_queries WHERE status = ? ORDER BY created_at DESC"),
  replyContactQuery: database.prepare(`
    UPDATE contact_queries
    SET status = 'replied', reply_message = @reply_message, replied_at = @replied_at
    WHERE id = @id
  `),
};

app.disable("x-powered-by");
app.use((request, response, next) => {
  const origin = request.get("origin");
  const isAllowedOrigin = Boolean(
    origin && (
      frontendOrigins.has(origin) ||
      process.env.NODE_ENV !== "production" ||
      origin.includes("localhost") ||
      origin.includes("127.0.0.1") ||
      origin.startsWith("http://192.168.") ||
      origin.startsWith("http://10.") ||
      origin.startsWith("http://172.")
    )
  );

  if (isAllowedOrigin) {
    response.set("Access-Control-Allow-Origin", origin);
    response.set("Vary", "Origin");
    response.set("Access-Control-Allow-Headers", "Content-Type, x-admin-key");
    response.set("Access-Control-Allow-Methods", "GET, POST, PUT, OPTIONS");
  }

  if (request.method === "OPTIONS") {
    if (isAllowedOrigin) return response.sendStatus(204);
    if (process.env.NODE_ENV !== "production") {
      response.set("Access-Control-Allow-Origin", origin || "*");
      response.set("Access-Control-Allow-Headers", "Content-Type, x-admin-key");
      response.set("Access-Control-Allow-Methods", "GET, POST, PUT, OPTIONS");
      return response.sendStatus(204);
    }
    return response.sendStatus(204);
  }
  next();
});
app.use(express.json({ limit: "32kb" }));

function requireAdminKey(request, response, next) {
  const supplied = request.get("x-admin-key") || "";
  const expected = process.env.ADMIN_KEY;
  const suppliedBuffer = Buffer.from(supplied);
  const expectedBuffer = Buffer.from(expected);
  // Replace this shared key with real login and session authentication before launch.
  if (suppliedBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(suppliedBuffer, expectedBuffer)) {
    return response.status(401).json({ error: "Unauthorized" });
  }
  next();
}

const allowedImageTypes = new Map([
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/webp", ".webp"],
  ["image/gif", ".gif"],
]);

const upload = multer({
  storage: multer.diskStorage({
    destination: uploadsDirectory,
    filename: (request, file, callback) => callback(null, `${crypto.randomUUID()}${allowedImageTypes.get(file.mimetype) || ""}`),
  }),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (request, file, callback) => {
    if (!allowedImageTypes.has(file.mimetype)) return callback(new Error("Image must be a JPEG, PNG, WebP, or GIF image"));
    callback(null, true);
  },
});

function getEventDetails() {
  const settings = statements.eventSettings.get();
  return {
    name: settings.event_name || process.env.EVENT_NAME || "Arkham MUN",
    date: settings.event_date || process.env.EVENT_DATE || "24–25 October 2026",
    time: settings.event_time || process.env.EVENT_TIME || "9:00 AM – 5:00 PM",
    venue: settings.venue || process.env.EVENT_VENUE || "Central Delhi, India",
  };
}

function issueEntryPayload(registration) {
  const body = Buffer.from(JSON.stringify({
    id: registration.id,
    name: registration.name,
    issuedAt: new Date().toISOString(),
    event: getEventDetails(),
  })).toString("base64url");
  const signature = crypto.createHmac("sha256", process.env.ENTRY_SECRET).update(body).digest("base64url");
  return `${body}.${signature}`;
}

function verifyEntryPayload(payload) {
  if (typeof payload !== "string" || payload.length > 4096) return null;
  const parts = payload.split(".");
  if (parts.length !== 2) return null;
  const [body, suppliedSignature] = parts;
  const expectedSignature = crypto.createHmac("sha256", process.env.ENTRY_SECRET).update(body).digest();
  let actualSignature;
  try {
    actualSignature = Buffer.from(suppliedSignature, "base64url");
  } catch {
    return null;
  }
  if (actualSignature.length !== expectedSignature.length || !crypto.timingSafeEqual(actualSignature, expectedSignature)) return null;
  try {
    const decoded = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (typeof decoded.id !== "string" || typeof decoded.name !== "string" || typeof decoded.issuedAt !== "string") return null;
    if (decoded.event !== undefined && (!decoded.event ||
        ["name", "date", "time", "venue"].some((field) => typeof decoded.event[field] !== "string"))) return null;
    return decoded;
  } catch {
    return null;
  }
}

app.get("/api/event", (request, response) => {
  const settings = statements.eventSettings.get();
  const defaultQrExists = fs.existsSync(path.join(uploadsDirectory, "default-payment-qr.jpg"));
  const hasQr = Boolean(settings.payment_qr_filename || defaultQrExists);
  const eventDetails = getEventDetails();
  const isConfigured = Boolean(hasQr && eventDetails.date && eventDetails.time && eventDetails.venue);
  const isOpen = Boolean(isConfigured && (settings.registration_open === null || settings.registration_open === undefined || Number(settings.registration_open) === 1));
  const currentFee = (settings.entry_fee !== null && settings.entry_fee !== undefined && Number(settings.entry_fee) > 0)
    ? Number(settings.entry_fee)
    : entryFee;

  response.json({
    event: getEventDetails(),
    amount: currentFee,
    upiId: settings.upi_id || "chauhan5408k@okaxis",
    paymentQrUrl: hasQr ? "/api/payment-qr.png" : null,
    registrationOpen: isOpen,
    registrationNotice: settings.registration_notice || "",
  });
});

app.get("/api/payment-qr.png", (request, response, next) => {
  const settings = statements.eventSettings.get();
  const filename = settings.payment_qr_filename || (fs.existsSync(path.join(uploadsDirectory, "default-payment-qr.jpg")) ? "default-payment-qr.jpg" : null);
  if (!filename) return response.status(404).json({ error: "Payment QR has not been configured" });
  response.set("X-Content-Type-Options", "nosniff").set("Cache-Control", "no-store");
  response.sendFile(path.join(uploadsDirectory, filename), (error) => {
    if (error && !response.headersSent) next(error);
  });
});

app.post("/api/registrations", (request, response) => {
  const name = typeof request.body?.name === "string" ? request.body.name.trim() : "";
  const email = typeof request.body?.email === "string" ? request.body.email.trim().toLowerCase() : "";
  const phone = typeof request.body?.phone === "string" ? request.body.phone.trim() : "";
  const organization = typeof request.body?.organization === "string" ? request.body.organization.trim() : "";
  const committee = typeof request.body?.committee === "string" ? request.body.committee.trim() : "";
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const settings = statements.eventSettings.get();
  const defaultQrExists = fs.existsSync(path.join(uploadsDirectory, "default-payment-qr.jpg"));
  const hasQr = Boolean(settings.payment_qr_filename || defaultQrExists);
  const eventDetails = getEventDetails();
  const isConfigured = Boolean(hasQr && eventDetails.date && eventDetails.time && eventDetails.venue);
  const isOpen = Boolean(isConfigured && (settings.registration_open === null || settings.registration_open === undefined || Number(settings.registration_open) === 1));

  if (!isOpen) {
    const errorMsg = !isConfigured
      ? "Registration is not open until the event details and payment QR are configured"
      : (settings.registration_notice || "Registration has been temporarily closed by the Secretariat");
    return response.status(503).json({ error: errorMsg });
  }
  if (!name || name.length > 120 || !emailPattern.test(email) || email.length > 200 ||
      !phone || phone.length > 40 || !organization || organization.length > 160 ||
      !committee || committee.length > 160) {
    return response.status(400).json({ error: "Full name, a valid email, phone, school or organization, and committee are required within the listed limits" });
  }

  const effectiveAmount = (settings.entry_fee !== null && settings.entry_fee !== undefined && Number(settings.entry_fee) > 0)
    ? Number(settings.entry_fee)
    : entryFee;

  const registration = {
    id: crypto.randomUUID(),
    name,
    email,
    phone,
    organization,
    committee,
    amount: effectiveAmount,
    created_at: new Date().toISOString(),
  };
  statements.create.run(registration);
  response.status(201).json({ id: registration.id, amount: registration.amount });
});

app.get("/api/registrations/:id", (request, response) => {
  const registration = statements.byId.get(request.params.id);
  if (!registration) return response.status(404).json({ error: "Registration not found" });
  response.json({
    id: registration.id,
    name: registration.name,
    amount: registration.amount,
    status: registration.status,
    committee: registration.committee || "",
    organization: registration.organization || "",
    reject_reason: registration.reject_reason || null,
    hasQr: Boolean(registration.status === "approved" && registration.entry_payload),
    event: getEventDetails(),
  });
});

app.post("/api/registrations/:id/payment-proof", (request, response, next) => {
  upload.single("screenshot")(request, response, (uploadError) => {
    if (uploadError) return next(uploadError);
    const utr = typeof request.body?.utr === "string" ? request.body.utr.trim() : "";
    if (!utr || utr.length > 120) {
      if (request.file) fs.unlinkSync(request.file.path);
      return response.status(400).json({ error: "A transaction reference (UTR) is required (maximum 120 characters)" });
    }
    const previous = statements.byId.get(request.params.id);
    const result = statements.proof.run(utr, request.file?.filename || null, request.params.id);
    if (!result.changes) {
      if (request.file) fs.unlinkSync(request.file.path);
      const registration = statements.byId.get(request.params.id);
      return response.status(registration ? 409 : 404).json({ error: registration ? "Payment proof can only be submitted while payment is pending or rejected" : "Registration not found" });
    }
    if (previous?.screenshot_path && previous.screenshot_path !== request.file?.filename) {
      fs.rmSync(path.join(uploadsDirectory, previous.screenshot_path), { force: true });
    }
    response.status(200).json({ id: request.params.id, status: "payment_submitted" });
  });
});

app.get("/api/registrations/:id/entry-qr", async (request, response, next) => {
  try {
    const registration = statements.byId.get(request.params.id);
    if (!registration) return response.status(404).json({ error: "Registration not found" });
    if (registration.status !== "approved" || !registration.entry_payload) {
      return response.status(409).json({ error: "Entry QR is available after approval" });
    }
    const qr = await QRCode.toDataURL(registration.entry_payload, { errorCorrectionLevel: "M", margin: 2, width: 320 });
    const decoded = verifyEntryPayload(registration.entry_payload);
    response.json({ payload: registration.entry_payload, qr, registrationId: registration.id, event: decoded.event || getEventDetails() });
  } catch (error) {
    next(error);
  }
});

app.post("/api/contact", (request, response) => {
  const name = typeof request.body?.name === "string" ? request.body.name.trim() : "";
  const email = typeof request.body?.email === "string" ? request.body.email.trim().toLowerCase() : "";
  const phone = typeof request.body?.phone === "string" ? request.body.phone.trim() : "";
  const subject = typeof request.body?.subject === "string" ? request.body.subject.trim() : "";
  const message = typeof request.body?.message === "string" ? request.body.message.trim() : "";

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!name || name.length > 120) {
    return response.status(400).json({ error: "Please provide your full name (maximum 120 characters)" });
  }
  if (!email || !emailPattern.test(email) || email.length > 200) {
    return response.status(400).json({ error: "Please provide a valid email address" });
  }
  if (!subject || subject.length > 200) {
    return response.status(400).json({ error: "Please provide a subject for your enquiry" });
  }
  if (!message || message.length > 2500) {
    return response.status(400).json({ error: "Please provide a message (up to 2500 characters)" });
  }

  const queryRecord = {
    id: `query-${crypto.randomUUID()}`,
    name,
    email,
    phone: phone || null,
    subject,
    message,
    created_at: new Date().toISOString(),
  };

  statements.createContactQuery.run(queryRecord);
  response.status(201).json({
    success: true,
    id: queryRecord.id,
    message: "Your enquiry has been received by the Secretariat.",
  });
});

app.use("/api/admin", requireAdminKey);
app.get("/api/admin/settings", (request, response) => {
  const settings = statements.eventSettings.get();
  const defaultQrExists = fs.existsSync(path.join(uploadsDirectory, "default-payment-qr.jpg"));
  const hasQr = Boolean(settings.payment_qr_filename || defaultQrExists);
  const currentFee = (settings.entry_fee !== null && settings.entry_fee !== undefined && Number(settings.entry_fee) > 0)
    ? Number(settings.entry_fee)
    : entryFee;

  response.json({
    event: getEventDetails(),
    amount: currentFee,
    upiId: settings.upi_id || "chauhan5408k@okaxis",
    registrationOpen: Boolean(settings.registration_open === null || settings.registration_open === undefined || Number(settings.registration_open) === 1),
    registrationNotice: settings.registration_notice || "",
    paymentQrConfigured: Boolean(settings.payment_qr_filename || defaultQrExists),
    paymentQrUrl: hasQr ? "/api/payment-qr.png" : null,
  });
});

app.put("/api/admin/settings", (request, response) => {
  const event = request.body?.event;
  const fields = ["name", "date", "time", "venue"];
  if (!event || fields.some((field) => typeof event[field] !== "string")) {
    return response.status(400).json({ error: "Event name, date, time, and venue are required" });
  }
  const values = {
    event_name: event.name.trim(),
    event_date: event.date.trim(),
    event_time: event.time.trim(),
    venue: event.venue.trim(),
    entry_fee: null,
    upi_id: null,
    registration_open: null,
    registration_notice: null,
  };
  if (!values.event_name || values.event_name.length > 160 ||
      !values.event_date || values.event_date.length > 120 ||
      !values.event_time || values.event_time.length > 120 ||
      !values.venue || values.venue.length > 300) {
    return response.status(400).json({ error: "Complete all event details within the allowed lengths" });
  }

  if (request.body?.amount !== undefined && request.body?.amount !== null && request.body?.amount !== "") {
    const parsedFee = Number(request.body.amount);
    if (!Number.isFinite(parsedFee) || parsedFee < 0) {
      return response.status(400).json({ error: "Amount must be a non-negative number" });
    }
    values.entry_fee = parsedFee;
  }

  if (typeof request.body?.upiId === "string") {
    values.upi_id = request.body.upiId.trim().slice(0, 100);
  }

  if (request.body?.registrationOpen !== undefined) {
    values.registration_open = request.body.registrationOpen ? 1 : 0;
  }

  if (typeof request.body?.registrationNotice === "string") {
    values.registration_notice = request.body.registrationNotice.trim().slice(0, 300);
  }

  statements.updateEventSettings.run({
    event_name: values.event_name,
    event_date: values.event_date,
    event_time: values.event_time,
    venue: values.venue,
  });

  const current = statements.eventSettings.get();
  statements.updateEventControls.run({
    entry_fee: values.entry_fee !== null ? values.entry_fee : current.entry_fee,
    upi_id: values.upi_id !== null ? values.upi_id : current.upi_id,
    registration_open: values.registration_open !== null ? values.registration_open : current.registration_open,
    registration_notice: values.registration_notice !== null ? values.registration_notice : current.registration_notice,
  });
  const updatedSettings = statements.eventSettings.get();
  response.json({
    event: getEventDetails(),
    amount: updatedSettings.entry_fee !== null ? Number(updatedSettings.entry_fee) : entryFee,
    upiId: updatedSettings.upi_id || "chauhan5408k@okaxis",
    registrationOpen: Boolean(updatedSettings.registration_open === null || Number(updatedSettings.registration_open) === 1),
    registrationNotice: updatedSettings.registration_notice || "",
    paymentQrConfigured: Boolean(updatedSettings.payment_qr_filename || fs.existsSync(path.join(uploadsDirectory, "default-payment-qr.jpg"))),
    paymentQrUrl: "/api/payment-qr.png",
  });
});

app.post("/api/admin/payment-qr", (request, response, next) => {
  upload.single("paymentQr")(request, response, (uploadError) => {
    if (uploadError) return next(uploadError);
    if (!request.file) return response.status(400).json({ error: "Select a payment QR image to upload" });
    const previousFilename = statements.eventSettings.get().payment_qr_filename;
    statements.updatePaymentQr.run(request.file.filename);
    if (previousFilename && previousFilename !== request.file.filename) {
      fs.rmSync(path.join(uploadsDirectory, previousFilename), { force: true });
    }
    response.json({ paymentQrConfigured: true, paymentQrUrl: "/api/payment-qr.png" });
  });
});

app.get("/api/admin/registrations", (request, response) => {
  const status = request.query.status || "payment_submitted";
  const allowedStatuses = new Set(["pending_payment", "payment_submitted", "approved", "rejected"]);
  if (typeof status !== "string" || !allowedStatuses.has(status)) return response.status(400).json({ error: "Invalid status filter" });
  const registrations = statements.queue.all(status).map((registration) => ({
    ...registration,
    screenshot_url: registration.screenshot_path ? `/uploads/${encodeURIComponent(registration.screenshot_path)}` : null,
  }));
  response.json({ registrations });
});

async function deliverApprovalEmail(registrationId) {
  const registration = statements.byId.get(registrationId);
  if (!registration) {
    throw new Error("Registration not found");
  }
  if (registration.status !== "approved" || !registration.entry_payload) {
    throw new Error("Only approved registrations with an entry pass can receive an email");
  }

  // Ensure event details on the pass/email are the details used when the pass was issued
  const decoded = verifyEntryPayload(registration.entry_payload);
  const event = decoded?.event || getEventDetails();

  if (!mailer.isSmtpConfigured()) {
    const errorMsg = "SMTP is not configured on the server";
    statements.updateEmailStatus.run({
      id: registration.id,
      status: "not_configured",
      sent_at: null,
      error: errorMsg,
    });
    return {
      status: "not_configured",
      error: errorMsg,
      sentAt: null,
    };
  }

  // Mark pending
  statements.updateEmailStatus.run({
    id: registration.id,
    status: "pending",
    sent_at: null,
    error: null,
  });

  try {
    const qrBuffer = await QRCode.toBuffer(registration.entry_payload, {
      errorCorrectionLevel: "M",
      margin: 2,
      width: 360,
    });

    await mailer.sendApprovalMail({
      registration,
      event,
      qrBuffer,
    });

    const sentAt = new Date().toISOString();
    statements.updateEmailStatus.run({
      id: registration.id,
      status: "sent",
      sent_at: sentAt,
      error: null,
    });

    return {
      status: "sent",
      sentAt,
      error: null,
    };
  } catch (err) {
    const sanitized = mailer.sanitizeEmailError(err);
    console.error(`Approval email delivery failed for registration ${registration.id}:`, sanitized);
    statements.updateEmailStatus.run({
      id: registration.id,
      status: "failed",
      sent_at: null,
      error: sanitized,
    });

    return {
      status: "failed",
      sentAt: null,
      error: sanitized,
    };
  }
}

app.post("/api/admin/registrations/:id/approve", async (request, response, next) => {
  try {
    const registration = statements.byId.get(request.params.id);
    if (!registration) return response.status(404).json({ error: "Registration not found" });
    if (registration.status !== "payment_submitted") return response.status(409).json({ error: "Only submitted payments can be approved" });
    const payload = issueEntryPayload(registration);
    statements.approve.run(payload, registration.id);

    // Deliver email safely after approval is committed
    const emailResult = await deliverApprovalEmail(registration.id);

    response.json({
      id: registration.id,
      status: "approved",
      email: emailResult,
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/admin/registrations/:id/retry-email", async (request, response, next) => {
  try {
    const registration = statements.byId.get(request.params.id);
    if (!registration) return response.status(404).json({ error: "Registration not found" });
    if (registration.status !== "approved" || !registration.entry_payload) {
      return response.status(409).json({ error: "Only approved registrations can be sent an entry pass email" });
    }

    const force = Boolean(request.body?.force);
    if (registration.email_status === "sent" && !force) {
      return response.status(409).json({
        error: "Email has already been confirmed sent to this delegate",
        alreadySent: true,
        email: {
          status: registration.email_status,
          sentAt: registration.email_sent_at,
          error: registration.email_error,
        },
      });
    }

    if (registration.email_status === "pending" && !force) {
      return response.status(409).json({
        error: "Email delivery is currently in progress",
        email: {
          status: "pending",
        },
      });
    }

    const emailResult = await deliverApprovalEmail(registration.id);

    if (emailResult.status === "failed") {
      return response.status(502).json({
        error: `Email delivery failed: ${emailResult.error}`,
        email: emailResult,
      });
    }

    if (emailResult.status === "not_configured") {
      return response.status(503).json({
        error: "SMTP is not configured on the server",
        email: emailResult,
      });
    }

    response.json({
      id: registration.id,
      email: emailResult,
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/admin/registrations/:id/reject", async (request, response) => {
  const reason = typeof request.body?.reason === "string" ? request.body.reason.trim() : "";
  if (!reason || reason.length > 500) return response.status(400).json({ error: "A rejection reason is required (maximum 500 characters)" });
  const result = statements.reject.run(reason, request.params.id);
  if (!result.changes) {
    const registration = statements.byId.get(request.params.id);
    return response.status(registration ? 409 : 404).json({ error: registration ? "Only submitted payments can be rejected" : "Registration not found" });
  }

  const registration = statements.byId.get(request.params.id);
  let emailResult = { status: "not_configured" };
  if (mailer.isSmtpConfigured() && registration) {
    try {
      await mailer.sendRejectionMail({
        registration,
        event: getEventDetails(),
        reason,
      });
      emailResult = { status: "sent" };
    } catch (e) {
      emailResult = { status: "failed", error: mailer.sanitizeEmailError(e) };
    }
  }

  response.json({ id: request.params.id, status: "rejected", email: emailResult });
});


app.get("/api/notifications/lookup", async (request, response) => {
  const rawQuery = typeof request.query.query === "string" ? request.query.query.trim() : "";
  const query = rawQuery.toLowerCase();
  const settings = statements.eventSettings.get();
  const event = getEventDetails();

  let registrations = [];
  let queries = [];

  if (query) {
    const rawRegs = database.prepare(`
      SELECT id, name, email, phone, organization, committee, amount, status, utr, reject_reason, entry_payload, created_at
      FROM registrations
      WHERE LOWER(email) = ? OR LOWER(id) = ?
      ORDER BY created_at DESC
    `).all(query, query);

    registrations = await Promise.all(rawRegs.map(async (reg) => {
      let qr = null;
      if (reg.status === "approved" && reg.entry_payload) {
        try {
          qr = await QRCode.toDataURL(reg.entry_payload, { errorCorrectionLevel: "M", margin: 2, width: 320 });
        } catch {
          // ignore qr error
        }
      }
      return {
        id: reg.id,
        name: reg.name,
        email: reg.email,
        phone: reg.phone,
        organization: reg.organization,
        committee: reg.committee,
        amount: reg.amount,
        status: reg.status,
        utr: reg.utr,
        reject_reason: reg.reject_reason || null,
        hasQr: Boolean(reg.status === "approved" && reg.entry_payload),
        qr,
        created_at: reg.created_at,
        event,
      };
    }));

    queries = database.prepare(`
      SELECT id, name, email, subject, message, status, reply_message, replied_at, created_at
      FROM contact_queries
      WHERE LOWER(email) = ?
      ORDER BY created_at DESC
    `).all(query);
  }

  response.json({
    query: rawQuery,
    registrations,
    queries,
    event,
    announcements: {
      registrationOpen: Boolean(settings.registration_open === null || settings.registration_open === undefined || Number(settings.registration_open) === 1),
      registrationNotice: settings.registration_notice || "",
      conferenceDates: event.date || "24–25 October 2026",
      conferenceVenue: event.venue || "Central Delhi, India",
      conferenceTimings: event.time || "9:00 AM – 5:00 PM",
      conferenceName: event.name || "Arkham MUN",
      countdownTarget: "2026-10-24T09:00:00+05:30",
    },
  });
});

app.get("/api/admin/queries", (request, response) => {
  const status = request.query.status;
  let queries;
  if (status && status !== "all") {
    queries = statements.contactQueriesByStatus.all(status);
  } else {
    queries = statements.allContactQueries.all();
  }
  response.json({ queries });
});

app.post("/api/admin/queries/:id/reply", async (request, response, next) => {
  try {
    const query = statements.contactQueryById.get(request.params.id);
    if (!query) return response.status(404).json({ error: "Query not found" });

    const replyMessage = typeof request.body?.replyMessage === "string" ? request.body.replyMessage.trim() : "";
    if (!replyMessage || replyMessage.length > 3000) {
      return response.status(400).json({ error: "Please provide a reply message (maximum 3000 characters)" });
    }

    const repliedAt = new Date().toISOString();
    statements.replyContactQuery.run({
      id: query.id,
      reply_message: replyMessage,
      replied_at: repliedAt,
    });

    let emailSent = false;
    let emailError = null;

    if (mailer.isSmtpConfigured()) {
      try {
        await mailer.sendQueryReplyMail({ query, replyMessage });
        emailSent = true;
      } catch (err) {
        emailError = mailer.sanitizeEmailError(err);
        console.error(`Reply email delivery failed for query ${query.id}:`, emailError);
      }
    } else {
      emailError = "SMTP not configured; reply saved in dashboard without outgoing email";
    }

    response.json({
      success: true,
      query: {
        ...query,
        status: "replied",
        reply_message: replyMessage,
        replied_at: repliedAt,
      },
      emailSent,
      emailError,
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/entry/verify", requireAdminKey, (request, response) => {
  const decoded = verifyEntryPayload(request.body?.payload);
  if (!decoded) return response.status(200).json({ valid: false, reason: "invalid" });
  const registration = statements.byId.get(decoded.id);
  if (!registration || registration.status !== "approved" || registration.entry_payload !== request.body.payload) {
    return response.status(200).json({ valid: false, reason: "invalid" });
  }

  const admit = request.body?.admit !== false;

  // Inspect mode: return complete delegate info without marking used
  if (!admit) {
    return response.json({
      valid: true,
      alreadyUsed: Boolean(registration.used_at),
      registration: {
        id: registration.id,
        name: registration.name,
        email: registration.email || registration.contact,
        phone: registration.phone || "",
        organization: registration.organization || "",
        committee: registration.committee || "",
        amount: registration.amount,
        utr: registration.utr,
        paymentStatus: registration.status,
        checkedInAt: registration.used_at || null,
        event: decoded.event || getEventDetails(),
      },
    });
  }

  // Admit mode: mark pass as used and admit delegate
  if (registration.used_at) {
    return response.status(409).json({ valid: false, reason: "already_used", name: registration.name });
  }

  const checkinTime = new Date().toISOString();
  const result = statements.markUsed.run(checkinTime, registration.id, request.body.payload);
  if (!result.changes) {
    return response.status(409).json({ valid: false, reason: "already_used", name: registration.name });
  }

  response.json({
    valid: true,
    alreadyUsed: false,
    registration: {
      id: registration.id,
      name: registration.name,
      email: registration.email || registration.contact,
      phone: registration.phone || "",
      organization: registration.organization || "",
      committee: registration.committee || "",
      amount: registration.amount,
      utr: registration.utr,
      paymentStatus: registration.status,
      checkedInAt: checkinTime,
      event: decoded.event || getEventDetails(),
    },
  });
});

app.get("/uploads/:filename", requireAdminKey, (request, response, next) => {
  const filename = request.params.filename;
  if (path.basename(filename) !== filename) return response.status(400).json({ error: "Invalid filename" });
  response.set("X-Content-Type-Options", "nosniff");
  response.sendFile(path.join(uploadsDirectory, filename), (error) => {
    if (error && !response.headersSent) next(error);
  });
});

app.use(express.static(publicDirectory));

app.use((error, request, response, next) => {
  if (response.headersSent) return next(error);
  if (error instanceof multer.MulterError) {
    const status = error.code === "LIMIT_FILE_SIZE" ? 413 : 400;
    return response.status(status).json({ error: error.code === "LIMIT_FILE_SIZE" ? "Screenshot exceeds the 5 MB limit" : error.message });
  }
  if (error.message?.startsWith("Image must be")) return response.status(400).json({ error: error.message });
  console.error(error);
  response.status(500).json({ error: "Internal server error" });
});

if (require.main === module) {
  app.listen(port, () => console.log(`Entry pass backend listening on http://localhost:${port}`));
}

module.exports = {
  app,
  database,
  statements,
  issueEntryPayload,
  verifyEntryPayload,
  deliverApprovalEmail,
  getEventDetails,
};