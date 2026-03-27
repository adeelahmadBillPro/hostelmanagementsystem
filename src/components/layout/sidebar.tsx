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
import { useState, useEffect } from "react";

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
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export default function Sidebar({ isOpen, onClose, hostelId, collapsed = false, onToggleCollapse }: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = session?.user?.role;
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [initialized, setInitialized] = useState(false);

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

  // Auto-expand parent menus that contain the active page
  useEffect(() => {
    const parentsToExpand: string[] = [];
    navigation.forEach((item) => {
      if (item.children?.some((child) => isActive(child.href))) {
        parentsToExpand.push(item.label);
      }
    });
    if (parentsToExpand.length > 0) {
      setExpandedItems((prev) => {
        const merged = new Set([...prev, ...parentsToExpand]);
        return Array.from(merged);
      });
    }
    setInitialized(true);
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  const renderNavItem = (item: NavItem, depth = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.includes(item.label);
    const active = isActive(item.href);

    // Collapsed mode - hidden completely (we use header toggle only)
    if (collapsed) {
      return null;
    }

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

  // Icon colors for each nav item (colorful like the reference)
  const iconColors: Record<string, string> = {
    "Dashboard": "#60A5FA",
    "Overview": "#60A5FA",
    "Map View": "#A78BFA",
    "Infrastructure": "#F97316",
    "Buildings": "#F97316",
    "Floors": "#F97316",
    "Rooms": "#F97316",
    "Residents": "#34D399",
    "All Residents": "#34D399",
    "Add Resident": "#34D399",
    "Food Menu": "#FBBF24",
    "Menu Items": "#FBBF24",
    "Orders": "#FBBF24",
    "Billing": "#F472B6",
    "Payments": "#22D3EE",
    "Expenses": "#FB923C",
    "All Expenses": "#FB923C",
    "P&L Summary": "#FB923C",
    "Staff": "#818CF8",
    "All Staff": "#818CF8",
    "Add Staff": "#818CF8",
    "Salary Sheet": "#818CF8",
    "Visitors": "#2DD4BF",
    "Complaints": "#F87171",
    "Gate Passes": "#A3E635",
    "Notices": "#FBBF24",
    "Reports": "#C084FC",
    "Tenants": "#34D399",
    "Plans": "#FBBF24",
    "Analytics": "#F472B6",
    "Hostels": "#F97316",
    "Managers": "#818CF8",
    "My Bill": "#F472B6",
    "Gate Pass": "#A3E635",
    "Deleted files": "#F87171",
  };

  const getIconColor = (label: string) => iconColors[label] || "#94A3B8";

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-[264px] z-50 flex flex-col transition-all duration-300 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } ${collapsed ? "lg:-translate-x-full" : "lg:translate-x-0"}`}
        style={{
          background: "linear-gradient(180deg, #0B1929 0%, #0F2235 50%, #0B1929 100%)",
        }}
      >
        {/* Subtle gradient overlay for glass effect */}
        <div className="absolute inset-0 pointer-events-none opacity-30"
          style={{
            background: "radial-gradient(ellipse at 30% 0%, rgba(56,189,248,0.15) 0%, transparent 60%)",
          }}
        />

        {/* Logo */}
        <div className="relative h-16 flex items-center justify-between px-5 border-b border-white/[0.06]">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-gradient-to-br from-emerald-400 to-teal-500 shadow-lg shadow-emerald-500/20">
              <Building2 size={18} className="text-white" />
            </div>
            <span className="text-white font-bold text-xl tracking-tight">HostelHub</span>
          </Link>
          <button onClick={onClose} className="lg:hidden text-white/40 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="relative flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
          {/* Back to hostels link */}
          {hostelId && role !== "RESIDENT" && role !== "STAFF" && (
            <Link
              href="/hostels"
              className="flex items-center gap-2 px-3 py-2 mb-3 text-xs uppercase tracking-widest text-slate-500 hover:text-slate-300 transition-colors"
            >
              <ChevronRight size={12} className="rotate-180" />
              <span>Back to Hostels</span>
            </Link>
          )}

          {navigation.map((item) => {
            const hasChildren = item.children && item.children.length > 0;
            const isExpanded = expandedItems.includes(item.label);
            const active = isActive(item.href);
            const iconColor = getIconColor(item.label);

            if (collapsed) return null;

            if (hasChildren) {
              const isAnyChildActive = item.children?.some((c) => isActive(c.href));
              return (
                <div key={item.label}>
                  <button
                    onClick={() => toggleExpand(item.label)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer ${
                      isAnyChildActive
                        ? "text-white bg-white/[0.08]"
                        : "text-slate-400 hover:text-white hover:bg-white/[0.04]"
                    }`}
                  >
                    <span style={{ color: iconColor }}>{item.icon}</span>
                    <span className="flex-1 text-left">{item.label}</span>
                    <ChevronDown
                      size={14}
                      className={`text-slate-500 transition-transform duration-200 ${
                        isExpanded ? "rotate-0" : "-rotate-90"
                      }`}
                    />
                  </button>
                  {isExpanded && (
                    <div className="mt-0.5 ml-3 pl-4 border-l border-white/[0.06] space-y-0.5 animate-fade-in">
                      {item.children!.map((child) => {
                        const childActive = isActive(child.href);
                        const childColor = getIconColor(child.label);
                        return (
                          <Link
                            key={child.href + child.label}
                            href={child.href}
                            onClick={onClose}
                            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-200 ${
                              childActive
                                ? "text-white bg-white/[0.08]"
                                : "text-slate-500 hover:text-slate-300 hover:bg-white/[0.04]"
                            }`}
                          >
                            <span style={{ color: childActive ? childColor : undefined }}>{child.icon}</span>
                            <span>{child.label}</span>
                          </Link>
                        );
                      })}
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
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  active
                    ? "text-white bg-gradient-to-r from-white/[0.1] to-transparent"
                    : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]"
                }`}
              >
                <span style={{ color: active ? iconColor : undefined }}>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Section label */}
        {session?.user && (
          <div className="relative border-t border-white/[0.06]">
            <div className="px-4 pt-3 pb-1">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-600">Account</p>
            </div>
            <div className="px-3 pb-4">
              <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/[0.04]">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-xs font-bold shadow-lg shadow-emerald-500/20">
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
                  <p className="text-slate-500 text-xs truncate">
                    {session.user.role.replace(/_/g, " ")}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
