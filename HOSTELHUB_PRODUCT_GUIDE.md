# HostelHub - Complete Hostel Management Platform

## Product Overview

**HostelHub** is a comprehensive, cloud-ready hostel management SaaS platform built for hostel owners, managers, and residents in Pakistan. It digitizes every aspect of hostel operations - from room management to billing, food ordering, staff tracking, and resident portals.

**Tech Stack:** Next.js 14 | React 18 | PostgreSQL | Prisma ORM | Tailwind CSS | TypeScript

---

## Live Demo Access

| Role | Email | Password | What They Can Do |
|------|-------|----------|------------------|
| Super Admin | admin@hostelhub.com | password123 | Manage tenants, plans, platform analytics |
| Tenant Admin | *(create via Super Admin)* | *(auto-generated)* | Manage hostels, staff, residents, billing |
| Manager | *(create via Tenant)* | *(auto-generated)* | Day-to-day hostel operations |
| Resident | *(create via Tenant/Manager)* | *(auto-generated)* | View bills, order food, complaints |

---

## Role Hierarchy

```
Super Admin (Platform Owner)
  └── Tenants (Hostel Owners)
        ├── Hostels (Multiple properties)
        │     ├── Managers (Assigned per hostel)
        │     ├── Staff (Security, Cook, Cleaner, etc.)
        │     └── Residents (Room/Bed assigned)
        └── Billing & Analytics
```

---

## Modules & Features (28 Modules)

### 1. Multi-Tenant System
- Super Admin manages all tenants from one dashboard
- Each tenant (hostel owner) is isolated with their own data
- Tenant creation auto-generates login credentials
- WhatsApp + Copy share for credentials

### 2. Subscription Plans & Trial
| Plan | Price | Hostels | Residents | Rooms | Staff |
|------|-------|---------|-----------|-------|-------|
| Free Trial | Free (14 days) | 1 | 5 | 10 | 2 |
| Starter | PKR 2,000/mo | 1 | 50 | 30 | 5 |
| Pro | PKR 5,000/mo | 3 | 200 | 100 | 20 |
| Enterprise | PKR 10,000/mo | Unlimited | Unlimited | Unlimited | Unlimited |

- Auto-assigned free trial on registration
- Dashboard shows usage bars (hostels, residents, rooms, staff)
- Trial expiry warning banner
- Limit enforcement on all APIs

### 3. Hostel Management
- Create multiple hostels per tenant
- Hostel types: Government, University, Private
- **15 amenities/facilities** (WiFi, AC, CCTV, Parking, Gym, etc.)
- Auto-select defaults per hostel type
- Hostel Profile page with toggle switches for amenities
- Cover image upload

### 4. Building & Floor Management
- Multiple buildings per hostel
- Multiple floors per building
- Duplicate name/number validation
- Visual hierarchy: Building > Floor > Rooms

### 5. Room Management
- Quick Add: Create 1-50 rooms in one go
- Room types: Single, Double, Triple, Quad
- Rent per bed pricing
- Room features field (AC, Fan, Attached Washroom, etc.)
- Room status: Active, Maintenance, Inactive
- Filters: Building, Floor, Type, Status
- Color-coded room cards with bed indicators

### 6. Visual Map View
- Blueprint-style floor plan for each building
- Color-coded rooms: Green (vacant), Amber (partial), Red (full)
- **Modern hover tooltip** on occupied beds showing:
  - Resident avatar + full name
  - Bed number
  - Phone number
- Click room for detailed panel
- Zoom in/out + fullscreen mode

### 7. Resident Management
- Multi-step add form: Personal Info > Room Assignment > Financial
- **CNIC auto-format** (XXXXX-XXXXXXX-X) with live validation
- Phone validation (Pakistani format)
- Email duplicate check
- Food Plan selection: Full Mess / No Mess / Custom
- Auto-generate login credentials
- **WhatsApp share** button for credentials
- **Password reset** with credential popup
- Food plan filter on residents list
- Food plan badge in table

