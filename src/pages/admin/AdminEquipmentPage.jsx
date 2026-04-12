import { useState, useEffect, useCallback } from 'react';
import { equipmentApi, equipmentCategoriesApi } from '../../api/endpoints';
import StatusBadge from '../../components/ui/StatusBadge';

const CONDITION_OPTIONS = ['NEW', 'GOOD', 'FAIR', 'NEEDS_MAINTENANCE'];
const EMPTY_FORM = {
  equipment_name: '',
  equipment_code: '',
  description: '',
  category: '',
  condition: 'GOOD',
  total_quantity: 1,
  unit_price_per_day: '',
  storage_location: '',
  acquisition_cost: '',
  acquisition_date: '',
  requires_personnel: false,
  personnel_cost_per_day: '',
  personnel_description: '',
};

function EquipmentModal({ editTarget, categories, onClose, onSaved }) {
  const [form, setForm] = useState(editTarget ? {
    equipment_name: editTarget.equipment_name ?? '',
    equipment_code: editTarget.equipment_code ?? '',
    description: editTarget.description ?? '',
    category: editTarget.category?.id ?? editTarget.category ?? '',
    condition: editTarget.condition ?? 'GOOD',
    total_quantity: editTarget.total_quantity ?? 1,
    unit_price_per_day: editTarget.unit_price_per_day ?? '',
    storage_location: editTarget.storage_location ?? '',
    acquisition_cost: editTarget.acquisition_cost ?? '',
    acquisition_date: editTarget.acquisition_date ?? '',
    requires_personnel: editTarget.requires_personnel ?? false,
    personnel_cost_per_day: editTarget.personnel_cost_per_day ?? '',
    personnel_description: editTarget.personnel_description ?? '',
  } : { ...EMPTY_FORM });

  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [saveError, setSaveError] = useState('');

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaveError('');
    setFieldErrors({});
    try {
      const payload = { ...form };
      if (!payload.acquisition_cost) delete payload.acquisition_cost;
      if (!payload.acquisition_date) delete payload.acquisition_date;
      if (!payload.personnel_cost_per_day) delete payload.personnel_cost_per_day;
      if (editTarget) {
        await equipmentApi.update(editTarget.id, payload);
      } else {
        await equipmentApi.create(payload);
      }
      onSaved();
    } catch (err) {
      if (err?.errors) {
        const { non_field_errors, ...fe } = err.errors;
        setFieldErrors(fe);
        setSaveError(non_field_errors?.[0] || 'Failed to save equipment.');
      } else {
        setSaveError(err?.message || 'Failed to save equipment.');
      }
    } finally {
      setSaving(false);
    }
  };

  const Field = ({ name, label, type = 'text', required }) => (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <input
        type={type}
        value={form[name] ?? ''}
        onChange={(e) => set(name, type === 'number' ? Number(e.target.value) : e.target.value)}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      {fieldErrors[name] && <p className="text-red-600 text-xs mt-1">{fieldErrors[name][0]}</p>}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">
            {editTarget ? 'Edit Equipment' : 'Add Equipment'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-2xl">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {saveError && (
            <div className="px-3 py-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{saveError}</div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <Field name="equipment_name" label="Equipment Name" required />
            <Field name="equipment_code" label="Equipment Code" required />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Category <span className="text-red-500">*</span></label>
            <select
              value={form.category}
              onChange={(e) => set('category', e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select category…</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.category_name}</option>)}
            </select>
            {fieldErrors.category && <p className="text-red-600 text-xs mt-1">{fieldErrors.category[0]}</p>}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
            <textarea
              rows={2}
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Condition</label>
              <select value={form.condition} onChange={(e) => set('condition', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {CONDITION_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <Field name="total_quantity" label="Total Quantity" type="number" required />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field name="unit_price_per_day" label="Price / Day (KES)" type="number" required />
            <Field name="storage_location" label="Storage Location" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field name="acquisition_cost" label="Acquisition Cost (KES)" type="number" />
            <Field name="acquisition_date" label="Acquisition Date" type="date" />
          </div>

          {/* Personnel section */}
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-3">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="requires_personnel"
                checked={form.requires_personnel}
                onChange={(e) => set('requires_personnel', e.target.checked)}
                className="rounded"
              />
              <label htmlFor="requires_personnel" className="text-sm font-medium text-amber-900">
                Requires Technician / Personnel
              </label>
            </div>
            {form.requires_personnel && (
              <>
                <Field name="personnel_cost_per_day" label="Personnel Cost / Day (KES)" type="number" />
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Personnel Description</label>
                  <textarea
                    rows={2}
                    value={form.personnel_description}
                    onChange={(e) => set('personnel_description', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>
              </>
            )}
          </div>

          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={saving}
              className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
              {saving ? 'Saving…' : editTarget ? 'Update Equipment' : 'Create Equipment'}
            </button>
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AdminEquipmentPage() {
  const [equipment, setEquipment] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ count: 0, next: null, previous: null });
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const fetchEquipment = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, page_size: 15, ordering: 'equipment_name' };
      if (search) params.search = search;
      const res = await equipmentApi.list(params);
      const payload = res?.data ?? res;
      const results = payload?.results || (Array.isArray(payload) ? payload : []);
      setEquipment(results);
      setPagination({ count: payload?.count || 0, next: payload?.next, previous: payload?.previous });
    } catch (err) {
      console.error('Failed to fetch equipment:', err);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { fetchEquipment(); }, [fetchEquipment]);
  useEffect(() => {
    equipmentCategoriesApi.list({ page_size: 50 })
      .then((res) => {
        const d = res?.data ?? res;
        setCategories(d?.results || (Array.isArray(d) ? d : []));
      })
      .catch(console.error);
  }, []);

  const handleDelete = async (eq) => {
    if (!window.confirm(`Delete "${eq.equipment_name}"? This cannot be undone.`)) return;
    setDeletingId(eq.id);
    try {
      await equipmentApi.delete(eq.id);
      await fetchEquipment();
    } catch (err) {
      alert(err?.message || 'Failed to delete equipment.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleSaved = () => {
    setShowModal(false);
    setEditTarget(null);
    fetchEquipment();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Equipment</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage laboratory equipment inventory.</p>
        </div>
        <button
          onClick={() => { setEditTarget(null); setShowModal(true); }}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          + Add Equipment
        </button>
      </div>

      <div className="mb-4">
        <form onSubmit={(e) => { e.preventDefault(); setSearch(searchInput); setPage(1); }} className="flex gap-2">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search equipment…"
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-56"
          />
          <button type="submit" className="px-3 py-2 border border-gray-300 text-sm rounded-lg hover:bg-gray-50">Search</button>
        </form>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Name</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide hidden md:table-cell">Category</th>
                <th className="text-center px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Condition</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide hidden sm:table-cell">Price/Day</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide hidden lg:table-cell">Available</th>
                <th className="text-center px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide hidden xl:table-cell">Personnel</th>
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
              ) : equipment.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-14 text-center text-gray-400">
                    <p className="text-sm">No equipment found.</p>
                  </td>
                </tr>
              ) : (
                equipment.map((eq) => (
                  <tr key={eq.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3">
                      <div>
                        <p className="font-medium text-gray-900">{eq.equipment_name}</p>
                        <p className="text-xs text-gray-400">{eq.equipment_code}</p>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-gray-600 hidden md:table-cell">{eq.category?.category_name}</td>
                    <td className="px-5 py-3 text-center">
                      <StatusBadge status={eq.condition} />
                    </td>
                    <td className="px-5 py-3 text-right text-gray-700 hidden sm:table-cell">
                      KES {parseFloat(eq.unit_price_per_day).toLocaleString()}
                    </td>
                    <td className="px-5 py-3 text-right text-gray-600 hidden lg:table-cell">
                      {eq.available_quantity} / {eq.total_quantity}
                    </td>
                    <td className="px-5 py-3 text-center hidden xl:table-cell">
                      {eq.requires_personnel
                        ? <span className="px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-800">Yes</span>
                        : <span className="text-gray-400 text-xs">No</span>
                      }
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex gap-1.5 justify-end">
                        <button
                          onClick={() => { setEditTarget(eq); setShowModal(true); }}
                          className="px-2.5 py-1 text-xs border border-gray-300 text-gray-600 rounded hover:bg-gray-50"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(eq)}
                          disabled={deletingId === eq.id}
                          className="px-2.5 py-1 text-xs border border-red-200 text-red-600 rounded hover:bg-red-50 disabled:opacity-50"
                        >
                          {deletingId === eq.id ? '…' : 'Delete'}
                        </button>
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

      {showModal && (
        <EquipmentModal
          editTarget={editTarget}
          categories={categories}
          onClose={() => { setShowModal(false); setEditTarget(null); }}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
