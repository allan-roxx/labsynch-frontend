import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import { bookingsApi, paymentsApi, usersApi } from '../../api/endpoints';
import { StatusBadge } from '../../components/ui';

// Updated for new booking state machine
const ACTIVE_STATUSES = new Set(['PENDING', 'APPROVED', 'RESERVED', 'DISPATCHED', 'IN_USE']);
const NEEDS_PAYMENT_STATUSES = new Set(['APPROVED']);

// ── Stat card ──────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5">
      <p className="text-2xl font-bold text-gray-900">{value ?? '—'}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      <p className="text-xs text-gray-500 mt-2">{label}</p>
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
        setBookings(bRes.data?.results ?? bRes.data ?? []);
        setPayments(pRes.data?.results ?? pRes.data ?? []);
        setSchoolProfile(spRes?.data ?? spRes);
      })
      .catch(() => {/* API errors handled by interceptor */ })
      .finally(() => setLoading(false));
  }, []);

  // ── Stats ──────────────────────────────────────────────────────────────────
  const activeBookings = bookings.filter((b) => ACTIVE_STATUSES.has(b.status));
  const completedBookings = bookings.filter((b) => b.status === 'COMPLETED');

  const pendingPaymentAmount = bookings
    .filter((b) => NEEDS_PAYMENT_STATUSES.has(b.status))
    .reduce((sum, b) => sum + parseFloat(b.total_amount ?? 0), 0);

  const totalSpent = payments.reduce((sum, p) => sum + parseFloat(p.amount ?? 0), 0);

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
      <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-6 py-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Welcome back, {schoolName}!</h1>
          <span className="mt-2 inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
            Active
          </span>
        </div>
        <button
          onClick={() => navigate('/school/catalog')}
          className="rounded-md bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 transition-colors"
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
      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-gray-900">Upcoming Bookings</h2>
          <Link to="/school/bookings" className="text-xs font-medium text-blue-600 hover:underline">
            View All →
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-medium text-gray-500">
                <th className="px-5 py-3">Booking Ref</th>
                <th className="px-5 py-3">Equipment Count</th>
                <th className="px-5 py-3">Pickup Date</th>
                <th className="px-5 py-3">Return Date</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
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
      <td className="px-5 py-3 font-mono text-xs text-gray-700">{booking.booking_reference}</td>
      <td className="px-5 py-3 text-gray-600">{itemLabel}</td>
      <td className="px-5 py-3 text-gray-600">{booking.pickup_date}</td>
      <td className="px-5 py-3 text-gray-600">{booking.return_date}</td>
      <td className="px-5 py-3">
        <StatusBadge status={booking.status} />
      </td>
      <td className="px-5 py-3">
        <div className="flex items-center gap-1.5">
          <ActionBtn onClick={() => navigate(`/school/bookings/${booking.id}`)}>View</ActionBtn>
          {canPay && (
            <ActionBtn onClick={() => navigate(`/school/bookings/${booking.id}`)} variant="pay">
              Pay
            </ActionBtn>
          )}
          {canCancel && (
            <ActionBtn onClick={handleCancel} variant="cancel" disabled={cancelling}>
              {cancelling ? '…' : 'Cancel'}
            </ActionBtn>
          )}
        </div>
      </td>
    </tr>
  );
}

function ActionBtn({ children, onClick, variant = 'default', disabled }) {
  const styles = {
    default: 'border-gray-300 text-gray-600 hover:bg-gray-100',
    pay: 'border-blue-300 text-blue-600 hover:bg-blue-50',
    cancel: 'border-red-200 text-red-500 hover:bg-red-50',
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rounded border px-2.5 py-0.5 text-xs font-medium transition-colors disabled:opacity-50 ${styles[variant]}`}
    >
      {children}
    </button>
  );
}
