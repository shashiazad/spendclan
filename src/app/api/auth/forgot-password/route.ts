import { randomUUID } from "crypto";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleZodError } from "@/lib/auth";
import { sendPasswordResetEmail } from "@/lib/email";
import { forgotPasswordSchema } from "@/lib/validators";

const GENERIC_MESSAGE =
  "If an account with that email exists, we have sent a password reset link.";

/**
 * Derives the application base URL from request headers.
 * Priority: Origin header → Referer header → NEXTAUTH_URL env var.
 * This ensures reset links always point to the correct domain.
 */
async function getBaseUrl(): Promise<string> {
  const h = await headers();
  const origin = h.get("origin");
  if (origin) return origin;

  const referer = h.get("referer");
  if (referer) {
    try {
      const url = new URL(referer);
      return url.origin;
    } catch {
      // Malformed referer — fall through
    }
  }

  return process.env.NEXTAUTH_URL ?? "http://localhost:3000";
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email } = forgotPasswordSchema.parse(body);
    const normalizedEmail = email.toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (user) {
      // Rate limiting: Max 3 password reset emails per 24 hours
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      let attempts = user.passwordResetAttempts;
      const lastSent = user.lastPasswordResetSentAt;

      if (attempts >= 3 && lastSent && lastSent > oneDayAgo) {
        const diffMs = 24 * 60 * 60 * 1000 - (now.getTime() - lastSent.getTime());
        const remainingHours = Math.floor(diffMs / (60 * 60 * 1000));
        const remainingMinutes = Math.ceil((diffMs % (60 * 60 * 1000)) / (60 * 1000));

        let remainingText = "";
        if (remainingHours > 0) {
          remainingText = `${remainingHours} hour${remainingHours > 1 ? "s" : ""} and ${remainingMinutes} minute${remainingMinutes > 1 ? "s" : ""}`;
        } else {
          remainingText = `${remainingMinutes} minute${remainingMinutes > 1 ? "s" : ""}`;
        }

        return NextResponse.json(
          { error: `Too many password reset attempts. Please try again in ${remainingText}.` },
          { status: 429 }
        );
      }

      // Increment reset attempts count
      if (!lastSent || lastSent <= oneDayAgo) {
        attempts = 1;
      } else {
        attempts += 1;
      }

      await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordResetAttempts: attempts,
          lastPasswordResetSentAt: now,
        },
      });

      // Clear existing tokens
      await prisma.passwordResetToken.deleteMany({
        where: { userId: user.id },
      });

      const token = randomUUID();
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

      await prisma.passwordResetToken.create({
        data: {
          token,
          userId: user.id,
          expiresAt,
        },
      });

      const baseUrl = await getBaseUrl();
      await sendPasswordResetEmail(normalizedEmail, token, baseUrl);
    }

    return NextResponse.json({ message: GENERIC_MESSAGE });
  } catch (error) {
    return handleZodError(error);
  }
}
