import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth.token;

    if (!token) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    const role = token.role as string;

    // Super Admin routes
    if (pathname.startsWith("/super-admin") && role !== "SUPER_ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    // Portal routes - only for residents and staff
    if (
      pathname.startsWith("/portal") &&
      role !== "RESIDENT" &&
      role !== "STAFF"
    ) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    // Dashboard routes - not for residents/staff
    if (
      (pathname.startsWith("/dashboard") ||
        pathname.startsWith("/hostels") ||
        pathname.startsWith("/managers") ||
        pathname.startsWith("/hostel/")) &&
      (role === "RESIDENT" || role === "STAFF")
    ) {
      return NextResponse.redirect(new URL("/portal/dashboard", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/super-admin/:path*",
    "/hostels/:path*",
    "/managers/:path*",
    "/hostel/:path*",
    "/portal/:path*",
    "/profile",
    "/profile/:path*",
    "/settings",
    "/settings/:path*",
    "/plans",
    "/plans/:path*",
  ],
};
