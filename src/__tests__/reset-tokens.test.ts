import {
  createResetToken,
  verifyResetToken,
  clearResetToken,
} from "@/lib/reset-tokens";

describe("Reset Tokens", () => {
  it("creates a token for a user", () => {
    const token = createResetToken("user-1", "test@example.com");
    expect(token).toBeDefined();
    expect(typeof token).toBe("string");
    expect(token.length).toBeGreaterThan(20);
  });

  it("verifies a valid token", () => {
    const token = createResetToken("user-2", "test2@example.com");
    const result = verifyResetToken(token);
    expect(result).not.toBeNull();
    expect(result?.userId).toBe("user-2");
    expect(result?.email).toBe("test2@example.com");
  });

  it("returns null for invalid token", () => {
    const result = verifyResetToken("invalid-token-123");
    expect(result).toBeNull();
  });

  it("clears a token after use", () => {
    const token = createResetToken("user-3", "test3@example.com");
    clearResetToken(token);
    const result = verifyResetToken(token);
    expect(result).toBeNull();
  });

  it("generates unique tokens", () => {
    const t1 = createResetToken("user-4", "a@b.com");
    const t2 = createResetToken("user-5", "c@d.com");
    expect(t1).not.toBe(t2);
  });
});
