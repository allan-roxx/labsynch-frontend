import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { equipmentApi, cartApi } from '../../api/endpoints';

function ConditionBadge({ condition }) {
  const map = {
    NEW: 'bg-green-100 text-green-800',
    GOOD: 'bg-blue-100 text-blue-800',
    FAIR: 'bg-yellow-100 text-yellow-800',
    NEEDS_MAINTENANCE: 'bg-red-100 text-red-800',
  };
  const labels = { NEW: 'New', GOOD: 'Good', FAIR: 'Fair', NEEDS_MAINTENANCE: 'Needs Maintenance' };
  return (
    <span
      className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${map[condition] || 'bg-gray-100 text-gray-700'}`}
    >
      {labels[condition] || condition}
    </span>
  );
}

export default function SchoolEquipmentDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [equipment, setEquipment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [pickupDate, setPickupDate] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [availability, setAvailability] = useState(null);
  const [checkingAvail, setCheckingAvail] = useState(false);
  const [availError, setAvailError] = useState('');
  const [addingToCart, setAddingToCart] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        // Also fetch current cart dates to pre-populate
        const [eqRes, cartRes] = await Promise.all([
          equipmentApi.retrieve(id),
          cartApi.get().catch(() => null),
        ]);
        const data = eqRes?.data ?? eqRes;
        setEquipment(data);
        const primary = data.images?.find((img) => img.is_primary) || data.images?.[0];
        setSelectedImage(primary?.image_url || null);

        // Pre-populate from server cart if set
        const cart = cartRes?.data ?? cartRes;
        if (cart?.pickup_date) setPickupDate(cart.pickup_date);
        if (cart?.return_date) setReturnDate(cart.return_date);
      } catch {
        setEquipment(null);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  const totalDays = (() => {
    if (!pickupDate || !returnDate) return 0;
    return Math.max(0, (new Date(returnDate) - new Date(pickupDate)) / (1000 * 60 * 60 * 24));
  })();

  const rentalEstimate = equipment
    ? totalDays * quantity * parseFloat(equipment.unit_price_per_day || 0)
    : 0;

  const personnelEstimate = equipment?.requires_personnel
    ? totalDays * quantity * parseFloat(equipment.personnel_cost_per_day || 0)
    : 0;

  const handleCheckAvailability = async () => {
    if (!pickupDate || !returnDate) {
      setAvailError('Please select pickup and return dates.');
      return;
    }
    setAvailError('');
    setCheckingAvail(true);
    try {
      const res = await equipmentApi.checkAvailability(id, {
        pickup_date: pickupDate,
        return_date: returnDate,
      });
      setAvailability(res?.data ?? res);
    } catch (err) {
      setAvailError(err?.message || 'Availability check failed.');
    } finally {
      setCheckingAvail(false);
    }
  };

  const handleAddToCart = async () => {
    if (!pickupDate || !returnDate) {
      setAvailError('Please select pickup and return dates before adding to cart.');
      return;
    }
    if (totalDays <= 0) {
      setAvailError('Return date must be after pickup date.');
      return;
    }
    setAvailError('');
    setAddingToCart(true);
    try {
      // Set dates on the server cart first
      await cartApi.patch({ pickup_date: pickupDate, return_date: returnDate });
      // Add/update item
      await cartApi.addItem({ equipment: equipment.id, quantity });
      setAddedToCart(true);
      setTimeout(() => navigate('/school/cart'), 1200);
    } catch (err) {
      const msg =
        err?.errors?.non_field_errors?.[0] ??
        err?.message ??
        'Failed to add to cart. Please try again.';
      setAvailError(msg);
    } finally {
      setAddingToCart(false);
    }
  };

  const today = new Date().toISOString().split('T')[0];

  if (loading) {
    return (
      <div className="animate-pulse space-y-5">
        <div className="h-5 bg-gray-200 rounded w-1/3 mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="h-80 bg-gray-200 rounded-xl" />
          <div className="space-y-3">
            <div className="h-8 bg-gray-200 rounded w-2/3" />
            <div className="h-4 bg-gray-200 rounded w-1/2" />
            <div className="h-4 bg-gray-200 rounded w-full" />
            <div className="h-4 bg-gray-200 rounded w-3/4" />
          </div>
        </div>
      </div>
    );
  }

  if (!equipment) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500">Equipment not found.</p>
        <Link to="/school/catalog" className="mt-4 inline-block text-blue-600 hover:underline text-sm">
          ← Back to Catalog
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-500 mb-6 flex items-center gap-1">
        <Link to="/school" className="hover:text-gray-800">Dashboard</Link>
        <span>/</span>
        <Link to="/school/catalog" className="hover:text-gray-800">Browse Equipment</Link>
        <span>/</span>
        <span className="text-gray-800 font-medium truncate">{equipment.equipment_name}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Image gallery */}
        <div>
          <div className="h-72 md:h-80 bg-gray-100 rounded-xl overflow-hidden mb-3 flex items-center justify-center">
            {selectedImage ? (
              <img
                src={selectedImage}
                alt={equipment.equipment_name}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-gray-300 text-6xl">—</span>
            )}
          </div>
          {equipment.images?.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {equipment.images.map((img) => (
                <button
                  key={img.id}
                  onClick={() => setSelectedImage(img.image_url)}
                  className={`shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${selectedImage === img.image_url
                    ? 'border-blue-500'
                    : 'border-transparent hover:border-gray-300'
                    }`}
                >
                  <img src={img.image_url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info + booking panel */}
        <div>
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
              {equipment.category?.category_name}
            </span>
            <ConditionBadge condition={equipment.condition} />
            {equipment.requires_personnel && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                Technician Required
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">{equipment.equipment_name}</h1>
          <p className="text-xs text-gray-400 mb-3">Code: {equipment.equipment_code}</p>
          <p className="text-gray-600 text-sm mb-5 leading-relaxed">
            {equipment.description || 'No description available.'}
          </p>

          {/* Personnel info */}
          {equipment.requires_personnel && equipment.personnel_description && (
            <div className="mb-4 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm">
              <p className="font-medium text-amber-800 mb-1">Technician Details</p>
              <p className="text-amber-700">{equipment.personnel_description}</p>
              {parseFloat(equipment.personnel_cost_per_day) > 0 && (
                <p className="text-amber-700 mt-1">
                  Cost:{' '}
                  <strong>KES {parseFloat(equipment.personnel_cost_per_day).toLocaleString()} / day</strong>
                </p>
              )}
            </div>
          )}

          <div className="flex items-center gap-6 mb-5 text-sm">
            <div>
              <p className="text-xs text-gray-500">Daily Rate</p>
              <p className="text-xl font-bold text-gray-900">
                KES {parseFloat(equipment.unit_price_per_day).toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Available</p>
              <p
                className={`font-semibold ${equipment.available_quantity > 0 ? 'text-green-700' : 'text-red-600'
                  }`}
              >
                {equipment.available_quantity} / {equipment.total_quantity} units
              </p>
            </div>
            {equipment.storage_location && (
              <div>
                <p className="text-xs text-gray-500">Location</p>
                <p className="font-medium text-gray-700">{equipment.storage_location}</p>
              </div>
            )}
          </div>

          {/* Date + Quantity selector */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3 mb-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Pickup Date</label>
                <input
                  type="date"
                  min={today}
                  value={pickupDate}
                  onChange={(e) => { setPickupDate(e.target.value); setAvailability(null); }}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Return Date</label>
                <input
                  type="date"
                  min={pickupDate || today}
                  value={returnDate}
                  onChange={(e) => { setReturnDate(e.target.value); setAvailability(null); }}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Quantity</label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="w-8 h-8 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 flex items-center justify-center text-lg leading-none"
                  >
                    −
                  </button>
                  <span className="w-8 text-center font-semibold text-sm">{quantity}</span>
                  <button
                    onClick={() => setQuantity((q) => Math.min(equipment.available_quantity, q + 1))}
                    className="w-8 h-8 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 flex items-center justify-center text-lg leading-none"
                  >
                    +
                  </button>
                </div>
              </div>
              {totalDays > 0 && (
                <div className="ml-auto text-right">
                  <p className="text-xs text-gray-500">{totalDays} day{totalDays !== 1 ? 's' : ''}</p>
                  <p className="font-bold text-gray-900">
                    KES{' '}
                    {rentalEstimate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  {personnelEstimate > 0 && (
                    <p className="text-xs text-amber-700">
                      + KES {personnelEstimate.toLocaleString(undefined, { minimumFractionDigits: 2 })} personnel
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Errors */}
          {availError && (
            <div className="mb-3 px-4 py-2.5 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
              {availError}
            </div>
          )}

          {/* Availability result */}
          {availability && (
            <div
              className={`mb-3 px-4 py-3 rounded-lg text-sm font-medium ${availability.available_quantity > 0
                ? 'bg-green-50 text-green-800'
                : 'bg-red-50 text-red-800'
                }`}
            >
              {availability.available_quantity > 0
                ? `Available — ${availability.available_quantity} units ready for those dates.`
                : 'Not available for the selected dates. Please choose different dates.'}
            </div>
          )}

          {/* Success flash */}
          {addedToCart && (
            <div className="mb-3 px-4 py-2.5 bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg">
              Added to cart! Redirecting…
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-3 mb-2">
            <button
              onClick={handleCheckAvailability}
              disabled={checkingAvail || !pickupDate || !returnDate}
              className="flex-1 px-4 py-2.5 border border-blue-600 text-blue-600 text-sm font-medium rounded-lg hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {checkingAvail ? 'Checking…' : 'Check Availability'}
            </button>
            <button
              onClick={handleAddToCart}
              disabled={equipment.available_quantity === 0 || addingToCart || addedToCart}
              className="flex-1 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {addingToCart ? 'Adding…' : addedToCart ? 'Added!' : 'Add to Cart'}
            </button>
          </div>
          <button
            onClick={() => navigate('/school/cart')}
            className="w-full px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-800 transition-colors"
          >
            View Cart &amp; Checkout
          </button>
        </div>
      </div>
    </div>
  );
}
