import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { bookingsApi } from '../../api/endpoints';
import StatusBadge from '../../components/ui/StatusBadge';

// Updated state machine statuses
const ALL_STATUSES = [
  'ALL',
  'PENDING',
  'RESERVED',
  'DISPATCHED',
  'IN_USE',
  'RETURNED',
  'COMPLETED',
  'OVERDUE',
  'CANCELLED',
];

export default function SchoolBookingsPage() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ count: 0, next: null, previous: null });

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, page_size: 10, ordering: '-created_at' };
      if (search) params.search = search;
      if (statusFilter !== 'ALL') params.status = statusFilter;
      const res = await bookingsApi.list(params);
      const payload = res?.data ?? res;
      const results = payload?.results || (Array.isArray(payload) ? payload : []);
      setBookings(results);
      setPagination({ count: payload?.count || 0, next: payload?.next, previous: payload?.previous });
    } catch (err) {
      console.error('Failed to fetch bookings:', err);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const handleSearch = (e) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const handleStatusFilter = (s) => {
    setStatusFilter(s);
    setPage(1);
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Bookings</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Track all your equipment rental requests.
          </p>
        </div>
        <Link
          to="/school/catalog"
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
        >
          + New Booking
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by reference…"
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-52"
          />
          <button
            type="submit"
            className="px-3 py-2 border border-gray-300 text-sm rounded-lg hover:bg-gray-50"
          >
            Search
          </button>
        </form>
        <div className="flex gap-1.5 flex-wrap">
          {ALL_STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => handleStatusFilter(s)}
              className={`px-3 py-1.5 text-xs rounded-full transition-colors ${
                statusFilter === s
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {s === 'ALL' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase().replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                Booking Ref
              </th>
              <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide hidden md:table-cell">
                Pickup
              </th>
              <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide hidden md:table-cell">
                Return
              </th>
              <th className="text-right px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide hidden sm:table-cell">
                Amount
              </th>
              <th className="text-center px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                Status
              </th>
              <th className="text-right px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td className="px-5 py-3"><div className="h-4 bg-gray-200 rounded w-32" /></td>
                  <td className="px-5 py-3 hidden md:table-cell"><div className="h-4 bg-gray-200 rounded w-24" /></td>
                  <td className="px-5 py-3 hidden md:table-cell"><div className="h-4 bg-gray-200 rounded w-24" /></td>
                  <td className="px-5 py-3 hidden sm:table-cell"><div className="h-4 bg-gray-200 rounded w-20 ml-auto" /></td>
                  <td className="px-5 py-3"><div className="h-5 bg-gray-200 rounded-full w-20 mx-auto" /></td>
                  <td className="px-5 py-3"><div className="h-7 bg-gray-200 rounded w-14 ml-auto" /></td>
                </tr>
              ))
            ) : bookings.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-14 text-center text-gray-400">
                  <p className="text-sm">No bookings found.</p>
                  <Link
                    to="/school/catalog"
                    className="mt-2 inline-block text-blue-600 hover:underline text-sm"
                  >
                    Browse equipment to make a booking
                  </Link>
                </td>
              </tr>
            ) : (
              bookings.map((booking) => (
                <tr
                  key={booking.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => navigate(`/school/bookings/${booking.id}`)}
                >
                  <td className="px-5 py-3 font-medium text-gray-900">
                    {booking.booking_reference}
                  </td>
                  <td className="px-5 py-3 text-gray-600 hidden md:table-cell">
                    {booking.pickup_date}
                  </td>
                  <td className="px-5 py-3 text-gray-600 hidden md:table-cell">
                    {booking.return_date}
                  </td>
                  <td className="px-5 py-3 text-right text-gray-700 font-medium hidden sm:table-cell">
                    KES {parseFloat(booking.total_amount || 0).toLocaleString()}
                  </td>
                  <td className="px-5 py-3 text-center">
                    <StatusBadge status={booking.status} />
                  </td>
                  <td
                    className="px-5 py-3 text-right"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Link
                      to={`/school/bookings/${booking.id}`}
                      className="px-3 py-1.5 text-xs text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {pagination.count > 10 && (
          <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
            <span>{pagination.count} total</span>
            <div className="flex gap-2">
              <button
                disabled={!pagination.previous}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1 border rounded disabled:opacity-40 hover:bg-gray-50"
              >
                ← Prev
              </button>
              <span className="px-3 py-1">Page {page}</span>
              <button
                disabled={!pagination.next}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1 border rounded disabled:opacity-40 hover:bg-gray-50"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
