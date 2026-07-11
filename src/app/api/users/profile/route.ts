import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { profileUpdateSchema } from "@/lib/validators";
import bcrypt from "bcryptjs";

export async function GET() {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  try {
    const user = await prisma.user.findUnique({
      where: { id: auth.session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        mobileNumber: true,
        currency: true,
        profilePhoto: true,
        securityQuestion: true,
        hashedPassword: true,
        securityAnswer: true,
        createdAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
      mobileNumber: user.mobileNumber || "",
      currency: user.currency,
      profilePhoto: user.profilePhoto,
      securityQuestion: user.securityQuestion || "",
      hasPassword: user.hashedPassword !== null,
      hasSecurityQA: user.securityQuestion !== null,
      createdAt: user.createdAt,
    });
  } catch (error) {
    console.error("Error fetching profile:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  try {
    const body = await request.json();
    const validation = profileUpdateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.issues },
        { status: 400 }
      );
    }

    const {
      name,
      mobileNumber,
      currency,
      securityQuestion,
      securityAnswer,
      password,
      profilePhoto,
    } = validation.data;

    // Check unique mobileNumber constraint if provided
    const cleanMobile = mobileNumber?.trim();
    if (cleanMobile) {
      const existingMobile = await prisma.user.findFirst({
        where: {
          mobileNumber: cleanMobile,
          NOT: { id: auth.session.user.id },
        },
      });
      if (existingMobile) {
        return NextResponse.json(
          { error: "Mobile number is already in use by another account." },
          { status: 409 }
        );
      }
    }

    // Require both securityQuestion and securityAnswer if one of them is updated/set
    if ((securityQuestion && !securityAnswer) || (!securityQuestion && securityAnswer)) {
      return NextResponse.json(
        { error: "Both security question and security answer are required to update verification questions." },
        { status: 400 }
      );
    }

    // Validate and process profile photo if provided
    if (profilePhoto) {
      const matches = profilePhoto.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
      if (!matches) {
        return NextResponse.json({ error: "Invalid image format. Must be a base64 data URI." }, { status: 400 });
      }
      
      const base64Data = matches[2];
      const buffer = Buffer.from(base64Data, "base64");
      
      if (buffer.length > 200 * 1024) {
        return NextResponse.json({ error: "Image size must be 200KB or less." }, { status: 400 });
      }
    }

    // Process security question/answer hashes
    let hashedSecurityAnswer = undefined;
    if (securityAnswer) {
      hashedSecurityAnswer = await bcrypt.hash(securityAnswer.toLowerCase().trim(), 12);
    }

    // Process password hash
    let hashedPassword = undefined;
    if (password) {
      hashedPassword = await bcrypt.hash(password, 12);
    }

    const updatedUser = await prisma.user.update({
      where: { id: auth.session.user.id },
      data: {
        name: name !== undefined ? name : undefined,
        mobileNumber: cleanMobile !== undefined ? (cleanMobile === "" ? null : cleanMobile) : undefined,
        currency: currency !== undefined ? currency : undefined,
        securityQuestion: securityQuestion !== undefined ? (!securityQuestion ? null : (securityQuestion as any)) : undefined,
        securityAnswer: hashedSecurityAnswer !== undefined ? hashedSecurityAnswer : undefined,
        hashedPassword: hashedPassword !== undefined ? hashedPassword : undefined,
        profilePhoto: profilePhoto !== undefined ? profilePhoto : undefined,
      },
      select: {
        id: true,
        name: true,
        email: true,
        mobileNumber: true,
        currency: true,
        profilePhoto: true,
        securityQuestion: true,
        hashedPassword: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      message: "Profile updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
