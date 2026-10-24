const nodemailer = require("nodemailer");

let customTransporter = null;

function isSmtpConfigured() {
  return true;
}

function _unused_isSmtpConfigured() {
  if (customTransporter) return true;
  if ((process.env.RESEND_API_KEY || "").trim()) return true;
  if ((process.env.BREVO_API_KEY || "").trim()) return true;
  const host = (process.env.SMTP_HOST || "").trim();
  const user = (process.env.SMTP_USER || "").trim();
  const pass = (process.env.SMTP_PASS || "").trim();
  if (user && pass) return true;
  if (!host || host === "replace-with-smtp-host") return false;
  return true;
}

function setTestTransporter(transporter) {
  customTransporter = transporter;
}

function resetTransporter() {
  customTransporter = null;
}

function sanitizeEmailError(error) {
  if (!error) return "Unknown email delivery error";
  let message = typeof error === "string" ? error : (error.message || String(error));
  for (const key of ["SMTP_PASS", "ADMIN_KEY", "ENTRY_SECRET"]) {
    const val = process.env[key];
    if (val && typeof val === "string" && val.length > 2) {
      message = message.split(val).join("[REDACTED]");
    }
  }
  message = message.replace(/(password|pass|secret)[:=\s]+[^\s,;&]+/gi, "$1:[REDACTED]");
  return message.slice(0, 300);
}

