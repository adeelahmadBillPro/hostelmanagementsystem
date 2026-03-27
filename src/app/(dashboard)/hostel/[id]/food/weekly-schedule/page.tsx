"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { useToast } from "@/components/providers";
import {
  CalendarDays,
  Save,
  Loader2,
  CheckSquare,
  Square,
  Copy,
  Trash2,
  UtensilsCrossed,
  RotateCcw,
} from "lucide-react";

interface MenuItem {
  id: string;
  mealType: string;
  itemName: string;
  rate: number;
  availableDays: string[];
  isActive: boolean;
}

const MEAL_TYPES = ["BREAKFAST", "LUNCH", "DINNER", "SNACK"] as const;

const MEAL_LABELS: Record<string, string> = {
  BREAKFAST: "Breakfast",
  LUNCH: "Lunch",
  DINNER: "Dinner",
  SNACK: "Snack",
};

const MEAL_COLORS: Record<string, string> = {
  BREAKFAST: "from-amber-500 to-orange-500",
  LUNCH: "from-blue-500 to-indigo-500",
  DINNER: "from-purple-500 to-violet-500",
  SNACK: "from-emerald-500 to-teal-500",
};

const MEAL_BG: Record<string, string> = {
  BREAKFAST: "bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800/30",
  LUNCH: "bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800/30",
  DINNER: "bg-purple-50 dark:bg-purple-900/10 border-purple-200 dark:border-purple-800/30",
  SNACK: "bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800/30",
};

const DAYS = [
  { key: "monday", label: "Mon", full: "Monday" },
  { key: "tuesday", label: "Tue", full: "Tuesday" },
  { key: "wednesday", label: "Wed", full: "Wednesday" },
  { key: "thursday", label: "Thu", full: "Thursday" },
  { key: "friday", label: "Fri", full: "Friday" },
  { key: "saturday", label: "Sat", full: "Saturday" },
  { key: "sunday", label: "Sun", full: "Sunday" },
];

const ALL_DAYS = DAYS.map((d) => d.key);
const WEEKDAYS = ["monday", "tuesday", "wednesday", "thursday", "friday"];
const WEEKENDS = ["saturday", "sunday"];

