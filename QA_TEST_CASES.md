# HostelHub — QA Test Cases
**Version:** 1.0 | **Project:** HostelHub SaaS | **Date:** 2026-04-03

> **Roles used in testing:**
> - **SA** = Super Admin (`admin@hostelhub.com` / `password123`)
> - **TA** = Tenant Admin (created by SA)
> - **MG** = Hostel Manager (created by TA)
> - **RS** = Resident (created by TA/MG)
> - **ST** = Staff (created by TA/MG)

---

## MODULE 1 — AUTHENTICATION

### TC-AUTH-01: Valid Login (All Roles)
**Steps:**
1. Go to `/login`
2. Enter valid email + password for each role (SA, TA, MG, RS, ST)
3. Click Login

**Expected:** Each role redirected to correct dashboard
- SA → `/super-admin/dashboard`
- TA, MG → `/dashboard`
- RS, ST → `/portal/dashboard`

---

### TC-AUTH-02: Invalid Login
**Steps:**
1. Enter wrong password for any valid email
2. Enter email that doesn't exist

**Expected:** Error message shown. No redirect.

---

### TC-AUTH-03: Revoked Resident Login
**Pre-condition:** Resident has been checked out (portal access revoked)
**Steps:**
1. Try to login as checked-out resident

**Expected:** Error: *"Portal access has been revoked. Contact hostel management."*

---

### TC-AUTH-04: Forgot Password Flow
**Steps:**
1. Go to `/forgot-password`
2. Enter registered email
3. Check inbox for reset link
4. Click link → set new password
5. Login with new password

**Expected:** Email received. Password reset successful. Login works.

---

### TC-AUTH-05: Session Expiry
**Steps:**
1. Login as any user
2. Wait 24+ hours (or clear cookies)
3. Try to access a dashboard page

**Expected:** Redirected to `/login`

---

### TC-AUTH-06: Unauthorized Page Access
**Steps:**
1. Login as Resident
2. Manually navigate to `/hostel/[id]/billing`

**Expected:** Redirected or 403 error — resident cannot access admin pages

---

## MODULE 2 — SUPER ADMIN

### TC-SA-01: Create Tenant
**Steps:**
1. Login as SA → `/super-admin/tenants`
2. Click "Add Tenant"
3. Fill: name, email, password, plan
4. Submit

**Expected:**
- Tenant created
- Credentials modal shown with email + password
- WhatsApp and Copy buttons work

---

### TC-SA-02: Suspend Tenant
**Steps:**
1. SA → Tenants list
2. Find active tenant → click Suspend

**Expected:** Tenant status changes to SUSPENDED. Tenant admin cannot login (sees "account suspended" error).

---

### TC-SA-03: Manage Plans
**Steps:**
1. SA → `/super-admin/plans`
2. Create a new plan with limits (max hostels: 2, max residents: 50)
3. Edit plan limits
4. Assign plan to a tenant

**Expected:** Plan saved. Tenant sees new plan. Limits enforced when creating resources.

---

### TC-SA-04: Platform Analytics
**Steps:**
1. SA → `/super-admin/analytics`

**Expected:** Stats visible — total tenants, hostels, residents, revenue

---

### TC-SA-05: Plan Upgrade Request
**Steps:**
1. TA → `/plans` → click upgrade request
2. SA → `/super-admin/plans` → approve/reject

**Expected:** SA sees pending upgrade badge in notifications. Approve/reject updates tenant plan.

---

## MODULE 3 — TENANT ADMIN: HOSTEL SETUP

### TC-HOST-01: Create Hostel
**Steps:**
1. TA → `/hostels` → Add Hostel
2. Fill: name, type (Private/Govt/University), address, contact
3. Select amenities
4. Submit

**Expected:** Hostel appears in list with "Manage →" button. Hostel type shown as badge.

---

### TC-HOST-02: Plan Limit Enforcement
**Pre-condition:** Tenant on plan allowing 1 hostel
**Steps:**
1. Try to create 2nd hostel

