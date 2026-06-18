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

