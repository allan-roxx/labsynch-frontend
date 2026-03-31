import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useCartStore from '../../store/cartStore';
import { bookingsApi } from '../../api/endpoints';

export default function SchoolCartPage() {
  const navigate = useNavigate();
  const { items, pickupDate, returnDate, removeItem, updateQuantity, clearCart, totalDays, totalAmount } =
    useCartStore();

  const days = totalDays();
  const total = totalAmount();

  const [specialInstructions, setSpecialInstructions] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [nonFieldErrors, setNonFieldErrors] = useState([]);

  const handlePlaceBooking = async () => {
    setErrors({});
    setNonFieldErrors([]);

    if (items.length === 0) {
      setNonFieldErrors(['Your cart is empty.']);
      return;
    }
    if (!pickupDate || !returnDate) {
      setNonFieldErrors([
        'Please set pickup and return dates by selecting equipment details first.',
      ]);
      return;
    }

    setLoading(true);
    try {
      const payload = {
        pickup_date: pickupDate,
        return_date: returnDate,
        special_instructions: specialInstructions,
        items: items.map((i) => ({ equipment: i.equipment.id, quantity: i.quantity })),
      };
      const res = await bookingsApi.create(payload);
      const booking = res?.data ?? res;
      clearCart();
      // Navigate to booking detail if we got an id back, otherwise list
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
        setNonFieldErrors([err?.message || 'Failed to place booking. Please try again.']);
      }
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Cart & Checkout</h1>
        <p className="text-sm text-gray-500 mb-8">
          Review your items before placing a booking request.
        </p>
        <div className="text-center py-20">
          <div className="text-5xl mb-4">🛒</div>
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

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Cart & Checkout</h1>
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
        {/* Left: Cart items + special instructions */}
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
            {items.map(({ equipment, quantity }) => {
              const subtotal = parseFloat(equipment.unit_price_per_day) * quantity * days;
              const primaryImage =
                equipment.images?.find((img) => img.is_primary) || equipment.images?.[0];
              return (
                <div key={equipment.id} className="flex items-center gap-4 px-4 py-3">
                  <div className="w-14 h-14 rounded-lg bg-gray-100 overflow-hidden shrink-0 flex items-center justify-center">
                    {primaryImage ? (
                      <img
                        src={primaryImage.image_url}
                        alt={equipment.equipment_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-2xl text-gray-300">🔬</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm truncate">
                      {equipment.equipment_name}
                    </p>
                    <p className="text-xs text-gray-500">
                      KES {parseFloat(equipment.unit_price_per_day).toLocaleString()} / day
                    </p>
                  </div>
                  {/* Quantity stepper */}
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() =>
                        quantity > 1
                          ? updateQuantity(equipment.id, quantity - 1)
                          : removeItem(equipment.id)
                      }
                      className="w-7 h-7 border border-gray-300 rounded text-gray-600 hover:bg-gray-50 flex items-center justify-center text-lg leading-none"
                    >
                      −
                    </button>
                    <span className="w-6 text-center text-sm font-medium">{quantity}</span>
                    <button
                      onClick={() =>
                        updateQuantity(
                          equipment.id,
                          Math.min(equipment.available_quantity, quantity + 1),
                        )
                      }
                      className="w-7 h-7 border border-gray-300 rounded text-gray-600 hover:bg-gray-50 flex items-center justify-center text-lg leading-none"
                    >
                      +
                    </button>
                  </div>
                  <div className="text-right w-28 shrink-0">
                    <p className="font-semibold text-sm text-gray-900">
                      KES {subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-gray-400">
                      {quantity} × {days}d
                    </p>
                  </div>
                  <button
                    onClick={() => removeItem(equipment.id)}
                    className="ml-1 text-gray-400 hover:text-red-500 p-1"
                    title="Remove"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              );
            })}
          </div>

          {/* Special instructions */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Special Instructions{' '}
              <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
              rows={3}
              placeholder="e.g. Handle with care — fragile equipment, deliver to Lab Block A…"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
            {errors.special_instructions && (
              <p className="text-red-600 text-xs mt-1">{errors.special_instructions[0]}</p>
            )}
          </div>
        </div>

        {/* Right: Order summary */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Order Summary</h3>
            <div className="space-y-2 text-sm mb-4">
              {items.map(({ equipment, quantity }) => (
                <div key={equipment.id} className="flex justify-between text-gray-600 gap-2">
                  <span className="truncate flex-1">
                    {equipment.equipment_name} ×{quantity}
                  </span>
                  <span className="shrink-0">
                    KES{' '}
                    {(
                      parseFloat(equipment.unit_price_per_day) *
                      quantity *
                      days
                    ).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              ))}
            </div>
            <div className="border-t border-gray-100 pt-3 flex justify-between font-semibold text-gray-900">
              <span>Total</span>
              <span>
                KES {total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              For {days} day{days !== 1 ? 's' : ''}
            </p>
          </div>

          <button
            onClick={handlePlaceBooking}
            disabled={loading || items.length === 0}
            className="w-full px-4 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Placing Booking…' : 'Place Booking Request'}
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