### 8. Food System
- **Menu Management**: Add items per meal type (Breakfast/Lunch/Dinner/Snack)
- **15 preset Pakistani foods** per meal (Biryani, Paratha, Nihari, etc.)
- Available days per item (Mon-Sun)
- Category system: Main, Side, Bread, Drink, Dessert
- Free items & "Free with meal" logic

### 9. Food Ordering (Resident Portal)
- Browse today's menu by meal type
- Add to cart with +/- quantity controls
- **Remove item (X)** and **Clear cart** buttons
- Order summary with subtotal
- Review order modal before submitting
- **Ordering time windows**: Breakfast 6-9AM, Lunch 11-2PM, Dinner 6-9PM, Snack 10AM-10PM
- **Today's orders** section
- **Ordering hours** display with live open/closed indicators
- Monthly spending summary

### 10. Food Order Management (Admin)
- View all orders with date/resident filters
- Revenue stats by meal type
- **Order status flow**: Pending → Preparing → Delivered / Cancelled
- Action buttons: Chef hat (preparing), Checkmark (delivered), X (cancel)
- Status badges: Pending (yellow), Preparing (blue), Delivered (green), Cancelled (red)

### 11. Weekly Food Schedule
- **Calendar view**: 7-day grid with 4 meal slots
- Color-coded by meal type
- Mobile responsive: stacked cards
- Toggle between Calendar and Edit mode
- Quick templates for common schedules

### 12. Billing System
- **Billing cycles**: Weekly, Bi-Weekly, Monthly
- **Billing Settings** modal:
  - Cycle selection
  - Fixed food/mess fee (prorated for weekly)
  - Payment due days
- **One-click generation** for all active residents
- Bill breakdown: Rent + Fixed Food + App Orders + Meter + Parking + Previous Balance - Advance
- **Food plan aware**: Full Mess (charged), No Mess (Rs 0), Custom (individual fee)
- Auto-mark PAID when total is Rs 0
- Delete bill option (when no payments)
- Bill detail page with payment recording

### 13. Payment System
- Record payments: Cash, Bank Transfer, JazzCash, EasyPaisa
- Bill status tracking: Unpaid → Partial → Paid → Overdue
- Auto-overdue after due date
- Payment history per resident
- **PDF receipt** generation
- **WhatsApp** bill sharing
- Payment proof upload system

### 14. Staff Management
- Staff types: Security, Cooking, Laundry, Cleaning, Maintenance, Admin
- Shift types: Day, Night, Full Time
- **Visual type selector** with icons
- **Staff benefits**:
  - Free Accommodation (checkbox + room number)
  - Free Mess Food (checkbox)
  - Food Allowance (PKR/month)
- **Monthly cost summary** card
- CNIC auto-format + duplicate check
- Phone validation

### 15. Staff Salary Sheet
- Generate salary sheet for all staff per month
- Base salary, Bonus, Deduction, Net Amount
- Mark individual or all as Paid
- Payment method tracking
- Stats: Total Base, Bonus, Deductions, Net, Paid/Unpaid

### 16. Staff Attendance
- Daily attendance with date picker
- Status: Present, Absent, Late, Half Day, Leave
- Check-in / Check-out times
- Notes per staff member
- Stats cards: Present, Absent, Late counts
- Color-coded status badges

### 17. Manager System
- Create managers with hostel assignment
- **Salary field** for salary sheet generation
- **Manager Salary Sheet** (separate from staff)
- Credential popup with WhatsApp share
- Managers see only assigned hostels

### 18. Expense Tracking
- Categorized expenses (Utilities, Maintenance, Food, etc.)
- Date, amount, description, receipt URL
- **P&L Summary** page
- Category-wise breakdown

### 19. Visitor Management
- Register visitors with CNIC, phone, purpose
- Assign to specific resident
- Time in/out tracking
- "Mark Out" button
- **Validation**: Name, CNIC (13 digits), Phone format

### 20. Complaint System
- Residents file complaints from portal
- Category, priority, description
- Status tracking: Open → In Progress → Resolved
- Admin/Manager resolution

### 21. Gate Pass System
- Residents request gate passes
- Types: Move-out, Luggage, Late Night
- Approval workflow
- Date/time tracking