**Expected:** Error: "Plan limit reached. Upgrade to add more hostels."

---

### TC-HOST-03: Hostel Profile Settings
**Steps:**
1. TA → `Hostel → Hostel Profile`
2. Update: billing cycle (Monthly/Weekly/Daily), food charge, advance rent, security deposit
3. Set payment methods: JazzCash number, EasyPaisa number, Bank IBAN
4. Save

**Expected:** All settings saved. Payment methods appear on resident portal bill page.

---

### TC-HOST-04: Building → Floor → Room Setup
**Steps:**
1. Create building (e.g., "Block A")
2. Create floor under that building (e.g., "Ground Floor")
3. Create room under floor (e.g., Room 101, Double, 8000/bed)
4. Check beds created automatically

**Expected:** Room has correct number of beds based on type (Single=1, Double=2, etc.)

---

### TC-HOST-05: Bulk Room Creation
**Steps:**
1. `Hostel → Rooms → Bulk Create`
2. Add 5 rooms at once with same type

**Expected:** All 5 rooms created. Beds allocated correctly.

---

## MODULE 4 — TENANT ADMIN: MANAGER SETUP

### TC-MGR-01: Create Manager
**Steps:**
1. TA → `/managers` → Add Manager
2. Fill: name, email, phone
3. Leave password blank
4. Assign to 1+ hostels
5. Submit

**Expected:**
- Manager created with auto-generated password
- Credentials modal shown
- WhatsApp share button works

---

### TC-MGR-02: Manager Permissions — Restrict Access
**Steps:**
1. TA → Managers → click Shield icon (Permissions) for a manager
2. Select hostel tab
3. Uncheck: Billing, Expenses, Staff
4. Save
5. Login as that manager
6. Navigate to the hostel

**Expected:**
- Billing, Expenses, Staff NOT visible in sidebar
- Only permitted pages accessible

---

### TC-MGR-03: Manager Permissions — Grant All
**Steps:**
1. TA → Manager Permissions → click "Select All"
2. Save
3. Login as manager

**Expected:** All sidebar items visible for that manager

---

### TC-MGR-04: Manager Salary Sheet
**Steps:**
1. TA → `/managers/salary`
2. Select month/year
3. Mark salary as paid

**Expected:** Salary records visible. Paid status updates.

---

## MODULE 5 — RESIDENTS

### TC-RES-01: Add Resident (Full Flow)
**Steps:**
1. Admin → `Hostel → Residents → Add Resident`
2. Step 1: Personal info (name, email, CNIC, phone)
3. Step 2: Select building → floor → room → bed
4. Step 3: Food plan = Full Mess
5. Step 4: Advance = 5000, Security = 10000
6. Submit

**Expected:**
- Resident created
- Credentials modal shown
- Bed status = OCCUPIED
- Room shows 1 less available bed

---

### TC-RES-02: Add Resident — Validation
**Steps:**
1. Enter invalid CNIC (not 13 digits)
2. Enter phone not starting with 03
3. Try to select already-occupied bed

**Expected:** Validation errors shown for each. Cannot submit until fixed.

---

### TC-RES-03: Resident Detail Edit
**Steps:**
1. Open resident detail page
2. Edit: phone, emergency contact, blood group
3. Change food plan from Full Mess → No Mess
4. Save

**Expected:** Changes reflected immediately on page.

---

### TC-RES-04: Room Transfer
**Steps:**
1. Admin → `Hostel → Room Transfer`
2. Select resident → select new room/bed
3. Confirm

**Expected:**
- Old bed → VACANT
- New bed → OCCUPIED
- Resident detail shows new room

---

### TC-RES-05: Checkout Flow (Settlement)
**Steps:**
1. Admin → Residents → click Checkout (red door icon)
2. Settlement modal shows:
   - Unpaid bills
   - Pro-rated rent for current month
   - Security deposit credit
   - Advance balance
   - Net due / refund
