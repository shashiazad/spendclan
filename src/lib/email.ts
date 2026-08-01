import nodemailer from "nodemailer";

function getTransporter() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? 587);
  const secure = process.env.SMTP_SECURE === "true";

  if (!host) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASS
        ? {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        }
        : undefined,
  });
}

interface TemplateParams {
  title: string;
  preheader?: string;
  contentHtml: string;
  ctaText?: string;
  ctaUrl?: string;
}

/**
 * Renders a premium, responsive HTML email wrapper template matching the SpendClan brand design.
 */
function renderEmailTemplate({
  title,
  preheader,
  contentHtml,
  ctaText,
  ctaUrl,
}: TemplateParams): string {
  const ctaBlock = (ctaText && ctaUrl)
    ? `
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 32px 0; text-align: center;">
        <tr>
          <td align="center">
            <table border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
              <tr>
                <td align="center" bgcolor="#10b981" style="border-radius: 8px;">
                  <a href="${ctaUrl}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #10b981, #059669); background-color: #10b981; color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-family: Inter, system-ui, -apple-system, sans-serif; font-size: 15px; border: none; box-shadow: 0 4px 6px -1px rgba(16, 185, 129, 0.2);">
                    ${ctaText}
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    `
    : "";

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <title>${title}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
    
    body {
      margin: 0;
      padding: 0;
      width: 100% !important;
      background-color: #f8fafc;
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: Inter, system-ui, -apple-system, sans-serif; color: #1e293b; -webkit-font-smoothing: antialiased;">
  ${preheader ? `<span style="display: none; max-height: 0px; overflow: hidden; mso-hide: all;">${preheader}</span>` : ""}
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; padding: 40px 0;">
    <tr>
      <td align="center">
        <!-- Main Wrapper Container -->
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 580px; width: 100%; margin: 0 auto; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05);">
          
          <!-- Top Accent Band -->
          <tr>
            <td height="6" style="background: linear-gradient(90deg, #10b981, #059669); background-color: #10b981;"></td>
          </tr>

          <!-- Logo / Header -->
          <tr>
            <td align="center" style="padding: 40px 40px 24px 40px;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center">
                    <!-- SpendClan Logo -->
                    <table border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                      <tr>
                        <td style="background-color: #ecfdf5; padding: 12px; border-radius: 12px; border: 1px solid #d1fae5;">
                          <img src="https://spenclan.vercel.app/icon-192x192.png" width="40" height="40" alt="SpendClan Logo" style="display: block; width: 40px; height: 40px; border-radius: 8px;" onerror="this.src='https://spendclan.vercel.app/icon-192x192.png'; this.onerror=null;" />
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-top: 16px;">
                    <span style="font-size: 22px; font-weight: 700; color: #0f172a; letter-spacing: -0.5px; font-family: Inter, system-ui, sans-serif;">SpendClan</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding: 0 40px;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="border-top: 1px solid #f1f5f9;">
                <tr><td></td></tr>
              </table>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 32px 40px 40px 40px; font-size: 15px; line-height: 1.6; color: #475569; font-family: Inter, system-ui, sans-serif;">
              ${contentHtml}
              ${ctaBlock}
              
              <!-- Signature -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 32px; border-top: 1px solid #f1f5f9; padding-top: 24px;">
                <tr>
                  <td style="font-size: 14px; color: #64748b; line-height: 1.5;">
                    Best regards,<br>
                    <strong style="color: #0f172a;">The SpendClan Team</strong><br>
                    <span style="font-size: 12px; color: #94a3b8; font-weight: normal; margin-top: 4px; display: block;">Smart Personal Ledger & Effortless Group Splitter</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer Legal -->
          <tr>
            <td align="center" bgcolor="#f8fafc" style="padding: 24px 40px; border-top: 1px solid #f1f5f9; font-size: 12px; color: #94a3b8; line-height: 1.5; text-align: center; font-family: Inter, system-ui, sans-serif;">
              <p style="margin: 0;">This email was sent to you to complete your requested account updates.</p>
              <p style="margin: 6px 0 0 0;">© ${new Date().getFullYear()} SpendClan. All rights reserved.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

export async function sendPasswordResetEmail(
  email: string,
  token: string,
  baseUrl: string,
): Promise<boolean> {
  const transporter = getTransporter();
  const resetUrl = `${baseUrl}/reset-password?token=${token}`;
  const devFallback = process.env.NODE_ENV !== "production";

  if (!transporter) {
    const msg = "SMTP transport is not configured. Set SMTP_HOST and optionally SMTP_USER/SMTP_PASS.";
    console.warn(msg);
    if (devFallback) {
      console.log(`[DEV] Password reset link for ${email}: ${resetUrl}`);
      return true;
    }
    throw new Error(msg);
  }

  const title = "Reset your SpendClan password";
  const preheader = "Reset your SpendClan password inside the next 1 hour.";
  const contentHtml = `
    <p style="margin: 0 0 16px 0; font-size: 16px; color: #0f172a; font-weight: 600;">Hello,</p>
    <p style="margin: 0 0 16px 0;">We received a request to reset the password associated with your SpendClan account. Click the button below to configure a new secure password:</p>
    <p style="margin: 28px 0 0 0; font-size: 13px; color: #64748b;">This password reset link is valid for <strong>1 hour</strong>. If you did not make this request, you can safely ignore this email; your account security remains fully intact.</p>
    <p style="margin: 16px 0 0 0; font-size: 11px; color: #94a3b8; word-break: break-all;">If the button does not work, copy and paste this URL into your browser:<br><a href="${resetUrl}" style="color: #10b981; text-decoration: underline;">${resetUrl}</a></p>
  `;

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM ?? "SpendClan <noreply@spendclan.com>",
      to: email,
      subject: title,
      html: renderEmailTemplate({
        title,
        preheader,
        contentHtml,
        ctaText: "Reset Your Password",
        ctaUrl: resetUrl,
      }),
    });
  } catch (error) {
    console.error("Failed to send password reset email via SMTP:", error);
    if (devFallback) {
      console.log(`[DEV-FALLBACK] Password reset link for ${email}: ${resetUrl}`);
      return true;
    }
    throw error;
  }

  return true;
}

