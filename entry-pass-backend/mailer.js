const nodemailer = require("nodemailer");

let customTransporter = null;

function isSmtpConfigured() {
  if (customTransporter) return true;
  const host = (process.env.SMTP_HOST || "").trim();
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
  const port = Number(process.env.SMTP_PORT || 587);
  const secure = process.env.SMTP_SECURE === "true" || process.env.SMTP_SECURE === "1" || port === 465;
  const user = (process.env.SMTP_USER || "").trim();
  const pass = process.env.SMTP_PASS || "";

  const config = {
    host,
    port,
    secure,
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
    (process.env.SMTP_USER ? `"Arkham MUN Secretariat" <${process.env.SMTP_USER.trim()}>` : `"Arkham MUN Secretariat" <no-reply@arkhammun.org>`);
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

  return {
    from: fromAddress,
    to: toAddress,
    subject,
    text: textBody,
    html: htmlBody,
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

async function sendApprovalMail({ registration, event, qrBuffer, transporter }) {
  const mailTransporter = transporter || getTransporter();
  if (!mailTransporter) {
    throw new Error("SMTP server is not configured");
  }

  const mailOptions = buildEmailPayload({ registration, event, qrBuffer });
  const info = await mailTransporter.sendMail(mailOptions);
  return info;
}

function buildQueryReplyPayload({ query, replyMessage }) {
  const fromAddress = (process.env.SMTP_FROM || "").trim() ||
    (process.env.SMTP_USER ? `"Arkham MUN Secretariat" <${process.env.SMTP_USER.trim()}>` : `"Arkham MUN Secretariat" <no-reply@arkhammun.org>`);
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
    `Submitted on: ${new Date(query.created_at).toLocaleString()}`,
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

  return {
    from: fromAddress,
    to: toAddress,
    subject,
    text: textBody,
    html: htmlBody,
  };
}

async function sendQueryReplyMail({ query, replyMessage, transporter }) {
  const mailTransporter = transporter || getTransporter();
  if (!mailTransporter) {
    throw new Error("SMTP server is not configured");
  }

  const mailOptions = buildQueryReplyPayload({ query, replyMessage });
  const info = await mailTransporter.sendMail(mailOptions);
  return info;
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
};
