# HostelHub - Hostel Management System

A complete multi-tenant hostel management SaaS platform built with Next.js 14, Prisma 5, and PostgreSQL.

## Tech Stack

- **Frontend**: Next.js 14 (App Router) + Tailwind CSS + Lucide Icons
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL with Prisma 5 ORM
- **Auth**: NextAuth.js v4 (JWT, role-based)
- **Charts**: ApexCharts
- **PDF**: pdfmake

## Features

- Multi-tenant architecture (multiple hostel owners on one platform)
- 5 user roles with role-based access control
- Building / Floor / Room / Bed management with visual room grid
- Resident management with CNIC validation
- Monthly billing with itemized breakdown
- Payment recording (Cash, Bank, JazzCash, EasyPaisa)
- Payment proof upload and manager approval
- Food menu management with ordering system
- Staff management with salary tracking
- Expense tracking with P&L reports
- Visitor log, complaint system, gate passes
- In-app messaging (Resident <-> Manager)
- Map/floor plan view
- Dark mode support
- Rate-limited API routes

## User Roles

| Role | Description |
|------|-------------|
| **SUPER_ADMIN** | Platform owner. Manages tenants, subscription plans, analytics |
| **TENANT_ADMIN** | Hostel owner. Manages multiple hostels, full access to all modules |
| **HOSTEL_MANAGER** | Assigned to specific hostels. Day-to-day operations |
| **RESIDENT** | Boy/Girl staying in hostel. Portal access for bills, food, complaints |
| **STAFF** | Watchman, cook, laundry etc. View own salary and shift |

## Prerequisites

- Node.js 18+
- PostgreSQL 14+
- npm

## Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/adeelahmadBillPro/hostelmanagementsystem.git
   cd hostelmanagementsystem
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and set your PostgreSQL connection string and NextAuth secret.

4. **Create the database**
   ```bash
   createdb hostel_management
   ```

5. **Run migrations**
   ```bash
   npx prisma migrate dev
   ```

6. **Seed demo data**
   ```bash
   npx tsx prisma/seed.ts
   ```

7. **Start the development server**
   ```bash
   npm run dev
   ```

8. **For production** (faster page loads)
   ```bash
   npm run build
   npm start
   ```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Demo Accounts

After seeding, use these credentials (password: `password123`):

| Role | Email |
|------|-------|
| Super Admin | admin@hostelhub.com |
| Tenant Admin | tenant@hostelhub.com |
| Hostel Manager | manager@hostelhub.com |
| Resident | resident@hostelhub.com |

## Project Structure

```
src/
  app/
    (auth)/          # Login, Register pages
    (dashboard)/     # All dashboard pages
      dashboard/     # Tenant dashboard
      super-admin/   # Super admin panel
      hostel/[id]/   # Hostel-specific pages (rooms, residents, billing, etc.)
      portal/        # Resident portal
    api/             # API routes
  components/
    layout/          # Sidebar, Header, DashboardLayout
    ui/              # StatCard, DataTable, Modal, Chart, etc.
  lib/               # Prisma client, auth, utils, validations
  types/             # TypeScript type definitions
prisma/
  schema.prisma      # Database schema
  seed.ts            # Demo data seed script
```

## License

MIT
