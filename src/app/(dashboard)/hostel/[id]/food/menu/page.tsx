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
} from "lucide-react";

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

const MEAL_COLORS: Record<string, string> = {
  BREAKFAST: "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400",
  LUNCH: "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400",
  DINNER: "bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400",
  SNACK: "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400",
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

  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalItems: 0,
    activeItems: 0,
    avgPrice: 0,
  });
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
        res = await fetch(
          `/api/hostels/${hostelId}/food/menu/${editItem.id}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          }
        );
      } else {
        res = await fetch(`/api/hostels/${hostelId}/food/menu`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Failed to save menu item");
        return;
      }

      setShowModal(false);
      setForm(emptyForm);
      setEditItem(null);
      fetchMenu();
    } catch (error) {
      console.error("Save error:", error);
      alert("Failed to save menu item");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (item: MenuItem) => {
    try {
      const res = await fetch(
        `/api/hostels/${hostelId}/food/menu/${item.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isActive: !item.isActive }),
        }
      );
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
      const res = await fetch(
        `/api/hostels/${hostelId}/food/menu/${deleteItem.id}`,
        { method: "DELETE" }
      );
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

  return (
    <DashboardLayout title="Food Menu" hostelId={hostelId}>
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard
          label="Total Items"
          value={stats.totalItems}
          icon={ListChecks}
          iconBg="#EEF2FF"
          iconColor="#4F46E5"
          delay={0}
        />
        <StatCard
          label="Active Items"
          value={stats.activeItems}
          icon={Activity}
          iconBg="#F0FDF4"
          iconColor="#16A34A"
          delay={100}
        />
        <StatCard
          label="Avg Price"
          value={formatCurrency(stats.avgPrice)}
          icon={TrendingUp}
          iconBg="#FFFBEB"
          iconColor="#D97706"
          delay={200}
        />
      </div>

      {/* Tabs + Add Button */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-1 bg-bg-main dark:bg-[#0B1222] rounded-xl p-1">
          {MEAL_TYPES.map((type) => (
            <button
              key={type}
              onClick={() => setActiveTab(type)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === type
                  ? "bg-white dark:bg-[#111C2E] text-primary shadow-sm"
                  : "text-text-muted hover:text-text-primary"
              }`}
            >
              {MEAL_LABELS[type]}
            </button>
          ))}
        </div>
        <button
          onClick={handleOpenAdd}
          className="btn-primary flex items-center gap-2"
        >
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
        <div className="card p-12 text-center">
          <UtensilsCrossed size={48} className="mx-auto mb-4 text-text-muted opacity-40" />
          <p className="text-text-muted mb-4">
            No {MEAL_LABELS[activeTab].toLowerCase()} items yet.
          </p>
          <button onClick={handleOpenAdd} className="btn-primary inline-flex items-center gap-2">
            <Plus size={16} />
            Add First Item
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className={`card transition-all ${
                !item.isActive ? "opacity-60" : ""
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-semibold text-text-primary dark:text-white">
                    {item.itemName}
                  </h4>
                  <span
                    className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full font-medium ${
                      MEAL_COLORS[item.mealType]
                    }`}
                  >
                    {MEAL_LABELS[item.mealType]}
                  </span>
                </div>
                <span className="text-lg font-bold text-primary">
                  {formatCurrency(item.rate)}
                </span>
              </div>

              {/* Available Days */}
              <div className="flex flex-wrap gap-1 mb-4">
                {DAYS.map((day) => (
                  <span
                    key={day.key}
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      item.availableDays.includes(day.key)
                        ? "bg-primary/10 text-primary"
                        : "bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-600"
                    }`}
                  >
                    {day.label}
                  </span>
                ))}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-3 border-t border-border dark:border-[#1E2D42]">
                <button
                  onClick={() => handleToggleActive(item)}
                  className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text-primary transition-colors"
                >
                  {item.isActive ? (
                    <>
                      <ToggleRight size={20} className="text-green-500" />
                      Active
                    </>
                  ) : (
                    <>
                      <ToggleLeft size={20} className="text-gray-400" />
                      Inactive
                    </>
                  )}
                </button>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEdit(item)}
                    className="p-1.5 rounded-lg hover:bg-bg-main transition-colors"
                    title="Edit"
                  >
                    <Edit size={16} className="text-text-muted" />
                  </button>
                  <button
                    onClick={() => setDeleteItem(item)}
                    className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={16} className="text-red-500" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditItem(null);
          setForm(emptyForm);
        }}
        title={editItem ? "Edit Menu Item" : "Add Menu Item"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Meal Type</label>
            <select
              value={form.mealType}
              onChange={(e) => setForm((f) => ({ ...f, mealType: e.target.value }))}
              className="select"
              required
            >
              {MEAL_TYPES.map((type) => (
                <option key={type} value={type}>
                  {MEAL_LABELS[type]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Item Name</label>
            <input
              type="text"
              value={form.itemName}
              onChange={(e) => setForm((f) => ({ ...f, itemName: e.target.value }))}
              className="input"
              placeholder="e.g., Chicken Biryani"
              required
            />
          </div>

          <div>
            <label className="label">Rate (PKR)</label>
            <input
              type="number"
              value={form.rate}
              onChange={(e) => setForm((f) => ({ ...f, rate: e.target.value }))}
              className="input"
              placeholder="Enter price"
              min="0"
              step="1"
              required
            />
          </div>

          <div>
            <label className="label">Available Days</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {DAYS.map((day) => (
                <label
                  key={day.key}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 cursor-pointer transition-colors text-sm ${
                    form.availableDays.includes(day.key)
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border dark:border-[#1E2D42] text-text-muted"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={form.availableDays.includes(day.key)}
                    onChange={() => toggleDay(day.key)}
                    className="sr-only"
                  />
                  {day.label}
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setShowModal(false);
                setEditItem(null);
                setForm(emptyForm);
              }}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={submitting}>
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
