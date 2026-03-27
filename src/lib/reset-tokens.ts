import crypto from "crypto";

interface TokenData {
  userId: string;
  email: string;
  expires: number;
}

const tokens = new Map<string, TokenData>();

// Clean up expired tokens every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of tokens.entries()) {
    if (now > value.expires) {
      tokens.delete(key);
    }
  }
}, 10 * 60 * 1000);

export function createResetToken(userId: string, email: string): string {
  // Remove any existing tokens for this user
  for (const [key, value] of tokens.entries()) {
    if (value.userId === userId) {
      tokens.delete(key);
    }
  }

  const token = crypto.randomBytes(32).toString("hex");
  tokens.set(token, {
    userId,
    email,
    expires: Date.now() + 60 * 60 * 1000, // 1 hour
  });

  return token;
}

export function verifyResetToken(
  token: string
): { userId: string; email: string } | null {
  const data = tokens.get(token);
  if (!data) return null;

  if (Date.now() > data.expires) {
    tokens.delete(token);
    return null;
  }

  return { userId: data.userId, email: data.email };
}

export function clearResetToken(token: string): void {
  tokens.delete(token);
}
