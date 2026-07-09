import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendVerificationEmail } from "@/lib/email";
import { sendWhatsAppOTP } from "@/lib/whatsapp";

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

    // Generate new 6-digit random token
    const token = Math.floor(100000 + Math.random() * 900000).toString();
    const tokenExpires = new Date(Date.now() + 3600000); // 1 hour expiration

    await prisma.user.update({
      where: { id: user.id },
      data: {
        verificationToken: token,
        verificationTokenExpires: tokenExpires,
      },
    });

    // Send verification WhatsApp message (or fallback to email if mobile is missing)
    if (user.mobileNumber) {
      await sendWhatsAppOTP(user.mobileNumber, user.name, token);
    } else if (user.email) {
      await sendVerificationEmail(user.email, user.name, token);
    }

    return NextResponse.json({ message: "Verification code sent successfully" }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
