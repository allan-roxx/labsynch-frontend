import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { equipmentApi, equipmentCategoriesApi, cartApi } from '../../api/endpoints';

function ConditionBadge({ condition }) {
  const map = {
    NEW: 'bg-green-100 text-green-800',
    GOOD: 'bg-blue-100 text-blue-800',
    FAIR: 'bg-yellow-100 text-yellow-800',
    NEEDS_MAINTENANCE: 'bg-red-100 text-red-800',
  };
  const labels = { NEW: 'New', GOOD: 'Good', FAIR: 'Fair', NEEDS_MAINTENANCE: 'Needs Maintenance' };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${map[condition] || 'bg-gray-100 text-gray-700'}`}>
      {labels[condition] || condition}
    </span>
  );
}

function EquipmentCard({ equipment }) {
  const navigate = useNavigate();
  const primaryImage = equipment.images?.find((img) => img.is_primary) || equipment.images?.[0];
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow duration-200 flex flex-col">
      <div className="h-44 bg-gray-100 flex items-center justify-center overflow-hidden relative">
        {primaryImage ? (
          <img
            src={primaryImage.image_url}
            alt={equipment.equipment_name}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-gray-300 text-5xl">—</span>
        )}
        {equipment.requires_personnel && (
          <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-400 text-amber-900">
            Technician
          </span>
        )}
      </div>
      <div className="p-4 flex flex-col flex-1">
        <p className="text-xs text-gray-500 mb-1">{equipment.category?.category_name}</p>
        <h3 className="font-semibold text-gray-900 text-sm leading-snug mb-2 flex-1">
          {equipment.equipment_name}
        </h3>
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <ConditionBadge condition={equipment.condition} />
          <span
            className={`text-xs ${equipment.available_quantity > 0 ? 'text-green-700' : 'text-red-600'
              }`}
          >
            {equipment.available_quantity > 0
              ? `${equipment.available_quantity} available`
              : 'Unavailable'}
          </span>
        </div>
        <div className="flex items-center justify-between mt-auto">
          <div>
            <span className="font-bold text-gray-900 text-sm">
              KES {parseFloat(equipment.unit_price_per_day).toLocaleString()}
              <span className="text-xs font-normal text-gray-500">/day</span>
            </span>
            {equipment.requires_personnel && parseFloat(equipment.personnel_cost_per_day) > 0 && (
              <p className="text-[10px] text-amber-700">
                + KES {parseFloat(equipment.personnel_cost_per_day).toLocaleString()} personnel/day
              </p>
            )}
          </div>
          <button
            onClick={() => navigate(`/school/equipment/${equipment.id}`)}
            className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            View Details
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SchoolCatalogPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [equipment, setEquipment] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cartCount, setCartCount] = useState(0);
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '');

  const selectedCategory = searchParams.get('category') || '';
  const searchQuery = searchParams.get('search') || '';
  const ordering = searchParams.get('ordering') || '';

  // Fetch server-side cart item count
  const fetchCartCount = useCallback(async () => {
    try {
      const res = await cartApi.get();
      const cart = res?.data ?? res;
      setCartCount(cart?.items?.length ?? 0);
    } catch {
      setCartCount(0);
    }
  }, []);

  const fetchEquipment = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page_size: 24 };
      if (searchQuery) params.search = searchQuery;
      if (ordering) params.ordering = ordering;
      const res = await equipmentApi.list(params);
      const payload = res?.data ?? res;
      let results = payload?.results || (Array.isArray(payload) ? payload : []);
      if (selectedCategory) {
        results = results.filter((e) => e.category?.id === selectedCategory);
      }
      setEquipment(results);
    } catch (err) {
      console.error('Failed to fetch equipment:', err);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, ordering, selectedCategory]);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await equipmentCategoriesApi.list({ page_size: 50 });
      const payload = res?.data ?? res;
      const cats = payload?.results || (Array.isArray(payload) ? payload : []);
      setCategories(cats);
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    }
  }, []);

  useEffect(() => { fetchCategories(); fetchCartCount(); }, [fetchCategories, fetchCartCount]);
  useEffect(() => { fetchEquipment(); }, [fetchEquipment]);

  const handleSearch = (e) => {
    e.preventDefault();
    const next = new URLSearchParams(searchParams);
    if (searchInput) next.set('search', searchInput);
    else next.delete('search');
    setSearchParams(next);
  };

  const handleCategoryClick = (catId) => {
    const next = new URLSearchParams(searchParams);
    if (catId === '' || catId === selectedCategory) next.delete('category');
    else next.set('category', catId);
    setSearchParams(next);
  };

  const handleOrdering = (e) => {
    const next = new URLSearchParams(searchParams);
    if (e.target.value) next.set('ordering', e.target.value);
    else next.delete('ordering');
    setSearchParams(next);
  };

  return (
    <div className="flex gap-6">
      {/* Category sidebar */}
      <aside className="w-44 shrink-0">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Categories
        </h3>
        <ul className="space-y-1">
          <li>
            <button
              onClick={() => handleCategoryClick('')}
              className={`w-full text-left text-sm px-3 py-2 rounded-lg transition-colors ${!selectedCategory
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-gray-600 hover:bg-gray-100'
                }`}
            >
              All Equipment
            </button>
          </li>
          {categories.map((cat) => (
            <li key={cat.id}>
              <button
                onClick={() => handleCategoryClick(cat.id)}
                className={`w-full text-left text-sm px-3 py-2 rounded-lg transition-colors ${selectedCategory === cat.id
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-100'
                  }`}
              >
                {cat.category_name}
              </button>
            </li>
          ))}
        </ul>
      </aside>

      {/* Main content */}
      <div className="flex-1 min-w-0">
        {/* Toolbar */}
        <div className="flex items-center gap-3 mb-5">
          <form onSubmit={handleSearch} className="flex-1 flex gap-2">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search equipment…"
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
            >
              Search
            </button>
          </form>
          <select
            value={ordering}
            onChange={handleOrdering}
            className="border border-gray-300 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Sort: Default</option>
            <option value="unit_price_per_day">Price: Low → High</option>
            <option value="-unit_price_per_day">Price: High → Low</option>
            <option value="equipment_name">Name A–Z</option>
            <option value="-available_quantity">Most Available</option>
          </select>
          <button
            onClick={() => navigate('/school/cart')}
            className="relative flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-gray-800"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            Cart
            {cartCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </button>
        </div>

        {/* Result count */}
        <p className="text-sm text-gray-500 mb-4">
          {loading
            ? 'Loading…'
            : `${equipment.length} item${equipment.length !== 1 ? 's' : ''} found`}
          {selectedCategory && categories.find((c) => c.id === selectedCategory) && (
            <span className="ml-1">
              in{' '}
              <strong>{categories.find((c) => c.id === selectedCategory).category_name}</strong>
            </span>
          )}
        </p>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-xl border border-gray-100 overflow-hidden animate-pulse"
              >
                <div className="h-44 bg-gray-200" />
                <div className="p-4 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                  <div className="h-3 bg-gray-200 rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : equipment.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-500 text-sm">
              No equipment found. Try a different search or category.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {equipment.map((eq) => (
              <EquipmentCard key={eq.id} equipment={eq} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