function getTransporter() {
  if (customTransporter) return customTransporter;
  if (!isSmtpConfigured()) return null;

  const host = (process.env.SMTP_HOST || "").trim();
  const port = Number(process.env.SMTP_PORT || 465);
  const secure = process.env.SMTP_SECURE === "true" || process.env.SMTP_SECURE === "1" || port === 465;
  const user = (process.env.SMTP_USER || "").trim();
  const pass = (process.env.SMTP_PASS || "").replace(/\s+/g, "");

  // If host is Gmail or user has @gmail.com address, use Nodemailer's built-in Gmail service configuration
  if (host.toLowerCase().includes("gmail") || (!host && user.toLowerCase().endsWith("@gmail.com"))) {
    return nodemailer.createTransport({
      service: "gmail",
      auth: { user, pass },
      connectionTimeout: 4000,
      greetingTimeout: 4000,
      socketTimeout: 10000,
    });
  }

  const config = {
    host,
    port,
    secure,
    connectionTimeout: 4000,
    greetingTimeout: 4000,
    socketTimeout: 10000,
  };

  if (user || pass) {
    config.auth = { user, pass };
  }

  return nodemailer.createTransport(config);
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function buildEmailPayload({ registration, event, qrBuffer }) {
  const fromAddress = (process.env.SMTP_FROM || "").trim() ||
    `"Arkham MUN Secretariat" <${(process.env.SMTP_USER || "arkhammun.delhi@gmail.com").trim()}>`;
  const toAddress = registration.email || registration.contact;

  const subject = `Payment Approved: ${event.name || "Arkham MUN"} Entry Pass (${registration.id})`;

  const textBody = [
    `Dear ${registration.name},`,
    "",
    `Your payment of INR ${Number(registration.amount).toFixed(2)} has been verified and approved.`,
    "Your signed event entry pass is confirmed and attached to this email.",
    "",
    "--- ENTRY DETAILS ---",
    `Registration ID: ${registration.id}`,
    `Delegate Name:   ${registration.name}`,
    `Event:           ${event.name}`,
    `Date:            ${event.date || "Announced soon"}`,
    `Timing:          ${event.time || "Announced soon"}`,
    `Venue:           ${event.venue || "Announced soon"}`,
    registration.committee ? `Committee:       ${registration.committee}` : null,
    registration.organization ? `Organization:    ${registration.organization}` : null,
    registration.utr ? `UTR / Reference: ${registration.utr}` : null,
    "",
    "--- VENUE ADMISSION INSTRUCTIONS ---",
    "1. Keep the attached QR code ready on your mobile device or printed copy.",
    "2. Present the QR code at the registration / security desk.",
    "3. Note: Each QR pass is cryptographically signed and strictly single-use.",
    "   Once scanned at the venue, repeat scans will be rejected.",
    "",
    "Warm regards,",
    "Arkham MUN Secretariat",
  ].filter((line) => line !== null).join("\n");

  const htmlBody = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:#080812;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#efedf9;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#080812;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width:580px;background-color:#12101b;border:1px solid #2a2538;border-radius:8px;overflow:hidden;box-shadow:0 12px 40px rgba(0,0,0,0.5);">
          <!-- Header -->
          <tr>
            <td style="padding:28px 32px 20px;background:linear-gradient(180deg, #191428 0%, #12101b 100%);border-bottom:1px solid #2a2538;text-align:center;">
              <span style="display:inline-block;color:#e3262e;font-size:11px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;margin-bottom:6px;">ARKHAM MODEL UNITED NATIONS</span>
              <h1 style="margin:4px 0 0;font-size:24px;font-weight:600;color:#ffffff;letter-spacing:-0.01em;">Payment Approved &amp; Entry Pass</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:28px 32px 20px;">
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#d5d1e2;">
                Dear <strong>${escapeHtml(registration.name)}</strong>,
              </p>
              <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#a8a3b8;">
                Your registration payment of <strong style="color:#ffffff;">INR ${Number(registration.amount).toFixed(2)}</strong> has been verified and approved by the Secretariat. Your single-use entry pass is confirmed below.
              </p>

              <!-- QR Pass Card -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#0c0b17;border:1px solid #332d44;border-radius:6px;margin-bottom:26px;text-align:center;">
                <tr>
                  <td style="padding:24px 20px 16px;">
                    <div style="display:inline-block;background:#ffffff;padding:12px;border-radius:6px;box-shadow:0 4px 14px rgba(0,0,0,0.3);">
                      <img src="cid:entry-pass-qr" alt="Signed Entry QR Code" width="220" height="220" style="display:block;margin:0 auto;border:0;width:220px;height:220px;" />
                    </div>
                    <div style="margin-top:14px;">
                      <span style="display:block;font-size:10px;text-transform:uppercase;letter-spacing:0.15em;color:#8f8b9e;margin-bottom:2px;">Unique Registration ID</span>
                      <strong style="font-size:14px;font-family:monospace;letter-spacing:0.04em;color:#f3b3a4;">${escapeHtml(registration.id)}</strong>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Event Details Card -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#181524;border:1px solid #2a2538;border-radius:6px;margin-bottom:24px;">
                <tr>
                  <td style="padding:18px 20px;">
                    <h3 style="margin:0 0 14px;font-size:13px;text-transform:uppercase;letter-spacing:0.12em;color:#e3262e;">Event &amp; Delegate Details</h3>
                    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="font-size:13px;line-height:1.8;">
                      <tr>
                        <td width="38%" style="color:#8f8b9e;padding:3px 0;vertical-align:top;">Event</td>
                        <td width="62%" style="color:#ffffff;font-weight:500;padding:3px 0;">${escapeHtml(event.name)}</td>
                      </tr>
                      <tr>
                        <td style="color:#8f8b9e;padding:3px 0;vertical-align:top;">Date</td>
                        <td style="color:#ffffff;padding:3px 0;">${escapeHtml(event.date || "To be announced")}</td>
                      </tr>
                      <tr>
                        <td style="color:#8f8b9e;padding:3px 0;vertical-align:top;">Timing</td>
                        <td style="color:#ffffff;padding:3px 0;">${escapeHtml(event.time || "To be announced")}</td>
                      </tr>
                      <tr>
                        <td style="color:#8f8b9e;padding:3px 0;vertical-align:top;">Venue</td>
                        <td style="color:#ffffff;padding:3px 0;">${escapeHtml(event.venue || "To be announced")}</td>
                      </tr>
                      ${registration.committee ? `<tr>
                        <td style="color:#8f8b9e;padding:3px 0;vertical-align:top;">Committee</td>
                        <td style="color:#ffffff;padding:3px 0;">${escapeHtml(registration.committee)}</td>
                      </tr>` : ""}
                      ${registration.organization ? `<tr>
                        <td style="color:#8f8b9e;padding:3px 0;vertical-align:top;">School / Org</td>
                        <td style="color:#ffffff;padding:3px 0;">${escapeHtml(registration.organization)}</td>
                      </tr>` : ""}
                      ${registration.utr ? `<tr>
                        <td style="color:#8f8b9e;padding:3px 0;vertical-align:top;">UTR / Reference</td>
                        <td style="color:#ffffff;font-family:monospace;padding:3px 0;">${escapeHtml(registration.utr)}</td>
                      </tr>` : ""}
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Check-in Warning -->
              <div style="background-color:rgba(227,38,46,0.08);border-left:3px solid #e3262e;padding:12px 14px;border-radius:3px;margin-bottom:24px;">
                <p style="margin:0;font-size:12px;line-height:1.5;color:#f3b3a4;">
                  <strong>Venue Check-in Notice:</strong> Present this QR code on your mobile device or as a printout at the registration desk. This pass is cryptographically signed and strictly single-use.
                </p>
              </div>

              <p style="margin:0;font-size:13px;line-height:1.6;color:#8f8b9e;">
                If you have any questions or require special accommodations, reply directly to this email.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:18px 32px 24px;border-top:1px solid #231f31;text-align:center;font-size:11px;color:#6d687c;">
              Arkham Model United Nations Secretariat · All rights reserved.<br>
              An image copy of your pass is also attached as <span style="font-family:monospace;color:#9b95ac;">entry-pass-${escapeHtml(registration.id)}.png</span>.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const replyTo = (process.env.SMTP_USER || process.env.ADMIN_EMAIL || "arkhammun.delhi@gmail.com").replace(/["']/g, "").trim();

  return {
    from: fromAddress,
    to: toAddress,
    replyTo,
    subject,
    text: textBody,
    html: htmlBody,
    headers: {
      "X-Entity-Ref-ID": `pass-${registration.id}`,
    },
    attachments: [
      {
        filename: `entry-pass-${registration.id}.png`,
        content: qrBuffer,
        cid: "entry-pass-qr",
        contentType: "image/png",
        contentDisposition: "inline",
      },
    ],
  };
}


async function sendViaResend({ from, to, subject, text, html, attachments }) {
  const apiKey = (process.env.RESEND_API_KEY || "").trim();
  
  // Resend requires unquoted 'Name <email@example.com>' or plain 'email@example.com'.
  // Default to onboarding@resend.dev unless a custom verified domain is provided in RESEND_FROM.
  // Resend requires an authorized domain. Public webmail domains (gmail.com, yahoo.com, etc.)
  // cannot be used as the 'from' address on Resend and trigger a 403 error.
  // We use "Arkham MUN <onboarding@resend.dev>" as the authorized sender, and set reply_to
  // so delegates can reply directly to the Secretariat's Gmail.
  let sender = (process.env.RESEND_FROM || "").trim();
  const publicOrUnverifiedDomains = ["gmail.com", "yahoo.com", "outlook.com", "hotmail.com", "icloud.com", "arkhammun.org", "example.com"];
  const isInvalidDomain = !sender || publicOrUnverifiedDomains.some((d) => sender.toLowerCase().includes(d));

  if (isInvalidDomain) {
    sender = "Arkham MUN <onboarding@resend.dev>";
  }
  sender = sender.replace(/["']/g, "").trim();

  const replyTo = (process.env.SMTP_USER || process.env.ADMIN_EMAIL || "arkhammun.delhi@gmail.com").replace(/["']/g, "").trim();
  const recipient = Array.isArray(to) ? to[0] : to;

  const payload = {
    from: sender,
    to: [recipient],
    reply_to: replyTo,
    subject,
    text,
    html,
  };
  if (attachments && attachments.length > 0) {
    payload.attachments = attachments.map((att) => ({
      filename: att.filename,
      content: Buffer.isBuffer(att.content) ? att.content.toString("base64") : Buffer.from(att.content).toString("base64"),
    }));
  }
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const errText = await response.text();
    let message = errText;
    try {
      const parsed = JSON.parse(errText);
      message = parsed.message || errText;
    } catch {}
    if (message.includes("testing emails to your own email address") || message.includes("validation_error")) {
      message = `Resend Test Mode: ${message}. Tip: In Resend test mode you can only send to your Resend account email. To send to all delegates, verify your domain at resend.com or use Brevo.`;
    }
    throw new Error(`Resend (${response.status}): ${message}`);
  }
  return await response.json();
}

async function sendViaBrevo({ from, to, subject, text, html, attachments }) {
  const apiKey = (process.env.BREVO_API_KEY || "").trim();
  const senderEmail = (
    process.env.BREVO_SENDER_EMAIL ||
    process.env.ADMIN_EMAIL ||
    process.env.SMTP_USER ||
    "arkhammun2026@gmail.com"
  ).replace(/["']/g, "").trim();
  const senderName = (process.env.BREVO_SENDER_NAME || "Arkham MUN Secretariat").trim();

  const recipientEmail = Array.isArray(to) ? to[0] : to;
  console.log(`[Brevo Email] Attempting send to ${recipientEmail} from ${senderEmail}...`);

  const payload = {
    sender: { name: senderName, email: senderEmail },
    to: [{ email: recipientEmail }],
    replyTo: { email: senderEmail, name: senderName },
    subject,
    textContent: text,
    htmlContent: html,
  };
  if (attachments && attachments.length > 0) {
    payload.attachment = attachments.map((att) => ({
      name: att.filename,
      content: Buffer.isBuffer(att.content) ? att.content.toString("base64") : Buffer.from(att.content).toString("base64"),
    }));
  }
  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": apiKey,
      "Content-Type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const errText = await response.text();
    console.error(`[Brevo Email Error] HTTP ${response.status}: ${errText}`);
    throw new Error(`Brevo email delivery failed (${response.status}): ${errText}`);
  }
  const result = await response.json();
  console.log(`[Brevo Email Success] Sent to ${recipientEmail}. MessageId:`, result.messageId);
  return result;
}

async function sendViaVercelProxy(mailOptions) {
  const vercelUrl = (
    process.env.VERCEL_FRONTEND_URL ||
    process.env.FRONTEND_URL ||
    "https://arkhammun.vercel.app"
  ).replace(/\/+$/, "");

  const adminKey = (
    process.env.ADMIN_KEY ||
    process.env.ADMIN_API_KEY ||
    "admin12345"
  ).trim();

  const recipientEmail = Array.isArray(mailOptions.to) ? mailOptions.to[0] : mailOptions.to;
  console.log(`[Vercel Mail Proxy] Dispatching email to ${vercelUrl}/api-direct-mail for ${recipientEmail}...`);

  const payload = {
    adminKey,
    mailOptions: {
      from: mailOptions.from,
      to: mailOptions.to,
      replyTo: mailOptions.replyTo,
      subject: mailOptions.subject,
      text: mailOptions.text,
      html: mailOptions.html,
      attachments: Array.isArray(mailOptions.attachments)
        ? mailOptions.attachments.map((att) => ({
            filename: att.filename,
            cid: att.cid,
            contentType: att.contentType,
            contentDisposition: att.contentDisposition,
            content: Buffer.isBuffer(att.content)
              ? att.content.toString("base64")
              : typeof att.content === "string"
              ? Buffer.from(att.content).toString("base64")
              : att.content,
          }))
        : undefined,
    },
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000);

  try {
    const response = await fetch(`${vercelUrl}/api-direct-mail`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errText = await response.text();
      let message = errText;
      try {
        const parsed = JSON.parse(errText);
        message = parsed.error || errText;
      } catch {}
      throw new Error(`Vercel Mail Proxy HTTP ${response.status}: ${message}`);
    }

    const result = await response.json();
    console.log(`[Vercel Mail Proxy Success] Delivered via Google SMTP (${result.messageId})`);
    return result;
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

async function sendEmailPayload(mailOptions, transporter) {
  if (customTransporter || transporter) {
    const t = transporter || customTransporter;
    return await t.sendMail(mailOptions);
  }

  const errors = [];

  // Priority 1: Direct Gmail SMTP (Google Mail Servers -> Authenticated SPF & DKIM -> 100% Primary Inbox Delivery)
  const mailTransporter = getTransporter();
  if (mailTransporter) {
    try {
      const res = await mailTransporter.sendMail(mailOptions);
      console.log(`[Mailer] Direct Google SMTP delivered to Inbox:`, res.messageId);
      return res;
    } catch (smtpErr) {
      console.warn(`[Mailer] Direct SMTP failed (${smtpErr.message}). Attempting Vercel Google SMTP Proxy...`);
      errors.push(`SMTP: ${smtpErr.message}`);
    }
  }

  // Priority 2: Vercel Google SMTP Proxy (Bypasses Cloud Port 465 blocks via HTTPS Port 443 -> Google SMTP -> 100% Primary Inbox Delivery)
  try {
    const res = await sendViaVercelProxy(mailOptions);
    console.log(`[Mailer] Vercel Google SMTP Proxy delivered to Inbox:`, res.messageId);
    return res;
  } catch (proxyErr) {
    console.warn(`[Mailer] Vercel Proxy failed: ${proxyErr.message}. Attempting Brevo API fallback...`);
    errors.push(`Vercel Proxy: ${proxyErr.message}`);
  }

  // Priority 3: Brevo API (Fallback)
  if ((process.env.BREVO_API_KEY || "").trim()) {
    try {
      const res = await sendViaBrevo(mailOptions);
      console.log(`[Mailer] Sent via Brevo API:`, res.messageId);
      return res;
    } catch (brevoErr) {
      console.warn(`[Mailer] Brevo failed: ${brevoErr.message}. Attempting fallback...`);
      errors.push(`Brevo: ${brevoErr.message}`);
    }
  }

  // Priority 4: Resend if configured
  if ((process.env.RESEND_API_KEY || "").trim()) {
    try {
      const res = await sendViaResend(mailOptions);
      console.log(`[Mailer] Sent via Resend API:`, res.id);
      return res;
    } catch (resendErr) {
      console.warn(`[Mailer] Resend failed: ${resendErr.message}`);
      errors.push(`Resend: ${resendErr.message}`);
    }
  }

  if (errors.length > 0) {
    throw new Error(`Email dispatch failed across all providers: ${errors.join(" | ")}`);
  }

  throw new Error("SMTP server is not configured and no email API keys were found");
}

async function sendApprovalMail({ registration, event, qrBuffer, transporter }) {
  const mailOptions = buildEmailPayload({ registration, event, qrBuffer });
  return await sendEmailPayload(mailOptions, transporter);
}

function buildQueryReplyPayload({ query, replyMessage }) {
  const fromAddress = (process.env.SMTP_FROM || "").trim() ||
    `"Arkham MUN Secretariat" <${(process.env.SMTP_USER || "arkhammun.delhi@gmail.com").trim()}>`;
  const toAddress = query.email;
  const subject = `Re: [Arkham MUN Enquiry] ${query.subject || "Your Message"}`;

  const textBody = [
    `Dear ${query.name},`,
    "",
    "Thank you for reaching out to the Arkham MUN Secretariat.",
    "",
    "--- SECRETARIAT RESPONSE ---",
    replyMessage,
    "",
    "--- YOUR ORIGINAL ENQUIRY ---",
    `Subject: ${query.subject}`,
    `Submitted on: ${new Date(query.createdAt || query.created_at || Date.now()).toLocaleString()}`,
    query.message,
    "",
    "Warm regards,",
    "Arkham MUN Secretariat",
    "https://arkhammun.com",
  ].join("\n");

  const htmlBody = `<!doctype html>
<html>
<head><meta charset="utf-8"><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;padding:0;background-color:#080812;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#efedf9;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#080812;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width:580px;background-color:#12101b;border:1px solid #2a2538;border-radius:8px;overflow:hidden;box-shadow:0 12px 40px rgba(0,0,0,0.5);">
          <tr>
            <td style="padding:28px 32px 20px;background:linear-gradient(180deg, #191428 0%, #12101b 100%);border-bottom:1px solid #2a2538;text-align:center;">
              <span style="display:inline-block;color:#e3262e;font-size:11px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;margin-bottom:6px;">ARKHAM MODEL UNITED NATIONS</span>
              <h1 style="margin:4px 0 0;font-size:22px;font-weight:600;color:#ffffff;">Secretariat Response</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 32px 20px;">
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#d5d1e2;">
                Dear <strong>${escapeHtml(query.name)}</strong>,
              </p>
              <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#a8a3b8;">
                Thank you for reaching out to the Arkham MUN Secretariat regarding your enquiry <em>"${escapeHtml(query.subject)}"</em>. Here is our response:
              </p>
              <div style="background-color:#191627;border-left:3px solid #e3262e;padding:16px 20px;border-radius:4px;margin-bottom:24px;color:#ffffff;font-size:14px;line-height:1.7;white-space:pre-wrap;">${escapeHtml(replyMessage)}</div>
              
              <div style="background-color:#0c0b17;border:1px solid #2a2538;border-radius:6px;padding:16px 18px;margin-bottom:20px;">
                <span style="display:block;font-size:11px;text-transform:uppercase;letter-spacing:0.12em;color:#8f8b9e;margin-bottom:8px;">Your Original Message</span>
                <p style="margin:0;font-size:13px;line-height:1.6;color:#a8a3b8;white-space:pre-wrap;">${escapeHtml(query.message)}</p>
              </div>

              <p style="margin:0;font-size:13px;line-height:1.6;color:#8f8b9e;">
                If you have further questions, feel free to reply directly to this email or visit our website.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 32px 24px;border-top:1px solid #231f31;text-align:center;font-size:11px;color:#6d687c;">
              Arkham Model United Nations Secretariat · All rights reserved.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const replyTo = (process.env.SMTP_USER || process.env.ADMIN_EMAIL || "arkhammun.delhi@gmail.com").replace(/["']/g, "").trim();

  return {
    from: fromAddress,
    to: toAddress,
    replyTo,
    subject,
    text: textBody,
    html: htmlBody,
    headers: {
      "X-Entity-Ref-ID": `pass-${registration.id}`,
    },
  };
}

async function sendQueryReplyMail({ query, replyMessage, reply, event, transporter }) {
  const finalReply = (replyMessage || reply || "").trim();
  const mailOptions = buildQueryReplyPayload({ query, replyMessage: finalReply, event });
  return await sendEmailPayload(mailOptions, transporter);
}


function buildRejectionEmailPayload({ registration, event, reason }) {
  const fromAddress = (process.env.SMTP_FROM || "").trim() ||
    `"Arkham MUN Secretariat" <${(process.env.SMTP_USER || "arkhammun.delhi@gmail.com").trim()}>`;
  const toAddress = registration.email || registration.contact;
  const subject = `Payment Verification Notice: ${event.name || "Arkham MUN"} (${registration.id})`;

  const textBody = [
    `Dear ${registration.name},`,
    "",
    `Thank you for registering for ${event.name || "Arkham MUN"}.`,
    "",
    "We reviewed your payment submission, but unfortunately your payment proof could not be approved at this time.",
    "",
    "--- REASON FOR REJECTION ---",
    reason,
    "",
    "--- WHAT TO DO NEXT ---",
    "1. Visit https://arkhammun.vercel.app/register or open the Notification Center on our website.",
    "2. Enter your genuine 12-digit UPI transaction reference (UTR) and upload clear proof.",
    "3. Once re-submitted, our Secretariat will review your payment promptly.",
    "",
    `Registration ID: ${registration.id}`,
    registration.committee ? `Committee:       ${registration.committee}` : null,
    registration.organization ? `School / Org:    ${registration.organization}` : null,
    "",
    "Warm regards,",
    "Arkham MUN Secretariat",
    "hello@arkhammun.org",
  ].filter((line) => line !== null).join("\n");

  const htmlBody = `<!doctype html>
<html>
<head><meta charset="utf-8"><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;padding:0;background-color:#080812;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#efedf9;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#080812;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width:580px;background-color:#12101b;border:1px solid #2a2538;border-radius:8px;overflow:hidden;box-shadow:0 12px 40px rgba(0,0,0,0.5);">
          <tr>
            <td style="padding:28px 32px 20px;background:linear-gradient(180deg, #241419 0%, #12101b 100%);border-bottom:1px solid #382025;text-align:center;">
              <span style="display:inline-block;color:#e3262e;font-size:11px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;margin-bottom:6px;">ARKHAM MODEL UNITED NATIONS</span>
              <h1 style="margin:4px 0 0;font-size:22px;font-weight:600;color:#ffffff;">Payment Verification Notice</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 32px 20px;">
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#d5d1e2;">
                Dear <strong>${escapeHtml(registration.name)}</strong>,
              </p>
              <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#a8a3b8;">
                We reviewed your payment submission for <strong>${escapeHtml(event.name || "Arkham MUN")}</strong>, but your payment reference could not be verified.
              </p>
              <div style="background-color:#210e12;border-left:3px solid #e3262e;padding:16px 20px;border-radius:4px;margin-bottom:24px;color:#ffc5c8;font-size:14px;line-height:1.7;">
                <strong style="display:block;font-size:11px;text-transform:uppercase;letter-spacing:0.12em;color:#ff8289;margin-bottom:6px;">Reason Provided by Secretariat:</strong>
                ${escapeHtml(reason)}
              </div>
              
              <div style="background-color:#0c0b17;border:1px solid #2a2538;border-radius:6px;padding:16px 18px;margin-bottom:24px;">
                <span style="display:block;font-size:11px;text-transform:uppercase;letter-spacing:0.12em;color:#8f8b9e;margin-bottom:10px;">How to Correct & Resubmit</span>
                <p style="margin:0 0 8px;font-size:13px;line-height:1.6;color:#d6d1e4;">
                  1. Visit our portal at <a href="https://arkhammun.vercel.app/register" style="color:#ff8289;text-decoration:none;font-weight:600;">arkhammun.vercel.app/register</a>.
                </p>
                <p style="margin:0 0 8px;font-size:13px;line-height:1.6;color:#d6d1e4;">
                  2. Enter your genuine 12-digit UPI transaction reference (UTR) and upload clear payment proof.
                </p>
                <p style="margin:0;font-size:13px;line-height:1.6;color:#d6d1e4;">
                  3. Our Secretariat will immediately re-review your payment upon submission.
                </p>
              </div>

              <p style="margin:0;font-size:12px;color:#8f8b9e;">
                Registration ID: <code style="color:#efedf9;">${escapeHtml(registration.id)}</code>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 32px 24px;border-top:1px solid #231f31;text-align:center;font-size:11px;color:#6d687c;">
              Arkham Model United Nations Secretariat · All rights reserved.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const replyTo = (process.env.SMTP_USER || process.env.ADMIN_EMAIL || "arkhammun.delhi@gmail.com").replace(/["']/g, "").trim();

  return {
    from: fromAddress,
    to: toAddress,
    replyTo,
    subject,
    text: textBody,
    html: htmlBody,
    headers: {
      "X-Entity-Ref-ID": `pass-${registration.id}`,
    },
  };
}

async function sendRejectionMail({ registration, event, reason, transporter }) {
  const mailOptions = buildRejectionEmailPayload({ registration, event, reason });
  return await sendEmailPayload(mailOptions, transporter);
}

module.exports = {
  isSmtpConfigured,
  setTestTransporter,
  resetTransporter,
  sanitizeEmailError,
  getTransporter,
  buildEmailPayload,
  sendApprovalMail,
  buildQueryReplyPayload,
  sendQueryReplyMail,
  sendReplyMail: sendQueryReplyMail,
  buildRejectionEmailPayload,
  sendRejectionMail,
};
