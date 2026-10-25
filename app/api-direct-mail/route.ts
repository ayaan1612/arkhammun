import { NextResponse } from "next/server";
// @ts-ignore
import nodemailer from "nodemailer";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { adminKey, mailOptions } = body;

    const expectedAdminKey =
      process.env.ADMIN_KEY ||
      process.env.ADMIN_API_KEY ||
      "admin12345";

    if (!adminKey || adminKey !== expectedAdminKey) {
      return NextResponse.json(
        { error: "Unauthorized mail dispatch request." },
        { status: 401 }
      );
    }

    if (!mailOptions || !mailOptions.to) {
      return NextResponse.json(
        { error: "Missing required mailOptions (to, subject, html)." },
        { status: 400 }
      );
    }

    const smtpUser = (process.env.SMTP_USER || "arkhammun.delhi@gmail.com").trim();
    const smtpPass = (process.env.SMTP_PASS || "iyda qvsc euke uxjr").replace(/\s+/g, "");

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
      connectionTimeout: 20000,
      greetingTimeout: 20000,
      socketTimeout: 30000,
    });

    const formattedMailOptions = {
      from: mailOptions.from || `"Arkham MUN Secretariat" <${smtpUser}>`,
      to: mailOptions.to,
      replyTo: mailOptions.replyTo || smtpUser,
      subject: mailOptions.subject,
      text: mailOptions.text,
      html: mailOptions.html,
      attachments: Array.isArray(mailOptions.attachments)
        ? mailOptions.attachments.map((att: any) => {
            if (att.content && typeof att.content === "string") {
              return {
                ...att,
                content: Buffer.from(att.content, "base64"),
              };
            }
            return att;
          })
        : undefined,
    };

    console.log(`[Vercel Mail Proxy] Dispatching email to ${mailOptions.to} via Google SMTP...`);
    const info = await transporter.sendMail(formattedMailOptions);
    console.log(`[Vercel Mail Proxy] Google SMTP delivered successfully: ${info.messageId}`);

    return NextResponse.json({
      success: true,
      provider: "google-smtp-vercel-proxy",
      messageId: info.messageId,
      response: info.response,
    });
  } catch (error: any) {
    console.error("[Vercel Mail Proxy Error]:", error);
    return NextResponse.json(
      {
        error: error.message || "Failed to send email via Google SMTP proxy.",
      },
      { status: 500 }
    );
  }
}
