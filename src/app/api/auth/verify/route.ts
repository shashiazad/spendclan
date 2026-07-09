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

    if (!user.verificationToken || user.verificationToken !== token.trim()) {
      return NextResponse.json({ error: "Invalid verification code" }, { status: 400 });
    }

    if (user.verificationTokenExpires && new Date() > user.verificationTokenExpires) {
      return NextResponse.json({ error: "Verification code has expired" }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        mobileVerified: true,
        verificationToken: null,
        verificationTokenExpires: null,
      },
    });

    return NextResponse.json({ message: "Account verified successfully" }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