3. Complete checkout

**Expected:**
- Bed → VACANT
- Resident status → CHECKED_OUT
- Resident cannot login to portal
- Lock icon shown in residents list

---

### TC-RES-06: Toggle Portal Access
**Steps:**
1. Admin → Residents → "Checked Out" tab
2. Find checked-out resident (shows lock icon)
3. Click lock to grant access
4. Resident logs in

**Expected:** Resident can login. Sees old bills and history.

---

### TC-RES-07: Reset Resident Password
**Steps:**
1. Admin → Residents → click Key icon for active resident
2. Confirm prompt

**Expected:** New password generated. Credentials modal shown. WhatsApp share works.

---

## MODULE 6 — BILLING

### TC-BILL-01: Generate Monthly Bills (All Residents)
**Steps:**
1. Admin → `Hostel → Billing`
2. Select month/year
3. Click "Generate Bills"
4. Confirm

**Expected:**
- Bills created for all ACTIVE residents
- Each bill includes: Rent + Food + Meter + Parking
- Residents with NO_MESS plan: no food charge

---

### TC-BILL-02: Pro-Rate New Resident
**Pre-condition:** Resident joined on 15th of current month
**Steps:**
1. Generate bills for current month

**Expected:**
- Bill shows pro-rate note: "Joined 15 [Month] — X days out of Y"
- Rent = (days_stayed / days_in_month) × monthly_rent

---

### TC-BILL-03: Flexible Bill Components
**Steps:**
1. Before generating, expand "Bill Components"
2. Uncheck: Food
3. Generate bills

**Expected:** Generated bills have roomRent but foodCharges = 0

---

### TC-BILL-04: Generate Bill for Single Resident
**Steps:**
1. Billing page → "Single Resident" button
2. Select specific resident(s)
3. Generate

**Expected:** Only selected residents get bills. Others unchanged.

---

### TC-BILL-05: Edit Bill
**Steps:**
1. Admin → Billing → click resident row
2. Click "Edit Bill"
3. Change: roomRent, add discount, add note
4. Save

**Expected:** Bill totals recalculate. Discount shown on bill. Note visible in history.

---

### TC-BILL-06: Record Payment
**Steps:**
1. Admin → Billing → resident bill
2. Click "Record Payment"
3. Amount = 5000, method = Cash

**Expected:**
- Bill balance reduces by 5000
- Payment appears in history
- If fully paid: status = PAID (green badge)

---

### TC-BILL-07: Advance Payment Applied
**Pre-condition:** Resident has advance balance of 3000
**Steps:**
1. Generate bill for resident

**Expected:** Bill shows advance balance. Can apply advance toward payment.

---

### TC-BILL-08: Daily Billing Cycle
**Pre-condition:** Hostel billing cycle = DAILY
**Steps:**
1. Generate bill

**Expected:** Rent = daily_rate × days_in_month (proportional)

---

## MODULE 7 — PAYMENT PROOFS

### TC-PROOF-01: Resident Submits Payment Proof
**Steps:**
1. Login as Resident → `/portal/pay`
2. Select bill, enter amount, upload screenshot
3. Submit

**Expected:** Proof submitted. Admin sees notification badge.

---

### TC-PROOF-02: Admin Reviews Proof
**Steps:**
1. Admin → `Hostel → Payment Proofs`
2. Find pending proof
3. Approve

**Expected:**
- Payment recorded automatically
- Bill balance reduces
- Resident sees payment in bill history

---

### TC-PROOF-03: Admin Rejects Proof
**Steps:**
1. Admin → Payment Proofs → Reject with reason

**Expected:** Resident notified. Bill unchanged.

---

## MODULE 8 — FOOD MANAGEMENT

### TC-FOOD-01: Add Menu Item
**Steps:**
1. Admin → `Food Menu → Menu Items`
2. Add item: "Biryani", Lunch, Rate = 150, Category = Main
3. Set available days (Mon-Fri)

