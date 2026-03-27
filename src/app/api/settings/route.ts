import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Please login to continue" }, { status: 401 });
    }

    const userId = (session.user as any).id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        cnic: true,
        role: true,
        image: true,
        createdAt: true,
        hostelId: true,
        hostel: {
          select: { id: true, name: true },
        },
        resident: {
          select: {
            id: true,
            emergencyContact: true,
            emergencyPhone: true,
            bloodGroup: true,
            medicalCondition: true,
            moveInDate: true,
            moveOutDate: true,
            photo: true,
            status: true,
            room: {
              select: { roomNumber: true },
            },
            bed: {
              select: { bedNumber: true },
            },
            hostel: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error("Settings GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch profile" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Please login to continue" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const role = (session.user as any).role;
    const body = await req.json();

    const {
      name,
      phone,
      image,
      email,
      emergencyContact,
      emergencyPhone,
      bloodGroup,
      medicalCondition,
      oldPassword,
      newPassword,
    } = body;

    // Build user update data - allowed for all roles
    const userUpdate: any = {};
    if (name !== undefined) userUpdate.name = name;
    if (phone !== undefined) userUpdate.phone = phone;
    if (image !== undefined) userUpdate.image = image;

    // Email is only editable by non-residents
    if (email !== undefined && role !== "RESIDENT") {
      // Check if email is already taken
      const existing = await prisma.user.findFirst({
        where: { email, id: { not: userId } },
      });
      if (existing) {
        return NextResponse.json(
          { error: "Email is already in use" },
          { status: 400 }
        );
      }
      userUpdate.email = email;
    }

    // Handle password change
    if (oldPassword && newPassword) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { password: true },
      });

      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      const isValid = await bcrypt.compare(oldPassword, user.password);
      if (!isValid) {
        return NextResponse.json(
          { error: "Current password is incorrect" },
          { status: 400 }
        );
      }

      if (newPassword.length < 6) {
        return NextResponse.json(
          { error: "New password must be at least 6 characters" },
          { status: 400 }
        );
      }

      userUpdate.password = await bcrypt.hash(newPassword, 12);
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: userUpdate,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        image: true,
        role: true,
      },
    });

    // Update resident-specific fields if applicable
    if (role === "RESIDENT") {
      const resident = await prisma.resident.findUnique({
        where: { userId },
      });

      if (resident) {
        const residentUpdate: any = {};
        if (emergencyContact !== undefined) residentUpdate.emergencyContact = emergencyContact;
        if (emergencyPhone !== undefined) residentUpdate.emergencyPhone = emergencyPhone;
        if (bloodGroup !== undefined) residentUpdate.bloodGroup = bloodGroup;
        if (medicalCondition !== undefined) residentUpdate.medicalCondition = medicalCondition;
        if (image !== undefined) residentUpdate.photo = image;

        if (Object.keys(residentUpdate).length > 0) {
          await prisma.resident.update({
            where: { id: resident.id },
            data: residentUpdate,
          });
        }
      }
    }

    return NextResponse.json({
      message: "Profile updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Settings PATCH error:", error);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }
}
