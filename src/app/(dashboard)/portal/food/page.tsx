'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import DashboardLayout from '@/components/layout/dashboard-layout';
import Modal from '@/components/ui/modal';
import { useToast } from '@/components/providers';
import { formatCurrency } from '@/lib/utils';
import {
  UtensilsCrossed,
  Plus,
  Minus,
  ShoppingCart,
  CheckCircle,
  Coffee,
  Sun,
  Moon,
  Cookie,
  TrendingUp,
  Receipt,
  Star,
  ChevronRight,
  Sparkles,
  X,
  Trash2,
  Clock,
  History,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────

interface MenuItem {
  id: string;
  itemName: string;
  mealType: 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK';
  category: 'main' | 'side' | 'bread' | 'drink' | 'dessert';
  rate: number;
  isFree: boolean;
  freeWithMeal: boolean;
  freeQtyLimit: number;
  extraRate: number;
  maxQtyPerOrder: number;
  isActive: boolean;
  availableDays: string[];
}

interface MonthlySummary {
  totalOrders: number;
  totalSpent: number;
  mostOrderedItem: string | null;
}

type MealType = 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK';

// ── Helpers ────────────────────────────────────────────────────────────

const MEAL_TABS: { key: MealType; label: string; icon: React.ReactNode }[] = [
  { key: 'BREAKFAST', label: 'Breakfast', icon: <Coffee size={18} /> },
  { key: 'LUNCH', label: 'Lunch', icon: <Sun size={18} /> },
  { key: 'DINNER', label: 'Dinner', icon: <Moon size={18} /> },
  { key: 'SNACK', label: 'Snack', icon: <Cookie size={18} /> },
];

const CATEGORY_COLORS: Record<string, { bg: string; text: string; darkBg: string; darkText: string }> = {
  main: { bg: 'bg-indigo-50', text: 'text-indigo-700', darkBg: 'dark:bg-indigo-900/30', darkText: 'dark:text-indigo-300' },
  side: { bg: 'bg-amber-50', text: 'text-amber-700', darkBg: 'dark:bg-amber-900/30', darkText: 'dark:text-amber-300' },
  bread: { bg: 'bg-orange-50', text: 'text-orange-700', darkBg: 'dark:bg-orange-900/30', darkText: 'dark:text-orange-300' },
  drink: { bg: 'bg-cyan-50', text: 'text-cyan-700', darkBg: 'dark:bg-cyan-900/30', darkText: 'dark:text-cyan-300' },
  dessert: { bg: 'bg-pink-50', text: 'text-pink-700', darkBg: 'dark:bg-pink-900/30', darkText: 'dark:text-pink-300' },
};

function CategoryBadge({ category }: { category: string }) {
  const c = CATEGORY_COLORS[category] || CATEGORY_COLORS.main;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold uppercase tracking-wide ${c.bg} ${c.text} ${c.darkBg} ${c.darkText}`}>
      {category}
    </span>
  );
}

function PriceBadge({ item, hasMainInCart }: { item: MenuItem; hasMainInCart: boolean }) {
  if (item.isFree) {
    return (
      <span className="badge-success text-xs font-bold">FREE</span>
    );
  }
  if (item.freeWithMeal) {
    if (hasMainInCart) {
      if (item.freeQtyLimit > 0 && item.extraRate > 0) {
        return (
          <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
            First {item.freeQtyLimit} FREE, then {formatCurrency(item.extraRate)} each
          </span>
        );
      }
      return (
        <span className="badge bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 text-xs font-bold">
          Free with meal
        </span>
      );
    }
    return (
      <span className="text-sm font-bold text-[#4F46E5] dark:text-indigo-400">
        {formatCurrency(item.extraRate || item.rate)}
      </span>
    );
  }
  return (
    <span className="text-sm font-bold text-[#4F46E5] dark:text-indigo-400">
      {formatCurrency(item.rate)}
    </span>
  );
}

// ── Main Component ─────────────────────────────────────────────────────

export default function FoodOrderingPage() {
  const { addToast } = useToast();

  // State
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<MealType>('LUNCH');
  const [summary, setSummary] = useState<MonthlySummary | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [todayOrders, setTodayOrders] = useState<any[]>([]);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [orderingWindows, setOrderingWindows] = useState<any[]>([]);
  const [foodPlanInfo, setFoodPlanInfo] = useState<{ plan: string; customFee: number; hostelFee: number } | null>(null);

  // Fetch menu
  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const res = await fetch('/api/portal/food');
        if (res.ok) {
          const data = await res.json();
          setMenu(data.menu || []);
          setSummary(data.summary || null);
          setOrderingWindows(data.orderingWindows || []);
          setTodayOrders(data.todayOrders || []);
          setRecentOrders(data.recentOrders || []);
          if (data.foodPlan) {
            setFoodPlanInfo({ plan: data.foodPlan, customFee: data.customFoodFee || 0, hostelFee: data.hostelFoodCharge || 0 });
          }
          // Auto-select first meal tab that has items
          const items: MenuItem[] = data.menu || [];
          const available = MEAL_TABS.find((t) =>
            items.some((i: MenuItem) => i.mealType === t.key)
          );
          if (available) setActiveTab(available.key);
        }
      } catch (error) {
        console.error('Failed to fetch menu:', error);
        addToast('Failed to load menu. Please try again.', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchMenu();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Grouped menu
  const groupedMenu = useMemo(() => {
    const groups: Record<MealType, MenuItem[]> = {
      BREAKFAST: [],
      LUNCH: [],
      DINNER: [],
      SNACK: [],
    };
    menu.forEach((item) => {
      if (item.isActive && groups[item.mealType]) {
        groups[item.mealType].push(item);
      }
    });
    return groups;
  }, [menu]);

  // Check if cart has any "main" category item
  const hasMainInCart = useMemo(() => {
    return menu.some(
      (item) => item.category === 'main' && (quantities[item.id] || 0) > 0
    );
  }, [menu, quantities]);

  // Quantity controls
  const setQty = useCallback(
    (itemId: string, qty: number) => {
      setQuantities((prev) => {
        const next = { ...prev };
        if (qty <= 0) {
          delete next[itemId];
        } else {
          next[itemId] = qty;
        }
        return next;
      });
    },
    []
  );

  const increment = useCallback(
    (item: MenuItem) => {
      const current = quantities[item.id] || 0;
      const max = item.maxQtyPerOrder || 99;
      if (current < max) {
        setQty(item.id, current + 1);
      }
    },
    [quantities, setQty]
  );

  const decrement = useCallback(
    (item: MenuItem) => {
      const current = quantities[item.id] || 0;
      setQty(item.id, current - 1);
    },
    [quantities, setQty]
  );

  // Calculate line total for a single item
  const calcLineTotal = useCallback(
    (item: MenuItem, qty: number): { freeQty: number; paidQty: number; total: number } => {
      if (qty === 0) return { freeQty: 0, paidQty: 0, total: 0 };

      // Completely free item
      if (item.isFree) {
        return { freeQty: qty, paidQty: 0, total: 0 };
      }

      // Free with meal logic
      if (item.freeWithMeal) {
        if (hasMainInCart) {
          const freeQty = Math.min(qty, item.freeQtyLimit || 0);
          const paidQty = qty - freeQty;
          const chargeRate = item.extraRate || item.rate;
          return { freeQty, paidQty, total: paidQty * chargeRate };
        }
        // No main dish → charge extraRate or rate for all
        const chargeRate = item.extraRate || item.rate;
        return { freeQty: 0, paidQty: qty, total: qty * chargeRate };
      }

      // Regular item
      return { freeQty: 0, paidQty: qty, total: qty * item.rate };
    },
    [hasMainInCart]
  );

  // Cart items (items with qty > 0)
  const cartItems = useMemo(() => {
    return menu
      .filter((item) => (quantities[item.id] || 0) > 0)
      .map((item) => {
        const qty = quantities[item.id] || 0;
        const calc = calcLineTotal(item, qty);
        return { ...item, qty, ...calc };
      });
  }, [menu, quantities, calcLineTotal]);

  // Totals
  const totalPayable = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + item.total, 0);
  }, [cartItems]);

  const totalFreeItems = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + item.freeQty, 0);
  }, [cartItems]);

  const totalItems = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + item.qty, 0);
  }, [cartItems]);

  // Submit order
  const submitOrder = async () => {
    if (cartItems.length === 0) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/portal/food', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cartItems.map((item) => ({
            menuId: item.id,
            quantity: item.qty,
          })),
        }),
      });
      if (res.ok) {
        setQuantities({});
        setShowReviewModal(false);
        addToast('Order placed successfully!', 'success');
        // Refresh summary + today's orders
        const menuRes = await fetch('/api/portal/food');
        if (menuRes.ok) {
          const data = await menuRes.json();
          setSummary(data.summary || null);
          setTodayOrders(data.todayOrders || []);
          setRecentOrders(data.recentOrders || []);
        }
      } else {
        const err = await res.json().catch(() => null);
        addToast(err?.error || 'Failed to place order. Please try again.', 'error');
      }
    } catch (error) {
      console.error('Failed to submit order:', error);
      addToast('Network error. Please try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Tab counts
  const tabCounts = useMemo(() => {
    const counts: Record<MealType, number> = { BREAKFAST: 0, LUNCH: 0, DINNER: 0, SNACK: 0 };
    Object.entries(quantities).forEach(([id, qty]) => {
      if (qty > 0) {
        const item = menu.find((m) => m.id === id);
        if (item) counts[item.mealType] += qty;
      }
    });
    return counts;
  }, [menu, quantities]);

  // Active tab items
  const activeItems = groupedMenu[activeTab] || [];

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <DashboardLayout title="Food Menu" hostelId="">
      <div className="space-y-6 animate-fade-in-up">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <UtensilsCrossed size={22} className="text-white" />
            </div>
            <div>
              <h1 className="page-title">Food Menu</h1>
              <p className="text-sm text-text-secondary dark:text-slate-400 mt-0.5">
                Order fresh meals for today
              </p>
            </div>
          </div>
          {totalItems > 0 && (
            <div className="flex items-center gap-2 lg:hidden">
              <button
                onClick={() => {
                  const el = document.getElementById('order-summary-mobile');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                className="btn-primary relative"
              >
                <ShoppingCart size={18} />
                View Cart
                <span className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white text-[11px] font-bold rounded-full flex items-center justify-center">
                  {totalItems}
                </span>
              </button>
            </div>
          )}
        </div>

        {/* Food Plan Banner */}
        {foodPlanInfo && (
          <div className={`rounded-xl p-3.5 flex items-start gap-3 text-sm ${
            foodPlanInfo.plan === "FULL_MESS" ? "bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800" :
            foodPlanInfo.plan === "NO_MESS" ? "bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800" :
            "bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800"
          }`}>
            <UtensilsCrossed size={18} className={
              foodPlanInfo.plan === "FULL_MESS" ? "text-emerald-600 mt-0.5" :
              foodPlanInfo.plan === "NO_MESS" ? "text-amber-600 mt-0.5" : "text-indigo-600 mt-0.5"
            } />
            <div>
              <p className={`font-semibold ${
                foodPlanInfo.plan === "FULL_MESS" ? "text-emerald-800 dark:text-emerald-300" :
                foodPlanInfo.plan === "NO_MESS" ? "text-amber-800 dark:text-amber-300" : "text-indigo-800 dark:text-indigo-300"
              }`}>
                {foodPlanInfo.plan === "FULL_MESS" && `Full Mess Plan (${formatCurrency(foodPlanInfo.hostelFee)}/month)`}
                {foodPlanInfo.plan === "NO_MESS" && "No Mess Plan"}
                {foodPlanInfo.plan === "CUSTOM" && `Custom Plan (${formatCurrency(foodPlanInfo.customFee)}/month)`}
              </p>
              <p className="text-xs text-text-muted mt-0.5">
                {foodPlanInfo.plan === "FULL_MESS" && "Your mess fee is fixed. Extra orders below will be charged separately on your bill."}
                {foodPlanInfo.plan === "NO_MESS" && "You don't have a mess plan. All orders below will be charged to your monthly bill."}
                {foodPlanInfo.plan === "CUSTOM" && "Extra orders below will be charged separately on top of your custom food fee."}
              </p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-12 h-12 border-4 border-[#4F46E5]/20 border-t-[#4F46E5] rounded-full animate-spin" />
            <p className="text-text-secondary dark:text-slate-400 font-medium">Loading today&apos;s menu...</p>
          </div>
        ) : menu.length === 0 ? (
          <div className="card text-center py-16">
            <UtensilsCrossed size={48} className="mx-auto text-text-muted mb-4 opacity-40" />
            <h3 className="text-lg font-semibold text-text-primary dark:text-white mb-2">No Menu Available Today</h3>
            <p className="text-text-secondary dark:text-slate-400">Check back later for updated menu items.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* ── Menu Section ──────────────────────────────────── */}
            <div className="lg:col-span-2 space-y-5">
              {/* Meal Type Tabs */}
              <div className="card !p-2">
                <div className="flex gap-1">
                  {MEAL_TABS.map((tab) => {
                    const count = groupedMenu[tab.key]?.length || 0;
                    const cartCount = tabCounts[tab.key];
                    const isActive = activeTab === tab.key;
                    return (
                      <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        disabled={count === 0}
                        className={`
                          flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 relative
                          ${isActive
                            ? 'bg-[#4F46E5] text-white shadow-md shadow-indigo-500/25'
                            : count > 0
                              ? 'text-text-secondary dark:text-slate-400 hover:bg-bg-main dark:hover:bg-[#0B1222]'
                              : 'text-text-muted opacity-40 cursor-not-allowed'
                          }
                        `}
                      >
                        {tab.icon}
                        <span className="hidden sm:inline">{tab.label}</span>
                        {count > 0 && (
                          <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full ${
                            isActive ? 'bg-white/20 text-white' : 'bg-bg-main dark:bg-[#1E2D42] text-text-muted'
                          }`}>
                            {count}
                          </span>
                        )}
                        {cartCount > 0 && (
                          <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                            {cartCount}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Menu Items Grid */}
              {activeItems.length === 0 ? (
                <div className="card text-center py-12">
                  <p className="text-text-muted">No items available for {activeTab.toLowerCase()} today.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {activeItems.map((item, index) => {
                    const qty = quantities[item.id] || 0;
                    const lineCalc = calcLineTotal(item, qty);
                    return (
                      <div
                        key={item.id}
                        className="card !p-4 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 animate-fade-in-up"
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        {/* Top: Name + Category */}
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-text-primary dark:text-white text-[15px] truncate">
                              {item.itemName}
                            </h4>
                            <div className="flex items-center gap-2 mt-1.5">
                              <CategoryBadge category={item.category} />
                              <PriceBadge item={item} hasMainInCart={hasMainInCart} />
                            </div>
                          </div>
                          {item.isFree && (
                            <div className="flex-shrink-0">
                              <Sparkles size={18} className="text-emerald-500" />
                            </div>
                          )}
                        </div>

                        {/* Free with meal info */}
                        {item.freeWithMeal && item.freeQtyLimit > 0 && item.extraRate > 0 && (
                          <div className="text-[11px] text-text-muted dark:text-slate-500 mb-3 flex items-center gap-1">
                            <span className="inline-block w-1 h-1 rounded-full bg-blue-400" />
                            First {item.freeQtyLimit} free with any main dish, then {formatCurrency(item.extraRate)}/each
                          </div>
                        )}

                        {/* Quantity + Line Total */}
                        <div className="flex items-center justify-between mt-auto pt-2 border-t border-border dark:border-[#1E2D42]">
                          {/* Quantity Selector */}
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => decrement(item)}
                              disabled={qty === 0}
                              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-150 ${
                                qty === 0
                                  ? 'bg-gray-100 dark:bg-[#1E2D42] text-text-muted cursor-not-allowed'
                                  : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 active:scale-95'
                              }`}
                            >
                              <Minus size={14} />
                            </button>
                            <span className={`w-10 text-center font-bold text-[15px] transition-colors duration-200 ${
                              qty > 0 ? 'text-[#4F46E5] dark:text-indigo-400' : 'text-text-muted'
                            }`}>
                              {qty}
                            </span>
                            <button
                              onClick={() => increment(item)}
                              disabled={qty >= (item.maxQtyPerOrder || 99)}
                              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-150 ${
                                qty >= (item.maxQtyPerOrder || 99)
                                  ? 'bg-gray-100 dark:bg-[#1E2D42] text-text-muted cursor-not-allowed'
                                  : 'bg-indigo-50 dark:bg-indigo-900/20 text-[#4F46E5] dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 active:scale-95'
                              }`}
                            >
                              <Plus size={14} />
                            </button>
                          </div>

                          {/* Line Total */}
                          <div className="text-right">
                            {qty > 0 && (
                              <div className="animate-fade-in">
                                {lineCalc.total === 0 && qty > 0 ? (
                                  <span className="badge-success text-xs font-bold">FREE</span>
                                ) : (
                                  <span className="font-bold text-sm text-[#4F46E5] dark:text-indigo-400">
                                    {formatCurrency(lineCalc.total)}
                                  </span>
                                )}
                              </div>
                            )}
                            {item.maxQtyPerOrder && item.maxQtyPerOrder < 99 && (
                              <p className="text-[10px] text-text-muted mt-0.5">Max {item.maxQtyPerOrder}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ── Order Summary Panel ───────────────────────────── */}
            <div className="space-y-5" id="order-summary-mobile">
              <div className="card sticky top-4">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-[#4F46E5]/10 dark:bg-indigo-900/30 flex items-center justify-center">
                    <ShoppingCart size={18} className="text-[#4F46E5] dark:text-indigo-400" />
                  </div>
                  <h2 className="text-lg font-bold text-text-primary dark:text-white">Order Summary</h2>
                  {totalItems > 0 && (
                    <>
                      <span className="badge-primary text-xs ml-auto">{totalItems} items</span>
                      <button
                        onClick={() => setQuantities({})}
                        className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        title="Clear cart"
                      >
                        <Trash2 size={14} className="text-red-400" />
                      </button>
                    </>
                  )}
                </div>

                {cartItems.length === 0 ? (
                  <div className="text-center py-8">
                    <ShoppingCart size={40} className="mx-auto text-text-muted opacity-30 mb-3" />
                    <p className="text-sm text-text-muted">Your cart is empty</p>
                    <p className="text-xs text-text-muted mt-1">Select items from the menu to get started</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Cart Items */}
                    <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                      {cartItems.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-start justify-between py-2 px-2 rounded-lg bg-bg-main dark:bg-[#0B1222] animate-fade-in"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-text-primary dark:text-white truncate">
                              {item.qty}x {item.itemName}
                            </p>
                            {/* Show free breakdown */}
                            {item.freeQty > 0 && (
                              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">
                                {item.freeQty}x {item.itemName} = FREE
                              </p>
                            )}
                            {item.paidQty > 0 && item.freeQty > 0 && (
                              <p className="text-[11px] text-text-muted mt-0.5">
                                {item.paidQty}x (extra) = {formatCurrency(item.total)}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                            <div className="text-right">
                              {item.total === 0 ? (
                                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">FREE</span>
                              ) : (
                                <span className="text-sm font-bold text-text-primary dark:text-white">
                                  {formatCurrency(item.total)}
                                </span>
                              )}
                            </div>
                            <button
                              onClick={() => setQty(item.id, 0)}
                              className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                              title="Remove"
                            >
                              <X size={12} className="text-red-400" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Separator + Totals */}
                    <div className="border-t border-border dark:border-[#1E2D42] pt-3 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-text-secondary dark:text-slate-400">Subtotal ({totalItems} items)</span>
                        <span className="font-medium text-text-primary dark:text-white">{formatCurrency(totalPayable)}</span>
                      </div>
                      {totalFreeItems > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-emerald-600 dark:text-emerald-400">Free items</span>
                          <span className="font-medium text-emerald-600 dark:text-emerald-400">{totalFreeItems} items</span>
                        </div>
                      )}
                      <div className="flex justify-between text-base pt-2 border-t border-dashed border-border dark:border-[#1E2D42]">
                        <span className="font-bold text-text-primary dark:text-white">Total Payable</span>
                        <span className="font-bold text-[#4F46E5] dark:text-indigo-400 text-lg">
                          {formatCurrency(totalPayable)}
                        </span>
                      </div>
                    </div>

                    {/* Review Order Button */}
                    <button
                      onClick={() => setShowReviewModal(true)}
                      className="btn-primary w-full mt-3 group"
                    >
                      Review Order
                      <ChevronRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  </div>
                )}
              </div>

              {/* ── Monthly Expense Summary ───────────────────────── */}
              {summary && (
                <div className="card animate-fade-in-up">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-[#F59E0B]/10 dark:bg-amber-900/30 flex items-center justify-center">
                      <TrendingUp size={18} className="text-[#F59E0B]" />
                    </div>
                    <h3 className="text-lg font-bold text-text-primary dark:text-white">This Month</h3>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-bg-main dark:bg-[#0B1222]">
                      <div className="flex items-center gap-2">
                        <Receipt size={15} className="text-text-muted" />
                        <span className="text-sm text-text-secondary dark:text-slate-400">Total Spent</span>
                      </div>
                      <span className="font-bold text-lg text-text-primary dark:text-white">
                        {formatCurrency(summary.totalSpent)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-bg-main dark:bg-[#0B1222]">
                      <div className="flex items-center gap-2">
                        <ShoppingCart size={15} className="text-text-muted" />
                        <span className="text-sm text-text-secondary dark:text-slate-400">Orders</span>
                      </div>
                      <span className="font-bold text-text-primary dark:text-white">{summary.totalOrders}</span>
                    </div>
                    {summary.mostOrderedItem && (
                      <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-bg-main dark:bg-[#0B1222]">
                        <div className="flex items-center gap-2">
                          <Star size={15} className="text-[#F59E0B]" />
                          <span className="text-sm text-text-secondary dark:text-slate-400">Most Ordered</span>
                        </div>
                        <span className="font-semibold text-sm text-text-primary dark:text-white truncate max-w-[120px]">
                          {summary.mostOrderedItem}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Ordering Hours with Timer */}
              {orderingWindows.length > 0 && (
                <div className="card animate-fade-in-up">
                  <div className="flex items-center gap-2 mb-3">
                    <Clock size={16} className="text-text-muted" />
                    <h3 className="text-sm font-bold text-text-primary dark:text-white">Ordering Hours</h3>
                  </div>
                  <div className="space-y-2.5">
                    {orderingWindows.map((w: any) => {
                      const now = new Date();
                      const currentHour = now.getHours();
                      const currentMin = now.getMinutes();
                      const isOpen = w.isOpen;

                      let timerText = "";
                      let timerColor = "text-text-muted dark:text-slate-500";

                      if (isOpen) {
                        // Show time remaining until closing
                        const minsLeft = (w.endHour - currentHour - 1) * 60 + (60 - currentMin);
                        if (minsLeft <= 60) {
                          timerText = `Closes in ${minsLeft}m`;
                          timerColor = "text-amber-500";
                        } else {
                          const hrs = Math.floor(minsLeft / 60);
                          timerText = `Closes in ${hrs}h ${minsLeft % 60}m`;
                          timerColor = "text-emerald-500";
                        }
                      } else {
                        // Show when it opens next
                        let hrsUntil = w.startHour - currentHour;
                        if (hrsUntil <= 0) hrsUntil += 24; // next day
                        if (hrsUntil === 1 && currentMin > 0) {
                          timerText = `Opens in ${60 - currentMin}m`;
                        } else if (hrsUntil <= 12) {
                          timerText = `Opens in ${hrsUntil}h`;
                        } else {
                          timerText = `Opens at ${w.start}`;
                        }
                        timerColor = "text-text-muted dark:text-slate-500";
                      }

                      return (
                        <div key={w.mealType} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            {isOpen ? (
                              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                            ) : (
                              <span className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600 shrink-0" />
                            )}
                            <span className={isOpen ? "text-text-primary dark:text-white font-semibold" : "text-text-muted"}>
                              {w.mealType.charAt(0) + w.mealType.slice(1).toLowerCase()}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-text-secondary dark:text-slate-400 font-medium">{w.start} - {w.end}</span>
                            <span className={`text-[10px] font-semibold ${timerColor}`}>{timerText}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Today's Orders */}
              {todayOrders.length > 0 && (
                <div className="card animate-fade-in-up">
                  <div className="flex items-center gap-2 mb-3">
                    <History size={16} className="text-text-muted" />
                    <h3 className="text-sm font-bold text-text-primary dark:text-white">Today&apos;s Orders</h3>
                    <span className="text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-text-muted px-1.5 py-0.5 rounded ml-auto">
                      {todayOrders.length}
                    </span>
                  </div>
                  <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                    {todayOrders.map((order: any, i: number) => {
                      const statusMap: Record<string, { cls: string; label: string }> = {
                        PENDING: { cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300", label: "Pending" },
                        PREPARING: { cls: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300", label: "Preparing" },
                        DELIVERED: { cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300", label: "Delivered" },
                        CANCELLED: { cls: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300", label: "Cancelled" },
                      };
                      const s = statusMap[order.status] || statusMap.PENDING;
                      return (
                        <div key={order.id || i} className="flex items-center justify-between py-2 px-2.5 rounded-lg bg-slate-50 dark:bg-[#0B1222] text-xs">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-text-primary dark:text-white truncate">
                              {order.quantity}x {order.itemName}
                            </p>
                            <p className="text-text-muted">{order.mealType?.charAt(0) + order.mealType?.slice(1).toLowerCase()}</p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${s.cls}`}>{s.label}</span>
                            <span className="font-bold text-text-primary dark:text-white">{formatCurrency(order.totalAmount)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Recent Order History (7 days) */}
              {recentOrders.length > 0 && (
                <div className="card animate-fade-in-up">
                  <div className="flex items-center gap-2 mb-3">
                    <History size={16} className="text-text-muted" />
                    <h3 className="text-sm font-bold text-text-primary dark:text-white">Order History (7 days)</h3>
                  </div>
                  <div className="space-y-1.5 max-h-[250px] overflow-y-auto">
                    {recentOrders.map((order: any, i: number) => {
                      const statusMap: Record<string, { cls: string; label: string }> = {
                        PENDING: { cls: "bg-amber-100 text-amber-700", label: "Pending" },
                        PREPARING: { cls: "bg-blue-100 text-blue-700", label: "Preparing" },
                        DELIVERED: { cls: "bg-emerald-100 text-emerald-700", label: "Delivered" },
                        CANCELLED: { cls: "bg-red-100 text-red-700", label: "Cancelled" },
                      };
                      const s = statusMap[order.status] || statusMap.PENDING;
                      const date = new Date(order.orderDate || order.createdAt);
                      return (
                        <div key={order.id || i} className="flex items-center justify-between py-2 px-2.5 rounded-lg bg-slate-50 dark:bg-[#0B1222] text-xs">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-text-primary dark:text-white truncate">
                              {order.quantity}x {order.itemName}
                            </p>
                            <p className="text-text-muted">{date.toLocaleDateString("en-PK", { day: "numeric", month: "short" })}</p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${s.cls}`}>{s.label}</span>
                            <span className="font-bold text-text-primary dark:text-white">{formatCurrency(order.totalAmount)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Review Order Modal ──────────────────────────────────────── */}
      <Modal
        isOpen={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        title="Review Your Order"
        maxWidth="max-w-[520px]"
      >
        <div className="space-y-4">
          {/* Items list */}
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {cartItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-bg-main dark:bg-[#0B1222]"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-text-primary dark:text-white">
                      {item.qty}x {item.itemName}
                    </span>
                    <CategoryBadge category={item.category} />
                  </div>
                  {item.freeQty > 0 && item.paidQty > 0 && (
                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1">
                      {item.freeQty} free + {item.paidQty} extra
                    </p>
                  )}
                  {item.freeQty > 0 && item.paidQty === 0 && (
                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1">
                      All {item.freeQty} free
                    </p>
                  )}
                </div>
                <div className="text-right flex-shrink-0 ml-3">
                  {item.total === 0 ? (
                    <span className="badge-success text-xs font-bold">FREE</span>
                  ) : (
                    <span className="font-bold text-sm text-text-primary dark:text-white">
                      {formatCurrency(item.total)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="border-t border-border dark:border-[#1E2D42] pt-3 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-text-secondary dark:text-slate-400">Total Items</span>
              <span className="font-medium">{totalItems}</span>
            </div>
            {totalFreeItems > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-emerald-600 dark:text-emerald-400">Free Items</span>
                <span className="font-medium text-emerald-600 dark:text-emerald-400">{totalFreeItems}</span>
              </div>
            )}
            <div className="flex justify-between items-center pt-2 border-t border-dashed border-border dark:border-[#1E2D42]">
              <span className="text-base font-bold text-text-primary dark:text-white">Total Payable</span>
              <span className="text-xl font-bold text-[#4F46E5] dark:text-indigo-400">
                {formatCurrency(totalPayable)}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <button
              onClick={() => setShowReviewModal(false)}
              className="btn-secondary flex-1 !text-xs sm:!text-sm !py-2"
            >
              Go Back & Edit
            </button>
            <button
              onClick={submitOrder}
              disabled={submitting}
              className="btn-success flex-1 relative !text-xs sm:!text-sm !py-2"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Placing...
                </>
              ) : (
                <>
                  <CheckCircle size={18} />
                  Confirm & Place Order
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
