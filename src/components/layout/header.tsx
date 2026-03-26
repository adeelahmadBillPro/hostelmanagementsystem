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
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";

interface HeaderProps {
  title: string;
  onMenuClick: () => void;
}

export default function Header({ title, onMenuClick }: HeaderProps) {
  const { data: session } = useSession();
  const { theme, toggleTheme } = useTheme();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="h-16 bg-white dark:bg-[#1E293B] border-b border-border dark:border-[#334155] shadow-header flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30">
      {/* Left */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg hover:bg-bg-main dark:hover:bg-[#0F172A] transition-colors"
        >
          <Menu size={20} className="text-text-primary dark:text-white" />
        </button>
        <h1 className="text-lg font-semibold text-text-primary dark:text-white truncate">
          {title}
        </h1>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2">
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg hover:bg-bg-main dark:hover:bg-[#0F172A] transition-colors"
          title={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
        >
          {theme === "light" ? (
            <Moon size={20} className="text-text-secondary" />
          ) : (
            <Sun size={20} className="text-yellow-400" />
          )}
        </button>

        {/* Notifications */}
        <button className="p-2 rounded-lg hover:bg-bg-main dark:hover:bg-[#0F172A] transition-colors relative">
          <Bell size={20} className="text-text-secondary dark:text-gray-400" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-danger rounded-full" />
        </button>

        {/* User dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-bg-main dark:hover:bg-[#0F172A] transition-colors"
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
            <div className="absolute right-0 top-12 w-56 bg-white dark:bg-[#1E293B] border border-border dark:border-[#334155] rounded-xl shadow-modal py-2 animate-scale-in">
              <div className="px-4 py-2 border-b border-border dark:border-[#334155]">
                <p className="text-sm font-medium text-text-primary dark:text-white truncate">
                  {session?.user?.name}
                </p>
                <p className="text-xs text-text-muted truncate">
                  {session?.user?.email}
                </p>
              </div>
              <Link
                href="/settings"
                className="flex items-center gap-2 px-4 py-2.5 text-sm text-text-secondary dark:text-gray-300 hover:bg-bg-main dark:hover:bg-[#0F172A] transition-colors"
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
