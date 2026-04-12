import { useState, useEffect, useCallback } from 'react';
import { transportZonesApi } from '../../api/endpoints';

const EMPTY_FORM = {
  zone_name: '',
  description: '',
  base_transport_fee: '',
  is_active: true,
};

function ZoneModal({ editTarget, onClose, onSaved }) {
  const [form, setForm] = useState(editTarget ? {
    zone_name: editTarget.zone_name ?? '',
    description: editTarget.description ?? '',
    base_transport_fee: editTarget.base_transport_fee ?? '',
    is_active: editTarget.is_active ?? true,
  } : { ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [saveError, setSaveError] = useState('');

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaveError('');
    setFieldErrors({});
    try {
      if (editTarget) {
        await transportZonesApi.update(editTarget.id, form);
      } else {
        await transportZonesApi.create(form);
      }
      onSaved();
    } catch (err) {
      if (err?.errors) {
        const { non_field_errors, ...fe } = err.errors;
        setFieldErrors(fe);
        setSaveError(non_field_errors?.[0] || 'Failed to save zone.');
      } else {
        setSaveError(err?.message || 'Failed to save zone.');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">
            {editTarget ? 'Edit Zone' : 'Create Transport Zone'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-2xl">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {saveError && (
            <div className="px-3 py-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{saveError}</div>
          )}
          {[
            { name: 'zone_name', label: 'Zone Name', type: 'text', required: true },
            { name: 'base_transport_fee', label: 'Base Transport Fee (KES)', type: 'number', required: true },
          ].map(({ name, label, type, required }) => (
            <div key={name}>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                {label}{required && <span className="text-red-500 ml-0.5">*</span>}
              </label>
              <input
                type={type}
                value={form[name] ?? ''}
                onChange={(e) => set(name, e.target.value)}
                required={required}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {fieldErrors[name] && <p className="text-red-600 text-xs mt-1">{fieldErrors[name][0]}</p>}
            </div>
          ))}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
            <textarea rows={2} value={form.description} onChange={(e) => set('description', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="is_active" checked={form.is_active}
              onChange={(e) => set('is_active', e.target.checked)} className="rounded" />
            <label htmlFor="is_active" className="text-sm text-gray-700">Active</label>
          </div>
          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={saving}
              className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {saving ? 'Saving…' : editTarget ? 'Update Zone' : 'Create Zone'}
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

export default function AdminTransportZonesPage() {
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const fetchZones = useCallback(async () => {
    setLoading(true);
    try {
      const res = await transportZonesApi.list({ page_size: 100, ordering: 'zone_name' });
      const d = res?.data ?? res;
      setZones(d?.results || (Array.isArray(d) ? d : []));
    } catch (err) {
      console.error('Failed to fetch zones:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchZones(); }, [fetchZones]);

  const handleDelete = async (zone) => {
    if (!window.confirm(`Delete zone "${zone.zone_name}"?`)) return;
    setDeletingId(zone.id);
    try {
      await transportZonesApi.delete(zone.id);
      await fetchZones();
    } catch (err) {
      alert(err?.message || 'Failed to delete zone.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleSaved = () => {
    setShowModal(false);
    setEditTarget(null);
    fetchZones();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Transport Zones</h1>
          <p className="text-sm text-gray-500 mt-0.5">Configure delivery zones and base fees.</p>
        </div>
        <button
          onClick={() => { setEditTarget(null); setShowModal(true); }}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          + New Zone
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Zone Name</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide hidden md:table-cell">Description</th>
              <th className="text-right px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Base Fee</th>
              <th className="text-center px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Active</th>
              <th className="text-right px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  {Array.from({ length: 5 }).map((__, j) => (
                    <td key={j} className="px-5 py-3"><div className="h-4 bg-gray-200 rounded" /></td>
                  ))}
                </tr>
              ))
            ) : zones.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-14 text-center text-gray-400">
                  <p className="text-sm">No transport zones configured.</p>
                  <button
                    onClick={() => { setEditTarget(null); setShowModal(true); }}
                    className="mt-3 text-blue-600 hover:underline text-sm"
                  >
                    Create your first zone →
                  </button>
                </td>
              </tr>
            ) : (
              zones.map((zone) => (
                <tr key={zone.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium text-gray-900">{zone.zone_name}</td>
                  <td className="px-5 py-3 text-gray-600 hidden md:table-cell">{zone.description || '—'}</td>
                  <td className="px-5 py-3 text-right text-gray-700">
                    KES {parseFloat(zone.base_transport_fee || 0).toLocaleString()}
                  </td>
                  <td className="px-5 py-3 text-center">
                    {zone.is_active
                      ? <span className="px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-800">Active</span>
                      : <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-500">Inactive</span>}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex gap-1.5 justify-end">
                      <button
                        onClick={() => { setEditTarget(zone); setShowModal(true); }}
                        className="px-2.5 py-1 text-xs border border-gray-300 text-gray-600 rounded hover:bg-gray-50"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(zone)}
                        disabled={deletingId === zone.id}
                        className="px-2.5 py-1 text-xs border border-red-200 text-red-600 rounded hover:bg-red-50 disabled:opacity-50"
                      >
                        {deletingId === zone.id ? '…' : 'Delete'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <ZoneModal
          editTarget={editTarget}
          onClose={() => { setShowModal(false); setEditTarget(null); }}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
