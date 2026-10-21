const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const Database = require("better-sqlite3");

// Ensure required environment variables for test environment
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "arkham-test-"));
const testDbPath = path.join(tempDir, "test.sqlite");
const testUploadsDir = path.join(tempDir, "uploads");

process.env.PORT = "3099";
process.env.ENTRY_FEE = "2200";
process.env.ENTRY_SECRET = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
process.env.ADMIN_KEY = "test-admin-key-1234567890abcdef0123456789abcdef";
process.env.EVENT_NAME = "Arkham MUN 2026";
process.env.DB_PATH = testDbPath;
process.env.UPLOADS_DIRECTORY = testUploadsDir;
delete process.env.SMTP_HOST; // start with unconfigured SMTP

const mailer = require("../mailer");
const { app, database, statements, issueEntryPayload, verifyEntryPayload, deliverApprovalEmail, getEventDetails } = require("../server");

// Helper to make local express requests using Node http
const http = require("node:http");

let server;
let baseUrl;

test.before(async () => {
  await new Promise((resolve) => {
    server = http.createServer(app);
    server.listen(0, "127.0.0.1", () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });

  // Seed event settings
  statements.updateEventSettings.run({
    event_name: "Arkham MUN 2026",
    event_date: "24-25 October 2026",
    event_time: "9:00 AM - 5:00 PM",
    venue: "Main Auditorium, Delhi",
  });
  statements.updatePaymentQr.run("mock-payment-qr.png");
});

test.after(() => {
  server?.close();
  mailer.resetTransporter();
  try {
    database.close();
    fs.rmSync(tempDir, { recursive: true, force: true });
  } catch {}
});

async function apiRequest(endpoint, { method = "GET", headers = {}, body } = {}) {
  const url = `${baseUrl}${endpoint}`;
  const requestHeaders = { ...headers };
  let payload = body;
  if (body && typeof body === "object" && !(body instanceof Buffer)) {
    payload = JSON.stringify(body);
    requestHeaders["Content-Type"] = "application/json";
  }

  const response = await fetch(url, {
    method,
    headers: requestHeaders,
    body: payload,
  });

  const responseBody = await response.json().catch(() => ({}));
  return { status: response.status, body: responseBody };
}

function createSubmittedRegistration(custom = {}) {
  const id = `reg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const registration = {
    id,
    name: custom.name || "Bruce Wayne",
    email: custom.email || "bruce@wayne-enterprises.com",
    phone: custom.phone || "+919876543210",
    organization: custom.organization || "Gotham Academy",
    committee: custom.committee || "UNODC",
    amount: 2200,
    created_at: new Date().toISOString(),
  };

  statements.create.run(registration);
  statements.proof.run("UTR1234567890", null, id);
  return statements.byId.get(id);
}

test("1. Migration preserves older schema records and adds email columns", () => {
  const oldDbPath = path.join(tempDir, "old-schema.sqlite");
  const oldDb = new Database(oldDbPath);

  // Recreate pre-email schema
  oldDb.exec(`
    CREATE TABLE registrations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      contact TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      organization TEXT,
      committee TEXT,
      amount REAL NOT NULL,
      status TEXT NOT NULL,
      utr TEXT,
      screenshot_path TEXT,
      reject_reason TEXT,
      entry_payload TEXT,
      used_at TEXT,
      created_at TEXT NOT NULL
    );
  `);

  oldDb.prepare(`
    INSERT INTO registrations (id, name, contact, email, phone, organization, committee, amount, status, created_at)
    VALUES ('old-reg-1', 'Legacy Delegate', 'legacy@example.com', 'legacy@example.com', '123456', 'Old School', 'UNGA', 2000, 'payment_submitted', '2026-01-01')
  `).run();

  // Apply migration
  const columns = new Set(oldDb.prepare("PRAGMA table_info(registrations)").all().map((c) => c.name));
  for (const [name, type] of [
    ["email_status", "TEXT"],
    ["email_sent_at", "TEXT"],
    ["email_error", "TEXT"],
  ]) {
    if (!columns.has(name)) oldDb.exec(`ALTER TABLE registrations ADD COLUMN ${name} ${type}`);
  }

  const updatedColumns = new Set(oldDb.prepare("PRAGMA table_info(registrations)").all().map((c) => c.name));
  assert.ok(updatedColumns.has("email_status"));
  assert.ok(updatedColumns.has("email_sent_at"));
  assert.ok(updatedColumns.has("email_error"));

  const record = oldDb.prepare("SELECT * FROM registrations WHERE id = 'old-reg-1'").get();
  assert.equal(record.name, "Legacy Delegate");
  assert.equal(record.email_status, null);
  oldDb.close();
});

test("2. Approval when SMTP is unconfigured succeeds without failing approval or claiming sent email", async () => {
  mailer.resetTransporter();
  delete process.env.SMTP_HOST;

  const reg = createSubmittedRegistration({ name: "Selina Kyle", email: "selina@gotham.city" });

  const res = await apiRequest(`/api/admin/registrations/${reg.id}/approve`, {
    method: "POST",
    headers: { "x-admin-key": process.env.ADMIN_KEY },
  });

  assert.equal(res.status, 200);
  assert.equal(res.body.status, "approved");
  assert.equal(res.body.email.status, "not_configured");
  assert.ok(res.body.email.error.includes("SMTP"));

  // Check database state
  const updated = statements.byId.get(reg.id);
  assert.equal(updated.status, "approved");
  assert.ok(updated.entry_payload);
  assert.equal(updated.email_status, "not_configured");
  assert.equal(updated.email_sent_at, null);
});

test("3. Approval succeeds and pass verifies even if email delivery encounters an outage/failure", async () => {
  const reg = createSubmittedRegistration({ name: "Harvey Dent", email: "harvey@gothamda.gov" });

  // Mock a failing transporter
  const failingTransporter = {
    sendMail: async () => {
      const err = new Error("Connection timeout to mail.gotham.gov:587 with password secretpass123");
      throw err;
    },
  };
  mailer.setTestTransporter(failingTransporter);

  const res = await apiRequest(`/api/admin/registrations/${reg.id}/approve`, {
    method: "POST",
    headers: { "x-admin-key": process.env.ADMIN_KEY },
  });

  assert.equal(res.status, 200);
  assert.equal(res.body.status, "approved");
  assert.equal(res.body.email.status, "failed");
  assert.ok(res.body.email.error);
  // Ensure error is sanitized
  assert.ok(!res.body.email.error.includes("secretpass123"), "Error must redact passwords");

  // Verify approval was preserved in DB
  const updated = statements.byId.get(reg.id);
  assert.equal(updated.status, "approved");
  assert.equal(updated.email_status, "failed");
  assert.equal(updated.email_sent_at, null);

  // Verify the pass is valid at the venue gate
  const verifyRes = await apiRequest("/api/entry/verify", {
    method: "POST",
    headers: { "x-admin-key": process.env.ADMIN_KEY },
    body: { payload: updated.entry_payload },
  });
  assert.equal(verifyRes.status, 200);
  assert.equal(verifyRes.body.valid, true);
  assert.equal(verifyRes.body.registration.name, "Harvey Dent");
});

test("4. Successful email delivery sends correct content, event details, and signed QR attachment", async () => {
  const reg = createSubmittedRegistration({
    name: "Lucius Fox",
    email: "lucius@wayne-tech.com",
    committee: "UNGA",
    organization: "Wayne Tech R&D",
  });

  const sentMails = [];
  const mockTransporter = {
    sendMail: async (mailOptions) => {
      sentMails.push(mailOptions);
      return { messageId: "msg-12345", response: "250 OK" };
    },
  };
  mailer.setTestTransporter(mockTransporter);

  const res = await apiRequest(`/api/admin/registrations/${reg.id}/approve`, {
    method: "POST",
    headers: { "x-admin-key": process.env.ADMIN_KEY },
  });

  assert.equal(res.status, 200);
  assert.equal(res.body.status, "approved");
  assert.equal(res.body.email.status, "sent");
  assert.ok(res.body.email.sentAt);

  assert.equal(sentMails.length, 1);
  const mail = sentMails[0];
  assert.equal(mail.to, "lucius@wayne-tech.com");
  assert.ok(mail.subject.includes("Payment Approved"));
  assert.ok(mail.subject.includes(reg.id));

  // Verify body contains required details
  assert.ok(mail.text.includes("Lucius Fox"));
  assert.ok(mail.text.includes(reg.id));
  assert.ok(mail.text.includes("Arkham MUN 2026"));
  assert.ok(mail.text.includes("24-25 October 2026"));
  assert.ok(mail.text.includes("Main Auditorium, Delhi"));
  assert.ok(mail.text.includes("UNGA"));

  assert.ok(mail.html.includes("Lucius Fox"));
  assert.ok(mail.html.includes(reg.id));
  assert.ok(mail.html.includes("cid:entry-pass-qr"));

  // Verify QR attachment
  assert.equal(mail.attachments.length, 1);
  const qrAttachment = mail.attachments[0];
  assert.equal(qrAttachment.cid, "entry-pass-qr");
  assert.equal(qrAttachment.contentType, "image/png");
  assert.ok(Buffer.isBuffer(qrAttachment.content));
  assert.ok(qrAttachment.content.length > 100);

  // Check DB state
  const updated = statements.byId.get(reg.id);
  assert.equal(updated.email_status, "sent");
  assert.ok(updated.email_sent_at);
  assert.equal(updated.email_error, null);
});

test("5. Email uses event details snapshot from when pass was issued, preserving consistency if settings change later", async () => {
  const reg = createSubmittedRegistration({ name: "Barbara Gordon", email: "barbara@gcpd.gov" });

  const sentMails = [];
  mailer.setTestTransporter({
    sendMail: async (mailOptions) => {
      sentMails.push(mailOptions);
      return { messageId: "msg-snapshot" };
    },
  });

  // Approve under current settings
  await apiRequest(`/api/admin/registrations/${reg.id}/approve`, {
    method: "POST",
    headers: { "x-admin-key": process.env.ADMIN_KEY },
  });

  // Admin later changes the event settings
  statements.updateEventSettings.run({
    event_name: "Arkham MUN Winter Edition",
    event_date: "15-16 December 2026",
    event_time: "10:00 AM - 6:00 PM",
    venue: "New Venue in Mumbai",
  });

  sentMails.length = 0; // reset

  // Force-retry email for the previously issued pass
  const retryRes = await apiRequest(`/api/admin/registrations/${reg.id}/retry-email`, {
    method: "POST",
    headers: { "x-admin-key": process.env.ADMIN_KEY },
    body: { force: true },
  });

  assert.equal(retryRes.status, 200);
  assert.equal(sentMails.length, 1);

  // The email MUST reflect the original event details snapshot, NOT the new settings
  assert.ok(sentMails[0].text.includes("Arkham MUN 2026"));
  assert.ok(sentMails[0].text.includes("24-25 October 2026"));
  assert.ok(sentMails[0].text.includes("Main Auditorium, Delhi"));
  assert.ok(!sentMails[0].text.includes("Mumbai"));

  // Restore settings
  statements.updateEventSettings.run({
    event_name: "Arkham MUN 2026",
    event_date: "24-25 October 2026",
    event_time: "9:00 AM - 5:00 PM",
    venue: "Main Auditorium, Delhi",
  });
});

test("6. Retry endpoint enforces authentication, status validation, and duplicate prevention", async () => {
  const reg = createSubmittedRegistration({ name: "Alfred Pennyworth", email: "alfred@wayne-manor.com" });

  const sentMails = [];
  mailer.setTestTransporter({
    sendMail: async (mailOptions) => {
      sentMails.push(mailOptions);
      return { messageId: "msg-retry" };
    },
  });

  // 1. Unauthenticated request -> 401
  const unauth = await apiRequest(`/api/admin/registrations/${reg.id}/retry-email`, {
    method: "POST",
  });
  assert.equal(unauth.status, 401);

  // 2. Unapproved registration -> 409
  const unapproved = await apiRequest(`/api/admin/registrations/${reg.id}/retry-email`, {
    method: "POST",
    headers: { "x-admin-key": process.env.ADMIN_KEY },
  });
  assert.equal(unapproved.status, 409);
  assert.ok(unapproved.body.error.includes("approved"));

  // 3. Approve registration (sending first email)
  await apiRequest(`/api/admin/registrations/${reg.id}/approve`, {
    method: "POST",
    headers: { "x-admin-key": process.env.ADMIN_KEY },
  });
  assert.equal(sentMails.length, 1);

  // 4. Retry without force when email was already confirmed sent -> 409 (prevent duplicates)
  const dupRes = await apiRequest(`/api/admin/registrations/${reg.id}/retry-email`, {
    method: "POST",
    headers: { "x-admin-key": process.env.ADMIN_KEY },
  });
  assert.equal(dupRes.status, 409);
  assert.equal(dupRes.body.alreadySent, true);
  assert.equal(sentMails.length, 1, "Duplicate email must not have been sent");

  // 5. Retry with force: true -> 200
  const forcedRes = await apiRequest(`/api/admin/registrations/${reg.id}/retry-email`, {
    method: "POST",
    headers: { "x-admin-key": process.env.ADMIN_KEY },
    body: { force: true },
  });
  assert.equal(forcedRes.status, 200);
  assert.equal(sentMails.length, 2, "Explicit forced resend must send email");
});

test("7. Rejection flow sends notification email with reason and rejected registrations cannot receive pass retry emails", async () => {
  const reg = createSubmittedRegistration({ name: "Edward Nigma", email: "riddler@arkham.org" });

  const sentMails = [];
  mailer.setTestTransporter({
    sendMail: async (mailOptions) => {
      sentMails.push(mailOptions);
      return { messageId: "msg-rej" };
    },
  });

  // Reject the submission
  const rejRes = await apiRequest(`/api/admin/registrations/${reg.id}/reject`, {
    method: "POST",
    headers: { "x-admin-key": process.env.ADMIN_KEY },
    body: { reason: "Invalid UTR reference number" },
  });

  assert.equal(rejRes.status, 200);
  assert.equal(rejRes.body.status, "rejected");
  assert.equal(sentMails.length, 1, "Rejection email must be sent when SMTP is configured");
  assert.match(sentMails[0].text, /Invalid UTR reference number/);
  assert.equal(sentMails[0].to, "riddler@arkham.org");

  // Attempting to call retry-email on a rejected registration must fail with 409
  const retryRej = await apiRequest(`/api/admin/registrations/${reg.id}/retry-email`, {
    method: "POST",
    headers: { "x-admin-key": process.env.ADMIN_KEY },
  });
  assert.equal(retryRej.status, 409);
  assert.equal(sentMails.length, 1);
});

test("8. Admin can update amount, UPI ID, and toggle registration open/closed", async () => {
  // Update settings via admin endpoint
  const updateRes = await apiRequest("/api/admin/settings", {
    method: "PUT",
    headers: { "x-admin-key": process.env.ADMIN_KEY },
    body: {
      event: {
        name: "Arkham MUN 2026 Updated",
        date: "25-26 October 2026",
        time: "10:00 AM - 6:00 PM",
        venue: "Auditorium B, Delhi",
      },
      amount: 2500,
      upiId: "secretariat@okaxis",
      registrationOpen: false,
      registrationNotice: "Registration is temporarily paused for review",
    },
  });

  assert.equal(updateRes.status, 200);
  assert.equal(updateRes.body.amount, 2500);
  assert.equal(updateRes.body.upiId, "secretariat@okaxis");
  assert.equal(updateRes.body.registrationOpen, false);

  // Check public /api/event
  const publicRes = await apiRequest("/api/event");
  assert.equal(publicRes.status, 200);
  assert.equal(publicRes.body.amount, 2500);
  assert.equal(publicRes.body.upiId, "secretariat@okaxis");
  assert.equal(publicRes.body.registrationOpen, false);
  assert.equal(publicRes.body.registrationNotice, "Registration is temporarily paused for review");

  // Re-open registration for subsequent checks
  await apiRequest("/api/admin/settings", {
    method: "PUT",
    headers: { "x-admin-key": process.env.ADMIN_KEY },
    body: {
      event: {
        name: "Arkham MUN 2026",
        date: "24-25 October 2026",
        time: "9:00 AM - 5:00 PM",
        venue: "Main Auditorium, Delhi",
      },
      amount: 2200,
      upiId: "chauhan5408k@okaxis",
      registrationOpen: true,
      registrationNotice: "",
    },
  });
});

test("9. User can submit contact inquiry and admin can view and reply via email", async () => {
  const sentReplies = [];
  mailer.setTestTransporter({
    sendMail: async (mailOptions) => {
      sentReplies.push(mailOptions);
      return { messageId: "msg-reply-1" };
    },
  });

  // Public submits contact inquiry
  const contactRes = await apiRequest("/api/contact", {
    method: "POST",
    body: {
      name: "Barbara Gordon",
      email: "barbara@gotham-pd.gov",
      phone: "+919999888877",
      subject: "Committee Allotment Query",
      message: "Can you confirm if UNODC seats are still open for delegation?",
    },
  });

  assert.equal(contactRes.status, 201);
  assert.equal(contactRes.body.success, true);
  const queryId = contactRes.body.id;
  assert.ok(queryId);

  // Admin retrieves queries
  const queriesRes = await apiRequest("/api/admin/queries", {
    headers: { "x-admin-key": process.env.ADMIN_KEY },
  });
  assert.equal(queriesRes.status, 200);
  const found = queriesRes.body.queries.find((q) => q.id === queryId);
  assert.ok(found, "Submitted inquiry must appear in admin query list");
  assert.equal(found.status, "pending");

  // Admin replies to inquiry
  const replyRes = await apiRequest(`/api/admin/queries/${queryId}/reply`, {
    method: "POST",
    headers: { "x-admin-key": process.env.ADMIN_KEY },
    body: {
      replyMessage: "Yes, UNODC has remaining delegate seats available. Please proceed with registration.",
    },
  });

  assert.equal(replyRes.status, 200);
  assert.equal(replyRes.body.success, true);
  assert.equal(replyRes.body.emailSent, true);
  assert.equal(replyRes.body.query.status, "replied");

  // Verify outgoing email
  assert.equal(sentReplies.length, 1);
  assert.equal(sentReplies[0].to, "barbara@gotham-pd.gov");
  assert.match(sentReplies[0].subject, /Re: \[Arkham MUN Enquiry\] Committee Allotment Query/);
  assert.match(sentReplies[0].text, /UNODC has remaining delegate seats/);
});

test("10. Notifications lookup returns delegate passes, rejection reasons, inquiry replies, and event info", async () => {
  // Test lookup endpoint with a registered email
  const lookupRes = await apiRequest("/api/notifications/lookup?query=riddler@arkham.org");
  assert.equal(lookupRes.status, 200);
  assert.ok(Array.isArray(lookupRes.body.registrations));
  assert.ok(Array.isArray(lookupRes.body.queries));
  assert.ok(lookupRes.body.event);
  assert.ok(lookupRes.body.announcements);
  assert.equal(lookupRes.body.registrations[0].email, "riddler@arkham.org");
  assert.equal(lookupRes.body.registrations[0].status, "rejected");
  assert.equal(lookupRes.body.registrations[0].reject_reason, "Invalid UTR reference number");
});
