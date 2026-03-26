import { z } from "zod";

// ==================== AUTH ====================

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const registerSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Invalid email address"),
    phone: z
      .string()
      .regex(/^(\+92|0)?3\d{9}$/, "Invalid Pakistani phone number")
      .optional()
      .or(z.literal("")),
    password: z
      .string()
      .min(6, "Password must be at least 6 characters")
      .regex(/[A-Z]/, "Must contain at least one uppercase letter")
      .regex(/[0-9]/, "Must contain at least one number"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

// ==================== HOSTEL ====================

export const hostelSchema = z.object({
  name: z.string().min(2, "Hostel name is required"),
  type: z.enum(["GOVERNMENT", "UNIVERSITY", "PRIVATE"]),
  address: z.string().min(5, "Address is required"),
  city: z.string().optional(),
  contact: z.string().optional(),
});

// ==================== BUILDING ====================

export const buildingSchema = z.object({
  name: z.string().min(1, "Building name is required"),
  totalFloors: z.number().min(1, "Must have at least 1 floor").max(50),
});

// ==================== FLOOR ====================

export const floorSchema = z.object({
  floorNumber: z.number().min(0),
  name: z.string().min(1, "Floor name is required"),
  buildingId: z.string().min(1, "Building is required"),
});

// ==================== ROOM ====================

export const roomSchema = z.object({
  roomNumber: z.string().min(1, "Room number is required"),
  type: z.enum(["SINGLE", "DOUBLE", "TRIPLE", "QUAD"]),
  totalBeds: z.number().min(1).max(10),
  rentPerBed: z.number().min(0, "Rent must be positive"),
  rentPerRoom: z.number().min(0).optional(),
  floorId: z.string().min(1, "Floor is required"),
});

// ==================== RESIDENT ====================

export const residentSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Invalid email"),
  phone: z.string().min(1, "Phone is required"),
  cnic: z
    .string()
    .regex(/^\d{5}-?\d{7}-?\d{1}$/, "CNIC must be 13 digits (XXXXX-XXXXXXX-X)")
    .optional()
    .or(z.literal("")),
  gender: z.enum(["Male", "Female", "Other"]).optional(),
  institution: z.string().optional(),
  emergencyContact: z.string().optional(),
  emergencyPhone: z.string().optional(),
  bloodGroup: z.string().optional(),
  medicalCondition: z.string().optional(),
  hostelId: z.string().min(1),
  roomId: z.string().min(1, "Room is required"),
  bedId: z.string().min(1, "Bed is required"),
  moveInDate: z.string().min(1, "Move-in date is required"),
  advancePaid: z.number().min(0).default(0),
  securityDeposit: z.number().min(0).default(0),
});

// ==================== EXPENSE ====================

export const expenseSchema = z.object({
  amount: z.number().min(1, "Amount must be greater than 0"),
  date: z.string().min(1, "Date is required"),
  description: z.string().optional(),
  categoryId: z.string().min(1, "Category is required"),
  receiptUrl: z.string().optional(),
});

// ==================== FOOD MENU ====================

export const foodMenuSchema = z.object({
  mealType: z.enum(["BREAKFAST", "LUNCH", "DINNER", "SNACK"]),
  itemName: z.string().min(1, "Item name is required"),
  rate: z.number().min(0, "Rate must be positive"),
  availableDays: z.array(z.string()).min(1, "Select at least one day"),
});

// ==================== PAYMENT ====================

export const paymentSchema = z.object({
  amount: z.number().min(1, "Amount must be greater than 0"),
  method: z.enum(["CASH", "BANK", "JAZZCASH", "EASYPAISA"]),
  date: z.string().min(1, "Date is required"),
  notes: z.string().optional(),
});

// ==================== STAFF ====================

export const staffSchema = z.object({
  name: z.string().min(2, "Name is required"),
  cnic: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  staffType: z.enum([
    "SECURITY",
    "COOKING",
    "LAUNDRY",
    "CLEANING",
    "MAINTENANCE",
    "ADMIN_STAFF",
    "OTHER",
  ]),
  shift: z.enum(["DAY", "NIGHT", "FULL"]),
  salary: z.number().min(0, "Salary must be positive"),
  joiningDate: z.string().min(1, "Joining date is required"),
});

// ==================== NOTICE ====================

export const noticeSchema = z.object({
  title: z.string().min(2, "Title is required"),
  content: z.string().min(5, "Content is required"),
});

// ==================== COMPLAINT ====================

export const complaintSchema = z.object({
  category: z.string().min(1, "Category is required"),
  description: z.string().min(10, "Description must be at least 10 characters"),
});

// ==================== GATE PASS ====================

export const gatePassSchema = z.object({
  leaveDate: z.string().min(1, "Leave date is required"),
  returnDate: z.string().min(1, "Return date is required"),
  reason: z.string().optional(),
});

// ==================== VISITOR ====================

export const visitorSchema = z.object({
  name: z.string().min(2, "Visitor name is required"),
  cnic: z.string().optional(),
  phone: z.string().optional(),
  purpose: z.string().optional(),
  residentId: z.string().min(1, "Resident is required"),
});

// ==================== SUBSCRIPTION PLAN ====================

export const subscriptionPlanSchema = z.object({
  name: z.string().min(2, "Plan name is required"),
  price: z.number().min(0, "Price must be positive"),
  maxHostels: z.number().min(1, "Must allow at least 1 hostel"),
  maxResidents: z.number().min(1, "Must allow at least 1 resident"),
  features: z.array(z.string()),
});

// ==================== TENANT ====================

export const tenantSchema = z.object({
  name: z.string().min(2, "Tenant name is required"),
  email: z.string().email("Invalid email"),
  phone: z.string().optional(),
  planId: z.string().optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type HostelInput = z.infer<typeof hostelSchema>;
export type BuildingInput = z.infer<typeof buildingSchema>;
export type RoomInput = z.infer<typeof roomSchema>;
export type ResidentInput = z.infer<typeof residentSchema>;
export type ExpenseInput = z.infer<typeof expenseSchema>;
export type FoodMenuInput = z.infer<typeof foodMenuSchema>;
export type PaymentInput = z.infer<typeof paymentSchema>;
export type StaffInput = z.infer<typeof staffSchema>;
export type NoticeInput = z.infer<typeof noticeSchema>;
export type ComplaintInput = z.infer<typeof complaintSchema>;
export type GatePassInput = z.infer<typeof gatePassSchema>;
export type VisitorInput = z.infer<typeof visitorSchema>;
