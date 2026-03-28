/**
 * Shared validation utilities for all API routes
 * Centralized to avoid inconsistency across endpoints
 */

// ── Phone Validation ──
export function validatePhone(phone: string | null | undefined): { valid: boolean; clean: string; error?: string } {
  if (!phone || !phone.trim()) return { valid: true, clean: "" }; // Optional field
  const clean = phone.replace(/\D/g, "");

  // Accept: 03XX (11 digits), 923XX (12 digits), or landline 042/051 etc
  if (clean.length === 11 && clean.startsWith("03")) {
    if (/^(\d)\1{10}$/.test(clean)) return { valid: false, clean, error: "Phone number cannot be all same digits" };
    return { valid: true, clean };
  }
  if (clean.length === 12 && clean.startsWith("92")) {
    if (/^(\d)\1{11}$/.test(clean)) return { valid: false, clean, error: "Phone number cannot be all same digits" };
    return { valid: true, clean };
  }
  if (clean.length >= 9 && clean.length <= 11) {
    // Landline format
    return { valid: true, clean };
  }
  return { valid: false, clean, error: "Invalid phone number. Use format: 03XX-XXXXXXX or +92 3XX XXXXXXX" };
}

// ── CNIC Validation ──
export function validateCNIC(cnic: string | null | undefined): { valid: boolean; clean: string; error?: string } {
  if (!cnic || !cnic.trim()) return { valid: true, clean: "" }; // Optional
  const clean = cnic.replace(/\D/g, "");
  if (clean.length !== 13) return { valid: false, clean, error: "CNIC must be exactly 13 digits" };
  if (/^(\d)\1{12}$/.test(clean)) return { valid: false, clean, error: "CNIC cannot be all same digits" };
  // Check common fake patterns
  if (clean === "1234567890123" || clean === "0000000000000") {
    return { valid: false, clean, error: "Please enter a valid CNIC number" };
  }
  return { valid: true, clean };
}

// ── Email Validation ──
export function validateEmail(email: string): { valid: boolean; error?: string } {
  if (!email || !email.trim()) return { valid: false, error: "Email is required" };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { valid: false, error: "Invalid email format" };

  const domain = email.split("@")[1].toLowerCase();
  const blocked = ["tempmail.com", "throwaway.email", "10minutemail.com", "mailinator.com", "guerrillamail.com"];
  if (blocked.includes(domain)) return { valid: false, error: "Temporary email addresses are not allowed" };

  return { valid: true };
}

// ── Name Validation ──
export function validateName(name: string, label = "Name"): { valid: boolean; error?: string } {
  if (!name || !name.trim()) return { valid: false, error: `${label} is required` };
  if (name.trim().length < 2) return { valid: false, error: `${label} must be at least 2 characters` };
  if (name.trim().length > 100) return { valid: false, error: `${label} cannot exceed 100 characters` };
  if (/(.)\1{4,}/.test(name)) return { valid: false, error: `${label} contains too many repeated characters` };
  return { valid: true };
}

// ── Password Validation ──
export function validatePassword(password: string): { valid: boolean; error?: string } {
  if (!password) return { valid: false, error: "Password is required" };
  if (password.length < 8) return { valid: false, error: "Password must be at least 8 characters" };
  if (!/[A-Z]/.test(password)) return { valid: false, error: "Password must contain an uppercase letter" };
  if (!/[a-z]/.test(password)) return { valid: false, error: "Password must contain a lowercase letter" };
  if (!/[0-9]/.test(password)) return { valid: false, error: "Password must contain a number" };
  if (!/[!@#$%^&*(),.?":{}|<>\-_]/.test(password)) return { valid: false, error: "Password must contain a special character" };
  return { valid: true };
}

// ── Amount Validation ──
export function validateAmount(amount: number | string | undefined, label = "Amount", min = 0, max = 10000000): { valid: boolean; value: number; error?: string } {
  const num = typeof amount === "string" ? parseFloat(amount) : (amount ?? 0);
  if (isNaN(num)) return { valid: false, value: 0, error: `${label} must be a valid number` };
  if (num < min) return { valid: false, value: num, error: `${label} must be at least ${min}` };
  if (num > max) return { valid: false, value: num, error: `${label} cannot exceed ${max.toLocaleString()}` };
  return { valid: true, value: num };
}

// ── Month/Year Validation ──
export function validateMonthYear(month: number, year: number): { valid: boolean; error?: string } {
  if (month < 1 || month > 12) return { valid: false, error: "Month must be between 1 and 12" };
  const currentYear = new Date().getFullYear();
  if (year < currentYear - 3 || year > currentYear + 1) return { valid: false, error: "Year is out of valid range" };
  return { valid: true };
}

// ── Duplicate Check Helper ──
export async function checkDuplicate(
  prisma: any,
  model: string,
  field: string,
  value: string,
  scope: Record<string, string>,
  label = "Record"
): Promise<{ exists: boolean; error?: string; existing?: any }> {
  if (!value || !value.trim()) return { exists: false };
  const where = { ...scope, [field]: value.trim() };
  const existing = await (prisma as any)[model].findFirst({ where });
  if (existing) {
    return { exists: true, error: `${label} with this ${field} already exists`, existing };
  }
  return { exists: false };
}
