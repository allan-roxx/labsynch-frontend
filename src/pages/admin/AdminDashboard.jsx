import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { reportsApi, bookingsApi } from '../../api/endpoints';

function StatCard({ label, value, color = 'blue', to }) {
  const colors = {
    blue: 'bg-blue-50 text-blue-700 border-blue-100',
    green: 'bg-green-50 text-green-700 border-green-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
    red: 'bg-red-50 text-red-700 border-red-100',
    purple: 'bg-purple-50 text-purple-700 border-purple-100',
    teal: 'bg-teal-50 text-teal-700 border-teal-100',
    gray: 'bg-gray-50 text-gray-700 border-gray-100',
  };
  const card = (
    <div className={`rounded-xl border p-5 ${colors[color]}`}>
      <p className="text-2xl font-bold mb-1">{value ?? '—'}</p>
      <p className="text-xs font-medium opacity-80">{label}</p>
    </div>
  );
  return to ? <Link to={to}>{card}</Link> : card;
}

const STATUS_STYLES = {
  PENDING:    'bg-yellow-100 text-yellow-800',
  APPROVED:   'bg-blue-100 text-blue-800',
  RESERVED:   'bg-indigo-100 text-indigo-800',
  DISPATCHED: 'bg-cyan-100 text-cyan-800',
  IN_USE:     'bg-green-100 text-green-800',
  RETURNED:   'bg-teal-100 text-teal-800',
  COMPLETED:  'bg-gray-100 text-gray-700',
  OVERDUE:    'bg-red-100 text-red-700',
  CANCELLED:  'bg-red-50 text-red-400',
};

