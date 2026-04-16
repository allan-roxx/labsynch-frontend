import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { reportsApi } from '../../api/endpoints';

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

export default function AdminDashboard() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    reportsApi.dashboard()
      .then((res) => setMetrics(res?.data ?? res))
      .catch((err) => setError(err?.message || 'Failed to load dashboard metrics.'))
      .finally(() => setLoading(false));
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

      <p className="text-xs text-gray-400">
        Metrics loaded from <code>/api/reports/dashboard/</code>. Last refreshed on page load.
      </p>
    </div>
  );
}
