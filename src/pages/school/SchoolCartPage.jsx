import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { cartApi, usersApi } from '../../api/endpoints';

// Helper: compute duration days between two date strings
function daysBetween(d1, d2) {
  if (!d1 || !d2) return 0;
  return Math.max(0, (new Date(d2) - new Date(d1)) / (1000 * 60 * 60 * 24));
}

export default function SchoolCartPage() {
  const navigate = useNavigate();

  // ── Server-side cart state ──────────────────────────────────────────────────
  const [cart, setCart] = useState(null);   // full CartRead object
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [nonFieldErrors, setNonFieldErrors] = useState([]);

  // ── Transport toggle ────────────────────────────────────────────────────────
  const [requiresTransport, setRequiresTransport] = useState(false);
  const [transportFee, setTransportFee] = useState(0);
  const [schoolProfile, setSchoolProfile] = useState(null);
  const [updatingTransport, setUpdatingTransport] = useState(false);

  // ── Local removal/update in-flight tracking ─────────────────────────────────
  const [busyItems, setBusyItems] = useState(new Set());

  const markBusy = (id) => setBusyItems((s) => new Set([...s, id]));
  const markIdle = (id) => setBusyItems((s) => { const n = new Set(s); n.delete(id); return n; });

  // Fetch cart + school profile on mount
  const fetchCart = useCallback(async () => {
    try {
      const [cartRes, profileRes] = await Promise.all([
        cartApi.get(),
        usersApi.mySchoolProfile(),
      ]);
      const cartData = cartRes?.data ?? cartRes;
      const profile  = profileRes?.data ?? profileRes;
      setCart(cartData);
      setSchoolProfile(profile);
      setRequiresTransport(cartData?.requires_transport ?? false);
      // transport fee from school's assigned zone
      const fee = parseFloat(profile?.transport_zone_details?.base_transport_fee ?? profile?.transport_zone_fee ?? 0);
      setTransportFee(fee);
    } catch (err) {
      console.error('Failed to load cart:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCart(); }, [fetchCart]);

  // ── Transport toggle handler ────────────────────────────────────────────────
  const handleTransportToggle = async () => {
    const next = !requiresTransport;
    setRequiresTransport(next);
    setUpdatingTransport(true);
    try {
      const res = await cartApi.patch({ requires_transport: next });
      setCart(res?.data ?? res);
    } catch {
      // revert on error
      setRequiresTransport(!next);
    } finally {
      setUpdatingTransport(false);
    }
  };

  // ── Remove item ─────────────────────────────────────────────────────────────
  const handleRemoveItem = async (itemId) => {
    markBusy(itemId);
    try {
      await cartApi.removeItem(itemId);
      await fetchCart();
    } catch {
      alert('Failed to remove item.');
    } finally {
      markIdle(itemId);
    }
  };

  // ── Update quantity ─────────────────────────────────────────────────────────
  const handleUpdateQty = async (itemId, newQty) => {
    if (newQty < 1) {
      return handleRemoveItem(itemId);
    }
    markBusy(itemId);
    try {
      await cartApi.updateItem(itemId, { quantity: newQty });
      await fetchCart();
    } catch {
      alert('Failed to update quantity.');
    } finally {
      markIdle(itemId);
    }
  };

  // ── Checkout ────────────────────────────────────────────────────────────────
  const handleCheckout = async () => {
    setErrors({});
    setNonFieldErrors([]);
    setCheckoutLoading(true);
    try {
      const res = await cartApi.checkout();
      const booking = res?.data ?? res;
      if (booking?.id) {
        navigate(`/school/bookings/${booking.id}`);
      } else {
        navigate('/school/bookings');
      }
    } catch (err) {
      if (err?.errors) {
        const { non_field_errors, ...fieldErrors } = err.errors;
        setErrors(fieldErrors || {});
        setNonFieldErrors(non_field_errors || []);
      } else {
        setNonFieldErrors([err?.message || 'Checkout failed. Please try again.']);
      }
    } finally {
      setCheckoutLoading(false);
    }
  };

  // ── Loading skeleton ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-7 bg-gray-200 rounded w-48" />
        <div className="h-40 bg-gray-200 rounded-xl" />
        <div className="h-40 bg-gray-200 rounded-xl" />
      </div>
    );
  }

  const items = cart?.items ?? [];
  const pickupDate = cart?.pickup_date;
  const returnDate = cart?.return_date;
  const days = daysBetween(pickupDate, returnDate);

  if (items.length === 0) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Cart &amp; Checkout</h1>
        <p className="text-sm text-gray-500 mb-8">
          Review your items before placing a booking request.
        </p>
        <div className="text-center py-20">
          <h3 className="text-gray-700 font-semibold mb-1">Your cart is empty</h3>
          <p className="text-sm text-gray-400 mb-5">
            Browse the catalog and add equipment to get started.
          </p>
          <Link
            to="/school/catalog"
            className="inline-block px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
          >
            Browse Equipment
          </Link>
        </div>
      </div>
    );
  }

  // Totals
  const rentalTotal = items.reduce((sum, item) => {
    const pricePerDay = parseFloat(item.equipment?.unit_price_per_day ?? item.unit_price ?? 0);
    return sum + pricePerDay * item.quantity * days;
  }, 0);

  const personnelTotal = items.reduce((sum, item) => {
    if (!item.equipment?.requires_personnel) return sum;
    const costPerDay = parseFloat(item.equipment?.personnel_cost_per_day ?? 0);
    return sum + costPerDay * item.quantity * days;
  }, 0);

  const deliveryTotal = requiresTransport ? transportFee : 0;
  const grandTotal = rentalTotal + personnelTotal + deliveryTotal;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Cart &amp; Checkout</h1>
      <p className="text-sm text-gray-500 mb-6">
        Review your items before placing a booking request.
      </p>

      {nonFieldErrors.length > 0 && (
        <div className="mb-4 space-y-1">
          {nonFieldErrors.map((e, i) => (
            <div
              key={i}
              className="px-4 py-2.5 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg"
            >
              {e}
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Cart items */}
        <div className="lg:col-span-2 space-y-4">
          {/* Date banner */}
          {pickupDate && returnDate && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-center gap-4 text-sm">
              <div>
                <span className="text-blue-600 font-medium">Pickup:</span>{' '}
                <span className="text-gray-800">{pickupDate}</span>
              </div>
              <span className="text-gray-400">→</span>
              <div>
                <span className="text-blue-600 font-medium">Return:</span>{' '}
                <span className="text-gray-800">{returnDate}</span>
              </div>
              <span className="ml-auto text-gray-600">
                {days} day{days !== 1 ? 's' : ''}
              </span>
            </div>
          )}

          {/* Items list */}
          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
            {items.map((item) => {
              const eq = item.equipment ?? {};
              const primaryImage = eq.images?.find((img) => img.is_primary) || eq.images?.[0];
              const pricePerDay = parseFloat(eq.unit_price_per_day ?? item.unit_price ?? 0);
              const subtotal = pricePerDay * item.quantity * days;
              const isBusy = busyItems.has(item.id);

              return (
                <div key={item.id} className={`flex items-center gap-4 px-4 py-3 ${isBusy ? 'opacity-50' : ''}`}>
                  <div className="w-14 h-14 rounded-lg bg-gray-100 overflow-hidden shrink-0 flex items-center justify-center">
                    {primaryImage ? (
                      <img src={primaryImage.image_url} alt={eq.equipment_name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-2xl text-gray-300">—</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm truncate">{eq.equipment_name}</p>
                    <p className="text-xs text-gray-500">
                      KES {pricePerDay.toLocaleString()} / day
                    </p>
                    {eq.requires_personnel && (
                      <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-800">
                        Technician Required
                      </span>
                    )}
                  </div>
                  {/* Quantity stepper */}
                  <div className="flex items-center gap-1.5">
                    <button
                      disabled={isBusy}
                      onClick={() => handleUpdateQty(item.id, item.quantity - 1)}
                      className="w-7 h-7 border border-gray-300 rounded text-gray-600 hover:bg-gray-50 flex items-center justify-center text-lg leading-none disabled:opacity-40"
                    >
                      −
                    </button>
                    <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                    <button
                      disabled={isBusy}
                      onClick={() => handleUpdateQty(item.id, item.quantity + 1)}
                      className="w-7 h-7 border border-gray-300 rounded text-gray-600 hover:bg-gray-50 flex items-center justify-center text-lg leading-none disabled:opacity-40"
                    >
                      +
                    </button>
                  </div>
                  <div className="text-right w-28 shrink-0">
                    <p className="font-semibold text-sm text-gray-900">
                      KES {subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-gray-400">{item.quantity} × {days}d</p>
                  </div>
                  <button
                    disabled={isBusy}
                    onClick={() => handleRemoveItem(item.id)}
                    className="ml-1 text-gray-400 hover:text-red-500 p-1 disabled:opacity-40"
                    title="Remove"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              );
            })}
          </div>

          {/* Delivery toggle */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">Request Delivery</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {requiresTransport
                    ? `Delivery fee: KES ${transportFee.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                    : 'Toggle on to have equipment delivered to your school.'}
                </p>
                {requiresTransport && !transportFee && (
                  <p className="text-xs text-amber-600 mt-0.5">
                    No transport zone assigned — contact admin.
                  </p>
                )}
              </div>
              <button
                onClick={handleTransportToggle}
                disabled={updatingTransport}
                className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none disabled:opacity-50 ${
                  requiresTransport ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                    requiresTransport ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
            {!requiresTransport && (
              <p className="mt-2 text-xs text-gray-400">Self-Pickup selected.</p>
            )}
          </div>
        </div>

        {/* Right: Order summary */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Order Summary</h3>
            <div className="space-y-2 text-sm mb-4">
              {items.map((item) => {
                const eq = item.equipment ?? {};
                const pricePerDay = parseFloat(eq.unit_price_per_day ?? item.unit_price ?? 0);
                const lineTotal = pricePerDay * item.quantity * days;
                return (
                  <div key={item.id} className="flex justify-between text-gray-600 gap-2">
                    <span className="truncate flex-1">{eq.equipment_name} ×{item.quantity}</span>
                    <span className="shrink-0">
                      KES {lineTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                );
              })}
              {personnelTotal > 0 && (
                <div className="flex justify-between text-amber-700 gap-2">
                  <span className="flex-1">Personnel</span>
                  <span>KES {personnelTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              {requiresTransport && (
                <div className="flex justify-between text-blue-700 gap-2">
                  <span className="flex-1">Transport</span>
                  <span>KES {deliveryTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
              )}
            </div>
            <div className="border-t border-gray-100 pt-3 flex justify-between font-semibold text-gray-900">
              <span>Total (est.)</span>
              <span>KES {grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">For {days} day{days !== 1 ? 's' : ''}</p>
          </div>

          <button
            onClick={handleCheckout}
            disabled={checkoutLoading || items.length === 0}
            className="w-full px-4 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {checkoutLoading ? 'Processing…' : 'Place Booking Request'}
          </button>

          <Link
            to="/school/catalog"
            className="block text-center text-sm text-gray-500 hover:text-gray-800"
          >
            ← Continue Browsing
          </Link>
        </div>
      </div>
    </div>
  );
}
