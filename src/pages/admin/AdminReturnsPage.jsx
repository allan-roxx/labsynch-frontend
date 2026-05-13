import { useState, useEffect, useCallback, useRef } from 'react';
import { returnsApi, damagesApi, bookingsApi } from '../../api/endpoints';
import StatusBadge from '../../components/ui/StatusBadge';
import ExportButton from '../../components/ui/ExportButton';

const RESOLUTION_STATUSES = ['ALL', 'PENDING', 'CHARGED', 'PAID', 'WAIVED', 'RESOLVED'];
const SEVERITIES           = ['ALL', 'MINOR', 'MODERATE', 'SEVERE'];

const SEVERITY_COLORS = {
  MINOR:    'bg-yellow-100 text-yellow-800',
  MODERATE: 'bg-orange-100 text-orange-800',
  SEVERE:   'bg-red-100 text-red-800',
};

// ── Damage Create Modal ───────────────────────────────────────────────────────
function DamageCreateModal({ preloadReturn = null, onClose, onSaved }) {
  const [returnRecord, setReturnRecord] = useState(preloadReturn);
  const [returnQuery, setReturnQuery]   = useState(preloadReturn?.booking_reference ?? '');
  const [returnResults, setReturnResults] = useState([]);
  const [returnOpen, setReturnOpen]     = useState(false);
  const [returnSearching, setReturnSearching] = useState(false);

  const [bookingItems, setBookingItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(false);

  const [form, setForm] = useState({
    booking_item:      '',
    quantity_damaged:  1,
    severity:          'MINOR',
    description:       '',
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const returnDebounceRef = useRef(null);
  const returnWrapperRef  = useRef(null);

  // Close return dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (returnWrapperRef.current && !returnWrapperRef.current.contains(e.target)) setReturnOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Load booking items whenever a return record is selected
  useEffect(() => {
    if (!returnRecord) { setBookingItems([]); return; }
    setLoadingItems(true);
    bookingsApi.retrieve(returnRecord.booking)
      .then((res) => {
        const d = res?.data ?? res;
        setBookingItems(d?.booking_items ?? []);
      })
      .catch(() => setBookingItems([]))
      .finally(() => setLoadingItems(false));
  }, [returnRecord]);

  const searchReturns = async (q) => {
    if (!q || q.trim().length < 2) { setReturnResults([]); setReturnOpen(false); return; }
    setReturnSearching(true);
    try {
      const res  = await returnsApi.list({ search: q, page_size: 8 });
      const d    = res?.data ?? res;
      const list = d?.results ?? (Array.isArray(d) ? d : []);
      setReturnResults(list);
      setReturnOpen(list.length > 0);
    } catch { setReturnResults([]); }
    finally { setReturnSearching(false); }
  };

  const handleReturnInputChange = (e) => {
    const q = e.target.value;
    setReturnQuery(q);
    if (returnRecord) {
      setReturnRecord(null);
      setBookingItems([]);
      setForm((f) => ({ ...f, booking_item: '' }));
    }
    clearTimeout(returnDebounceRef.current);
    returnDebounceRef.current = setTimeout(() => searchReturns(q), 300);
  };

  const handleReturnSelect = (r) => {
    setReturnRecord(r);
    setReturnQuery(r.booking_reference);
    setReturnOpen(false);
    setReturnResults([]);
    setForm((f) => ({ ...f, booking_item: '' }));
  };

  const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const validate = () => {
    const errs = {};
    if (!returnRecord)        errs.equipment_return = 'Select a return record.';
    if (!form.booking_item)   errs.booking_item     = 'Select a booking item.';
    if (!form.description.trim()) errs.description  = 'Description is required.';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSaving(true);
    setErrors({});
    try {
      await damagesApi.create({
        equipment_return: returnRecord.id,
        booking_item:     form.booking_item,
        quantity_damaged: form.quantity_damaged,
        severity:         form.severity,
        description:      form.description,
      });
      onSaved();
    } catch (ex) {
      const backendErrors = ex?.errors ?? {};
      const nonField = backendErrors.non_field_errors?.join(' ') ?? ex?.message ?? 'An error occurred.';
      setErrors({ ...backendErrors, _general: nonField });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
          <h2 className="text-lg font-bold text-gray-900">Log Damage Report</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-2xl leading-none">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {errors._general && (
            <div className="px-3 py-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
              {errors._general}
            </div>
          )}

          {/* Return record search */}
          <div ref={returnWrapperRef} className="relative">
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Equipment Return <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={returnQuery}
              onChange={handleReturnInputChange}
              onFocus={() => { if (returnResults.length) setReturnOpen(true); }}
              placeholder="Search by booking reference…"
              autoComplete="off"
              disabled={!!preloadReturn}
              className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
                returnRecord
                  ? 'border-green-400 ring-1 ring-green-300 bg-green-50'
                  : 'border-gray-300 focus:ring-blue-500'
              } disabled:bg-gray-50 disabled:cursor-not-allowed`}
            />
            {returnRecord && (
              <p className="mt-1 text-xs text-green-700 font-medium">
                Selected: {returnRecord.booking_reference} · returned{' '}
                {new Date(returnRecord.returned_at).toLocaleDateString('en-KE', { dateStyle: 'medium' })}
              </p>
            )}
            {returnSearching && <p className="mt-1 text-xs text-gray-400">Searching…</p>}
            {errors.equipment_return && (
              <p className="text-xs text-red-500 mt-0.5">{errors.equipment_return}</p>
            )}
            {returnOpen && returnResults.length > 0 && (
              <ul className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-40 overflow-y-auto">
                {returnResults.map((r) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => handleReturnSelect(r)}
                      className="w-full text-left px-4 py-2.5 hover:bg-blue-50 transition-colors"
                    >
                      <p className="text-sm font-medium text-gray-900">{r.booking_reference}</p>
                      <p className="text-xs text-gray-500">
                        Returned{' '}
                        {new Date(r.returned_at).toLocaleDateString('en-KE', { dateStyle: 'medium' })} ·{' '}
                        {r.returned_by_email}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Booking item select — appears after return is chosen */}
          {returnRecord && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Booking Item <span className="text-red-500">*</span>
              </label>
              {loadingItems ? (
                <div className="h-9 bg-gray-100 animate-pulse rounded-lg" />
              ) : bookingItems.length === 0 ? (
                <p className="text-xs text-gray-400">No booking items found for this return.</p>
              ) : (
                <select
                  value={form.booking_item}
                  onChange={(e) => setF('booking_item', e.target.value)}
                  className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.booking_item ? 'border-red-400 bg-red-50' : 'border-gray-300'
                  }`}
                >
                  <option value="">Select item…</option>
                  {bookingItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.equipment?.equipment_name ?? item.equipment} × {item.quantity}
                    </option>
                  ))}
                </select>
              )}
              {errors.booking_item && <p className="text-xs text-red-500 mt-0.5">{errors.booking_item}</p>}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Severity</label>
            <select
              value={form.severity}
              onChange={(e) => setF('severity', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="MINOR">Minor</option>
              <option value="MODERATE">Moderate</option>
              <option value="SEVERE">Severe</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Quantity Damaged</label>
            <input
              type="number"
              min="0"
              value={form.quantity_damaged}
              onChange={(e) => setF('quantity_damaged', parseInt(e.target.value, 10) || 0)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => setF('description', e.target.value)}
              className={`w-full border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.description ? 'border-red-400 bg-red-50' : 'border-gray-300'
              }`}
            />
            {errors.description && <p className="text-xs text-red-500 mt-0.5">{errors.description}</p>}
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Log Damage Report'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Damage Resolve Modal ──────────────────────────────────────────────────────
function DamageResolveModal({ damage, onClose, onSaved }) {
  const [form, setForm] = useState({
    resolution_status: damage.resolution_status ?? 'CHARGED',
    repair_cost:       damage.repair_cost  ?? '',
    amount_paid:       damage.amount_paid  ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await damagesApi.resolve(damage.id, {
        resolution_status: form.resolution_status,
        repair_cost:       form.repair_cost || null,
        amount_paid:       form.amount_paid || null,
      });
      onSaved();
    } catch (ex) {
      const backendErrors = ex?.errors ?? {};
      setError(backendErrors.non_field_errors?.join(' ') ?? ex?.message ?? 'Failed to update.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Resolve Damage Report</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {damage.booking_reference} · {damage.equipment_name}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-2xl leading-none">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {error && (
            <div className="px-3 py-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{error}</div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Resolution Status <span className="text-red-500">*</span>
            </label>
            <select
              value={form.resolution_status}
              onChange={(e) => setF('resolution_status', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="PENDING">Pending Assessment</option>
              <option value="CHARGED">Charged to School</option>
              <option value="PAID">Paid by School</option>
              <option value="WAIVED">Waived / Forgiven</option>
              <option value="RESOLVED">Resolved and Closed</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Repair Cost (KES)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.repair_cost}
              onChange={(e) => setF('repair_cost', e.target.value)}
              placeholder="0.00"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Amount Paid (KES)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.amount_paid}
              onChange={(e) => setF('amount_paid', e.target.value)}
              placeholder="0.00"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Update Resolution'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Returns tab ───────────────────────────────────────────────────────────────
function ReturnsTab({ onLogDamage }) {
  const [returns, setReturns]         = useState([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage]               = useState(1);
  const [pagination, setPagination]   = useState({ count: 0, next: null, previous: null });

  const fetchReturns = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, page_size: 15, ordering: '-returned_at' };
      if (search) params.search = search;
      const res     = await returnsApi.list(params);
      const payload = res?.data ?? res;
      const results = payload?.results || (Array.isArray(payload) ? payload : []);
      setReturns(results);
      setPagination({ count: payload?.count || 0, next: payload?.next, previous: payload?.previous });
    } catch (err) {
      console.error('Failed to fetch returns:', err);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { fetchReturns(); }, [fetchReturns]);

  const handleSearch = (e) => { e.preventDefault(); setSearch(searchInput); setPage(1); };

  return (
    <div>
      <div className="flex gap-3 mb-4">
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search booking reference…"
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-56"
          />
          <button type="submit" className="px-3 py-2 border border-gray-300 text-sm rounded-lg hover:bg-gray-50">
            Search
          </button>
        </form>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Booking Ref</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide hidden md:table-cell">Returned At</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide hidden lg:table-cell">Returned By</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide hidden lg:table-cell">Received By</th>
              <th className="text-center px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Damage?</th>
              <th className="text-right px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Actions</th>
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
            ) : returns.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-14 text-center text-gray-400">
                  <p className="text-sm">No returns found.</p>
                </td>
              </tr>
            ) : (
              returns.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 font-mono text-xs text-gray-700">{r.booking_reference}</td>
                  <td className="px-5 py-3 text-gray-600 hidden md:table-cell">
                    {r.returned_at
                      ? new Date(r.returned_at).toLocaleDateString('en-KE', { dateStyle: 'medium' })
                      : '—'}
                  </td>
                  <td className="px-5 py-3 text-gray-600 text-xs hidden lg:table-cell">{r.returned_by_email}</td>
                  <td className="px-5 py-3 text-gray-600 text-xs hidden lg:table-cell">{r.received_by_email}</td>
                  <td className="px-5 py-3 text-center">
                    {r.has_damage ? (
                      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-red-100 text-red-700">
                        Yes
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-gray-100 text-gray-500">
                        No
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right">
                    {r.has_damage && (
                      <button
                        onClick={() => onLogDamage(r)}
                        className="px-2.5 py-1 text-xs bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors"
                      >
                        Log Damage
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

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

// ── Damages tab ───────────────────────────────────────────────────────────────
function DamagesTab({ initialReturn = null, onClearInitialReturn }) {
  const [damages, setDamages]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [resFilter, setResFilter]   = useState('ALL');
  const [sevFilter, setSevFilter]   = useState('ALL');
  const [page, setPage]             = useState(1);
  const [pagination, setPagination] = useState({ count: 0, next: null, previous: null });

  const [showCreateModal, setShowCreateModal] = useState(!!initialReturn);
  const [preloadReturn, setPreloadReturn]     = useState(initialReturn);
  const [resolveTarget, setResolveTarget]     = useState(null);

  const fetchDamages = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, page_size: 15, ordering: '-created_at' };
      if (resFilter !== 'ALL') params.resolution_status = resFilter;
      if (sevFilter !== 'ALL') params.severity           = sevFilter;
      const res     = await damagesApi.list(params);
      const payload = res?.data ?? res;
      const results = payload?.results || (Array.isArray(payload) ? payload : []);
      setDamages(results);
      setPagination({ count: payload?.count || 0, next: payload?.next, previous: payload?.previous });
    } catch (err) {
      console.error('Failed to fetch damages:', err);
    } finally {
      setLoading(false);
    }
  }, [page, resFilter, sevFilter]);

  useEffect(() => { fetchDamages(); }, [fetchDamages]);

  const handleCreateClose = () => {
    setShowCreateModal(false);
    setPreloadReturn(null);
    onClearInitialReturn?.();
  };

  return (
    <div>
      {/* Filters + create button */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between mb-4">
        <div className="flex flex-col gap-2">
          <div className="flex gap-1.5 flex-wrap items-center">
            <span className="text-xs text-gray-400">Resolution:</span>
            {RESOLUTION_STATUSES.map((s) => (
              <button
                key={s}
                onClick={() => { setResFilter(s); setPage(1); }}
                className={`px-3 py-1.5 text-xs rounded-full transition-colors ${
                  resFilter === s ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {s === 'ALL' ? 'All' : s}
              </button>
            ))}
          </div>
          <div className="flex gap-1.5 flex-wrap items-center">
            <span className="text-xs text-gray-400">Severity:</span>
            {SEVERITIES.map((s) => (
              <button
                key={s}
                onClick={() => { setSevFilter(s); setPage(1); }}
                className={`px-3 py-1.5 text-xs rounded-full transition-colors ${
                  sevFilter === s ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {s === 'ALL' ? 'All' : s}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <ExportButton
            endpoint="/api/damages/export/"
            params={{
              ...(resFilter !== 'ALL' ? { resolution_status: resFilter } : {}),
              ...(sevFilter !== 'ALL' ? { severity: sevFilter } : {}),
            }}
            filename="damages"
          />
          <button
            onClick={() => { setPreloadReturn(null); setShowCreateModal(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Log Damage
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Equipment</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide hidden sm:table-cell">Booking Ref</th>
              <th className="text-center px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide hidden md:table-cell">Severity</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide hidden lg:table-cell">Description</th>
              <th className="text-right px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide hidden lg:table-cell">Repair Cost</th>
              <th className="text-right px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide hidden xl:table-cell">Outstanding</th>
              <th className="text-center px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
              <th className="text-right px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  {Array.from({ length: 8 }).map((__, j) => (
                    <td key={j} className="px-5 py-3"><div className="h-4 bg-gray-200 rounded" /></td>
                  ))}
                </tr>
              ))
            ) : damages.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-5 py-14 text-center text-gray-400">
                  <p className="text-sm">No damage reports found.</p>
                </td>
              </tr>
            ) : (
              damages.map((d) => (
                <tr key={d.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium text-gray-800">{d.equipment_name}</td>
                  <td className="px-5 py-3 font-mono text-xs text-gray-700 hidden sm:table-cell">{d.booking_reference}</td>
                  <td className="px-5 py-3 text-center hidden md:table-cell">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${SEVERITY_COLORS[d.severity] ?? 'bg-gray-100 text-gray-600'}`}>
                      {d.severity}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-gray-600 max-w-xs hidden lg:table-cell">
                    <p className="truncate">{d.description}</p>
                  </td>
                  <td className="px-5 py-3 text-right text-gray-700 hidden lg:table-cell">
                    {d.repair_cost ? `KES ${parseFloat(d.repair_cost).toLocaleString()}` : '—'}
                  </td>
                  <td className="px-5 py-3 text-right hidden xl:table-cell">
                    {parseFloat(d.amount_outstanding ?? 0) > 0 ? (
                      <span className="text-red-600 font-medium">
                        KES {parseFloat(d.amount_outstanding).toLocaleString()}
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-center">
                    <StatusBadge status={d.resolution_status ?? 'PENDING'} />
                  </td>
                  <td className="px-5 py-3 text-right">
                    {!['RESOLVED', 'WAIVED'].includes(d.resolution_status) && (
                      <button
                        onClick={() => setResolveTarget(d)}
                        className="px-2.5 py-1 text-xs border border-blue-300 text-blue-600 rounded hover:bg-blue-50 transition-colors"
                      >
                        Resolve
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

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

      {showCreateModal && (
        <DamageCreateModal
          preloadReturn={preloadReturn}
          onClose={handleCreateClose}
          onSaved={() => { handleCreateClose(); fetchDamages(); }}
        />
      )}

      {resolveTarget && (
        <DamageResolveModal
          damage={resolveTarget}
          onClose={() => setResolveTarget(null)}
          onSaved={() => { setResolveTarget(null); fetchDamages(); }}
        />
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function AdminReturnsPage() {
  const [activeTab, setActiveTab]         = useState('returns');
  const [logDamageReturn, setLogDamageReturn] = useState(null);

  const handleLogDamage = (returnRecord) => {
    setLogDamageReturn(returnRecord);
    setActiveTab('damages');
  };

  const TABS = [
    { key: 'returns', label: 'Returns' },
    { key: 'damages', label: 'Damage Reports' },
  ];

  return (
    <div>
      {/* Header */}
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-gray-900">Returns &amp; Damages</h1>
        <p className="text-sm text-gray-500 mt-0.5">Track equipment returns and manage damage reports.</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 mb-5 border-b border-gray-200">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === tab.key
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'returns' && <ReturnsTab onLogDamage={handleLogDamage} />}
      {activeTab === 'damages' && (
        <DamagesTab
          initialReturn={logDamageReturn}
          onClearInitialReturn={() => setLogDamageReturn(null)}
        />
      )}
    </div>
  );
}
