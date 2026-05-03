import { useState, useEffect, useCallback, useRef } from 'react';
import { maintenanceApi, equipmentApi } from '../../api/endpoints';
import StatusBadge from '../../components/ui/StatusBadge';

const ALL_STATUSES = ['ALL', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
const ALL_TYPES    = ['ALL', 'ROUTINE', 'REPAIR', 'CALIBRATION'];
const TYPE_LABELS  = { ROUTINE: 'Routine', REPAIR: 'Repair', CALIBRATION: 'Calibration' };

// ── Equipment search combobox ─────────────────────────────────────────────────
function EquipmentSearchInput({ value, onChange }) {
  const [query, setQuery]         = useState(value ? `${value.equipment_name} (${value.equipment_code})` : '');
  const [results, setResults]     = useState([]);
  const [open, setOpen]           = useState(false);
  const [searching, setSearching] = useState(false);
  const debounceRef               = useRef(null);
  const wrapperRef                = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const doSearch = async (q) => {
    if (!q || q.trim().length < 2) { setResults([]); setOpen(false); return; }
    setSearching(true);
    try {
      const res  = await equipmentApi.list({ search: q, page_size: 8 });
      const d    = res?.data ?? res;
      const list = d?.results ?? (Array.isArray(d) ? d : []);
      setResults(list);
      setOpen(list.length > 0);
    } catch { setResults([]); }
    finally { setSearching(false); }
  };

  const handleInputChange = (e) => {
    const q = e.target.value;
    setQuery(q);
    if (value) onChange(null);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(q), 300);
  };

  const handleSelect = (eq) => {
    setQuery(`${eq.equipment_name} (${eq.equipment_code})`);
    onChange(eq);
    setOpen(false);
    setResults([]);
  };

  return (
    <div ref={wrapperRef} className="relative">
      <label className="block text-xs font-medium text-gray-600 mb-1">
        Equipment <span className="text-red-500">*</span>
      </label>
      <input
        type="text"
        value={query}
        onChange={handleInputChange}
        onFocus={() => { if (results.length) setOpen(true); }}
        placeholder="Search equipment by name or code…"
        autoComplete="off"
        className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
          value ? 'border-green-400 ring-1 ring-green-300 bg-green-50' : 'border-gray-300 focus:ring-blue-500'
        }`}
      />
      {value && (
        <p className="mt-1 text-xs text-green-700 font-medium">
          Selected: {value.equipment_name} · {value.equipment_code}
        </p>
      )}
      {searching && <p className="mt-1 text-xs text-gray-400">Searching…</p>}
      {open && results.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
          {results.map((eq) => (
            <li key={eq.id}>
              <button
                type="button"
                onClick={() => handleSelect(eq)}
                className="w-full text-left px-4 py-2.5 hover:bg-blue-50 transition-colors"
              >
                <p className="text-sm font-medium text-gray-900">{eq.equipment_name}</p>
                <p className="text-xs text-gray-500">{eq.equipment_code}</p>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Create / Edit modal ───────────────────────────────────────────────────────
function MaintenanceModal({ initial, onClose, onSaved }) {
  const isEdit = !!initial;
  const [form, setForm] = useState({
    selectedEquipment: initial
      ? { id: initial.equipment, equipment_name: initial.equipment_name, equipment_code: initial.equipment_code }
      : null,
    maintenance_type: initial?.maintenance_type ?? 'ROUTINE',
    description:      initial?.description ?? '',
    scheduled_date:   initial?.scheduled_date ?? '',
    notes:            initial?.notes ?? '',
    // edit-only progress fields
    status:           initial?.status ?? 'SCHEDULED',
    technician_name:  initial?.technician_name ?? '',
    cost:             initial?.cost ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const validate = () => {
    const errs = {};
    if (!form.selectedEquipment)      errs.equipment     = 'Equipment is required.';
    if (!form.description.trim())     errs.description   = 'Description is required.';
    if (!form.scheduled_date)         errs.scheduled_date = 'Scheduled date is required.';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSaving(true);
    setErrors({});
    try {
      const payload = {
        equipment:        form.selectedEquipment.id,
        maintenance_type: form.maintenance_type,
        description:      form.description,
        scheduled_date:   form.scheduled_date,
        notes:            form.notes,
      };
      if (isEdit) {
        payload.status          = form.status;
        payload.technician_name = form.technician_name;
        payload.cost            = form.cost || null;
      }
      if (isEdit) {
        await maintenanceApi.update(initial.id, payload);
      } else {
        await maintenanceApi.create(payload);
      }
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
          <h2 className="text-lg font-bold text-gray-900">
            {isEdit ? 'Edit Maintenance Schedule' : 'Schedule Maintenance'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-2xl leading-none">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {errors._general && (
            <div className="px-3 py-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
              {errors._general}
            </div>
          )}

          <EquipmentSearchInput value={form.selectedEquipment} onChange={(eq) => set('selectedEquipment', eq)} />
          {errors.equipment && <p className="text-xs text-red-500 -mt-2">{errors.equipment}</p>}

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Maintenance Type</label>
            <select
              value={form.maintenance_type}
              onChange={(e) => set('maintenance_type', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ROUTINE">Routine Checkup</option>
              <option value="REPAIR">Repair</option>
              <option value="CALIBRATION">Calibration</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              className={`w-full border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.description ? 'border-red-400 bg-red-50' : 'border-gray-300'
              }`}
            />
            {errors.description && <p className="text-xs text-red-500 mt-0.5">{errors.description}</p>}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Scheduled Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={form.scheduled_date}
              onChange={(e) => set('scheduled_date', e.target.value)}
              className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.scheduled_date ? 'border-red-400 bg-red-50' : 'border-gray-300'
              }`}
            />
            {errors.scheduled_date && <p className="text-xs text-red-500 mt-0.5">{errors.scheduled_date}</p>}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Notes (optional)</label>
            <textarea
              rows={2}
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {isEdit && (
            <>
              <hr className="border-gray-100" />
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Progress Update</p>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => set('status', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="SCHEDULED">Scheduled</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Technician Name</label>
                <input
                  type="text"
                  value={form.technician_name}
                  onChange={(e) => set('technician_name', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Cost (KES)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.cost}
                  onChange={(e) => set('cost', e.target.value)}
                  placeholder="0.00"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Schedule'}
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

// ── Page ──────────────────────────────────────────────────────────────────────
export default function AdminMaintenancePage() {
  const [records, setRecords]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [search, setSearch]         = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage]             = useState(1);
  const [pagination, setPagination] = useState({ count: 0, next: null, previous: null });
  const [modal, setModal]           = useState(null); // null | { mode:'create' } | { mode:'edit', record }

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, page_size: 15, ordering: '-scheduled_date' };
      if (search)                    params.search           = search;
      if (statusFilter !== 'ALL')    params.status           = statusFilter;
      if (typeFilter   !== 'ALL')    params.maintenance_type = typeFilter;
      const res     = await maintenanceApi.list(params);
      const payload = res?.data ?? res;
      const results = payload?.results || (Array.isArray(payload) ? payload : []);
      setRecords(results);
      setPagination({ count: payload?.count || 0, next: payload?.next, previous: payload?.previous });
    } catch (err) {
      console.error('Failed to fetch maintenance records:', err);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, typeFilter]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  const handleSearch = (e) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this maintenance schedule?')) return;
    try {
      await maintenanceApi.delete(id);
      fetchRecords();
    } catch (err) {
      alert(err?.message || 'Failed to delete record.');
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Maintenance</h1>
          <p className="text-sm text-gray-500 mt-0.5">Schedule and track equipment maintenance activities.</p>
        </div>
        <button
          onClick={() => setModal({ mode: 'create' })}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Schedule Maintenance
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 mb-5">
        <div className="flex flex-col sm:flex-row gap-3">
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search equipment…"
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-56"
            />
            <button type="submit" className="px-3 py-2 border border-gray-300 text-sm rounded-lg hover:bg-gray-50">
              Search
            </button>
          </form>
          <div className="flex gap-1.5 flex-wrap items-center">
            <span className="text-xs text-gray-400 mr-1">Type:</span>
            {ALL_TYPES.map((t) => (
              <button
                key={t}
                onClick={() => { setTypeFilter(t); setPage(1); }}
                className={`px-3 py-1.5 text-xs rounded-full transition-colors ${
                  typeFilter === t ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {t === 'ALL' ? 'All Types' : TYPE_LABELS[t]}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-1.5 flex-wrap items-center">
          <span className="text-xs text-gray-400 mr-1">Status:</span>
          {ALL_STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => { setStatusFilter(s); setPage(1); }}
              className={`px-3 py-1.5 text-xs rounded-full transition-colors ${
                statusFilter === s ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {s === 'ALL' ? 'All Statuses' : s.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Equipment</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide hidden sm:table-cell">Type</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide hidden md:table-cell">Scheduled</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide hidden lg:table-cell">Technician</th>
              <th className="text-right px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide hidden lg:table-cell">Cost</th>
              <th className="text-center px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
              <th className="text-right px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  {Array.from({ length: 7 }).map((__, j) => (
                    <td key={j} className="px-5 py-3"><div className="h-4 bg-gray-200 rounded" /></td>
                  ))}
                </tr>
              ))
            ) : records.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-14 text-center text-gray-400">
                  <p className="text-sm">No maintenance records found.</p>
                </td>
              </tr>
            ) : (
              records.map((rec) => (
                <tr key={rec.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3">
                    <p className="font-medium text-gray-800">{rec.equipment_name}</p>
                    <p className="text-xs text-gray-500 font-mono">{rec.equipment_code}</p>
                  </td>
                  <td className="px-5 py-3 text-gray-600 text-xs hidden sm:table-cell">
                    {TYPE_LABELS[rec.maintenance_type] ?? rec.maintenance_type}
                  </td>
                  <td className="px-5 py-3 text-gray-600 text-sm hidden md:table-cell">
                    {rec.scheduled_date
                      ? new Date(rec.scheduled_date).toLocaleDateString('en-KE', { dateStyle: 'medium' })
                      : '—'}
                  </td>
                  <td className="px-5 py-3 text-gray-600 text-sm hidden lg:table-cell">
                    {rec.technician_name || '—'}
                  </td>
                  <td className="px-5 py-3 text-right text-gray-700 text-sm hidden lg:table-cell">
                    {rec.cost ? `KES ${parseFloat(rec.cost).toLocaleString()}` : '—'}
                  </td>
                  <td className="px-5 py-3 text-center">
                    <StatusBadge status={rec.status ?? 'SCHEDULED'} />
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-1.5 justify-end">
                      <button
                        onClick={() => setModal({ mode: 'edit', record: rec })}
                        className="px-2.5 py-1 text-xs border border-gray-300 text-gray-600 rounded hover:bg-gray-50 transition-colors"
                      >
                        Edit
                      </button>
                      {!['COMPLETED', 'CANCELLED'].includes(rec.status) && (
                        <button
                          onClick={() => handleDelete(rec.id)}
                          className="px-2.5 py-1 text-xs border border-red-200 text-red-600 rounded hover:bg-red-50 transition-colors"
                        >
                          Delete
                        </button>
                      )}
                    </div>
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
              <button
                disabled={!pagination.previous}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1 border rounded disabled:opacity-40 hover:bg-gray-50"
              >← Prev</button>
              <span className="px-3 py-1">Page {page}</span>
              <button
                disabled={!pagination.next}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1 border rounded disabled:opacity-40 hover:bg-gray-50"
              >Next →</button>
            </div>
          </div>
        )}
      </div>

      {modal && (
        <MaintenanceModal
          initial={modal.mode === 'edit' ? modal.record : null}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); fetchRecords(); }}
        />
      )}
    </div>
  );
}
