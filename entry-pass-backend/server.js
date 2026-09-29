const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

require("dotenv").config();

const express = require("express");
const multer = require("multer");
const QRCode = require("qrcode");
const Database = require("better-sqlite3");

const app = express();
const port = Number(process.env.PORT || 3001);
const frontendOrigins = new Set((process.env.FRONTEND_ORIGINS || "http://localhost:3000,http://127.0.0.1:3000").split(",").map((origin) => origin.trim()).filter(Boolean));
const entryFee = Number(process.env.ENTRY_FEE);
const publicDirectory = path.join(__dirname, "public");
const uploadsDirectory = path.join(__dirname, "uploads");
const dataDirectory = path.join(__dirname, "data");

for (const variable of ["ENTRY_FEE", "ADMIN_UPI_ID", "ADMIN_NAME", "ENTRY_SECRET", "ADMIN_KEY"]) {
  if (!process.env[variable]) throw new Error(`Missing required environment variable: ${variable}`);
}
if (!Number.isFinite(entryFee) || entryFee <= 0) throw new Error("ENTRY_FEE must be a positive number");

fs.mkdirSync(uploadsDirectory, { recursive: true });
fs.mkdirSync(dataDirectory, { recursive: true });

const database = new Database(path.join(dataDirectory, "registrations.sqlite"));
database.pragma("journal_mode = WAL");
database.exec(`
  CREATE TABLE IF NOT EXISTS registrations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    contact TEXT NOT NULL,
    amount REAL NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending_payment', 'payment_submitted', 'approved', 'rejected')),
    utr TEXT,
    screenshot_path TEXT,
    reject_reason TEXT,
    entry_payload TEXT,
    used_at TEXT,
    created_at TEXT NOT NULL
  )
`);

const statements = {
  create: database.prepare(`
    INSERT INTO registrations (id, name, contact, amount, status, created_at)
    VALUES (@id, @name, @contact, @amount, 'pending_payment', @created_at)
  `),
  byId: database.prepare("SELECT * FROM registrations WHERE id = ?"),
  proof: database.prepare(`
    UPDATE registrations SET utr = ?, screenshot_path = ?, reject_reason = NULL, status = 'payment_submitted'
    WHERE id = ? AND status IN ('pending_payment', 'rejected')
  `),
  queue: database.prepare(`
    SELECT id, name, contact, amount, status, utr, screenshot_path, created_at
    FROM registrations WHERE status = ? ORDER BY created_at ASC
  `),
  approve: database.prepare(`
    UPDATE registrations SET status = 'approved', entry_payload = ?
    WHERE id = ? AND status = 'payment_submitted'
  `),
  reject: database.prepare(`
    UPDATE registrations SET status = 'rejected', reject_reason = ?
    WHERE id = ? AND status = 'payment_submitted'
  `),
  markUsed: database.prepare(`
    UPDATE registrations SET used_at = ?
    WHERE id = ? AND status = 'approved' AND entry_payload = ? AND used_at IS NULL
  `),
};

app.disable("x-powered-by");
app.use((request, response, next) => {
  const origin = request.get("origin");
  if (origin && frontendOrigins.has(origin)) {
    response.set("Access-Control-Allow-Origin", origin);
    response.set("Vary", "Origin");
    response.set("Access-Control-Allow-Headers", "Content-Type, x-admin-key");
    response.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  }
  if (request.method === "OPTIONS") return response.sendStatus(204);
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
    if (!allowedImageTypes.has(file.mimetype)) return callback(new Error("Screenshot must be a JPEG, PNG, WebP, or GIF image"));
    callback(null, true);
  },
});

function makeUpiString() {
  const parameters = new URLSearchParams({
    pa: process.env.ADMIN_UPI_ID,
    pn: process.env.ADMIN_NAME,
    am: entryFee.toFixed(2),
    cu: "INR",
    tn: "Event entry fee",
  });
  return `upi://pay?${parameters.toString()}`;
}

