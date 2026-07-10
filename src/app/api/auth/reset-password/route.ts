import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleZodError } from "@/lib/auth";
import { resetPasswordSchema } from "@/lib/validators";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { token, password } = resetPasswordSchema.parse(body);

    // Atomically delete the token first to prevent concurrent reuse (strict single-use validation)
    let resetToken;
    try {
      resetToken = await prisma.passwordResetToken.delete({
        where: { token },
      });
    } catch (err) {
      if (err && typeof err === "object" && "code" in err && err.code === "P2025") {
        return NextResponse.json(
          { error: "Invalid or expired reset token" },
          { status: 400 },
        );
      }
      throw err;
    }

    if (resetToken.expiresAt < new Date()) {
      return NextResponse.json(
        { error: "Invalid or expired reset token" },
        { status: 400 },
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    await prisma.user.update({
      where: { id: resetToken.userId },
      data: { hashedPassword },
    });

    return NextResponse.json({ message: "Password reset successfully" });
  } catch (error) {
    return handleZodError(error);
  }
}
