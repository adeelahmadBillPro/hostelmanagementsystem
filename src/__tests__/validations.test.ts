import {
  loginSchema,
  registerSchema,
  hostelSchema,
  roomSchema,
  residentSchema,
  paymentSchema,
  staffSchema,
  foodMenuSchema,
  noticeSchema,
  complaintSchema,
  gatePassSchema,
  visitorSchema,
} from "@/lib/validations";

describe("Zod Validation Schemas", () => {
  describe("loginSchema", () => {
    it("accepts valid login", () => {
      const result = loginSchema.safeParse({
        email: "test@example.com",
        password: "password123",
      });
      expect(result.success).toBe(true);
    });

    it("rejects empty email", () => {
      const result = loginSchema.safeParse({
        email: "",
        password: "password123",
      });
      expect(result.success).toBe(false);
    });

    it("rejects short password", () => {
      const result = loginSchema.safeParse({
        email: "test@example.com",
        password: "12345",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("hostelSchema", () => {
    it("accepts valid hostel", () => {
      const result = hostelSchema.safeParse({
        name: "Al-Noor Hostel",
        type: "PRIVATE",
        address: "123 University Road",
      });
      expect(result.success).toBe(true);
    });

    it("rejects missing name", () => {
      const result = hostelSchema.safeParse({
        name: "",
        type: "PRIVATE",
        address: "123 Road",
      });
      expect(result.success).toBe(false);
    });

    it("rejects invalid type", () => {
      const result = hostelSchema.safeParse({
        name: "Test Hostel",
        type: "INVALID",
        address: "123 Road",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("roomSchema", () => {
    it("accepts valid room", () => {
      const result = roomSchema.safeParse({
        roomNumber: "101",
        type: "DOUBLE",
        totalBeds: 2,
        rentPerBed: 8000,
        floorId: "test-floor-id",
      });
      expect(result.success).toBe(true);
    });

    it("rejects zero beds", () => {
      const result = roomSchema.safeParse({
        roomNumber: "101",
        type: "DOUBLE",
        totalBeds: 0,
        rentPerBed: 8000,
        floorId: "test-floor-id",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("paymentSchema", () => {
    it("accepts valid payment", () => {
      const result = paymentSchema.safeParse({
        amount: 5000,
        method: "JAZZCASH",
        date: "2026-03-27",
      });
      expect(result.success).toBe(true);
    });

    it("rejects zero amount", () => {
      const result = paymentSchema.safeParse({
        amount: 0,
        method: "CASH",
        date: "2026-03-27",
      });
      expect(result.success).toBe(false);
    });

    it("rejects invalid method", () => {
      const result = paymentSchema.safeParse({
        amount: 5000,
        method: "BITCOIN",
        date: "2026-03-27",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("staffSchema", () => {
    it("accepts valid staff", () => {
      const result = staffSchema.safeParse({
        name: "Ali Hassan",
        staffType: "SECURITY",
        shift: "NIGHT",
        salary: 25000,
        joiningDate: "2024-01-15",
      });
      expect(result.success).toBe(true);
    });

    it("rejects invalid staff type", () => {
      const result = staffSchema.safeParse({
        name: "Ali",
        staffType: "PILOT",
        shift: "DAY",
        salary: 25000,
        joiningDate: "2024-01-15",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("foodMenuSchema", () => {
    it("accepts valid menu item", () => {
      const result = foodMenuSchema.safeParse({
        mealType: "LUNCH",
        itemName: "Chicken Biryani",
        rate: 200,
        availableDays: ["monday", "wednesday", "friday"],
      });
      expect(result.success).toBe(true);
    });

    it("rejects empty available days", () => {
      const result = foodMenuSchema.safeParse({
        mealType: "LUNCH",
        itemName: "Biryani",
        rate: 200,
        availableDays: [],
      });
      expect(result.success).toBe(false);
    });
  });

  describe("noticeSchema", () => {
    it("accepts valid notice", () => {
      const result = noticeSchema.safeParse({
        title: "Important Notice",
        content: "Please follow hostel rules.",
      });
      expect(result.success).toBe(true);
    });

    it("rejects short content", () => {
      const result = noticeSchema.safeParse({
        title: "Notice",
        content: "Hi",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("complaintSchema", () => {
    it("accepts valid complaint", () => {
      const result = complaintSchema.safeParse({
        category: "Maintenance",
        description: "AC is not working in room 201",
      });
      expect(result.success).toBe(true);
    });

    it("rejects short description", () => {
      const result = complaintSchema.safeParse({
        category: "Maintenance",
        description: "AC broken",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("gatePassSchema", () => {
    it("accepts valid gate pass", () => {
      const result = gatePassSchema.safeParse({
        leaveDate: "2026-04-01",
        returnDate: "2026-04-03",
        reason: "Going home for weekend",
      });
      expect(result.success).toBe(true);
    });

    it("rejects missing dates", () => {
      const result = gatePassSchema.safeParse({
        leaveDate: "",
        returnDate: "",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("visitorSchema", () => {
    it("accepts valid visitor", () => {
      const result = visitorSchema.safeParse({
        name: "Ahmed Khan",
        residentId: "test-resident-id",
      });
      expect(result.success).toBe(true);
    });

    it("rejects missing name", () => {
      const result = visitorSchema.safeParse({
        name: "",
        residentId: "test-id",
      });
      expect(result.success).toBe(false);
    });
  });
});