export default function WeeklySchedulePage() {
  const params = useParams();
  const hostelId = params.id as string;
  const { addToast } = useToast();

  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [schedule, setSchedule] = useState<Record<string, string[]>>({});
  const [originalSchedule, setOriginalSchedule] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const fetchMenu = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/hostels/${hostelId}/food/menu`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      const items = data.menuItems.filter((m: MenuItem) => m.isActive);
      setMenuItems(items);

      const sched: Record<string, string[]> = {};
      items.forEach((item: MenuItem) => {
        sched[item.id] = [...item.availableDays];
      });
      setSchedule(sched);
      setOriginalSchedule(JSON.parse(JSON.stringify(sched)));
    } catch (error) {
      console.error("Error fetching menu:", error);
      addToast("Failed to load menu items", "error");
    } finally {
      setLoading(false);
    }
  }, [hostelId, addToast]);

  useEffect(() => {
    fetchMenu();
  }, [fetchMenu]);

  useEffect(() => {
    setHasChanges(JSON.stringify(schedule) !== JSON.stringify(originalSchedule));
  }, [schedule, originalSchedule]);

  const toggleDay = (itemId: string, day: string) => {
    setSchedule((prev) => {
      const current = prev[itemId] || [];
      const updated = current.includes(day)
        ? current.filter((d) => d !== day)
        : [...current, day];
      return { ...prev, [itemId]: updated };
    });
  };

  const selectAllForItem = (itemId: string) => {
    setSchedule((prev) => ({ ...prev, [itemId]: [...ALL_DAYS] }));
  };

  const clearAllForItem = (itemId: string) => {
    setSchedule((prev) => ({ ...prev, [itemId]: [] }));
  };

  const applyTemplate = (template: "daily" | "weekdays" | "weekends") => {
    const days =
      template === "daily" ? ALL_DAYS : template === "weekdays" ? WEEKDAYS : WEEKENDS;
    setSchedule((prev) => {
      const updated = { ...prev };
      menuItems.forEach((item) => {
        updated[item.id] = [...days];
      });
      return updated;
    });
  };

  const resetChanges = () => {
    setSchedule(JSON.parse(JSON.stringify(originalSchedule)));
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      const updates = menuItems
        .filter((item) => {
          const orig = originalSchedule[item.id] || [];
          const curr = schedule[item.id] || [];
          return JSON.stringify(orig.sort()) !== JSON.stringify(curr.sort());
        })
        .map((item) => ({
          menuId: item.id,
          availableDays: schedule[item.id] || [],
        }));

      if (updates.length === 0) {
        addToast("No changes to save", "info");
        return;
      }

      const res = await fetch(`/api/hostels/${hostelId}/food/weekly-schedule`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save");
      }

      const data = await res.json();
      addToast(`Updated ${data.updatedCount} menu items`, "success");
      setOriginalSchedule(JSON.parse(JSON.stringify(schedule)));
      setHasChanges(false);
    } catch (error: any) {
      console.error("Save error:", error);
      addToast(error.message || "Failed to save schedule", "error");
    } finally {
      setSaving(false);
    }
  };

  const groupedItems = MEAL_TYPES.map((type) => ({
    type,
    items: menuItems.filter((item) => item.mealType === type),
  })).filter((group) => group.items.length > 0);

  return (
    <DashboardLayout title="Weekly Schedule" hostelId={hostelId}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-text-primary dark:text-white flex items-center gap-2">
            <CalendarDays size={24} className="text-primary" />
            Weekly Menu Schedule
          </h2>
          <p className="text-sm text-text-muted mt-1">
            Set which days each menu item is available. Check or uncheck days for each item.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {hasChanges && (
            <button
              onClick={resetChanges}
              className="btn-secondary flex items-center gap-2 text-sm animate-fade-in"
            >
              <RotateCcw size={14} />
              Reset
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className="btn-primary flex items-center gap-2 text-sm disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save size={14} />
                Save Schedule
              </>
            )}
          </button>
        </div>
      </div>

      {/* Quick Templates */}
      <div className="card mb-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-text-primary dark:text-white">
              Quick Templates
            </h3>
            <p className="text-xs text-text-muted mt-0.5">
              Apply a template to all items at once
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => applyTemplate("daily")}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:hover:bg-emerald-900/30 transition-colors"
            >
              <Copy size={12} className="inline mr-1.5" />
              Daily (All 7 Days)
            </button>
            <button
              onClick={() => applyTemplate("weekdays")}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/30 transition-colors"
            >
              <Copy size={12} className="inline mr-1.5" />
              Weekdays Only (Mon-Fri)
            </button>
            <button
              onClick={() => applyTemplate("weekends")}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-purple-50 text-purple-700 hover:bg-purple-100 dark:bg-purple-900/20 dark:text-purple-400 dark:hover:bg-purple-900/30 transition-colors"
            >
              <Copy size={12} className="inline mr-1.5" />
              Weekends Only (Sat-Sun)
            </button>
          </div>
        </div>
      </div>

      {/* Schedule Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-primary" />
        </div>
      ) : menuItems.length === 0 ? (
        <div className="card p-12 text-center animate-fade-in">
          <UtensilsCrossed size={48} className="mx-auto mb-4 text-text-muted opacity-40" />
          <p className="text-text-muted mb-2">No active menu items found.</p>
          <p className="text-xs text-text-muted">
            Add menu items from the Food Menu page first.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {groupedItems.map((group, gi) => (
            <div
              key={group.type}
              className="animate-fade-in-up"
              style={{ animationDelay: `${gi * 100}ms` }}
            >
              {/* Meal Type Header */}
              <div className="flex items-center gap-3 mb-3">
                <div
                  className={`w-1 h-8 rounded-full bg-gradient-to-b ${MEAL_COLORS[group.type]}`}
                />
                <h3 className="text-lg font-bold text-text-primary dark:text-white">
                  {MEAL_LABELS[group.type]}
                </h3>
                <span className="text-xs text-text-muted bg-bg-main dark:bg-[#111C2E] px-2 py-0.5 rounded-full">
                  {group.items.length} items
                </span>
              </div>

              {/* Table */}
              <div className={`rounded-xl border overflow-hidden ${MEAL_BG[group.type]}`}>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-black/5 dark:border-white/5">
                        <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary dark:text-gray-400 uppercase tracking-wider min-w-[200px]">
                          Menu Item
                        </th>
                        {DAYS.map((day) => (
                          <th
                            key={day.key}
                            className="px-2 py-3 text-center text-xs font-semibold text-text-secondary dark:text-gray-400 uppercase tracking-wider w-16"
                          >
                            <span className="hidden sm:inline">{day.label}</span>
                            <span className="sm:hidden">{day.label.charAt(0)}</span>
                          </th>
                        ))}
                        <th className="px-3 py-3 text-center text-xs font-semibold text-text-secondary dark:text-gray-400 uppercase tracking-wider w-24">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.items.map((item, idx) => {
                        const itemDays = schedule[item.id] || [];
                        const isAllSelected = ALL_DAYS.every((d) =>
                          itemDays.includes(d)
                        );
                        const isNoneSelected = itemDays.length === 0;

                        return (
                          <tr
                            key={item.id}
                            className={`transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.02] ${
                              idx !== group.items.length - 1
                                ? "border-b border-black/5 dark:border-white/5"
                                : ""
                            }`}
                          >
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-text-primary dark:text-white">
                                  {item.itemName}
                                </span>
                                <span className="text-xs text-text-muted">
                                  PKR {item.rate}
                                </span>
                              </div>
                            </td>
                            {DAYS.map((day) => {
                              const isChecked = itemDays.includes(day.key);
                              const wasChecked = (
                                originalSchedule[item.id] || []
                              ).includes(day.key);
                              const changed = isChecked !== wasChecked;

                              return (
                                <td
                                  key={day.key}
                                  className="px-2 py-3 text-center"
                                >
                                  <button
                                    onClick={() => toggleDay(item.id, day.key)}
                                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 mx-auto ${
                                      isChecked
                                        ? "bg-primary/10 text-primary hover:bg-primary/20"
                                        : "bg-gray-100 text-gray-300 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-600 dark:hover:bg-gray-700"
                                    } ${
                                      changed
                                        ? "ring-2 ring-amber-400 ring-offset-1 dark:ring-offset-transparent"
                                        : ""
                                    }`}
                                    title={`${isChecked ? "Remove from" : "Add to"} ${day.full}`}
                                  >
                                    {isChecked ? (
                                      <CheckSquare size={16} />
                                    ) : (
                                      <Square size={16} />
                                    )}
                                  </button>
                                </td>
                              );
                            })}
                            <td className="px-3 py-3">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  onClick={() =>
                                    isAllSelected
                                      ? clearAllForItem(item.id)
                                      : selectAllForItem(item.id)
                                  }
                                  className={`p-1.5 rounded-lg text-xs transition-colors ${
                                    isAllSelected
                                      ? "bg-primary/10 text-primary hover:bg-primary/20"
                                      : "bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
                                  }`}
                                  title={isAllSelected ? "Clear all days" : "Select all days"}
                                >
                                  {isAllSelected ? (
                                    <CheckSquare size={14} />
                                  ) : (
                                    <Square size={14} />
                                  )}
                                </button>
                                {!isNoneSelected && (
                                  <button
                                    onClick={() => clearAllForItem(item.id)}
                                    className="p-1.5 rounded-lg text-xs bg-red-50 text-red-500 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30 transition-colors"
                                    title="Clear all days"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Floating save bar when changes exist */}
      {hasChanges && !loading && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-fade-in-up">
          <div className="bg-sidebar dark:bg-[#111C2E] text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-4 border border-white/10">
            <span className="text-sm">
              You have unsaved changes
            </span>
            <button
              onClick={resetChanges}
              className="px-3 py-1.5 rounded-lg text-sm font-medium bg-white/10 hover:bg-white/20 transition-colors"
            >
              Discard
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-1.5 rounded-lg text-sm font-medium bg-primary hover:bg-primary-dark transition-colors flex items-center gap-2"
            >
              {saving ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Save size={14} />
              )}
              Save All
            </button>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
