import {
  formatCurrency,
  formatDate,
  formatCNIC,
  validateCNIC,
  validateEmail,
  validatePhone,
  generateReceiptNumber,
  getInitials,
  getOccupancyColor,
} from "@/lib/utils";

describe("Utility Functions", () => {
  describe("formatCurrency", () => {
    it("formats number as PKR currency", () => {
      const result = formatCurrency(10000);
      expect(result).toContain("10");
      expect(result).toContain("000");
    });

    it("handles zero", () => {
      const result = formatCurrency(0);
      expect(result).toContain("0");
    });

    it("handles large numbers", () => {
      const result = formatCurrency(1500000);
      expect(result).toContain("1,500,000");
    });
  });

  describe("formatCNIC", () => {
    it("formats 13 digit CNIC correctly", () => {
      expect(formatCNIC("3520112345671")).toBe("35201-1234567-1");
    });

    it("returns original if not 13 digits", () => {
      expect(formatCNIC("12345")).toBe("12345");
    });

    it("strips non-digits before formatting", () => {
      expect(formatCNIC("35201-1234567-1")).toBe("35201-1234567-1");
    });
  });

  describe("validateCNIC", () => {
    it("returns true for valid 13-digit CNIC", () => {
      expect(validateCNIC("3520112345671")).toBe(true);
    });

    it("returns true for formatted CNIC", () => {
      expect(validateCNIC("35201-1234567-1")).toBe(true);
    });

    it("returns false for short CNIC", () => {
      expect(validateCNIC("12345")).toBe(false);
    });

    it("returns false for long CNIC", () => {
      expect(validateCNIC("35201123456789")).toBe(false);
    });
  });

  describe("validateEmail", () => {
    it("returns true for valid email", () => {
      expect(validateEmail("test@example.com")).toBe(true);
    });

    it("returns false for invalid email", () => {
      expect(validateEmail("test@")).toBe(false);
      expect(validateEmail("test")).toBe(false);
      expect(validateEmail("")).toBe(false);
    });
  });

  describe("validatePhone", () => {
    it("returns true for valid Pakistani phone", () => {
      expect(validatePhone("03001234567")).toBe(true);
    });

    it("returns false for invalid phone", () => {
      expect(validatePhone("12345")).toBe(false);
      expect(validatePhone("")).toBe(false);
    });
  });

  describe("generateReceiptNumber", () => {
    it("generates unique receipt numbers", () => {
      const r1 = generateReceiptNumber();
      const r2 = generateReceiptNumber();
      expect(r1).not.toBe(r2);
    });

    it("starts with RCP-", () => {
      expect(generateReceiptNumber()).toMatch(/^RCP-/);
    });
  });

  describe("getInitials", () => {
    it("gets initials from full name", () => {
      expect(getInitials("Muhammad Ahmed")).toBe("MA");
    });

    it("handles single name", () => {
      expect(getInitials("Ahmed")).toBe("A");
    });

    it("limits to 2 characters", () => {
      expect(getInitials("Muhammad Ahmed Khan")).toBe("MA");
    });
  });

  describe("getOccupancyColor", () => {
    it("returns danger for high occupancy", () => {
      expect(getOccupancyColor(95)).toBe("danger");
    });

    it("returns warning for medium occupancy", () => {
      expect(getOccupancyColor(75)).toBe("warning");
    });

    it("returns success for low occupancy", () => {
      expect(getOccupancyColor(30)).toBe("success");
    });
  });
});
