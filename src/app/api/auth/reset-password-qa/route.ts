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

    if (!user?.securityAnswer) {
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
      return NextResponse.json(
        { error: "Invalid email or security answer" },
        { status: 400 },
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    await prisma.user.update({
      where: { id: user.id },
      data: { hashedPassword },
    });

    return NextResponse.json({ message: "Password reset successfully" });
  } catch (error) {
    return handleZodError(error);
  }
}
