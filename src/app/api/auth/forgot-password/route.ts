import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { createResetToken } from "@/lib/reset-tokens";

export async function POST(req: Request) {
  const limited = rateLimit(req, "strict");
  if (limited) return limited;

  try {
    const body = await req.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) {
      // Don't reveal whether user exists - but for testing, we return an error
      return NextResponse.json(
        { error: "No account found with this email address" },
        { status: 404 }
      );
    }

    const token = createResetToken(user.id, user.email);

    // In production, you would send this token via email
    // For now, we return it in the response for testing
    return NextResponse.json({
      message: "Password reset token generated",
      token, // Remove this in production - send via email instead
      email: user.email,
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { error: "Failed to process password reset request" },
      { status: 500 }
    );
  }
}
