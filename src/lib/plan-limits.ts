import { prisma } from "./prisma";

export interface PlanLimits {
  maxHostels: number;
  maxResidents: number;
  maxRooms: number;
  maxStaff: number;
  features: string[];
  planName: string;
  isTrial: boolean;
  trialExpired: boolean;
  trialEndsAt: Date | null;
  daysLeft: number | null;
}

export interface LimitCheck {
  allowed: boolean;
  reason?: string;
  current?: number;
  limit?: number;
}

/**
 * Get the plan limits for a tenant
 */
export async function getPlanLimits(tenantId: string): Promise<PlanLimits> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: { plan: true },
  });

  if (!tenant) {
    return {
      maxHostels: 0, maxResidents: 0, maxRooms: 0, maxStaff: 0,
      features: [], planName: "None", isTrial: false,
      trialExpired: true, trialEndsAt: null, daysLeft: 0,
    };
  }

  const plan = tenant.plan;
  const isTrial = tenant.isTrial;
  const trialEndsAt = tenant.trialEndsAt;
  const now = new Date();
  const trialExpired = isTrial && trialEndsAt ? now > trialEndsAt : false;
  const daysLeft = trialEndsAt
    ? Math.max(0, Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
    : null;

  if (!plan) {
    // No plan assigned - give basic defaults (free trial defaults)
    return {
      maxHostels: 1, maxResidents: 20, maxRooms: 50, maxStaff: 5,
      features: ["rooms", "residents", "billing", "food"],
      planName: isTrial ? "Free Trial" : "No Plan",
      isTrial, trialExpired, trialEndsAt, daysLeft,
    };
  }

  return {
    maxHostels: plan.maxHostels,
    maxResidents: plan.maxResidents,
    maxRooms: plan.maxRooms,
    maxStaff: plan.maxStaff,
    features: plan.features,
    planName: plan.name,
    isTrial, trialExpired, trialEndsAt, daysLeft,
  };
}

/**
 * Check if tenant can add more hostels
 */
export async function canAddHostel(tenantId: string): Promise<LimitCheck> {
  const limits = await getPlanLimits(tenantId);

  if (limits.trialExpired) {
    return { allowed: false, reason: "Your free trial has expired. Please upgrade your plan to continue." };
  }

  const currentHostels = await prisma.hostel.count({ where: { tenantId } });

  if (currentHostels >= limits.maxHostels) {
    return {
      allowed: false,
      reason: `Your ${limits.planName} plan allows maximum ${limits.maxHostels} hostel(s). Please upgrade to add more.`,
      current: currentHostels,
      limit: limits.maxHostels,
    };
  }

  return { allowed: true, current: currentHostels, limit: limits.maxHostels };
}

/**
 * Check if tenant can add more residents to a hostel
 */
export async function canAddResident(tenantId: string, hostelId: string): Promise<LimitCheck> {
  const limits = await getPlanLimits(tenantId);

  if (limits.trialExpired) {
    return { allowed: false, reason: "Your free trial has expired. Please upgrade your plan to continue." };
  }

  const currentResidents = await prisma.resident.count({
    where: { hostelId, status: "ACTIVE" },
  });

  if (currentResidents >= limits.maxResidents) {
    return {
      allowed: false,
      reason: `Your ${limits.planName} plan allows maximum ${limits.maxResidents} residents per hostel. Please upgrade to add more.`,
      current: currentResidents,
      limit: limits.maxResidents,
    };
  }

  return { allowed: true, current: currentResidents, limit: limits.maxResidents };
}

/**
 * Check if tenant can add more rooms to a hostel
 */
export async function canAddRooms(tenantId: string, hostelId: string, count: number = 1): Promise<LimitCheck> {
  const limits = await getPlanLimits(tenantId);

  if (limits.trialExpired) {
    return { allowed: false, reason: "Your free trial has expired. Please upgrade your plan to continue." };
  }

  const currentRooms = await prisma.room.count({
    where: { floor: { building: { hostelId } } },
  });

  if (currentRooms + count > limits.maxRooms) {
    return {
      allowed: false,
      reason: `Your ${limits.planName} plan allows maximum ${limits.maxRooms} rooms. You have ${currentRooms} rooms. Please upgrade to add more.`,
      current: currentRooms,
      limit: limits.maxRooms,
    };
  }

  return { allowed: true, current: currentRooms, limit: limits.maxRooms };
}