**Expected:** Item appears in menu list. Available on correct days.

---

### TC-FOOD-02: Resident Orders Food (Within Window)
**Pre-condition:** Current time is within lunch ordering window
**Steps:**
1. Resident → `/portal/food`
2. Select Lunch tab
3. Add 1 Biryani to cart
4. Review → Place Order

**Expected:** Order placed. "Pending" status shown. Admin sees pending order notification.

---

### TC-FOOD-03: Ordering Outside Window
**Pre-condition:** Current time is outside ordering window
**Steps:**
1. Resident → Food menu

**Expected:** Items grayed out / disabled. Timer shows "opens in X hours"

---

### TC-FOOD-04: Free Items
**Pre-condition:** Menu item marked as "Free with Meal"
**Steps:**
1. Add main dish + free side dish

**Expected:** Side dish shows FREE. Total only charges main dish.

---

### TC-FOOD-05: Resident Changes Mess Plan
**Steps:**
1. Resident → `/portal/food`
2. Click "Change Plan" button
3. Switch from Full Mess → No Mess
4. Save

**Expected:** Banner updates to amber (No Mess). Next bill won't include fixed mess fee.

---

### TC-FOOD-06: Weekly Schedule
**Steps:**
1. Admin → `Food → Weekly Schedule`
2. Set Monday Lunch = "Rice + Dal + Salad"
3. Save

**Expected:** Schedule visible. Residents can see what's planned for each day.

---

## MODULE 9 — EXPENSES

### TC-EXP-01: Add Expense
**Steps:**
1. Admin → `Hostel → Expenses → Add Expense`
2. Category = Utilities, Amount = 15000, Description = "Electricity Bill", Date = today

**Expected:** Expense added. Total expenses stat updates.

---

### TC-EXP-02: Custom Category Expense
**Steps:**
1. Add Expense → select "✏️ Custom"
2. Type: "Generator Fuel"
3. Submit

**Expected:** Expense saved with custom category name "GENERATOR FUEL".

---

### TC-EXP-03: P&L Summary
**Steps:**
1. Admin → `Expenses → P&L Summary`
2. Select month

**Expected:**
- Total Income (payments received) shown
- Total Expenses shown
- Net Profit/Loss calculated

---

## MODULE 10 — STAFF

### TC-STAFF-01: Add Staff
**Steps:**
1. Admin → `Staff → Add Staff`
2. Fill: name, type = Security, shift = Day, salary = 20000

**Expected:** Staff added. Appears in staff list.

---

### TC-STAFF-02: Mark Attendance
**Steps:**
1. Admin → `Staff → Attendance`
2. Select date
3. Mark staff as Present/Absent/Leave

**Expected:** Attendance saved. Summary shows present count.

---

### TC-STAFF-03: Staff Salary Sheet
**Steps:**
1. Admin → `Staff → Salary Sheet`
2. Select month
3. Mark salaries as paid

**Expected:** Salary records show. Paid status persists.

---

## MODULE 11 — METER READINGS

### TC-METER-01: Add Meter Reading
**Steps:**
1. Admin → `Meter Readings`
2. Select room, enter previous reading = 100, current = 150
3. Rate per unit = 25
4. Submit

**Expected:**
- Units used = 50
- Charges = 1250
- Automatically added to next bill generation

---

### TC-METER-02: Meter in Bill
**Steps:**
1. After adding meter reading, generate bills

**Expected:** Electricity charges (1250) appear on relevant resident's bill under "Meter Charges"

---

## MODULE 12 — OPERATIONS

### TC-OPS-01: Gate Pass Request (Resident)
**Steps:**
1. Resident → `/portal/gate-pass`
2. Fill: purpose, destination, return date
3. Submit

**Expected:** Gate pass created with PENDING status. Admin sees notification.

---

### TC-OPS-02: Gate Pass Approve (Admin)
**Steps:**
1. Admin → `Gate Passes` → find pending pass
2. Approve

