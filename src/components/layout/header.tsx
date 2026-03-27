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
        // Filter out notifications if user dismissed them recently (within 1 hour)
        const dismissedAt = localStorage.getItem("notif-dismissed-at");
        if (dismissedAt) {
          const dismissedTime = new Date(dismissedAt).getTime();
          const oneHourAgo = Date.now() - 60 * 60 * 1000;
          if (dismissedTime > oneHourAgo) {
            // Still within dismiss window - show empty
            setNotifications([]);
            setTotalUnread(0);
            return;
          } else {
            // Dismiss expired - clear it
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
    const interval = setInterval(fetchNotifications, 10000); // 10 seconds
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
    switch (icon) {
      case "message":
        return <MessageCircle size={16} className="text-blue-500" />;
      case "payment":
      case "bill":
        return <CreditCard size={16} className="text-green-500" />;
      case "complaint":
        return <AlertTriangle size={16} className="text-amber-500" />;
      case "gatepass":
        return <Ticket size={16} className="text-purple-500" />;
      case "tenant":
        return <Users size={16} className="text-indigo-500" />;
      default:
        return <Bell size={16} className="text-gray-400" />;
    }
  };

  const handleNotifClick = (link: string) => {
    setShowNotifications(false);
    router.push(link);
  };

  const handleMarkAllRead = () => {
    // Save dismiss timestamp so notifications don't reappear after refresh
    localStorage.setItem("notif-dismissed-at", new Date().toISOString());
    setNotifications([]);
    setTotalUnread(0);
    setShowNotifications(false);
  };

  return (
    <header className="h-16 bg-white dark:bg-[#111C2E] border-b border-border dark:border-[#1E2D42] shadow-header flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30">
      {/* Left */}
      <div className="flex items-center gap-2">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg hover:bg-bg-main dark:hover:bg-[#0B1222] transition-colors"
        >
          <Menu size={20} className="text-text-primary dark:text-white" />
        </button>
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="hidden lg:flex p-2 rounded-lg hover:bg-bg-main dark:hover:bg-[#0B1222] transition-colors"
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
      <div className="flex items-center gap-2">
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg hover:bg-bg-main dark:hover:bg-[#0B1222] transition-colors"
          title={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
        >
          {theme === "light" ? (
            <Moon size={20} className="text-text-secondary" />
          ) : (
            <Sun size={20} className="text-yellow-400" />
          )}
        </button>

        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 rounded-lg hover:bg-bg-main dark:hover:bg-[#0B1222] transition-colors relative"
          >
            <Bell size={20} className="text-text-secondary dark:text-gray-400" />
            {totalUnread > 0 && (
              <span className="absolute top-1 right-1 min-w-[18px] h-[18px] bg-danger text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                {totalUnread > 99 ? "99+" : totalUnread}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 top-12 w-80 bg-white dark:bg-[#111C2E] border border-border dark:border-[#1E2D42] rounded-xl shadow-modal animate-scale-in overflow-hidden z-50">
              <div className="px-4 py-3 border-b border-border dark:border-[#1E2D42] flex items-center justify-between">
                <h3 className="text-sm font-semibold text-text-primary dark:text-white">
                  Notifications
                </h3>
                {notifications.length > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-xs text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
                  >
                    <CheckCheck size={14} />
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-[360px] overflow-y-auto">
                {notifLoading && notifications.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 text-sm">
                    Loading...
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="text-center py-8">
                    <Bell size={32} className="mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                    <p className="text-sm text-gray-400 dark:text-gray-500">
                      No new notifications
                    </p>
                  </div>
                ) : (
                  notifications.map((notif, idx) => (
                    <button
                      key={`${notif.type}-${idx}`}
                      onClick={() => handleNotifClick(notif.link)}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-[#0B1222] transition-colors border-b border-gray-100 dark:border-[#1E2D42] last:border-0 flex items-start gap-3"
                    >
                      <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-[#0B1222] flex items-center justify-center flex-shrink-0 mt-0.5">
                        {getNotifIcon(notif.icon)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900 dark:text-white">
                          {notif.text}
                        </p>
                        <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5 capitalize">
                          {notif.type}
                        </p>
                      </div>
                      <span className="bg-primary/10 text-primary text-xs font-semibold rounded-full px-2 py-0.5 flex-shrink-0">
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
            className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-bg-main dark:hover:bg-[#0B1222] transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-xs font-semibold">
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
            <div className="absolute right-0 top-12 w-56 bg-white dark:bg-[#111C2E] border border-border dark:border-[#1E2D42] rounded-xl shadow-modal py-2 animate-scale-in z-50">
              <div className="px-4 py-2 border-b border-border dark:border-[#1E2D42]">
                <p className="text-sm font-medium text-text-primary dark:text-white truncate">
                  {session?.user?.name}
                </p>
                <p className="text-xs text-text-muted truncate">
                  {session?.user?.email}
                </p>
              </div>
              <Link
                href="/settings"
                className="flex items-center gap-2 px-4 py-2.5 text-sm text-text-secondary dark:text-gray-300 hover:bg-bg-main dark:hover:bg-[#0B1222] transition-colors"
                onClick={() => setShowDropdown(false)}
              >
                <User size={16} />
                <span>Profile Settings</span>
              </Link>
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-danger hover:bg-danger-light dark:hover:bg-red-900/20 transition-colors"
              >
                <LogOut size={16} />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
