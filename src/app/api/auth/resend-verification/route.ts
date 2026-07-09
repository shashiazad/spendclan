import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendVerificationEmail } from "@/lib/email";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { identifier } = body;

    if (!identifier) {
      return NextResponse.json({ error: "Identifier (mobile/email) is required" }, { status: 400 });
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

    // Rate limiting logic: Max 3 sends per 24 hours
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    let attempts = user.verificationAttempts;
    const lastSent = user.lastVerificationSentAt;

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
        { 
          error: `Too many verification attempts. Please try again in ${remainingText}.`,
          attemptsRemaining: 0 
        },
        { status: 429 }
      );
    }

    // If the last sent time was more than 24 hours ago, reset the count to 1
    if (!lastSent || lastSent <= oneDayAgo) {
      attempts = 1;
    } else {
      attempts += 1;
    }

    // Generate new 6-digit random token
    const token = Math.floor(100000 + Math.random() * 900000).toString();
    const tokenExpires = new Date(Date.now() + 3600000); // 1 hour expiration

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        verificationToken: token,
        verificationTokenExpires: tokenExpires,
        verificationAttempts: attempts,
        lastVerificationSentAt: now,
      },
    });

    // Send verification email
    await sendVerificationEmail(updatedUser.email, updatedUser.name, token);

    return NextResponse.json({ 
      message: "Verification code sent successfully",
      attemptsRemaining: 3 - attempts 
    }, { status: 200 });
  } catch (error) {
    console.error("Resend verification error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
