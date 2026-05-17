import { useState, useEffect, useCallback } from 'react';
import { equipmentApi, equipmentCategoriesApi } from '../../api/endpoints';
import StatusBadge from '../../components/ui/StatusBadge';
import ExportButton from '../../components/ui/ExportButton';

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
  is_consumable: false,
  requires_personnel: false,
  personnel_cost_per_day: '',
  personnel_description: '',
};

// ── Field component (defined outside to prevent re-creation on each render) ──
function Field({ name, label, type = 'text', required, value, onChange, errors }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <input
        type={type}
        value={value ?? ''}
        onChange={onChange}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      {errors?.[name] && <p className="text-red-600 text-xs mt-1">{errors[name][0]}</p>}
    </div>
  );
}

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
    is_consumable: editTarget.is_consumable ?? false,
    requires_personnel: editTarget.requires_personnel ?? false,
    personnel_cost_per_day: editTarget.personnel_cost_per_day ?? '',
    personnel_description: editTarget.personnel_description ?? '',
  } : { ...EMPTY_FORM });

  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [saveError, setSaveError] = useState('');

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const handleFieldChange = (name, type, value) => {
    set(name, type === 'number' ? Number(value) : value);
  };

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
            <Field name="equipment_name" label="Equipment Name" required value={form.equipment_name} onChange={(e) => handleFieldChange('equipment_name', 'text', e.target.value)} errors={fieldErrors} />
            <Field name="equipment_code" label="Equipment Code" required value={form.equipment_code} onChange={(e) => handleFieldChange('equipment_code', 'text', e.target.value)} errors={fieldErrors} />
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
            <Field name="total_quantity" label="Total Quantity" type="number" required value={form.total_quantity} onChange={(e) => handleFieldChange('total_quantity', 'number', e.target.value)} errors={fieldErrors} />
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Condition</label>
              <select value={form.condition} onChange={(e) => set('condition', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {CONDITION_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field name="unit_price_per_day" label="Price / Day (KES)" type="number" required value={form.unit_price_per_day} onChange={(e) => handleFieldChange('unit_price_per_day', 'number', e.target.value)} errors={fieldErrors} />
            <Field name="storage_location" label="Storage Location" value={form.storage_location} onChange={(e) => handleFieldChange('storage_location', 'text', e.target.value)} errors={fieldErrors} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field name="acquisition_cost" label="Acquisition Cost (KES)" type="number" value={form.acquisition_cost} onChange={(e) => handleFieldChange('acquisition_cost', 'number', e.target.value)} errors={fieldErrors} />
            <Field name="acquisition_date" label="Acquisition Date" type="date" value={form.acquisition_date} onChange={(e) => handleFieldChange('acquisition_date', 'text', e.target.value)} errors={fieldErrors} />
          </div>
          {/* Consumable toggle */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="is_consumable"
              checked={form.is_consumable}
              onChange={(e) => set('is_consumable', e.target.checked)}
              className="rounded"
            />
            <label htmlFor="is_consumable" className="text-sm font-medium text-gray-700">
              Consumable item (single-use, no return required)
            </label>
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
                <Field name="personnel_cost_per_day" label="Personnel Cost / Day (KES)" type="number" value={form.personnel_cost_per_day} onChange={(e) => handleFieldChange('personnel_cost_per_day', 'number', e.target.value)} errors={fieldErrors} />
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

function StockAppendModal({ equipmentOptions, onClose, onSaved }) {
  const [equipmentId, setEquipmentId] = useState(equipmentOptions?.[0]?.id ?? '');
  const [additionalQuantity, setAdditionalQuantity] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!equipmentId) {
      setError('Please select equipment.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      await equipmentApi.addStock(equipmentId, { additional_quantity: Number(additionalQuantity) });
      onSaved();
    } catch (err) {
      setError(err?.message || 'Failed to append stock.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Append Inventory Stock</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-2xl">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {error && (
            <div className="px-3 py-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{error}</div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Equipment</label>
            <select
              value={equipmentId}
              onChange={(e) => setEquipmentId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Select equipment…</option>
              {equipmentOptions.map((eq) => (
                <option key={eq.id} value={eq.id}>
                  {eq.equipment_name} ({eq.equipment_code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Quantity To Add</label>
            <input
              type="number"
              min={1}
              value={additionalQuantity}
              onChange={(e) => setAdditionalQuantity(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Updating…' : 'Append Stock'}
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

function EquipmentImagesModal({ equipment, onClose, onSaved }) {
  const [images, setImages] = useState(equipment.images || []);
  const [newImageFile, setNewImageFile] = useState(null);
  const [newIsPrimary, setNewIsPrimary] = useState(images.length === 0);
  const [newDisplayOrder, setNewDisplayOrder] = useState(images.length);
  const [replaceFiles, setReplaceFiles] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const refreshImages = async () => {
    const res = await equipmentApi.retrieve(equipment.id);
    const payload = res?.data ?? res;
    const latest = payload?.images || [];
    setImages(latest);
    onSaved();
  };

  const handleUploadNew = async (e) => {
    e.preventDefault();
    if (!newImageFile) {
      setError('Please choose an image to upload.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('image', newImageFile);
      formData.append('is_primary', newIsPrimary ? 'true' : 'false');
      formData.append('display_order', String(newDisplayOrder || 0));
      await equipmentApi.uploadImage(equipment.id, formData);

      setNewImageFile(null);
      setNewIsPrimary(false);
      await refreshImages();
    } catch (err) {
      setError(err?.message || 'Failed to upload image.');
    } finally {
      setSaving(false);
    }
  };

  const handleReplace = async (imageId) => {
    const file = replaceFiles[imageId];
    if (!file) {
      setError('Choose a replacement file first.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('image', file);
      await equipmentApi.updateImage(equipment.id, imageId, formData);
      setReplaceFiles((prev) => ({ ...prev, [imageId]: null }));
      await refreshImages();
    } catch (err) {
      setError(err?.message || 'Failed to replace image.');
    } finally {
      setSaving(false);
    }
  };

  const handleSetPrimary = async (imageId) => {
    setSaving(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('is_primary', 'true');
      await equipmentApi.updateImage(equipment.id, imageId, formData);
      await refreshImages();
    } catch (err) {
      setError(err?.message || 'Failed to update image.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Manage Images: {equipment.equipment_name}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-2xl">&times;</button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {error && (
            <div className="px-3 py-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{error}</div>
          )}

          <form onSubmit={handleUploadNew} className="p-4 border border-gray-200 rounded-xl space-y-3">
            <h3 className="text-sm font-semibold text-gray-800">Upload New Image</h3>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setNewImageFile(e.target.files?.[0] || null)}
              className="block w-full text-sm"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={newIsPrimary}
                  onChange={(e) => setNewIsPrimary(e.target.checked)}
                  className="rounded"
                />
                Set as primary image
              </label>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Display Order</label>
                <input
                  type="number"
                  min={0}
                  value={newDisplayOrder}
                  onChange={(e) => setNewDisplayOrder(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Uploading…' : 'Upload Image'}
            </button>
          </form>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {images.length === 0 ? (
              <p className="text-sm text-gray-500">No images uploaded yet.</p>
            ) : (
              images.map((img) => (
                <div key={img.id} className="border border-gray-200 rounded-xl p-3 space-y-3">
                  <img
                    src={img.image_url}
                    alt={equipment.equipment_name}
                    className="w-full h-40 object-cover rounded-lg bg-gray-100"
                  />
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">Order: {img.display_order}</span>
                    {img.is_primary ? (
                      <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-medium">Primary</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSetPrimary(img.id)}
                        className="px-2 py-1 border border-blue-200 text-blue-600 rounded hover:bg-blue-50"
                      >
                        Set Primary
                      </button>
                    )}
                  </div>
                  <div className="space-y-2">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) =>
                        setReplaceFiles((prev) => ({
                          ...prev,
                          [img.id]: e.target.files?.[0] || null,
                        }))
                      }
                      className="block w-full text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => handleReplace(img.id)}
                      disabled={saving}
                      className="px-3 py-1.5 text-xs border border-gray-300 text-gray-700 rounded hover:bg-gray-50 disabled:opacity-50"
                    >
                      Replace Image
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
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
  const [consumableFilter, setConsumableFilter] = useState('ALL'); // 'ALL' | 'CONSUMABLE' | 'REUSABLE'
  const [showAcqCost, setShowAcqCost] = useState(false);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ count: 0, next: null, previous: null });
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [showStockModal, setShowStockModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [imageTarget, setImageTarget] = useState(null);

  const fetchEquipment = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, page_size: 15, ordering: 'equipment_name' };
      if (search) params.search = search;
      if (consumableFilter === 'CONSUMABLE') params.is_consumable = true;
      if (consumableFilter === 'REUSABLE') params.is_consumable = false;
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
  }, [page, search, consumableFilter]);

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
    setShowStockModal(false);
    fetchEquipment();
  };

  const handleImageModalOpen = (eq) => {
    setImageTarget(eq);
    setShowImageModal(true);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Equipment Inventory</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage laboratory equipment inventory.</p>
        </div>
        <div className="flex items-center gap-2">
          <ExportButton
            endpoint="/api/equipment/export/"
            params={{
              ...(search ? { search } : {}),
              ...(consumableFilter === 'CONSUMABLE'
                ? { is_consumable: true }
                : consumableFilter === 'REUSABLE'
                ? { is_consumable: false }
                : {}),
            }}
            filename="equipment"
          />
          <button
            onClick={() => setShowStockModal(true)}
            className="px-4 py-2 border border-blue-200 text-blue-700 text-sm font-medium rounded-lg hover:bg-blue-50 transition-colors"
          >
            + Append Stock
          </button>
          <button
            onClick={() => { setEditTarget(null); setShowModal(true); }}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            + Add Equipment
          </button>
        </div>
      </div>

      <div className="mb-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
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
        <div className="flex gap-1.5">
          {['ALL', 'CONSUMABLE', 'REUSABLE'].map((f) => (
            <button
              key={f}
              onClick={() => { setConsumableFilter(f); setPage(1); }}
              className={`px-3 py-1.5 text-xs rounded-full transition-colors ${
                consumableFilter === f
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f === 'ALL' ? 'All Types' : f === 'CONSUMABLE' ? 'Consumables' : 'Reusables'}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowAcqCost((v) => !v)}
          className={`px-3 py-1.5 text-xs rounded-full transition-colors ${
            showAcqCost ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          {showAcqCost ? 'Hide Acq. Cost' : 'Show Acq. Cost'}
        </button>
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
              <th className="text-center px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide hidden xl:table-cell">Type</th>
              {showAcqCost && (
                <th className="text-right px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide hidden lg:table-cell">Acq. Cost</th>
              )}
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
                    <td className="px-5 py-3 text-center hidden xl:table-cell">
                      {eq.is_consumable
                        ? <span className="px-2 py-0.5 rounded-full text-xs bg-orange-100 text-orange-800">Consumable</span>
                        : <span className="text-gray-400 text-xs">Reusable</span>
                      }
                    </td>
                    {showAcqCost && (
                      <td className="px-5 py-3 text-right text-gray-600 hidden lg:table-cell text-xs">
                        {eq.acquisition_cost ? `KES ${parseFloat(eq.acquisition_cost).toLocaleString()}` : '—'}
                      </td>
                    )}
                    <td className="px-5 py-3 text-right">
                      <div className="flex gap-1.5 justify-end">
                        <button
                          onClick={() => { setEditTarget(eq); setShowModal(true); }}
                          className="px-2.5 py-1 text-xs border border-gray-300 text-gray-600 rounded hover:bg-gray-50"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleImageModalOpen(eq)}
                          className="px-2.5 py-1 text-xs border border-blue-200 text-blue-600 rounded hover:bg-blue-50"
                        >
                          Images
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

      {showStockModal && (
        <StockAppendModal
          equipmentOptions={equipment}
          onClose={() => setShowStockModal(false)}
          onSaved={handleSaved}
        />
      )}

      {showImageModal && imageTarget && (
        <EquipmentImagesModal
          equipment={imageTarget}
          onClose={() => {
            setShowImageModal(false);
            setImageTarget(null);
          }}
          onSaved={fetchEquipment}
        />
      )}
    </div>
  );
}