**Expected:**
- Status → APPROVED
- Resident portal shows approval
- Resident gets notification

---

### TC-OPS-03: Visitor Log
**Steps:**
1. Admin → `Visitors`
2. Add visitor: name, CNIC, purpose, resident being visited
3. Time in = now

**Expected:** Visitor logged. Appears in active visitors. Notification badge shows.

---

### TC-OPS-04: Mark Visitor Checkout
**Steps:**
1. Admin → Visitors → click visitor
2. Enter time out

**Expected:** Visitor no longer in "active visitors". Notification badge removes.

---

### TC-OPS-05: Resident Complaint
**Steps:**
1. Resident → `/portal/complaints`
2. Submit: "Tap leaking in bathroom", category = Maintenance

**Expected:**
- Complaint created as OPEN
- Admin sees complaint notification
- Admin can change status → IN_PROGRESS → RESOLVED

---

### TC-OPS-06: Bill Dispute
**Steps:**
1. Resident → `/portal/bill-disputes`
2. Select bill → dispute: "Electricity charges too high"

**Expected:**
- Dispute created as OPEN
- Admin sees dispute notification
- Admin can adjust bill and resolve dispute simultaneously

---

### TC-OPS-07: Leave Notice
**Steps:**
1. Resident → `/portal/leave-notice`
2. Submit: from date, to date, reason

**Expected:**
- Leave notice created
- Admin sidebar shows pending badge count
- Admin can acknowledge → complete

---

### TC-OPS-08: Notices
**Steps:**
1. Admin → `Notices` → Post notice: "Water will be off Thursday 2-4pm"

**Expected:**
- Residents see notice on portal
- Residents get notification badge

---

## MODULE 13 — MESSAGES

### TC-MSG-01: Admin Sends Message to Resident
**Steps:**
1. Admin → `Hostel → Messages`
2. Start conversation with a resident
3. Send: "Your bill is due. Please pay."

**Expected:** Message delivered. Resident sees unread message badge in portal.

---

### TC-MSG-02: Resident Replies
**Steps:**
1. Resident → `/portal/messages`
2. Reply to admin message

**Expected:** Admin sees reply. Conversation threaded correctly.

---

## MODULE 14 — REPORTS

### TC-RPT-01: View Reports
**Steps:**
1. Admin → `Reports`
2. Select month/year

**Expected:**
- Occupancy rate shown
- Revenue vs expenses
- Resident summary
- Food orders count

---

## MODULE 15 — IMPORT / EXPORT

### TC-IE-01: Export Residents
**Steps:**
1. Admin → `Import / Export`
2. Export Residents as CSV/Excel

**Expected:** File downloads with all resident data

---

### TC-IE-02: Import Residents Template
**Steps:**
1. Download import template
2. Fill in 3 resident rows
3. Upload file

**Expected:** 3 residents imported. Errors shown for invalid rows (if any).

---

## MODULE 16 — RESIDENT PORTAL (Full Journey)

### TC-PORT-01: Full Resident Journey
1. Login as resident → See portal dashboard
2. View hostel info (`/portal/hostel-info`) — see address, contact, amenities
3. Check bill (`/portal/bill`) — see current month bill breakdown
4. Submit payment proof (`/portal/pay`) — upload screenshot
5. Order food (`/portal/food`) — place lunch order
6. File complaint (`/portal/complaints`) — submit maintenance request
7. Request gate pass (`/portal/gate-pass`)
8. Read notices (`/portal/notices`)
9. Send message to admin (`/portal/messages`)
10. Submit leave notice (`/portal/leave-notice`)

**Expected:** All flows complete without errors. Data persists.

---

### TC-PORT-02: Portal Notification Bell
**Steps:**
1. Login as Resident
2. Create an unpaid bill for them (as admin)
3. Refresh resident portal

**Expected:** Notification bell shows red badge. Bell click shows "1 unpaid bill" with link.

