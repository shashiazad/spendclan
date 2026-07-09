import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { identifier, token } = body;

    if (!identifier || !token) {
      return NextResponse.json(
        { error: "Verification code is required" },
        { status: 400 },
      );
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: identifier.toLowerCase() },
          { mobileNumber: identifier },
        ],
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.emailVerified || user.mobileVerified) {
      return NextResponse.json({ message: "Account already verified" }, { status: 200 });
    }

    if (user.verificationTokenExpires && new Date() > user.verificationTokenExpires) {
      return NextResponse.json({ error: "Verification code has expired" }, { status: 400 });
    }

    // Brute force protection: maximum 5 incorrect guesses per token
    if (!user.verificationToken || user.verificationToken !== token.trim()) {
      const attempts = user.failedAttempts + 1;

      if (attempts >= 5) {
        // Invalidate token completely
        await prisma.user.update({
          where: { id: user.id },
          data: {
            verificationToken: null,
            verificationTokenExpires: null,
            failedAttempts: 0,
          },
        });

        return NextResponse.json(
          { error: "Too many invalid attempts. Your verification code has been invalidated. Please request a new one." },
          { status: 400 }
        );
      } else {
        // Increment count
        await prisma.user.update({
          where: { id: user.id },
          data: { failedAttempts: attempts },
        });

        const remaining = 5 - attempts;
        return NextResponse.json(
          { error: `Invalid verification code. ${remaining} attempt${remaining > 1 ? "s" : ""} remaining.` },
          { status: 400 }
        );
      }
    }

    // Success: Verify user and clear states
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        mobileVerified: true,
        verificationToken: null,
        verificationTokenExpires: null,
        failedAttempts: 0,
      },
    });

    return NextResponse.json({ message: "Account verified successfully" }, { status: 200 });
  } catch (error) {
    console.error("Verification error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
