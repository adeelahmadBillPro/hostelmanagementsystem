import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { createResetToken } from "@/lib/reset-tokens";
import { sendEmail, passwordResetEmail } from "@/lib/email";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";

export async function POST(req: Request) {
  const limited = rateLimit(req, "strict");
  if (limited) return limited;

  try {
    const body = await req.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) {
      return NextResponse.json(
        { error: "No account found with this email address" },
        { status: 404 }
      );
    }

    // Generate new password and update
    const newPassword = randomBytes(4).toString("hex");
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    // Send email with new password
    const emailData = passwordResetEmail(user.name, user.email, newPassword);
    await sendEmail(emailData);

    return NextResponse.json({
      message: "A new password has been sent to your email. Please check your inbox.",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { error: "Failed to process password reset request" },
      { status: 500 }
    );
  }
}