---

## MODULE 17 — SECURITY & EDGE CASES

### TC-SEC-01: Cross-Tenant Data Isolation
**Pre-condition:** Two tenants exist (Tenant A, Tenant B)
**Steps:**
1. Login as Tenant A admin
2. Try to access Tenant B's hostel URL directly: `/hostel/[tenantB-hostelId]/residents`

**Expected:** 404 or "Hostel not found" — cannot see other tenant's data

---

### TC-SEC-02: Manager Cannot Access Admin-Only Pages
**Steps:**
1. Login as Manager
2. Navigate to `/managers` (admin-only)

**Expected:** Redirected. Managers page not accessible to managers.

---

### TC-SEC-03: CNIC Uniqueness
**Steps:**
1. Add resident with CNIC: 3520112345671
2. Try to add another resident with same CNIC

**Expected:** Error: duplicate CNIC not allowed

---

### TC-SEC-04: Revoked Portal Session
**Steps:**
1. Resident logs in (session active)
2. Admin checks out resident (portal revoked)
3. Resident (still logged in) tries to access `/portal/bill`

**Expected:** API returns 401. Portal page shows "unauthorized". Session effectively revoked.

---

### TC-SEC-05: Manager Restricted API Access
**Pre-condition:** Manager has `billing_view` removed
**Steps:**
1. Login as manager
2. Directly call `GET /api/hostels/[id]/billing` (via browser or Postman)

**Expected:** Even though not in sidebar, API should reject or manager should not have billing data access (test by checking if API checks permissions)

---

### TC-SEC-06: Plan Limits — Residents
**Pre-condition:** Plan allows max 10 residents. Currently 10 active.
**Steps:**
1. Try to add 11th resident

**Expected:** Error shown: "Resident limit reached for your plan"

---

## MODULE 18 — MOBILE RESPONSIVENESS

### TC-MOB-01: Login Page
- Login form readable and usable on 375px (iPhone SE)

### TC-MOB-02: Dashboard
- Stats cards stack vertically on mobile

### TC-MOB-03: Residents List
- Table scrollable horizontally OR cards view on mobile

### TC-MOB-04: Add Resident (Multi-step)
- All 4 steps work on mobile. Step indicator readable.

### TC-MOB-05: Portal Food Page
- Meal tabs, menu items, cart all accessible on mobile

### TC-MOB-06: Sidebar
- Hamburger menu opens/closes cleanly
- All nav items tappable

---

## MODULE 19 — DARK MODE

### TC-DARK-01: Toggle Dark Mode
1. Click sun/moon icon in header
2. Verify all pages render correctly in dark mode (no white text on white bg, no invisible elements)

**Pages to specifically check:**
- Login
- Dashboard
- Residents list
- Billing page
- Resident portal
- Food ordering page
- Modals (Add Resident, Edit Bill, Permissions)

---

## SMOKE TEST (Quick Demo Checklist)

Run before any demo — these are the 10 most critical flows:

| # | Test | Pass/Fail |
|---|---|---|
| 1 | SA creates Tenant, TA logs in | |
| 2 | TA creates Hostel with rooms and beds | |
| 3 | TA creates Manager, sets partial permissions | |
| 4 | Manager sees only permitted sidebar items | |
| 5 | TA adds Resident — credentials modal shown | |
| 6 | Admin generates monthly bills | |
| 7 | Resident logs in → views bill → submits payment proof | |
| 8 | Admin approves proof → bill marked paid | |
| 9 | Resident ordered food within window | |
| 10 | Resident checked out → portal access revoked → login blocked | |

---

## BUG REPORTING TEMPLATE

```
BUG-[number]
Title: 
Module: 
Severity: Critical / High / Medium / Low
Role: (which user role)
Steps to Reproduce:
  1.
  2.
  3.
Expected Result:
Actual Result:
Screenshot: (attach)
```

---

*Total Test Cases: 75+ | Modules Covered: 19*
