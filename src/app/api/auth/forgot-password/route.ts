import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleZodError } from "@/lib/auth";
import { sendPasswordResetEmail } from "@/lib/email";
import { forgotPasswordSchema } from "@/lib/validators";

const GENERIC_MESSAGE =
  "If an account with that email exists, we have sent a password reset link.";

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

      await sendPasswordResetEmail(normalizedEmail, token);
    }

    return NextResponse.json({ message: GENERIC_MESSAGE });
  } catch (error) {
    return handleZodError(error);
  }
}
