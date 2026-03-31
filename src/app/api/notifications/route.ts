import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Please login to continue" }, { status: 401 });
    }

    const user = session.user as any;
    const role = user.role;
    const userId = user.id;
    const hostelId = user.hostelId;
    const residentId = user.residentId;

    const notifications: {
      type: string;
      text: string;
      link: string;
      count: number;
      icon: string;
    }[] = [];

    if (role === "RESIDENT" && residentId) {
      // Get resident's hostelId
      const resident = await prisma.resident.findUnique({
        where: { id: residentId },
        select: { hostelId: true },
      });

      if (resident) {
        // Unread messages
        const unreadMsgs = await prisma.message.count({
          where: {
            conversation: {
              residentId: residentId,
            },
            isRead: false,
            senderId: { not: userId },
          },
        });
        if (unreadMsgs > 0) {
          notifications.push({
            type: "message",
            text: `${unreadMsgs} unread message${unreadMsgs > 1 ? "s" : ""}`,
            link: "/portal/messages",
            count: unreadMsgs,
            icon: "message",
          });
        }

        // Unpaid bills
        const unpaidBills = await prisma.monthlyBill.count({
          where: {
            residentId: residentId,
            status: { in: ["UNPAID", "PARTIAL", "OVERDUE"] },
          },
        });
        if (unpaidBills > 0) {
          notifications.push({
            type: "bill",
            text: `${unpaidBills} unpaid bill${unpaidBills > 1 ? "s" : ""}`,
            link: "/portal/pay",
            count: unpaidBills,
            icon: "bill",
          });
        }

        // Complaint updates (resolved recently)
        const recentComplaints = await prisma.complaint.count({
          where: {
            residentId: residentId,
            status: { in: ["RESOLVED", "CLOSED"] },
            updatedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
          },
        });
        if (recentComplaints > 0) {
          notifications.push({
            type: "complaint",
            text: `${recentComplaints} complaint${recentComplaints > 1 ? "s" : ""} updated`,
            link: "/portal/complaints",
            count: recentComplaints,
            icon: "complaint",
          });
        }

        // Gate pass status changes (approved/rejected recently)
        const recentGatePasses = await prisma.gatePass.count({
          where: {
            residentId: residentId,
            status: { in: ["APPROVED", "REJECTED"] },
            updatedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
          },
        });
        if (recentGatePasses > 0) {
          notifications.push({
            type: "gatepass",
            text: `${recentGatePasses} gate pass${recentGatePasses > 1 ? "es" : ""} updated`,
            link: "/portal/gate-passes",
            count: recentGatePasses,
            icon: "gatepass",
          });
        }

        // Food orders - recently delivered or preparing
        const activeOrders = await prisma.foodOrder.count({
          where: {
            residentId: residentId,
            status: { in: ["PREPARING"] },
            orderDate: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          },
        });
        if (activeOrders > 0) {
          notifications.push({
            type: "food",
            text: `${activeOrders} order${activeOrders > 1 ? "s" : ""} being prepared`,
            link: "/portal/food",
            count: activeOrders,
            icon: "food",
          });
        }

        const deliveredOrders = await prisma.foodOrder.count({
          where: {
            residentId: residentId,
            status: "DELIVERED",
            deliveredAt: { gte: new Date(Date.now() - 2 * 60 * 60 * 1000) }, // Last 2 hours
          },
        });
        if (deliveredOrders > 0) {
          notifications.push({
            type: "food",
            text: `${deliveredOrders} order${deliveredOrders > 1 ? "s" : ""} delivered`,
            link: "/portal/food",
            count: deliveredOrders,
            icon: "food",
          });
        }

        // Recent notices
        const recentNotices = await prisma.notice.count({
          where: {
            hostelId: resident.hostelId,
            createdAt: { gte: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) },
          },
        });
        if (recentNotices > 0) {
          notifications.push({
            type: "notice",
            text: `${recentNotices} recent notice${recentNotices > 1 ? "s" : ""}`,
            link: "/portal/notices",
            count: recentNotices,
            icon: "notice",
          });
        }

        // Leave notice updates (acknowledged or completed)
        const leaveUpdates = await prisma.leaveNotice.count({
          where: {
            userId: userId,
            status: { in: ["ACKNOWLEDGED", "COMPLETED"] },
            updatedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
          },
        });
        if (leaveUpdates > 0) {
          notifications.push({
            type: "leave",
            text: `Leave notice ${leaveUpdates === 1 ? "has been" : "updates"} acknowledged`,
            link: "/portal/leave-notice",
            count: leaveUpdates,
            icon: "leave",
          });
        }

      }
    } else if (
      role === "HOSTEL_MANAGER" ||
      role === "TENANT_ADMIN"
    ) {
      // Get hostel IDs for this manager
      let hostelIds: string[] = [];

      if (hostelId) {
        hostelIds = [hostelId];
      }

      // Also check ManagerHostel assignments
      const managerHostels = await prisma.managerHostel.findMany({
        where: { userId },
        select: { hostelId: true },
      });
      const additionalIds = managerHostels.map((mh) => mh.hostelId);
      hostelIds = [...new Set([...hostelIds, ...additionalIds])];

      // For TENANT_ADMIN: get all hostels owned by tenant
      if (role === "TENANT_ADMIN" && user.tenantId) {
        const tenantHostels = await prisma.hostel.findMany({
          where: { tenantId: user.tenantId },
          select: { id: true },
        });
        const tenantHostelIds = tenantHostels.map((h) => h.id);
        hostelIds = [...new Set([...hostelIds, ...tenantHostelIds])];
      }

      if (hostelIds.length > 0) {
        const primaryHostelId = hostelIds[0];

        // Unread messages
        const unreadMsgs = await prisma.message.count({
          where: {
            conversation: {
              hostelId: { in: hostelIds },
            },
            isRead: false,
            senderId: { not: userId },
          },
        });
        if (unreadMsgs > 0) {
          notifications.push({
            type: "message",
            text: `${unreadMsgs} unread message${unreadMsgs > 1 ? "s" : ""}`,
            link: `/hostel/${primaryHostelId}/messages`,
            count: unreadMsgs,
            icon: "message",
          });
        }

        // Pending payment proofs
        const pendingProofs = await prisma.paymentProof.count({
          where: {
            bill: { hostelId: { in: hostelIds } },
            status: "PENDING",
          },
        });
        if (pendingProofs > 0) {
          notifications.push({
            type: "payment",
            text: `${pendingProofs} payment proof${pendingProofs > 1 ? "s" : ""} to review`,
            link: `/hostel/${primaryHostelId}/payment-proofs`,
            count: pendingProofs,
            icon: "payment",
          });
        }

        // New/open complaints
        const openComplaints = await prisma.complaint.count({
          where: {
            hostelId: { in: hostelIds },
            status: "OPEN",
          },
        });
        if (openComplaints > 0) {
          notifications.push({
            type: "complaint",
            text: `${openComplaints} open complaint${openComplaints > 1 ? "s" : ""}`,
            link: `/hostel/${primaryHostelId}/complaints`,
            count: openComplaints,
            icon: "complaint",
          });
        }

        // Open bill disputes
        const openDisputes = await prisma.billDispute.count({
          where: {
            bill: { hostelId: { in: hostelIds } },
            status: "OPEN",
          },
        });
        if (openDisputes > 0) {
          notifications.push({
            type: "dispute",
            text: `${openDisputes} open bill dispute${openDisputes > 1 ? "s" : ""}`,
            link: `/hostel/${primaryHostelId}/disputes`,
            count: openDisputes,
            icon: "dispute",
          });
        }

        // Pending food orders (today)
        const pendingFoodOrders = await prisma.foodOrder.count({
          where: {
            hostelId: { in: hostelIds },
            status: "PENDING",
            orderDate: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
          },
        });
        if (pendingFoodOrders > 0) {
          notifications.push({
            type: "food",
            text: `${pendingFoodOrders} pending food order${pendingFoodOrders > 1 ? "s" : ""}`,
            link: `/hostel/${primaryHostelId}/food/orders`,
            count: pendingFoodOrders,
            icon: "food",
          });
        }

        // Pending gate pass requests
        const pendingPasses = await prisma.gatePass.count({
          where: {
            hostelId: { in: hostelIds },
            status: "PENDING",
          },
        });
        if (pendingPasses > 0) {
          notifications.push({
            type: "gatepass",
            text: `${pendingPasses} gate pass request${pendingPasses > 1 ? "s" : ""}`,
            link: `/hostel/${primaryHostelId}/gate-passes`,
            count: pendingPasses,
            icon: "gatepass",
          });
        }

        // Pending leave notices
        const pendingLeaves = await prisma.leaveNotice.count({
          where: {
            hostelId: { in: hostelIds },
            status: "PENDING",
          },
        });
        if (pendingLeaves > 0) {
          notifications.push({
            type: "leave",
            text: `${pendingLeaves} leave notice${pendingLeaves > 1 ? "s" : ""} pending`,
            link: `/hostel/${primaryHostelId}/leave-notices`,
            count: pendingLeaves,
            icon: "leave",
          });
        }

        // Active visitors (checked in, not checked out yet)
        const activeVisitors = await prisma.visitor.count({
          where: {
            hostelId: { in: hostelIds },
            timeOut: null,
          },
        });
        if (activeVisitors > 0) {
          notifications.push({
            type: "visitor",
            text: `${activeVisitors} visitor${activeVisitors > 1 ? "s" : ""} currently in hostel`,
            link: `/hostel/${primaryHostelId}/visitors`,
            count: activeVisitors,
            icon: "visitor",
          });
        }
      }
    } else if (role === "SUPER_ADMIN") {
      // New tenants (last 7 days)
      const newTenants = await prisma.tenant.count({
        where: {
          createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
      });
      if (newTenants > 0) {
        notifications.push({
          type: "tenant",
          text: `${newTenants} new tenant${newTenants > 1 ? "s" : ""} this week`,
          link: "/super-admin/dashboard",
          count: newTenants,
          icon: "tenant",
        });
      }

      // Pending plan upgrade requests
      const pendingUpgrades = await prisma.planUpgradeRequest.count({
        where: { status: "PENDING" },
      });
      if (pendingUpgrades > 0) {
        notifications.push({
          type: "upgrade",
          text: `${pendingUpgrades} plan upgrade request${pendingUpgrades > 1 ? "s" : ""}`,
          link: "/super-admin/plans",
          count: pendingUpgrades,
          icon: "upgrade",
        });
      }
    }

    // Sort: highest count first (most urgent on top)
    notifications.sort((a, b) => b.count - a.count);

    const totalUnread = notifications.reduce((s, n) => s + n.count, 0);

    return NextResponse.json({ notifications, totalUnread });
  } catch (error) {
    console.error("Notifications error:", error);
    return NextResponse.json(
      { error: "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}
