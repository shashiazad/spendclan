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

export async function sendPasswordResetEmail(
  email: string,
  token: string,
): Promise<boolean> {
  const transporter = getTransporter();
  const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password?token=${token}`;

  if (!transporter) {
    console.log(`[DEV] Password reset link for ${email}: ${resetUrl}`);
    return true;
  }

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM ?? "Ledgerly <noreply@example.com>",
      to: email,
      subject: "Reset your Ledgerly password",
      html: `
        <p>You requested a password reset for your Ledgerly account.</p>
        <p><a href="${resetUrl}">Click here to reset your password</a></p>
        <p>This link expires in 1 hour.</p>
        <p>If you did not request this, you can ignore this email.</p>
      `,
    });
  } catch (error) {
    console.error("Failed to send email via SMTP, falling back to console log:", error);
    console.log(`[DEV-FALLBACK] Password reset link for ${email}: ${resetUrl}`);
  }

  return true;
}

export async function sendVerificationEmail(
  email: string,
  name: string,
  token: string,
): Promise<boolean> {
  const transporter = getTransporter();

  if (!transporter) {
    console.log(`\n==================================================`);
    console.log(`[DEV] Email verification code for ${name} (${email}): ${token}`);
    console.log(`==================================================\n`);
    return true;
  }

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM ?? "Ledgerly <noreply@example.com>",
      to: email,
      subject: "Verify your Ledgerly email address",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #4f46e5; margin-bottom: 20px;">Welcome to Ledgerly, ${name}!</h2>
          <p>Thank you for signing up. Please verify your email address by entering the following 6-digit code on the verification screen:</p>
          <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 16px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #1e293b; margin: 24px 0;">
            ${token}
          </div>
          <p style="color: #64748b; font-size: 14px;">This code is valid for 1 hour. If you did not sign up for Ledgerly, please ignore this email.</p>
        </div>
      `,
    });
  } catch (error) {
    console.error("Failed to send verification email via SMTP, falling back to console log:", error);
    console.log(`\n==================================================`);
    console.log(`[DEV-FALLBACK] Email verification code for ${name} (${email}): ${token}`);
    console.log(`==================================================\n`);
  }

  return true;
}

