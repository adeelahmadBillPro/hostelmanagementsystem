"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import DashboardLayout from "@/components/layout/dashboard-layout";
import StatCard from "@/components/ui/stat-card";
import Modal from "@/components/ui/modal";
import ConfirmDialog from "@/components/ui/confirm-dialog";
import { formatCurrency } from "@/lib/utils";
import {
  UtensilsCrossed,
  Plus,
  Edit,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Loader2,
  ListChecks,
  Activity,
  TrendingUp,
  CheckCircle,
  Coffee,
  Sun,
  Moon,
  Cookie,
  Sparkles,
} from "lucide-react";
import { useToast } from "@/components/providers";

interface MenuItem {
  id: string;
  mealType: string;
  itemName: string;
  rate: number;
  availableDays: string[];
  isActive: boolean;
}

interface Stats {
  totalItems: number;
  activeItems: number;
  avgPrice: number;
}

const MEAL_TYPES = ["BREAKFAST", "LUNCH", "DINNER", "SNACK"] as const;

const MEAL_LABELS: Record<string, string> = {
  BREAKFAST: "Breakfast",
  LUNCH: "Lunch",
  DINNER: "Dinner",
  SNACK: "Snack",
};

const MEAL_ICONS: Record<string, React.ReactNode> = {
  BREAKFAST: <Coffee size={16} />,
  LUNCH: <Sun size={16} />,
  DINNER: <Moon size={16} />,
  SNACK: <Cookie size={16} />,
};

const MEAL_COLORS: Record<string, { badge: string; tab: string; accent: string }> = {
  BREAKFAST: {
    badge: "bg-amber-50 text-amber-700 ring-1 ring-amber-200/50 dark:bg-amber-900/20 dark:text-amber-400 dark:ring-amber-500/20",
    tab: "bg-amber-500 text-white shadow-sm shadow-amber-500/25",
    accent: "text-amber-500",
  },
  LUNCH: {
    badge: "bg-blue-50 text-blue-700 ring-1 ring-blue-200/50 dark:bg-blue-900/20 dark:text-blue-400 dark:ring-blue-500/20",
    tab: "bg-blue-500 text-white shadow-sm shadow-blue-500/25",
    accent: "text-blue-500",
  },
  DINNER: {
    badge: "bg-purple-50 text-purple-700 ring-1 ring-purple-200/50 dark:bg-purple-900/20 dark:text-purple-400 dark:ring-purple-500/20",
    tab: "bg-purple-500 text-white shadow-sm shadow-purple-500/25",
    accent: "text-purple-500",
  },
  SNACK: {
    badge: "bg-green-50 text-green-700 ring-1 ring-green-200/50 dark:bg-green-900/20 dark:text-green-400 dark:ring-green-500/20",
    tab: "bg-green-500 text-white shadow-sm shadow-green-500/25",
    accent: "text-green-500",
  },
};

// Common Pakistani food presets per meal type
const FOOD_PRESETS: Record<string, string[]> = {
  BREAKFAST: [
    "Paratha", "Omelette", "Halwa Puri", "Nihari", "Chai", "Lassi",
    "Aloo Paratha", "Chanay", "Daal", "Bread & Butter", "Anda Paratha",
    "French Toast", "Fruit Chaat", "Cornflakes & Milk", "Sandwich",
  ],
  LUNCH: [
    "Chicken Biryani", "Daal Chawal", "Chicken Karahi", "Qeema Rice",
    "Aloo Gosht", "Chicken Pulao", "Mix Sabzi", "Chana Daal",
    "Rajma Chawal", "Chicken Korma", "Mutton Biryani", "Fried Rice",
    "Chicken Handi", "Daal Makhani", "Bhindi Gosht",
  ],
  DINNER: [
    "Chicken Biryani", "Daal Roti", "Chicken Karahi", "Seekh Kebab",
    "Nihari", "Chicken Tikka", "Mutton Korma", "Qeema Naan",
    "Palak Paneer", "Aloo Keema", "Chicken Sajji", "Fish Fry",
    "Daal Gosht", "Chapli Kebab", "Haleem",
  ],
  SNACK: [
    "Samosa", "Pakora", "Roll Paratha", "Burger", "Fries",
    "Shawarma", "Chana Chaat", "Dahi Bhalla", "Fruit Chaat",
    "Gol Gappay", "Sandwich", "Pizza Slice", "Spring Roll",
    "Bun Kebab", "Chai",
  ],
};

