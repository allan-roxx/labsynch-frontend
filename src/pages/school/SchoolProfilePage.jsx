import { useState, useEffect } from 'react';
import { usersApi } from '../../api/endpoints';
import StatusBadge from '../../components/ui/StatusBadge';

export default function SchoolProfilePage() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    usersApi.mySchoolProfile()
      .then((res) => {
        const data = res?.data ?? res;
        setProfile(data);
        setForm({
          school_name: data.school_name ?? '',
          contact_person: data.contact_person ?? '',
          contact_designation: data.contact_designation ?? '',
          physical_address: data.physical_address ?? '',
          county: data.county ?? '',
          town: data.town ?? '',
          phone_number: data.phone_number ?? '',
        });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaveError('');
    setSaveSuccess(false);
    setFieldErrors({});
    try {
      const res = await usersApi.updateMySchoolProfile(form);
      const updated = res?.data ?? res;
      setProfile(updated);
      setEditing(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      if (err?.errors) {
        const { non_field_errors, ...fe } = err.errors;
        setFieldErrors(fe);
        setSaveError(non_field_errors?.[0] || 'Failed to save profile.');
      } else {
        setSaveError(err?.message || 'Failed to save profile.');
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4 max-w-2xl">
        <div className="h-7 bg-gray-200 rounded w-40" />
        <div className="h-64 bg-gray-200 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage your school's information.</p>
        </div>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Edit Profile
          </button>
        )}
      </div>

      {saveSuccess && (
        <div className="mb-4 px-4 py-2.5 bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg">
          Profile updated successfully!
        </div>
      )}

      {saveError && (
        <div className="mb-4 px-4 py-2.5 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
          {saveError}
        </div>
      )}

      {/* Read-only status strip */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5">
        <h3 className="font-semibold text-gray-900 mb-4 text-sm">Account Status</h3>
        <dl className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-gray-500 text-xs mb-1">Liability Status</dt>
            <dd><StatusBadge status={profile?.liability_status ?? 'CLEAR'} /></dd>
          </div>
          <div>
            <dt className="text-gray-500 text-xs mb-1">Account Status</dt>
            <dd><StatusBadge status={profile?.account_status ?? 'ACTIVE'} /></dd>
          </div>
          <div>
            <dt className="text-gray-500 text-xs mb-1">Transport Zone</dt>
            <dd className="font-medium text-gray-800">{profile?.transport_zone_name ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-gray-500 text-xs mb-1">Registration No.</dt>
            <dd className="font-medium text-gray-800">{profile?.registration_number ?? '—'}</dd>
          </div>
        </dl>
      </div>

      {/* Editable profile card */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-900 mb-4 text-sm">School Information</h3>

        {editing ? (
          <form onSubmit={handleSave} className="space-y-4">
            {[
              { key: 'school_name', label: 'School Name', required: true },
              { key: 'contact_person', label: 'Contact Person' },
              { key: 'contact_designation', label: 'Designation' },
              { key: 'physical_address', label: 'Physical Address' },
              { key: 'county', label: 'County' },
              { key: 'town', label: 'Town / Locality' },
              { key: 'phone_number', label: 'Phone Number' },
            ].map(({ key, label, required }) => (
              <div key={key}>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  {label}{required && <span className="text-red-500 ml-0.5">*</span>}
                </label>
                <input
                  type="text"
                  value={form[key] ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  required={required}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {fieldErrors[key] && (
                  <p className="text-red-600 text-xs mt-1">{fieldErrors[key][0]}</p>
                )}
              </div>
            ))}

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <dl className="space-y-3 text-sm">
            {[
              ['School Name', profile?.school_name],
              ['Contact Person', profile?.contact_person],
              ['Designation', profile?.contact_designation],
              ['Physical Address', profile?.physical_address],
              ['County', profile?.county],
              ['Town', profile?.town],
              ['Phone Number', profile?.phone_number],
              ['Email', profile?.user_email],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between gap-3">
                <dt className="text-gray-500 shrink-0">{label}</dt>
                <dd className="font-medium text-gray-900 text-right">{value || '—'}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </div>
  );
}