export async function sendVerificationEmail(
  email: string,
  name: string,
  token: string,
): Promise<boolean> {
  const transporter = getTransporter();

  const devFallback = process.env.NODE_ENV !== "production";

  if (!transporter) {
    const msg = "SMTP transport is not configured. Set SMTP_HOST and optionally SMTP_USER/SMTP_PASS.";
    console.warn(msg);
    if (devFallback) {
      console.log(`\n==================================================`);
      console.log(`[DEV] Email verification code for ${name} (${email}): ${token}`);
      console.log(`==================================================\n`);
      return true;
    }
    throw new Error(msg);
  }

  const title = "Verify your SpendClan email address";
  const preheader = `Use verification code ${token} to complete your registration.`;
  const contentHtml = `
    <p style="margin: 0 0 16px 0; font-size: 16px; color: #0f172a; font-weight: 600;">Hello ${name},</p>
    <p style="margin: 0 0 16px 0;">Welcome to SpendClan! We're excited to help you track personal spending and split group expenses effortlessly.</p>
    <p style="margin: 0 0 20px 0;">Please verify your email address by entering the following 6-digit confirmation code on the verification screen:</p>
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
      <span style="font-size: 38px; font-weight: 700; letter-spacing: 8px; color: #10b981; font-family: 'Courier New', Courier, monospace;">${token}</span>
    </div>
    <p style="margin: 20px 0 0 0; font-size: 13px; color: #64748b;">This verification code is valid for <strong>1 hour</strong>. If you did not sign up for SpendClan, please ignore this email.</p>
  `;

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM ?? "SpendClan <noreply@example.com>",
      to: email,
      subject: title,
      html: renderEmailTemplate({
        title,
        preheader,
        contentHtml,
      }),
    });
  } catch (error) {
    console.error("Failed to send verification email via SMTP:", error);
    if (devFallback) {
      console.log(`\n==================================================`);
      console.log(`[DEV-FALLBACK] Email verification code for ${name} (${email}): ${token}`);
      console.log(`==================================================\n`);
      return true;
    }
    throw error;
  }

  return true;
}

export async function sendGroupInvitationEmail(
  email: string,
  groupName: string,
  invitedByName: string,
  baseUrl: string,
): Promise<boolean> {
  const transporter = getTransporter();
  const registerUrl = `${baseUrl}/register?email=${encodeURIComponent(email)}`;

  const devFallback = process.env.NODE_ENV !== "production";

  if (!transporter) {
    const msg = "SMTP transport is not configured. Set SMTP_HOST and optionally SMTP_USER/SMTP_PASS.";
    console.warn(msg);
    if (devFallback) {
      console.log(`[DEV] Group invitation email for ${email} to join group "${groupName}" by ${invitedByName}: ${registerUrl}`);
      return true;
    }
    throw new Error(msg);
  }

  const title = `Invitation to join "${groupName}" on SpendClan`;
  const preheader = `${invitedByName} has invited you to join the group "${groupName}" on SpendClan.`;
  const contentHtml = `
    <p style="margin: 0 0 16px 0; font-size: 16px; color: #0f172a; font-weight: 600;">Hello,</p>
    <p style="margin: 0 0 16px 0;"><strong>${invitedByName}</strong> has invited you to join their pocket group <strong>"${groupName}"</strong> on SpendClan.</p>
    <p style="margin: 0 0 16px 0;">SpendClan makes it incredibly simple to split bills, track shared expenses, and settle up with friends and family instantly.</p>
    <p style="margin: 0 0 20px 0;">Click the button below to accept the invitation and sign up using this email address. Once registered, you will be automatically added to the group.</p>
    <p style="margin: 28px 0 0 0; font-size: 13px; color: #64748b;">If the button does not work, copy and paste this URL into your browser:<br><a href="${registerUrl}" style="color: #10b981; text-decoration: underline;">${registerUrl}</a></p>
  `;

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM ?? "SpendClan <noreply@example.com>",
      to: email,
      subject: title,
      html: renderEmailTemplate({
        title,
        preheader,
        contentHtml,
        ctaText: `Join "${groupName}" Now`,
        ctaUrl: registerUrl,
      }),
    });
  } catch (error) {
    console.error("Failed to send group invitation email via SMTP:", error);
    if (devFallback) {
      console.log(`[DEV-FALLBACK] Group invitation email for ${email} to join group "${groupName}" by ${invitedByName}: ${registerUrl}`);
      return true;
    }
    throw error;
  }

  return true;
}
