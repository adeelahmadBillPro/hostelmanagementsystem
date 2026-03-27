"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/dashboard-layout";
import {
  Building2, MapPin, Phone, Users, BedDouble, CheckCircle2, XCircle,
  Utensils, Droplets, ShieldCheck, Car, ChevronDown, ChevronRight,
  Home, Info, Star,
} from "lucide-react";

const CATEGORY_META: Record<string, { label: string; icon: any; color: string; emoji: string }> = {
  hostel: { label: "Hostel Facilities", icon: Building2, color: "#4F46E5", emoji: "🏢" },
  room: { label: "Room Facilities", icon: BedDouble, color: "#10B981", emoji: "🛏️" },
  washroom: { label: "Washroom / Bathroom", icon: Droplets, color: "#0EA5E9", emoji: "🚿" },
  dining: { label: "Dining & Kitchen", icon: Utensils, color: "#F59E0B", emoji: "🍽️" },
  security: { label: "Safety & Security", icon: ShieldCheck, color: "#EF4444", emoji: "🔒" },
  transport: { label: "Location & Nearby", icon: Car, color: "#8B5CF6", emoji: "📍" },
};

interface Amenity {
  id: string;
  name: string;
  category: string;
  isAvailable: boolean;
}

export default function HostelInfoPage() {
  const [hostel, setHostel] = useState<any>(null);
  const [amenities, setAmenities] = useState<Record<string, Amenity[]>>({});
  const [stats, setStats] = useState({ total: 0, available: 0 });
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [expandedCats, setExpandedCats] = useState<string[]>(Object.keys(CATEGORY_META));

  useEffect(() => {
    fetch("/api/portal/hostel-info")
      .then((r) => r.json())
      .then((data) => {
        setHostel(data.hostel);
        setAmenities(data.amenities || {});
        setStats(data.stats || { total: 0, available: 0 });
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <DashboardLayout title="Hostel Info">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  if (!hostel) {
    return (
      <DashboardLayout title="Hostel Info">
        <div className="text-center py-20 text-text-muted">Hostel info not found</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Hostel Info">
      <div className="space-y-6">
        {/* Cover Image + Header */}
        <div className="card p-0 overflow-hidden animate-fade-in-up">
          {hostel.coverImage && (
            <div className="h-48 bg-gray-200 dark:bg-[#0B1222]">
              <img src={hostel.coverImage} alt={hostel.name} className="w-full h-full object-cover" />
            </div>
          )}
          <div className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white shadow-lg flex-shrink-0">
                <Building2 size={28} />
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-text-primary dark:text-white">{hostel.name}</h1>
                <div className="flex items-center gap-3 mt-2 flex-wrap">
                  <span className="badge-primary">{hostel.type}</span>
                  <div className="flex items-center gap-1 text-sm text-text-secondary dark:text-slate-400">
                    <MapPin size={14} />
                    {hostel.address}{hostel.city ? `, ${hostel.city}` : ""}
                  </div>
                  {hostel.contact && (
                    <div className="flex items-center gap-1 text-sm text-text-secondary dark:text-slate-400">
                      <Phone size={14} />
                      {hostel.contact}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {hostel.description && (
              <div className="mt-4 p-4 bg-gray-50 dark:bg-[#0B1222] rounded-xl">
                <p className="text-sm text-text-secondary dark:text-slate-300 leading-relaxed">
                  {hostel.description}
                </p>
              </div>
            )}

            {/* Quick stats */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-4">
              {[
                { label: "Buildings", value: hostel.buildings, icon: Building2 },
                { label: "Rooms", value: hostel.rooms, icon: Home },
                { label: "Beds", value: hostel.beds, icon: BedDouble },
                { label: "Residents", value: hostel.residents, icon: Users },
                { label: "Facilities", value: `${stats.available}/${stats.total}`, icon: Star },
              ].map((s, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 p-3 bg-white dark:bg-[#111C2E] border border-border dark:border-[#1E2D42] rounded-xl"
                >
                  <s.icon size={18} className="text-primary" />
                  <div>
                    <p className="font-bold text-lg text-text-primary dark:text-white">{s.value}</p>
                    <p className="text-[11px] text-text-muted">{s.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Show all toggle */}
        <div className="flex items-center justify-between">
          <h2 className="section-title">Facilities & Amenities</h2>
          <label className="flex items-center gap-2 text-sm text-text-secondary dark:text-slate-400 cursor-pointer">
            <input
              type="checkbox"
              checked={showAll}
              onChange={(e) => setShowAll(e.target.checked)}
              className="rounded"
            />
            Show unavailable items
          </label>
        </div>

        {/* Amenities by category */}
        {Object.entries(CATEGORY_META).map(([catKey, catMeta]) => {
          const items = amenities[catKey] || [];
          const filtered = showAll ? items : items.filter((a) => a.isAvailable);
          if (filtered.length === 0 && !showAll) return null;

          const isExpanded = expandedCats.includes(catKey);
          const availableInCat = items.filter((a) => a.isAvailable).length;
          const CatIcon = catMeta.icon;

          return (
            <div key={catKey} className="card p-0 overflow-hidden animate-fade-in-up">
              <button
                onClick={() =>
                  setExpandedCats((prev) =>
                    prev.includes(catKey)
                      ? prev.filter((c) => c !== catKey)
                      : [...prev, catKey]
                  )
                }
                className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 dark:hover:bg-[#0B1222] transition-colors"
              >
                <span className="text-2xl">{catMeta.emoji}</span>
                <div className="flex-1 text-left">
                  <h3 className="font-semibold text-text-primary dark:text-white">{catMeta.label}</h3>
                  <p className="text-xs text-text-muted">{availableInCat} of {items.length} available</p>
                </div>
                {isExpanded ? <ChevronDown size={18} className="text-text-muted" /> : <ChevronRight size={18} className="text-text-muted" />}
              </button>

              {isExpanded && (
                <div className="border-t border-border dark:border-[#1E2D42] p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {filtered.map((amenity) => (
                      <div
                        key={amenity.id}
                        className={`flex items-center gap-2.5 p-2.5 rounded-lg ${
                          amenity.isAvailable
                            ? "bg-success-light dark:bg-emerald-900/10"
                            : "bg-gray-50 dark:bg-[#0B1222] opacity-50"
                        }`}
                      >
                        {amenity.isAvailable ? (
                          <CheckCircle2 size={16} className="text-success flex-shrink-0" />
                        ) : (
                          <XCircle size={16} className="text-gray-400 flex-shrink-0" />
                        )}
                        <span
                          className={`text-sm ${
                            amenity.isAvailable
                              ? "text-text-primary dark:text-white"
                              : "text-text-muted line-through"
                          }`}
                        >
                          {amenity.name}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </DashboardLayout>
  );
}