### 22. Notice Board
- Admin publishes notices
- All residents see on their dashboard
- Recent notices on portal homepage

### 23. Messaging System
- Conversations between residents and management
- Subject + message threads
- New conversation modal
- Real-time-ready architecture

### 24. Meter Readings
- Track electricity/water meter readings per room
- Amount calculation
- Auto-included in monthly bills

### 25. Reports & Analytics
- Occupancy rates
- Revenue trends
- Expense breakdowns
- Per-hostel analytics
- Super Admin platform-wide analytics

### 26. Import / Export Center
**Import (Excel upload):**
- Residents: Auto-generates passwords, validates CNIC/email, finds room/bed, returns credentials list
- Rooms: Auto-creates buildings/floors, creates beds
- Food Menu: Validates meal types, creates items

**Export (Excel download):**
- Residents, Payments, Staff, Billing, Rooms, Expenses

### 27. Profile & Security
- **Change Password** page with strength validation
- Account info display (name, email, role)
- Password requirements: 8+ chars, uppercase, lowercase, number, special char
- Session management via JWT

### 28. Resident Portal
- **Dashboard**: Welcome banner, Room/Bed info, Agreement card (rent, advance, deposit, food plan), Current bill, Recent notices, Quick links
- **Hostel Info**: View hostel details and amenities
- **My Bill**: View current and past bills
- **Pay Bill**: Online payment submission
- **Food Menu**: Browse and order food
- **Complaints**: File and track complaints
- **Gate Pass**: Request gate passes
- **Notices**: View hostel notices
- **Messages**: Chat with management

---

## Security & Validation

- **Server-side validation** on all 11+ API endpoints
- Phone: Pakistani format, repeated digit rejection
- CNIC: 13-digit validation, duplicate check, fake pattern detection
- Email: Format + disposable domain blocking
- Password: 8+ chars, uppercase, lowercase, number, special character
- Amount: Min/max bounds, NaN check
- Rate limiting on all APIs (standard, sensitive, strict)
- Role-based access control (5 roles)
- JWT session management
- bcrypt password hashing

---

## Registration Flow

1. New user visits `/register`
2. Fills: Name, Email, Phone (+92 mobile/landline), Password (with strength meter)
3. All fields validated in real-time
4. Auto-assigned **Free Trial** plan (14 days)
5. **Auto-login** after registration → goes to dashboard
6. Dashboard shows plan usage bars + trial countdown

---

## UI/UX Highlights

- Dark mode support (toggle in header)
- Responsive design (mobile + desktop)
- Custom dark sidebar with ambient glow
- Color-coded icon navigation
- Smooth animations (fade-in, slide-up, scale)
- Toast notifications (no browser alerts)
- Loading skeletons
- Staggered card animations
- Custom scrollbar
- PWA-ready (manifest + service worker)

---

## Database Schema

**28 tables** including:
User, Tenant, SubscriptionPlan, Hostel, HostelAmenity, Building, Floor, Room, Bed, Resident, Staff, StaffSalary, StaffAttendance, ManagerSalary, FoodMenu, FoodOrder, MonthlyBill, Payment, PaymentProof, BillDispute, Expense, ExpenseCategory, Visitor, Complaint, GatePass, Notice, Conversation, Message, MeterReading, RoomTransfer, RoomInventory, Parking, AuditLog, ManagerHostel

---

## Tech Specifications

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript
- **Styling**: Tailwind CSS 3, Custom Design System
- **Database**: PostgreSQL with Prisma ORM 5
- **Auth**: NextAuth.js with JWT strategy
- **Charts**: ApexCharts
- **PDF**: pdfmake
- **Excel**: xlsx library
- **Icons**: Lucide React (1000+ icons)
- **Forms**: React Hook Form + Zod validation

---

## Deployment Ready

- Vercel-compatible (Next.js optimized)
- Environment variables configured
- Production build tested
- PWA manifest included

---

*Built with Next.js 14 + TypeScript + PostgreSQL + Prisma*
*HostelHub - Complete Hostel Management Platform*
