"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  LayoutDashboard,
  Building2,
  Users,
  UtensilsCrossed,
  Receipt,
  Wallet,
  CreditCard,
  BarChart3,
  Bell,
  Layers,
  DoorOpen,
  UserCog,
  ShieldCheck,
  Truck,
  MessageSquare,
  ClipboardList,
  Eye,
  X,
  ChevronDown,
  ChevronRight,
  UserPlus,
  Banknote,
  Home,
  Map,
} from "lucide-react";
import { useState } from "react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  children?: NavItem[];
  roles?: string[];
}

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  hostelId?: string;
}

export default function Sidebar({ isOpen, onClose, hostelId }: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = session?.user?.role;
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  const toggleExpand = (label: string) => {
    setExpandedItems((prev) =>
      prev.includes(label) ? prev.filter((i) => i !== label) : [...prev, label]
    );
  };

  // Super Admin navigation
  const superAdminNav: NavItem[] = [
    {
      label: "Dashboard",
      href: "/super-admin/dashboard",
      icon: <LayoutDashboard size={20} />,
    },
    {
      label: "Tenants",
      href: "/super-admin/tenants",
      icon: <Building2 size={20} />,
    },
    {
      label: "Plans",
      href: "/super-admin/plans",
      icon: <CreditCard size={20} />,
    },
    {
      label: "Analytics",
      href: "/super-admin/analytics",
      icon: <BarChart3 size={20} />,
    },
  ];

  // Tenant Admin / Manager navigation
  const tenantNav: NavItem[] = [
    {
      label: "Dashboard",
      href: "/dashboard",
      icon: <LayoutDashboard size={20} />,
    },
    {
      label: "Hostels",
      href: "/hostels",
      icon: <Building2 size={20} />,
    },
    {
      label: "Managers",
      href: "/managers",
      icon: <UserCog size={20} />,
      roles: ["TENANT_ADMIN"],
    },
  ];

  // Hostel-specific navigation (when inside a hostel)
  const hostelNav: NavItem[] = hostelId
    ? [
        {
          label: "Overview",
          href: `/hostel/${hostelId}/buildings`,
          icon: <Home size={20} />,
        },
        {
          label: "Map View",
          href: `/hostel/${hostelId}/map`,
          icon: <Map size={20} />,
        },
        {
          label: "Infrastructure",
          href: "#",
          icon: <Building2 size={20} />,
          children: [
            {
              label: "Buildings",
              href: `/hostel/${hostelId}/buildings`,
              icon: <Layers size={20} />,
            },
            {
              label: "Floors",
              href: `/hostel/${hostelId}/floors`,
              icon: <Layers size={20} />,
            },
            {
              label: "Rooms",
              href: `/hostel/${hostelId}/rooms`,
              icon: <DoorOpen size={20} />,
            },
          ],
        },
        {
          label: "Residents",
          href: `/hostel/${hostelId}/residents`,
          icon: <Users size={20} />,
          children: [
            {
              label: "All Residents",
              href: `/hostel/${hostelId}/residents`,
              icon: <Users size={20} />,
            },
            {
              label: "Add Resident",
              href: `/hostel/${hostelId}/residents/add`,
              icon: <UserPlus size={20} />,
            },
          ],
        },
        {
          label: "Food Menu",
          href: `/hostel/${hostelId}/food/menu`,
          icon: <UtensilsCrossed size={20} />,
          children: [
            {
              label: "Menu Items",
              href: `/hostel/${hostelId}/food/menu`,
              icon: <UtensilsCrossed size={20} />,
            },
            {
              label: "Orders",
              href: `/hostel/${hostelId}/food/orders`,
              icon: <ClipboardList size={20} />,
            },
          ],
        },
        {
          label: "Billing",
          href: `/hostel/${hostelId}/billing`,
          icon: <Receipt size={20} />,
        },
        {
          label: "Payments",
          href: `/hostel/${hostelId}/payments`,
          icon: <CreditCard size={20} />,
        },
        {
          label: "Expenses",
          href: `/hostel/${hostelId}/expenses`,
          icon: <Wallet size={20} />,
          children: [
            {
              label: "All Expenses",
              href: `/hostel/${hostelId}/expenses`,
              icon: <Wallet size={20} />,
            },
            {
              label: "P&L Summary",
              href: `/hostel/${hostelId}/expenses/summary`,
              icon: <BarChart3 size={20} />,
            },
          ],
        },
        {
          label: "Staff",
          href: `/hostel/${hostelId}/staff`,
          icon: <ShieldCheck size={20} />,
          children: [
            {
              label: "All Staff",
              href: `/hostel/${hostelId}/staff`,
              icon: <ShieldCheck size={20} />,
            },
            {
              label: "Add Staff",
              href: `/hostel/${hostelId}/staff/add`,
              icon: <UserPlus size={20} />,
            },
            {
              label: "Salary Sheet",
              href: `/hostel/${hostelId}/staff/salary`,
              icon: <Banknote size={20} />,
            },
          ],
        },
        {
          label: "Visitors",
          href: `/hostel/${hostelId}/visitors`,
          icon: <Eye size={20} />,
        },
        {
          label: "Complaints",
          href: `/hostel/${hostelId}/complaints`,
          icon: <MessageSquare size={20} />,
        },
        {
          label: "Gate Passes",
          href: `/hostel/${hostelId}/gate-passes`,
          icon: <Truck size={20} />,
        },
        {
          label: "Notices",
          href: `/hostel/${hostelId}/notices`,
          icon: <Bell size={20} />,
        },
        {
          label: "Reports",
          href: `/hostel/${hostelId}/reports`,
          icon: <BarChart3 size={20} />,
        },
      ]
    : [];

  // Resident/Staff portal navigation
  const portalNav: NavItem[] = [
    {
      label: "Dashboard",
      href: "/portal/dashboard",
      icon: <LayoutDashboard size={20} />,
    },
    {
      label: "My Bill",
      href: "/portal/bill",
      icon: <Receipt size={20} />,
    },
    {
      label: "Food Menu",
      href: "/portal/food",
      icon: <UtensilsCrossed size={20} />,
    },
    {
      label: "Complaints",
      href: "/portal/complaints",
      icon: <MessageSquare size={20} />,
    },
    {
      label: "Gate Pass",
      href: "/portal/gate-pass",
      icon: <Truck size={20} />,
    },
    {
      label: "Notices",
      href: "/portal/notices",
      icon: <Bell size={20} />,
    },
  ];

  // Choose navigation based on role
  let navigation: NavItem[] = [];
  if (role === "SUPER_ADMIN") {
    navigation = superAdminNav;
  } else if (role === "RESIDENT" || role === "STAFF") {
    navigation = portalNav;
  } else {
    navigation = hostelId ? hostelNav : tenantNav;
  }

  // Filter by role
  navigation = navigation.filter(
    (item) => !item.roles || (role && item.roles.includes(role))
  );

  const isActive = (href: string) => {
    if (href === "#") return false;
    return pathname === href || pathname.startsWith(href + "/");
  };

  const renderNavItem = (item: NavItem, depth = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.includes(item.label);
    const active = isActive(item.href);

    if (hasChildren) {
      return (
        <div key={item.label}>
          <button
            onClick={() => toggleExpand(item.label)}
            className={`w-full nav-item-inactive ${
              item.children?.some((c) => isActive(c.href))
                ? "text-white bg-sidebar-hover"
                : ""
            }`}
          >
            {item.icon}
            <span className="flex-1 text-left">{item.label}</span>
            {isExpanded ? (
              <ChevronDown size={16} />
            ) : (
              <ChevronRight size={16} />
            )}
          </button>
          {isExpanded && (
            <div className="ml-4 mt-1 space-y-1 animate-fade-in">
              {item.children!.map((child) => renderNavItem(child, depth + 1))}
            </div>
          )}
        </div>
      );
    }

    return (
      <Link
        key={item.href + item.label}
        href={item.href}
        onClick={onClose}
        className={active ? "nav-item-active" : "nav-item-inactive"}
      >
        {item.icon}
        <span>{item.label}</span>
      </Link>
    );
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-[260px] bg-sidebar z-50 flex flex-col transition-transform duration-300 lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-white/10">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Building2 size={18} className="text-white" />
            </div>
            <span className="text-white font-bold text-lg">HostelHub</span>
          </Link>
          <button onClick={onClose} className="lg:hidden text-white/60 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {/* Back to hostels link when inside a hostel */}
          {hostelId && role !== "RESIDENT" && role !== "STAFF" && (
            <Link
              href="/hostels"
              className="nav-item-inactive mb-3 text-xs uppercase tracking-wider opacity-70"
            >
              <ChevronRight size={14} className="rotate-180" />
              <span>Back to Hostels</span>
            </Link>
          )}
          {navigation.map((item) => renderNavItem(item))}
        </nav>

        {/* User profile section */}
        {session?.user && (
          <div className="p-4 border-t border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white text-sm font-semibold">
                {session.user.name
                  ?.split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">
                  {session.user.name}
                </p>
                <p className="text-indigo-300 text-xs truncate">
                  {session.user.role.replace("_", " ")}
                </p>
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
