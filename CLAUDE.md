# HostelHub - Development Guidelines

## Project Overview
Multi-tenant hostel management SaaS built with Next.js 14 + Prisma + PostgreSQL + Tailwind CSS.
28+ modules, 5 user roles, 28 database tables.

## Key Commands
- `npx next dev` - Development server
- `npx next build` - Production build
- `npx next start -p 3000` - Production server
- `npx prisma db push --accept-data-loss` - Push schema changes
- `npx prisma generate` - Regenerate Prisma client
- `npx prisma studio` - Database GUI

## Architecture
- **Frontend**: Next.js 14 App Router, React 18, TypeScript
- **Styling**: Tailwind CSS with custom design system in `globals.css` + `tailwind.config.ts`
- **Database**: PostgreSQL via Prisma ORM 5
- **Auth**: NextAuth.js with JWT strategy
- **API**: Next.js Route Handlers in `src/app/api/`

## Project Structure
```
src/
  app/
    (auth)/         - Login, Register, Forgot Password pages
    (dashboard)/    - All authenticated pages
      dashboard/    - Tenant dashboard
      hostels/      - Hostel list
      hostel/[id]/  - Hostel-specific pages (rooms, residents, billing, etc.)
      portal/       - Resident/Staff portal pages
      super-admin/  - Super admin pages
      managers/     - Manager management
      profile/      - User profile/settings
    api/            - API routes
  components/
    layout/         - Sidebar, Header, DashboardLayout
    ui/             - Reusable UI components (Modal, DataTable, StatCard, etc.)
    providers.tsx   - Theme, Toast, Session providers
  lib/
    prisma.ts       - Prisma client singleton
    auth.ts         - NextAuth configuration
    session.ts      - Session helpers
    billing.ts      - Bill generation logic
    validate.ts     - Shared validation utilities
    plan-limits.ts  - Plan enforcement
    audit-log.ts    - Audit logging
    email.ts        - Email templates
    utils.ts        - Formatting helpers
```

## User Roles
1. **SUPER_ADMIN** - Platform owner, manages tenants/plans
2. **TENANT_ADMIN** - Hostel owner, manages hostels/staff/billing
3. **HOSTEL_MANAGER** - Day-to-day operations for assigned hostels
4. **RESIDENT** - Portal access (bills, food, complaints)
5. **STAFF** - Portal access (attendance)

## Coding Rules
- Always validate inputs on BOTH client and server side
- Use `src/lib/validate.ts` for shared validation (phone, CNIC, email, amounts)
- Use toast notifications (`useToast`) instead of browser `alert()`
- Always check plan limits before creating hostels/residents/rooms
- Return credentials after creating users (tenant/manager/resident)
- Test the complete flow from every role's perspective before shipping
- Every creation should show proper confirmation/credentials
- Use `(data as any)` sparingly - prefer proper TypeScript interfaces

## Database
- Schema: `prisma/schema.prisma`
- Always run `npx prisma db push --accept-data-loss` after schema changes
- Always run `npx prisma generate` if Prisma client shows type errors

## Environment Variables
- `DATABASE_URL` - PostgreSQL connection
- `NEXTAUTH_URL` - App URL
- `NEXTAUTH_SECRET` - JWT secret

## Default Accounts
- Super Admin: `admin@hostelhub.com` / `password123`
