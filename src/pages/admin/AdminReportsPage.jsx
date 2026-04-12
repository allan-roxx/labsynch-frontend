import { useState, useEffect, useCallback } from 'react';
import { reportsApi } from '../../api/endpoints';
import {
  BarChart, Bar,
  LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell,
} from 'recharts';

const TABS = ['Overview', 'Bookings', 'Financial', 'Equipment', 'Clients'];

const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

function KpiCard({ label, value, sub, color = 'blue' }) {
  const borders = {
    blue: 'border-l-blue-500',
    green: 'border-l-green-500',
    amber: 'border-l-amber-500',
    red: 'border-l-red-500',
    teal: 'border-l-teal-500',
  };
  return (
    <div className={`bg-white rounded-xl border border-gray-200 border-l-4 ${borders[color]} p-4`}>
      <p className="text-2xl font-bold text-gray-900">{value ?? '—'}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      <p className="text-xs text-gray-500 mt-2">{label}</p>
    </div>
  );
}

function DateRangeFilter({ startDate, endDate, onChangeDates }) {
  return (
    <div className="flex items-center gap-3 text-sm flex-wrap">
      <label className="flex items-center gap-2">
        <span className="text-gray-500 text-xs">From</span>
        <input
          type="date"
          value={startDate}
          onChange={(e) => onChangeDates(e.target.value, endDate)}
          className="border border-gray-300 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </label>
      <label className="flex items-center gap-2">
        <span className="text-gray-500 text-xs">To</span>
        <input
          type="date"
          value={endDate}
          onChange={(e) => onChangeDates(startDate, e.target.value)}
          className="border border-gray-300 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </label>
    </div>
  );
}

// ── Overview Tab ──
function OverviewTab({ metrics }) {
  if (!metrics) return <div className="text-center py-10 text-gray-400">Loading metrics…</div>;
  const fmtKes = (n) => `KES ${parseFloat(n || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}`;
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <KpiCard label="Total Bookings"     value={metrics.total_bookings}       color="blue" />
      <KpiCard label="Active Bookings"    value={metrics.active_bookings}      color="green" />
      <KpiCard label="Overdue Bookings"   value={metrics.overdue_bookings}     color="red" />
      <KpiCard label="Total Equipment"    value={metrics.total_equipment}      color="blue" />
      <KpiCard label="Total Revenue"      value={fmtKes(metrics.total_revenue)}       color="teal" />
      <KpiCard label="Revenue This Month" value={fmtKes(metrics.revenue_this_month)}  color="teal" />
      <KpiCard label="Client Schools"     value={metrics.total_schools}        color="amber" />
      <KpiCard label="Pending Damages"    value={metrics.pending_damage_reports} color="red" />
    </div>
  );
}

