'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/dashboard-layout';
import { formatCurrency } from '@/lib/utils';
import { UtensilsCrossed, Plus, Minus, ShoppingCart, Trash2 } from 'lucide-react';

interface MenuItem {
  id: string;
  name: string;
  rate: number;
  mealType: string;
  available: boolean;
}

interface CartItem {
  menuItemId: string;
  name: string;
  rate: number;
  quantity: number;
}

interface FoodSummary {
  totalOrders: number;
  totalSpent: number;
}

export default function FoodOrderingPage() {
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [summary, setSummary] = useState<FoodSummary | null>(null);
  const [orderSuccess, setOrderSuccess] = useState(false);

  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const res = await fetch('/api/portal/food');
        if (res.ok) {
          const data = await res.json();
          setMenu(data.menu || []);
          setSummary(data.summary || null);
        }
      } catch (error) {
        console.error('Failed to fetch menu:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchMenu();
  }, []);

  const addToCart = (item: MenuItem) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.menuItemId === item.id);
      if (existing) {
        return prev.map((c) =>
          c.menuItemId === item.id ? { ...c, quantity: c.quantity + 1 } : c
        );
      }
      return [...prev, { menuItemId: item.id, name: item.name, rate: item.rate, quantity: 1 }];
    });
  };

  const updateQuantity = (menuItemId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((c) =>
          c.menuItemId === menuItemId ? { ...c, quantity: Math.max(0, c.quantity + delta) } : c
        )
        .filter((c) => c.quantity > 0)
    );
  };

  const removeFromCart = (menuItemId: string) => {
    setCart((prev) => prev.filter((c) => c.menuItemId !== menuItemId));
  };

  const cartTotal = cart.reduce((sum, c) => sum + c.rate * c.quantity, 0);

  const submitOrder = async () => {
    if (cart.length === 0) return;
    setSubmitting(true);
    setOrderSuccess(false);
    try {
      const res = await fetch('/api/portal/food', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart.map((c) => ({
            menuItemId: c.menuItemId,
            quantity: c.quantity,
          })),
        }),
      });
      if (res.ok) {
        setCart([]);
        setOrderSuccess(true);
        // Refresh summary
        const menuRes = await fetch('/api/portal/food');
        if (menuRes.ok) {
          const data = await menuRes.json();
          setSummary(data.summary || null);
        }
      }
    } catch (error) {
      console.error('Failed to submit order:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const mealTypes = ['BREAKFAST', 'LUNCH', 'DINNER'];
  const groupedMenu: Record<string, MenuItem[]> = {};
  mealTypes.forEach((type) => {
    const items = menu.filter((item) => item.mealType === type);
    if (items.length > 0) {
      groupedMenu[type] = items;
    }
  });

  const getCartQuantity = (menuItemId: string) => {
    const item = cart.find((c) => c.menuItemId === menuItemId);
    return item?.quantity || 0;
  };

  return (
    <DashboardLayout title="Food Ordering" hostelId="">
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <UtensilsCrossed size={28} className="text-green-600" />
          <h1 className="page-title">Food Ordering</h1>
        </div>

        {orderSuccess && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
            Order placed successfully!
          </div>
        )}

        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading menu...</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Menu Section */}
            <div className="lg:col-span-2 space-y-6">
              {Object.entries(groupedMenu).length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  No menu items available today
                </div>
              ) : (
                Object.entries(groupedMenu).map(([mealType, items]) => (
                  <div key={mealType} className="card">
                    <h2 className="section-title mb-4 capitalize">
                      {mealType.toLowerCase()}
                    </h2>
                    <div className="space-y-3">
                      {items.map((item) => {
                        const qty = getCartQuantity(item.id);
                        return (
                          <div
                            key={item.id}
                            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                          >
                            <div>
                              <h4 className="font-medium text-gray-900">{item.name}</h4>
                              <p className="text-sm text-green-600 font-semibold">
                                {formatCurrency(item.rate)}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              {qty > 0 ? (
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => updateQuantity(item.id, -1)}
                                    className="p-1 rounded-full bg-gray-200 hover:bg-gray-300"
                                  >
                                    <Minus size={16} />
                                  </button>
                                  <span className="w-8 text-center font-semibold">{qty}</span>
                                  <button
                                    onClick={() => updateQuantity(item.id, 1)}
                                    className="p-1 rounded-full bg-indigo-100 hover:bg-indigo-200 text-indigo-600"
                                  >
                                    <Plus size={16} />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => addToCart(item)}
                                  disabled={!item.available}
                                  className="btn-primary text-sm flex items-center gap-1"
                                >
                                  <Plus size={14} />
                                  Add
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Cart & Summary */}
            <div className="space-y-6">
              {/* Cart */}
              <div className="card sticky top-4">
                <h2 className="section-title mb-4 flex items-center gap-2">
                  <ShoppingCart size={20} />
                  Order Summary
                </h2>
                {cart.length === 0 ? (
                  <p className="text-gray-400 text-center py-4">Your cart is empty</p>
                ) : (
                  <div className="space-y-3">
                    {cart.map((item) => (
                      <div key={item.menuItemId} className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{item.name}</p>
                          <p className="text-xs text-gray-500">
                            {formatCurrency(item.rate)} x {item.quantity}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm">
                            {formatCurrency(item.rate * item.quantity)}
                          </span>
                          <button
                            onClick={() => removeFromCart(item.menuItemId)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                    <div className="flex justify-between pt-3 border-t font-bold">
                      <span>Total</span>
                      <span>{formatCurrency(cartTotal)}</span>
                    </div>
                    <button
                      onClick={submitOrder}
                      disabled={submitting}
                      className="btn-primary w-full mt-2"
                    >
                      {submitting ? 'Placing Order...' : 'Submit Order'}
                    </button>
                  </div>
                )}
              </div>

              {/* Monthly Summary */}
              {summary && (
                <div className="card">
                  <h3 className="section-title mb-4">Monthly Food Expense</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Total Orders</span>
                      <span className="font-semibold">{summary.totalOrders}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Total Spent</span>
                      <span className="font-bold text-lg">{formatCurrency(summary.totalSpent)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