function issueEntryPayload(registration) {
  const body = Buffer.from(JSON.stringify({
    id: registration.id,
    name: registration.name,
    issuedAt: new Date().toISOString(),
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
    return decoded;
  } catch {
    return null;
  }
}

app.post("/api/registrations", (request, response) => {
  const name = typeof request.body?.name === "string" ? request.body.name.trim() : "";
  const contact = typeof request.body?.contact === "string" ? request.body.contact.trim() : "";
  if (!name || name.length > 120 || !contact || contact.length > 200) {
    return response.status(400).json({ error: "Name and contact are required (maximum 120 and 200 characters)" });
  }

  const registration = {
    id: crypto.randomUUID(),
    name,
    contact,
    amount: entryFee,
    created_at: new Date().toISOString(),
  };
  statements.create.run(registration);
  response.status(201).json({ id: registration.id, amount: registration.amount, upiString: makeUpiString() });
});

app.get("/api/registrations/:id", (request, response) => {
  const registration = statements.byId.get(request.params.id);
  if (!registration) return response.status(404).json({ error: "Registration not found" });
  response.json({ id: registration.id, amount: registration.amount, status: registration.status });
});

app.get("/api/registrations/:id/payment-qr.png", async (request, response, next) => {
  try {
    if (!statements.byId.get(request.params.id)) return response.status(404).json({ error: "Registration not found" });
    response.type("png").set("Cache-Control", "no-store");
    await QRCode.toFileStream(response, makeUpiString(), { type: "png", width: 320, margin: 2 });
  } catch (error) {
    next(error);
  }
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
    response.json({ payload: registration.entry_payload, qr });
  } catch (error) {
    next(error);
  }
});

app.use("/api/admin", requireAdminKey);
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

app.post("/api/admin/registrations/:id/approve", (request, response) => {
  const registration = statements.byId.get(request.params.id);
  if (!registration) return response.status(404).json({ error: "Registration not found" });
  if (registration.status !== "payment_submitted") return response.status(409).json({ error: "Only submitted payments can be approved" });
  const payload = issueEntryPayload(registration);
  statements.approve.run(payload, registration.id);
  response.json({ id: registration.id, status: "approved" });
});

app.post("/api/admin/registrations/:id/reject", (request, response) => {
  const reason = typeof request.body?.reason === "string" ? request.body.reason.trim() : "";
  if (!reason || reason.length > 500) return response.status(400).json({ error: "A rejection reason is required (maximum 500 characters)" });
  const result = statements.reject.run(reason, request.params.id);
  if (!result.changes) {
    const registration = statements.byId.get(request.params.id);
    return response.status(registration ? 409 : 404).json({ error: registration ? "Only submitted payments can be rejected" : "Registration not found" });
  }
  response.json({ id: request.params.id, status: "rejected" });
});

app.post("/api/entry/verify", requireAdminKey, (request, response) => {
  const decoded = verifyEntryPayload(request.body?.payload);
  if (!decoded) return response.status(200).json({ valid: false, reason: "invalid" });
  const registration = statements.byId.get(decoded.id);
  if (!registration || registration.status !== "approved" || registration.entry_payload !== request.body.payload) {
    return response.status(200).json({ valid: false, reason: "invalid" });
  }
  if (registration.used_at) return response.status(409).json({ valid: false, reason: "already_used", name: registration.name });
  const result = statements.markUsed.run(new Date().toISOString(), registration.id, request.body.payload);
  if (!result.changes) return response.status(409).json({ valid: false, reason: "already_used", name: registration.name });
  response.json({ valid: true, name: registration.name });
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
  if (error.message?.startsWith("Screenshot must be")) return response.status(400).json({ error: error.message });
  console.error(error);
  response.status(500).json({ error: "Internal server error" });
});

app.listen(port, () => console.log(`Entry pass backend listening on http://localhost:${port}`));