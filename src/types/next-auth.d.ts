import { UserRole } from "@prisma/client";
import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      role: UserRole;
      tenantId: string | null;
      hostelId: string | null;
      residentId: string | null;
      image: string | null;
    };
  }

  interface User {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    tenantId: string | null;
    hostelId: string | null;
    residentId: string | null;
    image: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: UserRole;
    tenantId: string | null;
    hostelId: string | null;
    residentId: string | null;
  }
}
