import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import { bookingsApi, paymentsApi, usersApi } from '../../api/endpoints';
import { StatusBadge } from '../../components/ui';

// Updated for new booking state machine
const ACTIVE_STATUSES = new Set(['PENDING', 'APPROVED', 'RESERVED', 'DISPATCHED', 'IN_USE']);
const NEEDS_PAYMENT_STATUSES = new Set(['APPROVED']);

// ── Stat card 
function StatCard({ label, value, sub }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <p className="text-3xl font-bold text-black">{value ?? '—'}</p>
      {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
      <p className="text-sm text-gray-500 mt-1">{label}</p>
    </div>
  );
}

export default function SchoolHomePage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [bookings, setBookings] = useState([]);
  const [payments, setPayments] = useState([]);
  const [schoolProfile, setSchoolProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      bookingsApi.list({ page_size: 100, ordering: 'pickup_date' }),
      paymentsApi.list({ page_size: 100 }),
      usersApi.mySchoolProfile(),
    ])
      .then(([bRes, pRes, spRes]) => {
        const bData = bRes?.data ?? bRes;
        const pData = pRes?.data ?? pRes;
        const spData = spRes?.data ?? spRes;

        setBookings(bData?.results ?? (Array.isArray(bData) ? bData : []));
        setPayments(pData?.results ?? (Array.isArray(pData) ? pData : []));
        setSchoolProfile(spData ?? null);
      })
      .catch(() => {/* API errors handled by interceptor */ })
      .finally(() => setLoading(false));
  }, []);

  // ── Stats ──────────────────────────────────────────────────────────────────
  const activeBookings = bookings.filter((b) => ACTIVE_STATUSES.has(b.status));
  const completedBookings = bookings.filter((b) => b.status === 'COMPLETED' || b.status === 'IN_USE');

  const pendingPaymentAmount = bookings
    .filter((b) => NEEDS_PAYMENT_STATUSES.has(b.status))
    .reduce((sum, b) => sum + parseFloat(b.total_amount ?? 0), 0);

  const totalSpent = payments
    .filter((p) => p.payment_status === 'SUCCESS')
    .reduce((sum, p) => sum + parseFloat(p.amount_paid ?? 0), 0);

  // Upcoming = active bookings, first 5 sorted by pickup_date
  const upcomingBookings = bookings
    .filter((b) => ACTIVE_STATUSES.has(b.status))
    .slice(0, 5);
  const schoolName = schoolProfile?.school_name ?? user?.school_profile?.school_name ?? user?.full_name ?? 'School';
  const liabilityStatus = schoolProfile?.liability_status ?? user?.school_profile?.liability_status;

  const fmt = (n) =>
    n === 0 ? 'KES 0' : `KES ${n.toLocaleString('en-KE', { minimumFractionDigits: 0 })}`;

  return (
    <div className="space-y-6">
      {/* ── Liability warning banner ── */}
      {liabilityStatus === 'HAS_OUTSTANDING' && (
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-5 py-4">
          <svg className="mt-0.5 h-5 w-5 shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-800">
              Outstanding Damage Liabilities
            </p>
            <p className="mt-0.5 text-sm text-red-700">
              You have unresolved damage liabilities. New bookings are blocked until resolved.{' '}
              <Link to="/school/bookings" className="underline font-medium">
                View Bookings →
              </Link>
            </p>
          </div>
        </div>
      )}

      {/* ── Welcome banner ── */}
      <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-8 py-8 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-700">Welcome back, {schoolName}!</h1>
          <div className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1 text-xs font-semibold text-black">
            <span className="h-1.5 w-1.5 rounded-full bg-black"></span>
            Active
          </div>
        </div>
        <button
          onClick={() => navigate('/school/catalog')}
          className="bg-blue-500 rounded-lg px-6 py-3 text-sm font-bold text-white hover:bg-black transition-colors"
        >
          MAKE A BOOKING
        </button>
      </div>

      {/* ── Stat cards ── */}
      {loading ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 rounded-lg border border-gray-200 bg-white animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard value={activeBookings.length} label="Active Bookings" />
          <StatCard value={fmt(pendingPaymentAmount)} label="Pending Payments" />
          <StatCard value={completedBookings.length} label="Completed Bookings" />
          <StatCard value={fmt(totalSpent)} label="Total Spent" />
        </div>
      )}

      {/* ── Upcoming Bookings table ── */}
      <div className="rounded-lg border-2 border-gray-200 bg-white mt-8">
        <div className="flex items-center justify-between rounded-lg border border-gray-200 px-6 py-6">
          <h2 className="text-xl font-bold text-black">Upcoming Bookings</h2>
          <Link to="/school/bookings" className="text-sm font-semibold text-blue-600 hover:underline">
            View All →
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-white text-left text-sm font-bold text-black">
                <th className="px-6 py-4">Booking Ref</th>
                <th className="px-6 py-4">Equipment Count</th>
                <th className="px-6 py-4">Pickup Date</th>
                <th className="px-6 py-4">Return Date</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(6)].map((__, j) => (
                      <td key={j} className="px-5 py-3">
                        <div className="h-4 w-20 rounded bg-gray-100 animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : upcomingBookings.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-sm text-gray-400">
                    No upcoming bookings.{' '}
                    <Link to="/school/catalog" className="text-blue-600 hover:underline">
                      Browse equipment →
                    </Link>
                  </td>
                </tr>
              ) : (
                upcomingBookings.map((booking) => (
                  <BookingRow key={booking.id} booking={booking} onRefresh={() => window.location.reload()} />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Individual booking row ─────────────────────────────────────────────────────
function BookingRow({ booking, onRefresh }) {
  const navigate = useNavigate();
  const [cancelling, setCancelling] = useState(false);

  const itemCount = booking.booking_items?.length ?? '—';
  const itemLabel = typeof itemCount === 'number'
    ? `${itemCount} item${itemCount !== 1 ? 's' : ''}`
    : itemCount;

  const handleCancel = async () => {
    if (!window.confirm('Cancel this booking?')) return;
    setCancelling(true);
    try {
      await bookingsApi.cancel(booking.id);
      onRefresh();
    } catch {
      alert('Failed to cancel booking. Please try again.');
    } finally {
      setCancelling(false);
    }
  };

  // Updated for new state machine
  const canPay = booking.status === 'APPROVED';
  const canCancel = ['PENDING', 'APPROVED', 'RESERVED'].includes(booking.status);

  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="px-6 py-4 font-medium text-sm text-black">{booking.booking_reference}</td>
      <td className="px-6 py-4 text-sm text-black">{itemLabel}</td>
      <td className="px-6 py-4 text-sm text-black">{booking.pickup_date}</td>
      <td className="px-6 py-4 text-sm text-black">{booking.return_date}</td>
      <td className="px-6 py-4">
        <span className="text-sm font-medium text-black capitalize">
          {booking.status?.toLowerCase().replace('_', ' ') || 'Unknown'}
        </span>
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center gap-2">
          <ActionBtn onClick={() => navigate(`/school/bookings/${booking.id}`)}>View</ActionBtn>
          {canPay && (
            <ActionBtn onClick={() => navigate(`/school/bookings/${booking.id}`)}>
              Pay
            </ActionBtn>
          )}
          {canCancel && (
            <ActionBtn onClick={handleCancel} disabled={cancelling}>
              {cancelling ? '...' : 'Cancel'}
            </ActionBtn>
          )}
        </div>
      </td>
    </tr>
  );
}

function ActionBtn({ children, onClick, variant = 'default', disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="border border-gray-200 px-4 py-1 text-xs font-semibold text-black hover:bg-gray-100 transition-colors disabled:opacity-50"
    >
      {children}
    </button>
  );
}