// ── Bookings Tab ──
function BookingsTab() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      const res = await reportsApi.bookings(params);
      setData(res?.data ?? res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => { load(); }, [load]);

  const statusData = data?.bookings_by_status
    ? Object.entries(data.bookings_by_status).map(([status, count]) => ({ status, count }))
    : [];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h3 className="text-sm font-semibold text-gray-900">Booking Analytics</h3>
        <DateRangeFilter
          startDate={startDate}
          endDate={endDate}
          onChangeDates={(s, e) => { setStartDate(s); setEndDate(e); }}
        />
      </div>
      {loading ? (
        <div className="h-60 bg-gray-100 rounded-xl animate-pulse" />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <KpiCard label="Total Bookings" value={data?.total_bookings} color="blue" />
            <KpiCard label="Approved" value={data?.approved_bookings} color="green" />
            <KpiCard label="Cancelled" value={data?.cancelled_bookings} color="red" />
            <KpiCard label="Completed" value={data?.completed_bookings} color="teal" />
          </div>
          {statusData.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-xs font-semibold text-gray-700 mb-4">Bookings by Status</p>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={statusData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="status" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3b82f6" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Financial Tab ──
function FinancialTab() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      const res = await reportsApi.financial(params);
      setData(res?.data ?? res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => { load(); }, [load]);

  const fmtKes = (n) => `KES ${parseFloat(n || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}`;
  const monthlyData = data?.monthly_revenue ?? [];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h3 className="text-sm font-semibold text-gray-900">Financial Report</h3>
        <DateRangeFilter
          startDate={startDate}
          endDate={endDate}
          onChangeDates={(s, e) => { setStartDate(s); setEndDate(e); }}
        />
      </div>
      {loading ? (
        <div className="h-60 bg-gray-100 rounded-xl animate-pulse" />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <KpiCard label="Total Revenue" value={fmtKes(data?.total_revenue)} color="teal" />
            <KpiCard label="Total Payments" value={data?.total_payments} color="blue" />
            <KpiCard label="Outstanding" value={fmtKes(data?.outstanding_amount)} color="amber" />
          </div>
          {monthlyData.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-xs font-semibold text-gray-700 mb-4">Monthly Revenue (KES)</p>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => `KES ${parseFloat(v).toLocaleString()}`} />
                  <Legend />
                  <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Equipment Tab ──
function EquipmentTab() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    reportsApi.equipment()
      .then((res) => {
        const d = res?.data ?? res;
        setData(Array.isArray(d) ? d : d?.results ?? []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const chartData = data.slice(0, 10).map((item) => ({
    name: item.equipment_name?.substring(0, 16) + (item.equipment_name?.length > 16 ? '…' : ''),
    bookings: item.total_bookings ?? item.booking_count ?? 0,
    days: item.total_days_booked ?? 0,
  }));

  return (
    <div className="space-y-5">
      <h3 className="text-sm font-semibold text-gray-900">Equipment Utilisation</h3>
      {loading ? (
        <div className="h-60 bg-gray-100 rounded-xl animate-pulse" />
      ) : (
        <>
          {chartData.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-xs font-semibold text-gray-700 mb-4">Top 10 Most-Booked Equipment</p>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={120} />
                  <Tooltip />
                  <Bar dataKey="bookings" fill="#8b5cf6" radius={[0,4,4,0]} name="Bookings" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Equipment</th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Bookings</th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide hidden sm:table-cell">Days Booked</th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide hidden md:table-cell">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.map((item, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-5 py-3 font-medium text-gray-900">{item.equipment_name}</td>
                    <td className="px-5 py-3 text-right text-gray-700">{item.total_bookings ?? item.booking_count ?? '—'}</td>
                    <td className="px-5 py-3 text-right text-gray-700 hidden sm:table-cell">{item.total_days_booked ?? '—'}</td>
                    <td className="px-5 py-3 text-right text-gray-700 hidden md:table-cell">
                      {item.total_revenue ? `KES ${parseFloat(item.total_revenue).toLocaleString()}` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

// ── Clients Tab ──
function ClientsTab() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    reportsApi.clients()
      .then((res) => {
        const d = res?.data ?? res;
        setData(Array.isArray(d) ? d : d?.results ?? []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const pieData = data.slice(0, 6).map((item) => ({
    name: item.school_name?.substring(0, 20),
    value: item.total_bookings ?? item.booking_count ?? 0,
  }));

  return (
    <div className="space-y-5">
      <h3 className="text-sm font-semibold text-gray-900">Client Activity</h3>
      {loading ? (
        <div className="h-60 bg-gray-100 rounded-xl animate-pulse" />
      ) : (
        <>
          {pieData.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center justify-center">
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name }) => name}>
                    {pieData.map((_, idx) => <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">School</th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Bookings</th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide hidden sm:table-cell">Completed</th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide hidden md:table-cell">Total Spent</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.map((item, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-5 py-3 font-medium text-gray-900">{item.school_name}</td>
                    <td className="px-5 py-3 text-right text-gray-700">{item.total_bookings ?? item.booking_count ?? '—'}</td>
                    <td className="px-5 py-3 text-right text-gray-700 hidden sm:table-cell">{item.completed_bookings ?? '—'}</td>
                    <td className="px-5 py-3 text-right text-gray-700 hidden md:table-cell">
                      {item.total_spent ? `KES ${parseFloat(item.total_spent).toLocaleString()}` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

// ── Main Page ──
export default function AdminReportsPage() {
  const [activeTab, setActiveTab] = useState('Overview');
  const [dashboardMetrics, setDashboardMetrics] = useState(null);

  useEffect(() => {
    if (activeTab === 'Overview') {
      reportsApi.dashboard()
        .then((res) => setDashboardMetrics(res?.data ?? res))
        .catch(console.error);
    }
  }, [activeTab]);

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <p className="text-sm text-gray-500 mt-0.5">Analytics and performance metrics.</p>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 border-b border-gray-200 mb-6">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'Overview'   && <OverviewTab  metrics={dashboardMetrics} />}
      {activeTab === 'Bookings'   && <BookingsTab />}
      {activeTab === 'Financial'  && <FinancialTab />}
      {activeTab === 'Equipment'  && <EquipmentTab />}
      {activeTab === 'Clients'    && <ClientsTab />}
    </div>
  );
}
