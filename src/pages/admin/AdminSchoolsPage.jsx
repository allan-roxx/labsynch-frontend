import { useState, useEffect, useCallback } from 'react';
import { schoolProfilesApi, transportZonesApi } from '../../api/endpoints';
import StatusBadge from '../../components/ui/StatusBadge';

function TransportZoneSelect({ value, onChange }) {
  const [zones, setZones] = useState([]);
  useEffect(() => {
    transportZonesApi.list({ page_size: 50 })
      .then((res) => {
        const data = res?.data ?? res;
        setZones(data?.results || (Array.isArray(data) ? data : []));
      })
      .catch(console.error);
  }, []);
  return (
    <select
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value || null)}
      className="border border-gray-300 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
    >
      <option value="">— No zone —</option>
      {zones.map((z) => (
        <option key={z.id} value={z.id}>{z.zone_name}</option>
      ))}
    </select>
  );
}

export default function AdminSchoolsPage() {
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [liabilityFilter, setLiabilityFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ count: 0, next: null, previous: null });
  const [updatingZone, setUpdatingZone] = useState(null);

  const fetchSchools = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, page_size: 15, ordering: 'school_name' };
      if (search) params.search = search;
      if (liabilityFilter !== 'ALL') params.liability_status = liabilityFilter;
      const res = await schoolProfilesApi.list(params);
      const payload = res?.data ?? res;
      const results = payload?.results || (Array.isArray(payload) ? payload : []);
      setSchools(results);
      setPagination({ count: payload?.count || 0, next: payload?.next, previous: payload?.previous });
    } catch (err) {
      console.error('Failed to fetch schools:', err);
    } finally {
      setLoading(false);
    }
  }, [page, search, liabilityFilter]);

  useEffect(() => { fetchSchools(); }, [fetchSchools]);

  const handleSearch = (e) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const handleZoneUpdate = async (school, zoneId) => {
    setUpdatingZone(school.id);
    try {
      await schoolProfilesApi.update(school.id, { transport_zone: zoneId });
      await fetchSchools();
    } catch (err) {
      alert(err?.message || 'Failed to update transport zone.');
    } finally {
      setUpdatingZone(null);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Schools</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage client school profiles and zones.</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search school name…"
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-52"
          />
          <button type="submit" className="px-3 py-2 border border-gray-300 text-sm rounded-lg hover:bg-gray-50">
            Search
          </button>
        </form>
        <div className="flex gap-1.5">
          {['ALL', 'CLEAR', 'HAS_OUTSTANDING'].map((f) => (
            <button
              key={f}
              onClick={() => { setLiabilityFilter(f); setPage(1); }}
              className={`px-3 py-1.5 text-xs rounded-full transition-colors ${
                liabilityFilter === f
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f === 'ALL' ? 'All' : f === 'CLEAR' ? 'No Liabilities' : 'Outstanding'}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">School Name</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide hidden md:table-cell">County</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide hidden lg:table-cell">Contact</th>
                <th className="text-center px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Liability</th>
                <th className="text-center px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Account</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Transport Zone</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {Array.from({ length: 6 }).map((__, j) => (
                      <td key={j} className="px-5 py-3"><div className="h-4 bg-gray-200 rounded" /></td>
                    ))}
                  </tr>
                ))
              ) : schools.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-14 text-center text-gray-400">
                    <p className="text-sm">No schools found.</p>
                  </td>
                </tr>
              ) : (
                schools.map((school) => (
                  <tr key={school.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3">
                      <div>
                        <p className="font-medium text-gray-900">{school.school_name}</p>
                        <p className="text-xs text-gray-400">{school.registration_number}</p>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-gray-600 hidden md:table-cell">{school.county}</td>
                    <td className="px-5 py-3 text-gray-600 text-xs hidden lg:table-cell">
                      <div>{school.contact_person}</div>
                      <div className="text-gray-400">{school.user_email}</div>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <StatusBadge status={school.liability_status ?? 'CLEAR'} />
                    </td>
                    <td className="px-5 py-3 text-center">
                      <StatusBadge status={school.account_status ?? 'ACTIVE'} />
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <TransportZoneSelect
                          value={school.transport_zone}
                          onChange={(zoneId) => handleZoneUpdate(school, zoneId)}
                        />
                        {updatingZone === school.id && (
                          <span className="text-xs text-blue-600">Saving…</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {pagination.count > 15 && (
          <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
            <span>{pagination.count} total</span>
            <div className="flex gap-2">
              <button disabled={!pagination.previous} onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1 border rounded disabled:opacity-40 hover:bg-gray-50">← Prev</button>
              <span className="px-3 py-1">Page {page}</span>
              <button disabled={!pagination.next} onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1 border rounded disabled:opacity-40 hover:bg-gray-50">Next →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
