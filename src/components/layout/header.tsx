"use client";

import { useSession, signOut } from "next-auth/react";
import { useTheme } from "@/components/providers";
import {
  Menu,
  Bell,
  Moon,
  Sun,
  LogOut,
  User,
  ChevronDown,
  PanelLeftClose,
  PanelLeftOpen,
  MessageCircle,
  CreditCard,
  AlertTriangle,
  Ticket,
  Users,
  CheckCheck,
  Settings,
} from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Notification {
  type: string;
  text: string;
  link: string;
  count: number;
  icon: string;
}

interface HeaderProps {
  title: string;
  onMenuClick: () => void;
  onToggleCollapse?: () => void;
  sidebarCollapsed?: boolean;
}

export default function Header({ title, onMenuClick, onToggleCollapse, sidebarCollapsed }: HeaderProps) {
  const { data: session } = useSession();
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [totalUnread, setTotalUnread] = useState(0);
  const [notifLoading, setNotifLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      setNotifLoading(true);
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        const dismissedAt = localStorage.getItem("notif-dismissed-at");
        if (dismissedAt) {
          const dismissedTime = new Date(dismissedAt).getTime();
          const oneHourAgo = Date.now() - 60 * 60 * 1000;
          if (dismissedTime > oneHourAgo) {
            setNotifications([]);
            setTotalUnread(0);
            return;
          } else {
            localStorage.removeItem("notif-dismissed-at");
          }
        }
        setNotifications(data.notifications || []);
        setTotalUnread(data.totalUnread || 0);
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    } finally {
      setNotifLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
      if (
        notifRef.current &&
        !notifRef.current.contains(e.target as Node)
      ) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getNotifIcon = (icon: string) => {
    const iconMap: Record<string, { icon: React.ReactNode; bg: string }> = {
      message: { icon: <MessageCircle size={15} />, bg: "bg-blue-500/15 text-blue-500" },
      payment: { icon: <CreditCard size={15} />, bg: "bg-emerald-500/15 text-emerald-500" },
      bill: { icon: <CreditCard size={15} />, bg: "bg-emerald-500/15 text-emerald-500" },
      complaint: { icon: <AlertTriangle size={15} />, bg: "bg-amber-500/15 text-amber-500" },
      gatepass: { icon: <Ticket size={15} />, bg: "bg-purple-500/15 text-purple-500" },
      tenant: { icon: <Users size={15} />, bg: "bg-indigo-500/15 text-indigo-500" },
    };
    const match = iconMap[icon] || { icon: <Bell size={15} />, bg: "bg-gray-500/15 text-gray-400" };
    return (
      <div className={`w-8 h-8 rounded-lg ${match.bg} flex items-center justify-center flex-shrink-0`}>
        {match.icon}
      </div>
    );
  };

  const handleNotifClick = (link: string) => {
    setShowNotifications(false);
    router.push(link);
  };

  const handleMarkAllRead = () => {
    localStorage.setItem("notif-dismissed-at", new Date().toISOString());
    setNotifications([]);
    setTotalUnread(0);
    setShowNotifications(false);
  };

  return (
    <header className="h-16 bg-white/80 dark:bg-[#111C2E]/80 backdrop-blur-xl border-b border-border/80 dark:border-[#1E2D42]/80 shadow-header flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30">
      {/* Left */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-xl hover:bg-bg-main dark:hover:bg-[#0B1222] transition-all duration-200"
        >
          <Menu size={20} className="text-text-primary dark:text-white" />
        </button>
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="hidden lg:flex p-2 rounded-xl hover:bg-bg-main dark:hover:bg-[#0B1222] transition-all duration-200"
            title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {sidebarCollapsed ? (
              <PanelLeftOpen size={20} className="text-text-secondary" />
            ) : (
              <PanelLeftClose size={20} className="text-text-secondary" />
            )}
          </button>
        )}
        <h1 className="text-lg font-semibold text-text-primary dark:text-white truncate">
          {title}
        </h1>
      </div>

      {/* Right */}
      <div className="flex items-center gap-1">
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="p-2.5 rounded-xl hover:bg-bg-main dark:hover:bg-[#0B1222] transition-all duration-200 group"
          title={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
        >
          {theme === "light" ? (
            <Moon size={18} className="text-text-secondary group-hover:text-primary transition-colors" />
          ) : (
            <Sun size={18} className="text-yellow-400 group-hover:text-yellow-300 transition-colors" />
          )}
        </button>

        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2.5 rounded-xl hover:bg-bg-main dark:hover:bg-[#0B1222] transition-all duration-200 relative"
          >
            <Bell size={18} className="text-text-secondary dark:text-gray-400" />
            {totalUnread > 0 && (
              <span className="absolute top-1.5 right-1.5 min-w-[17px] h-[17px] bg-danger text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 animate-notification-pop ring-2 ring-white dark:ring-[#111C2E]">
                {totalUnread > 99 ? "99+" : totalUnread}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 top-12 w-80 bg-white dark:bg-[#111C2E] border border-border dark:border-[#1E2D42] rounded-2xl shadow-dropdown animate-slide-up overflow-hidden z-50">
              <div className="px-4 py-3 border-b border-border dark:border-[#1E2D42] flex items-center justify-between">
                <h3 className="text-sm font-semibold text-text-primary dark:text-white">
                  Notifications
                </h3>
                {notifications.length > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-xs text-primary hover:text-primary-dark transition-colors flex items-center gap-1 font-medium"
                  >
                    <CheckCheck size={14} />
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-[360px] overflow-y-auto">
                {notifLoading && notifications.length === 0 ? (
                  <div className="text-center py-10 text-gray-400 text-sm">
                    Loading...
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="text-center py-10">
                    <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-[#0B1222] flex items-center justify-center mx-auto mb-3">
                      <Bell size={22} className="text-gray-300 dark:text-gray-600" />
                    </div>
                    <p className="text-sm font-medium text-gray-400 dark:text-gray-500">
                      No new notifications
                    </p>
                    <p className="text-xs text-gray-300 dark:text-gray-600 mt-1">
                      You&apos;re all caught up!
                    </p>
                  </div>
                ) : (
                  notifications.map((notif, idx) => (
                    <button
                      key={`${notif.type}-${idx}`}
                      onClick={() => handleNotifClick(notif.link)}
                      className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-[#0B1222] transition-colors border-b border-slate-100 dark:border-[#1A2A3E] last:border-0 flex items-start gap-3 group"
                    >
                      {getNotifIcon(notif.icon)}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900 dark:text-white group-hover:text-primary dark:group-hover:text-primary transition-colors">
                          {notif.text}
                        </p>
                        <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5 capitalize">
                          {notif.type}
                        </p>
                      </div>
                      <span className="bg-primary/10 text-primary text-xs font-bold rounded-lg px-2 py-0.5 flex-shrink-0">
                        {notif.count}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-2 py-1.5 px-2 rounded-xl hover:bg-bg-main dark:hover:bg-[#0B1222] transition-all duration-200 ml-1"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center text-white text-xs font-bold shadow-sm">
              {session?.user?.name
                ?.split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()
                .slice(0, 2)}
            </div>
            <span className="hidden sm:block text-sm font-medium text-text-primary dark:text-white max-w-[120px] truncate">
              {session?.user?.name}
            </span>
            <ChevronDown
              size={14}
              className={`text-text-muted transition-transform duration-200 hidden sm:block ${
                showDropdown ? "rotate-180" : ""
              }`}
            />
          </button>

          {showDropdown && (
            <div className="absolute right-0 top-12 w-56 bg-white dark:bg-[#111C2E] border border-border dark:border-[#1E2D42] rounded-2xl shadow-dropdown py-1.5 animate-slide-up z-50">
              <div className="px-4 py-3 border-b border-border dark:border-[#1E2D42]">
                <p className="text-sm font-semibold text-text-primary dark:text-white truncate">
                  {session?.user?.name}
                </p>
                <p className="text-xs text-text-muted truncate mt-0.5">
                  {session?.user?.email}
                </p>
              </div>
              <div className="py-1">
                <Link
                  href="/profile"
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-text-secondary dark:text-gray-300 hover:bg-bg-main dark:hover:bg-[#0B1222] transition-colors rounded-lg mx-1.5"
                  onClick={() => setShowDropdown(false)}
                >
                  <Settings size={16} />
                  <span>Profile Settings</span>
                </Link>
              </div>
              <div className="border-t border-border dark:border-[#1E2D42] pt-1">
                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-danger hover:bg-danger/5 dark:hover:bg-red-900/20 transition-colors rounded-lg mx-1.5"
                  style={{ width: "calc(100% - 12px)" }}
                >
                  <LogOut size={16} />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
