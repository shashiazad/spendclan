import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleZodError } from "@/lib/auth";
import { registerSchema } from "@/lib/validators";
import { sendVerificationEmail } from "@/lib/email";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = registerSchema.parse(body);

    const existing = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
    });

    if (existing) {
      if (existing.emailVerified) {
        return NextResponse.json(
          { error: "Email already registered" },
          { status: 409 },
        );
      } else {
        // Delete the unverified stale user so they can register again and get a new code
        await prisma.user.delete({ where: { id: existing.id } });
      }
    }

    const hashedPassword = await bcrypt.hash(data.password, 12);
    const hashedAnswer = await bcrypt.hash(
      data.securityAnswer.toLowerCase().trim(),
      12,
    );

    // Generate 6-digit random token
    const token = Math.floor(100000 + Math.random() * 900000).toString();
    const tokenExpires = new Date(Date.now() + 3600000); // 1 hour expiration

    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email.toLowerCase(),
        hashedPassword,
        currency: data.currency,
        securityQuestion: data.securityQuestion,
        securityAnswer: hashedAnswer,
        emailVerified: false,
        verificationToken: token,
        verificationTokenExpires: tokenExpires,
      },
      select: {
        id: true,
        name: true,
        email: true,
        currency: true,
        emailVerified: true,
      },
    });

    // Send verification email
    await sendVerificationEmail(user.email, user.name, token);

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    return handleZodError(error);
  }
}

