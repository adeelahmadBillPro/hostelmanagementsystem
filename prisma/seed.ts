import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  const password = await bcrypt.hash("password123", 12);

  // 1. Create Subscription Plans
  const basicPlan = await prisma.subscriptionPlan.create({
    data: {
      name: "Basic",
      price: 0,
      maxHostels: 1,
      maxResidents: 50,
      features: ["1 Hostel", "Up to 50 Residents", "Basic Reports", "Email Support"],
    },
  });

  const proPlan = await prisma.subscriptionPlan.create({
    data: {
      name: "Pro",
      price: 0,
      maxHostels: 5,
      maxResidents: 200,
      features: [
        "Up to 5 Hostels",
        "Up to 200 Residents",
        "Advanced Reports",
        "Food Management",
        "Staff Management",
        "Priority Support",
      ],
    },
  });

  const enterprisePlan = await prisma.subscriptionPlan.create({
    data: {
      name: "Enterprise",
      price: 0,
      maxHostels: 50,
      maxResidents: 2000,
      features: [
        "Unlimited Hostels",
        "Unlimited Residents",
        "All Features",
        "API Access",
        "Custom Branding",
        "24/7 Support",
      ],
    },
  });

  // 2. Create Super Admin
  await prisma.user.create({
    data: {
      name: "Super Admin",
      email: "admin@hostelhub.com",
      password,
      role: "SUPER_ADMIN",
    },
  });

  // 3. Create Tenant with Admin
  const tenant = await prisma.tenant.create({
    data: {
      name: "Adeel Hostels",
      email: "tenant@hostelhub.com",
      phone: "03001234567",
      planId: proPlan.id,
    },
  });

  const tenantAdmin = await prisma.user.create({
    data: {
      name: "Adeel Ahmad",
      email: "tenant@hostelhub.com",
      phone: "03001234567",
      password,
      role: "TENANT_ADMIN",
      tenantId: tenant.id,
    },
  });

  // 4. Create Hostel
  const hostel = await prisma.hostel.create({
    data: {
      name: "Al-Noor Boys Hostel",
      type: "PRIVATE",
      address: "123 University Road, Lahore",
      city: "Lahore",
      contact: "042-35761234",
      tenantId: tenant.id,
    },
  });

  const hostel2 = await prisma.hostel.create({
    data: {
      name: "Fatima Girls Hostel",
      type: "UNIVERSITY",
      address: "45 Mall Road, Lahore",
      city: "Lahore",
      contact: "042-35769876",
      tenantId: tenant.id,
    },
  });

  // 5. Create Manager
  const manager = await prisma.user.create({
    data: {
      name: "Ali Hassan",
      email: "manager@hostelhub.com",
      phone: "03009876543",
      password,
      role: "HOSTEL_MANAGER",
      tenantId: tenant.id,
      hostelId: hostel.id,
    },
  });

  await prisma.managerHostel.create({
    data: {
      userId: manager.id,
      hostelId: hostel.id,
    },
  });

  // 6. Create Building, Floors, Rooms, Beds
  const building = await prisma.building.create({
    data: {
      name: "Block A",
      totalFloors: 3,
      hostelId: hostel.id,
    },
  });

  const building2 = await prisma.building.create({
    data: {
      name: "Block B",
      totalFloors: 2,
      hostelId: hostel.id,
    },
  });

  const floors = [];
  for (let i = 1; i <= 3; i++) {
    const floor = await prisma.floor.create({
      data: {
        floorNumber: i,
        name: `Floor ${i}`,
        buildingId: building.id,
      },
    });
    floors.push(floor);
  }

  // Create rooms and beds for first floor
  const roomTypes = [
    { type: "DOUBLE" as const, beds: 2, rent: 8000 },
    { type: "TRIPLE" as const, beds: 3, rent: 6000 },
    { type: "QUAD" as const, beds: 4, rent: 5000 },
    { type: "SINGLE" as const, beds: 1, rent: 12000 },
    { type: "DOUBLE" as const, beds: 2, rent: 8000 },
    { type: "TRIPLE" as const, beds: 3, rent: 6000 },
  ];

  const allRooms = [];
  const allBeds = [];

  for (const floor of floors) {
    for (let r = 0; r < roomTypes.length; r++) {
      const rt = roomTypes[r];
      const roomNumber = `${floor.floorNumber}0${r + 1}`;
      const room = await prisma.room.create({
        data: {
          roomNumber,
          type: rt.type,
          totalBeds: rt.beds,
          rentPerBed: rt.rent,
          rentPerRoom: rt.rent * rt.beds * 0.9,
          floorId: floor.id,
        },
      });
      allRooms.push(room);

      for (let b = 1; b <= rt.beds; b++) {
        const bed = await prisma.bed.create({
          data: {
            bedNumber: `${roomNumber}-B${b}`,
            status: "VACANT",
            roomId: room.id,
          },
        });
        allBeds.push(bed);
      }
    }
  }

  // 7. Create some residents
  const residentNames = [
    { name: "Muhammad Ahmed", email: "ahmed@student.com", gender: "Male" },
    { name: "Usman Ali", email: "usman@student.com", gender: "Male" },
    { name: "Bilal Khan", email: "bilal@student.com", gender: "Male" },
    { name: "Hassan Raza", email: "hassan@student.com", gender: "Male" },
    { name: "Fahad Malik", email: "fahad@student.com", gender: "Male" },
  ];

  const residentUser = await prisma.user.create({
    data: {
      name: "Muhammad Ahmed",
      email: "resident@hostelhub.com",
      phone: "03121234567",
      password,
      role: "RESIDENT",
      tenantId: tenant.id,
      hostelId: hostel.id,
    },
  });

  // First resident with demo login
  await prisma.resident.create({
    data: {
      userId: residentUser.id,
      hostelId: hostel.id,
      roomId: allRooms[0].id,
      bedId: allBeds[0].id,
      moveInDate: new Date("2024-09-01"),
      advancePaid: 8000,
      securityDeposit: 5000,
      gender: "Male",
      institution: "Punjab University",
      emergencyContact: "Father",
      emergencyPhone: "03001111111",
    },
  });

  // Mark bed as occupied
  await prisma.bed.update({
    where: { id: allBeds[0].id },
    data: { status: "OCCUPIED" },
  });

  // More residents
  let bedIndex = 1;
  for (let i = 1; i < residentNames.length; i++) {
    const rn = residentNames[i];
    const user = await prisma.user.create({
      data: {
        name: rn.name,
        email: rn.email,
        phone: `031${String(i).padStart(8, "0")}`,
        password,
        role: "RESIDENT",
        tenantId: tenant.id,
        hostelId: hostel.id,
      },
    });

    await prisma.resident.create({
      data: {
        userId: user.id,
        hostelId: hostel.id,
        roomId: allRooms[Math.floor(bedIndex / 4)].id,
        bedId: allBeds[bedIndex].id,
        moveInDate: new Date("2024-09-01"),
        advancePaid: 5000 + i * 1000,
        securityDeposit: 5000,
        gender: rn.gender,
        institution: "Punjab University",
      },
    });

    await prisma.bed.update({
      where: { id: allBeds[bedIndex].id },
      data: { status: "OCCUPIED" },
    });

    bedIndex++;
  }

  // 8. Create Expense Categories
  const categories = [
    "Gas Bill",
    "Electricity",
    "Internet",
    "Water",
    "Maintenance",
    "Staff Salary",
    "Cleaning",
    "Parking",
    "Other",
  ];

  for (const cat of categories) {
    await prisma.expenseCategory.create({
      data: {
        name: cat,
        type: cat === "Staff Salary" ? "HOSTEL_LEVEL" : "HOSTEL_LEVEL",
        hostelId: hostel.id,
      },
    });
  }

  // 9. Create Food Menu
  const menuItems = [
    { meal: "BREAKFAST" as const, name: "Paratha + Chai", rate: 100, days: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] },
    { meal: "BREAKFAST" as const, name: "Omelette + Toast", rate: 120, days: ["monday", "wednesday", "friday"] },
    { meal: "LUNCH" as const, name: "Chicken Biryani", rate: 200, days: ["monday", "wednesday", "friday"] },
    { meal: "LUNCH" as const, name: "Dal Chawal", rate: 120, days: ["tuesday", "thursday", "saturday"] },
    { meal: "LUNCH" as const, name: "Chicken Karahi", rate: 250, days: ["sunday"] },
    { meal: "DINNER" as const, name: "Chicken Qorma + Naan", rate: 180, days: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] },
    { meal: "DINNER" as const, name: "Beef Nihari", rate: 220, days: ["friday", "sunday"] },
    { meal: "SNACK" as const, name: "Samosa + Chai", rate: 80, days: ["monday", "tuesday", "wednesday", "thursday", "friday"] },
  ];

  for (const item of menuItems) {
    await prisma.foodMenu.create({
      data: {
        mealType: item.meal,
        itemName: item.name,
        rate: item.rate,
        availableDays: item.days,
        hostelId: hostel.id,
      },
    });
  }

  // 10. Create Notices
  await prisma.notice.create({
    data: {
      title: "Hostel Rules & Regulations",
      content: "All residents must follow hostel timings. Gate closes at 10:00 PM. Visitors allowed only from 2:00 PM to 6:00 PM. Maintain cleanliness in rooms and common areas.",
      hostelId: hostel.id,
      createdById: manager.id,
    },
  });

  await prisma.notice.create({
    data: {
      title: "Monthly Rent Due Date",
      content: "Monthly rent is due on the 5th of every month. Late payment will incur a fine of PKR 500. Please ensure timely payments.",
      hostelId: hostel.id,
      createdById: manager.id,
    },
  });

  // 11. Create Staff
  const staffMembers = [
    { name: "Ramzan Ali", type: "SECURITY" as const, shift: "NIGHT" as const, salary: 25000 },
    { name: "Muhammad Akbar", type: "SECURITY" as const, shift: "DAY" as const, salary: 22000 },
    { name: "Fatima Bibi", type: "COOKING" as const, shift: "FULL" as const, salary: 30000 },
    { name: "Shafiq Ahmad", type: "COOKING" as const, shift: "DAY" as const, salary: 20000 },
    { name: "Naseem", type: "CLEANING" as const, shift: "DAY" as const, salary: 18000 },
    { name: "Irfan", type: "LAUNDRY" as const, shift: "DAY" as const, salary: 15000 },
  ];

  for (const s of staffMembers) {
    await prisma.staff.create({
      data: {
        name: s.name,
        staffType: s.type,
        shift: s.shift,
        salary: s.salary,
        joiningDate: new Date("2024-01-15"),
        hostelId: hostel.id,
      },
    });
  }

  // 12. Room Inventory for first room
  const inventoryItems = [
    { item: "Bed Frame", qty: 2, condition: "good" },
    { item: "Mattress", qty: 2, condition: "good" },
    { item: "Ceiling Fan", qty: 1, condition: "good" },
    { item: "Study Table", qty: 2, condition: "good" },
    { item: "Chair", qty: 2, condition: "needs_repair" },
    { item: "Almirah", qty: 1, condition: "good" },
  ];

  for (const inv of inventoryItems) {
    await prisma.roomInventory.create({
      data: {
        itemName: inv.item,
        quantity: inv.qty,
        condition: inv.condition,
        roomId: allRooms[0].id,
        lastChecked: new Date(),
      },
    });
  }

  console.log("Database seeded successfully!");
  console.log("\nDemo Accounts:");
  console.log("Super Admin: admin@hostelhub.com / password123");
  console.log("Tenant Admin: tenant@hostelhub.com / password123");
  console.log("Manager: manager@hostelhub.com / password123");
  console.log("Resident: resident@hostelhub.com / password123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