function StatusPill({ status }) {
  const cls = STATUS_STYLES[status] ?? 'bg-gray-100 text-gray-600';
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold ${cls}`}>
      {status}
    </span>
  );
}

export default function AdminDashboard() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [recentBookings, setRecentBookings] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(true);

  const [topEquipment, setTopEquipment] = useState([]);
  const [equipLoading, setEquipLoading] = useState(true);

  useEffect(() => {
    reportsApi.dashboard()
      .then((res) => setMetrics(res?.data ?? res))
      .catch((err) => setError(err?.message || 'Failed to load dashboard metrics.'))
      .finally(() => setLoading(false));

    bookingsApi.list({ page_size: 6, ordering: '-created_at' })
      .then((res) => {
        const data = res?.data ?? res;
        setRecentBookings(data?.results ?? (Array.isArray(data) ? data : []));
      })
      .catch(() => setRecentBookings([]))
      .finally(() => setBookingsLoading(false));

    reportsApi.equipment()
      .then((res) => {
        const data = res?.data ?? res;
        const list = Array.isArray(data) ? data : (data?.results ?? []);
        const sorted = [...list].sort((a, b) => (b.times_booked ?? 0) - (a.times_booked ?? 0));
        setTopEquipment(sorted.slice(0, 5));
      })
      .catch(() => setTopEquipment([]))
      .finally(() => setEquipLoading(false));
  }, []);

  const fmt = (n) => {
    if (n === undefined || n === null) return '—';
    const num = parseFloat(n);
    if (isNaN(num)) return '—';
    return num >= 1000
      ? `KES ${num.toLocaleString('en-KE', { maximumFractionDigits: 0 })}`
      : num.toLocaleString('en-KE', { maximumFractionDigits: 0 });
  };

  const fmtKes = (n) => {
    if (n === undefined || n === null) return '—';
    return `KES ${parseFloat(n).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 mb-6 animate-pulse">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-28 bg-gray-200 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 mb-6 animate-pulse">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-28 bg-gray-200 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-pulse">
          <div className="h-72 bg-gray-200 rounded-xl" />
          <div className="h-72 bg-gray-200 rounded-xl" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>
        <div className="px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{error}</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <Link
          to="/admin/reports"
          className="text-sm text-blue-600 font-medium hover:underline flex items-center gap-1"
        >
          Full Reports →
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 mb-6">
        <StatCard label="Total Bookings" value={metrics?.total_bookings} color="blue" to="/admin/bookings" />
        <StatCard label="Active Bookings" value={metrics?.active_bookings} color="green" to="/admin/bookings" />
        <StatCard label="Overdue Bookings" value={metrics?.overdue_bookings} color="red" to="/admin/bookings" />
        <StatCard label="Total Equipment" value={metrics?.total_equipment} color="purple" to="/admin/equipment" />
        <StatCard label="Total Revenue" value={fmtKes(metrics?.revenue_total)} color="teal" to="/admin/reports" />
        <StatCard label="Revenue This Month" value={fmtKes(metrics?.revenue_this_month)} color="teal" to="/admin/reports" />
        <StatCard label="Client Schools" value={metrics?.total_schools} color="amber" to="/admin/schools" />
        <StatCard label="Pending Damages" value={metrics?.pending_damage_reports} color="red" to="/admin/returns" />
      </div>

      <h2 className="text-sm font-semibold text-gray-700 mb-3">Today's Activity</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-6">
        <StatCard
          label="Today's Pickups"
          value={metrics?.today_pickups}
          color="blue"
          to="/admin/bookings"
        />
        <StatCard
          label="Today's Returns"
          value={metrics?.today_returns}
          color="green"
          to="/admin/bookings"
        />
        <StatCard
          label="Awaiting Payment Today"
          value={metrics?.today_pending_payment}
          color="amber"
          to="/admin/bookings"
        />
      </div>

      {/* ── Bottom panels ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

        {/* Recent Bookings */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-800">Recent Bookings</h2>
            <Link to="/admin/bookings" className="text-xs text-blue-600 font-medium hover:underline">
              View all →
            </Link>
          </div>
          {bookingsLoading ? (
            <div className="p-5 space-y-2 animate-pulse">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-8 bg-gray-100 rounded" />
              ))}
            </div>
          ) : recentBookings.length === 0 ? (
            <p className="px-5 py-8 text-sm text-gray-400 text-center">No bookings yet.</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {recentBookings.map((b) => (
                <Link
                  key={b.id}
                  to={`/admin/bookings/${b.id}`}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{b.booking_reference}</p>
                    <p className="text-xs text-gray-400 truncate">{b.school_name}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <StatusPill status={b.status} />
                    <p className="text-xs text-gray-400 mt-0.5">
                      {b.pickup_date} → {b.return_date}
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-gray-700 shrink-0 w-28 text-right">
                    KES {parseFloat(b.total_amount || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Most Borrowed Equipment */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-800">Most Borrowed Equipment</h2>
            <Link to="/admin/reports" className="text-xs text-blue-600 font-medium hover:underline">
              Full report →
            </Link>
          </div>
          {equipLoading ? (
            <div className="p-5 space-y-2 animate-pulse">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-8 bg-gray-100 rounded" />
              ))}
            </div>
          ) : topEquipment.length === 0 ? (
            <p className="px-5 py-8 text-sm text-gray-400 text-center">No equipment data available.</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {topEquipment.map((eq, idx) => (
                <Link
                  key={eq.equipment_id}
                  to={`/admin/equipment`}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors"
                >
                  <span className="w-6 h-6 rounded-full bg-blue-50 text-blue-600 text-xs font-bold flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{eq.equipment_name}</p>
                    <p className="text-xs text-gray-400">{eq.equipment_code}</p>
                  </div>
                  <div className="text-right shrink-0 space-y-0.5">
                    <p className="text-xs font-semibold text-gray-700">
                      {eq.times_booked} booking{eq.times_booked !== 1 ? 's' : ''}
                    </p>
                    <p className="text-xs text-teal-600 font-medium">
                      KES {parseFloat(eq.total_revenue || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      <p className="text-xs text-gray-400">
        Metrics loaded from <code>/api/reports/dashboard/</code>. Last refreshed on page load.
      </p>
    </div>
  );
}