const DAYS = [
  { key: "monday", label: "Mon" },
  { key: "tuesday", label: "Tue" },
  { key: "wednesday", label: "Wed" },
  { key: "thursday", label: "Thu" },
  { key: "friday", label: "Fri" },
  { key: "saturday", label: "Sat" },
  { key: "sunday", label: "Sun" },
];

const emptyForm = {
  mealType: "BREAKFAST" as string,
  itemName: "",
  rate: "",
  availableDays: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"],
};

export default function FoodMenuPage() {
  const params = useParams();
  const hostelId = params.id as string;
  const { addToast } = useToast();

  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [stats, setStats] = useState<Stats>({ totalItems: 0, activeItems: 0, avgPrice: 0 });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("BREAKFAST");
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<MenuItem | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [deleteItem, setDeleteItem] = useState<MenuItem | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchMenu = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/hostels/${hostelId}/food/menu`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setMenuItems(data.menuItems);
      setStats(data.stats);
    } catch (error) {
      console.error("Error fetching menu:", error);
    } finally {
      setLoading(false);
    }
  }, [hostelId]);

  useEffect(() => {
    fetchMenu();
  }, [fetchMenu]);

  const handleOpenAdd = () => {
    setEditItem(null);
    setForm({ ...emptyForm, mealType: activeTab });
    setShowModal(true);
  };

  const handleOpenEdit = (item: MenuItem) => {
    setEditItem(item);
    setForm({
      mealType: item.mealType,
      itemName: item.itemName,
      rate: String(item.rate),
      availableDays: [...item.availableDays],
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const payload = {
        mealType: form.mealType,
        itemName: form.itemName,
        rate: parseFloat(form.rate),
        availableDays: form.availableDays,
      };
      let res;
      if (editItem) {
        res = await fetch(`/api/hostels/${hostelId}/food/menu/${editItem.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch(`/api/hostels/${hostelId}/food/menu`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      if (!res.ok) {
        const err = await res.json();
        addToast(err.error || "Failed to save menu item", "error");
        return;
      }
      setShowModal(false);
      setForm(emptyForm);
      setEditItem(null);
      fetchMenu();
    } catch (error) {
      console.error("Save error:", error);
      addToast("Failed to save menu item", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (item: MenuItem) => {
    try {
      const res = await fetch(`/api/hostels/${hostelId}/food/menu/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !item.isActive }),
      });
      if (!res.ok) throw new Error("Failed to toggle");
      fetchMenu();
    } catch (error) {
      console.error("Toggle error:", error);
    }
  };

  const handleDelete = async () => {
    if (!deleteItem) return;
    try {
      setDeleteLoading(true);
      const res = await fetch(`/api/hostels/${hostelId}/food/menu/${deleteItem.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      setDeleteItem(null);
      fetchMenu();
    } catch (error) {
      console.error("Delete error:", error);
    } finally {
      setDeleteLoading(false);
    }
  };

  const toggleDay = (day: string) => {
    setForm((f) => ({
      ...f,
      availableDays: f.availableDays.includes(day)
        ? f.availableDays.filter((d) => d !== day)
        : [...f.availableDays, day],
    }));
  };

  const filteredItems = menuItems.filter((item) => item.mealType === activeTab);

  // Count items per meal type for tab badges
  const countPerType = MEAL_TYPES.reduce((acc, type) => {
    acc[type] = menuItems.filter((item) => item.mealType === type).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <DashboardLayout title="Food Menu" hostelId={hostelId}>
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <StatCard label="Total Items" value={stats.totalItems} icon={ListChecks} iconBg="#EEF2FF" iconColor="#4F46E5" delay={0} />
        <StatCard label="Active Items" value={stats.activeItems} icon={Activity} iconBg="#F0FDF4" iconColor="#16A34A" delay={100} />
        <StatCard label="Avg Price" value={formatCurrency(stats.avgPrice)} icon={TrendingUp} iconBg="#FFFBEB" iconColor="#D97706" delay={200} />
      </div>

      {/* Tabs + Add Button */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-[#0B1222] rounded-2xl p-1.5 overflow-x-auto flex-nowrap">
          {MEAL_TYPES.map((type) => {
            const isActive = activeTab === type;
            const colors = MEAL_COLORS[type];
            return (
              <button
                key={type}
                onClick={() => setActiveTab(type)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 flex-shrink-0 ${
                  isActive
                    ? colors.tab
                    : "text-text-muted hover:text-text-primary dark:hover:text-white hover:bg-white/50 dark:hover:bg-white/5"
                }`}
              >
                {MEAL_ICONS[type]}
                <span>{MEAL_LABELS[type]}</span>
                {countPerType[type] > 0 && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                    isActive ? "bg-white/25" : "bg-slate-200 dark:bg-slate-700 text-text-muted"
                  }`}>
                    {countPerType[type]}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <button onClick={handleOpenAdd} className="btn-primary flex items-center gap-2">
          <Plus size={16} />
          Add Item
        </button>
      </div>

      {/* Menu Items Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-primary" />
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="card p-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
            <UtensilsCrossed size={28} className="text-slate-300 dark:text-slate-600" />
          </div>
          <p className="text-lg font-semibold text-text-primary dark:text-white mb-1">
            No {MEAL_LABELS[activeTab].toLowerCase()} items yet
          </p>
          <p className="text-sm text-text-muted mb-5">
            Add your first {MEAL_LABELS[activeTab].toLowerCase()} item to get started
          </p>
          <button onClick={handleOpenAdd} className="btn-primary inline-flex items-center gap-2">
            <Sparkles size={16} />
            Add First Item
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item, idx) => {
            const colors = MEAL_COLORS[item.mealType];
            return (
              <div
                key={item.id}
                className={`card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-hover opacity-0 animate-fade-in-up ${
                  !item.isActive ? "opacity-50 grayscale-[30%]" : ""
                }`}
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-text-primary dark:text-white truncate">
                      {item.itemName}
                    </h4>
                    <span className={`inline-flex items-center gap-1.5 mt-1.5 text-xs px-2.5 py-1 rounded-lg font-semibold ${colors.badge}`}>
                      {MEAL_ICONS[item.mealType]}
                      {MEAL_LABELS[item.mealType]}
                    </span>
                  </div>
                  <span className={`text-xl font-bold ${colors.accent}`}>
                    {formatCurrency(item.rate)}
                  </span>
                </div>

                {/* Available Days */}
                <div className="flex gap-1 mb-4">
                  {DAYS.map((day) => {
                    const available = item.availableDays.includes(day.key);
                    return (
                      <span
                        key={day.key}
                        className={`flex-1 text-center text-[10px] font-bold py-1 rounded-md transition-colors ${
                          available
                            ? "bg-primary/10 text-primary dark:bg-primary/20"
                            : "bg-slate-50 text-slate-300 dark:bg-slate-800/50 dark:text-slate-700"
                        }`}
                      >
                        {day.label}
                      </span>
                    );
                  })}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-3 border-t border-border dark:border-[#1E2D42]">
                  <button
                    onClick={() => handleToggleActive(item)}
                    className="flex items-center gap-1.5 text-sm font-medium text-text-muted hover:text-text-primary dark:hover:text-white transition-colors"
                  >
                    {item.isActive ? (
                      <>
                        <ToggleRight size={22} className="text-emerald-500" />
                        <span className="text-emerald-600 dark:text-emerald-400 text-xs font-semibold">Active</span>
                      </>
                    ) : (
                      <>
                        <ToggleLeft size={22} className="text-slate-400" />
                        <span className="text-xs">Inactive</span>
                      </>
                    )}
                  </button>
                  <div className="flex items-center gap-0.5">
                    <button
                      onClick={() => handleOpenEdit(item)}
                      className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      title="Edit"
                    >
                      <Edit size={15} className="text-text-muted" />
                    </button>
                    <button
                      onClick={() => setDeleteItem(item)}
                      className="p-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={15} className="text-red-400" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setEditItem(null); setForm(emptyForm); }}
        title={editItem ? "Edit Menu Item" : "Add Menu Item"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Meal Type *</label>
              <select
                value={form.mealType}
                onChange={(e) => setForm((f) => ({ ...f, mealType: e.target.value }))}
                className="select"
                required
              >
                {MEAL_TYPES.map((type) => (
                  <option key={type} value={type}>{MEAL_LABELS[type]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Rate (PKR) *</label>
              <input
                type="number"
                value={form.rate}
                onChange={(e) => setForm((f) => ({ ...f, rate: e.target.value }))}
                className="input"
                placeholder="e.g., 250"
                min="0"
                step="1"
                required
              />
            </div>
          </div>

          <div>
            <label className="label">Item Name *</label>
            <input
              type="text"
              value={form.itemName}
              onChange={(e) => setForm((f) => ({ ...f, itemName: e.target.value }))}
              className="input"
              placeholder="Type or pick from suggestions below"
              required
            />
            {/* Quick pick suggestions */}
            {!editItem && (
              <div className="mt-2">
                <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1.5">Quick Pick:</p>
                <div className="flex flex-wrap gap-1.5 max-h-[100px] overflow-y-auto">
                  {(FOOD_PRESETS[form.mealType] || [])
                    .filter((preset) => !menuItems.some((m) => m.itemName.toLowerCase() === preset.toLowerCase() && m.mealType === form.mealType))
                    .map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, itemName: preset }))}
                        className={`text-xs px-2.5 py-1 rounded-lg border transition-all duration-150 ${
                          form.itemName === preset
                            ? "bg-primary text-white border-primary"
                            : "bg-white dark:bg-[#111C2E] border-border dark:border-[#1E2D42] text-text-secondary hover:border-primary hover:text-primary"
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                </div>
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label !mb-0">Available Days</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, availableDays: DAYS.map((d) => d.key) }))}
                  className="text-[10px] font-bold text-primary hover:text-primary-dark transition-colors uppercase"
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, availableDays: ["monday", "tuesday", "wednesday", "thursday", "friday"] }))}
                  className="text-[10px] font-bold text-text-muted hover:text-text-primary transition-colors uppercase"
                >
                  Weekdays
                </button>
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, availableDays: [] }))}
                  className="text-[10px] font-bold text-text-muted hover:text-red-500 transition-colors uppercase"
                >
                  Clear
                </button>
              </div>
            </div>
            <div className="flex gap-1.5">
              {DAYS.map((day) => {
                const selected = form.availableDays.includes(day.key);
                return (
                  <button
                    key={day.key}
                    type="button"
                    onClick={() => toggleDay(day.key)}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ${
                      selected
                        ? "bg-primary text-white shadow-sm shadow-primary/25"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                    }`}
                  >
                    {day.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => { setShowModal(false); setEditItem(null); setForm(emptyForm); }}
              className="btn-secondary flex-1"
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary flex-1" disabled={submitting}>
              {submitting ? (
                <span className="flex items-center gap-2">
                  <Loader2 size={16} className="animate-spin" />
                  Saving...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <CheckCircle size={16} />
                  {editItem ? "Update Item" : "Add Item"}
                </span>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={!!deleteItem}
        onClose={() => setDeleteItem(null)}
        onConfirm={handleDelete}
        title="Delete Menu Item"
        message={`Are you sure you want to delete "${deleteItem?.itemName}"? If it has linked orders, it will be deactivated instead.`}
        confirmText="Delete"
        confirmVariant="danger"
        loading={deleteLoading}
      />
    </DashboardLayout>
  );
}
