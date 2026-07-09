import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { handleZodError } from "@/lib/auth";
import { resetPasswordQaSchema } from "@/lib/validators";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");

    const { email: parsedEmail } = resetPasswordQaSchema
      .pick({ email: true })
      .parse({ email });

    const user = await prisma.user.findUnique({
      where: { email: parsedEmail.toLowerCase() },
      select: { securityQuestion: true },
    });

    if (!user?.securityQuestion) {
      return NextResponse.json(
        { error: "No security question found for this account" },
        { status: 404 },
      );
    }

    return NextResponse.json({ question: user.securityQuestion });
  } catch (error) {
    return handleZodError(error);
  }
}

const resetQaPostSchema = z.object({
  email: z.string().email(),
  answer: z.string().min(1),
  password: z.string().min(8).max(100),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, answer, password } = resetQaPostSchema.parse(body);

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Invalid email or security answer" },
        { status: 400 },
      );
    }

    // Rate limiting: Max 3 incorrect security question attempts per 24 hours
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
        { error: `Too many failed recovery attempts. Account recovery locked. Please try again in ${remainingText}.` },
        { status: 429 }
      );
    }

    // If last lockout was more than 24 hours ago, reset local attempts count
    if (lastSent && lastSent <= oneDayAgo && attempts >= 3) {
      attempts = 0;
    }

    if (!user.securityAnswer) {
      return NextResponse.json(
        { error: "Invalid email or security answer" },
        { status: 400 },
      );
    }

    const valid = await bcrypt.compare(
      answer.toLowerCase().trim(),
      user.securityAnswer,
    );

    if (!valid) {
      const newAttempts = attempts + 1;

      await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordResetAttempts: newAttempts,
          lastPasswordResetSentAt: now,
        },
      });

      if (newAttempts >= 3) {
        return NextResponse.json(
          { error: "Too many failed recovery attempts. Account recovery locked for 24 hours." },
          { status: 429 }
        );
      } else {
        const remaining = 3 - newAttempts;
        return NextResponse.json(
          { error: `Invalid email or security answer. ${remaining} attempt${remaining > 1 ? "s" : ""} remaining.` },
          { status: 400 }
        );
      }
    }

    // Valid answer: Update password and reset metrics
    const hashedPassword = await bcrypt.hash(password, 12);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        hashedPassword,
        passwordResetAttempts: 0,
        lastPasswordResetSentAt: null,
      },
    });

    return NextResponse.json({ message: "Password reset successfully" });
  } catch (error) {
    return handleZodError(error);
  }
}
