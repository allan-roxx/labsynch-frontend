import { useState, useEffect, useCallback } from 'react';
import { usersApi, transportZonesApi } from '../../api/endpoints';
import StatusBadge from '../../components/ui/StatusBadge';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function DraggableMarker({ position, onChange }) {
  useMapEvents({
    click(e) {
      onChange(e.latlng.lat, e.latlng.lng);
    },
  });
  return position[0] && position[1] ? (
    <Marker
      position={position}
      draggable
      eventHandlers={{
        dragend(e) {
          const { lat, lng } = e.target.getLatLng();
          onChange(lat, lng);
        },
      }}
    />
  ) : null;
}

export default function SchoolProfilePage() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  // transport zones for the dropdown
  const [zones, setZones] = useState([]);
  const [zonesLoading, setZonesLoading] = useState(false);

  // fetch profile on mount
  useEffect(() => {
    usersApi.mySchoolProfile()
      .then((res) => {
        const data = res?.data ?? res;
        setProfile(data);
        setForm({
          school_name:          data.school_name          ?? '',
          contact_person:       data.contact_person       ?? '',
          contact_designation:  data.contact_designation  ?? '',
          physical_address:     data.physical_address     ?? '',
          phone_number:         data.phone_number         ?? '',
          transport_zone:       data.transport_zone       ?? '',
          gps_latitude:         data.gps_latitude         ?? '',
          gps_longitude:        data.gps_longitude        ?? '',
        });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // fetch zones when editing opens
  useEffect(() => {
    if (!editing || zones.length > 0) return;
    setZonesLoading(true);
    transportZonesApi.list({ page_size: 100, ordering: 'zone_name' })
      .then((res) => {
        const d = res?.data ?? res;
        setZones(d?.results || (Array.isArray(d) ? d : []));
      })
      .catch(console.error)
      .finally(() => setZonesLoading(false));
  }, [editing, zones.length]);

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaveError('');
    setSaveSuccess(false);
    setFieldErrors({});
    try {
      const payload = { ...form };
      // send null if no zone selected so backend clears it
      if (!payload.transport_zone) payload.transport_zone = null;
      const res = await usersApi.updateMySchoolProfile(payload);
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

  // Find selected zone name for read-only display
  const selectedZone = zones.find((z) => z.id === profile?.transport_zone)
    || (profile?.transport_zone_name ? { zone_name: profile.transport_zone_name } : null);

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
            <dd className="font-medium text-gray-800">
              {profile?.transport_zone_name ?? (selectedZone?.zone_name) ?? '—'}
            </dd>
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
            {/* Simple text fields */}
            {[
              { key: 'school_name',         label: 'School Name',    required: true },
              { key: 'contact_person',       label: 'Contact Person' },
              { key: 'contact_designation',  label: 'Designation' },
              { key: 'physical_address',     label: 'Physical Address' },

            ].map(({ key, label, required }) => (
              <div key={key}>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  {label}{required && <span className="text-red-500 ml-0.5">*</span>}
                </label>
                <input
                  type="text"
                  value={form[key] ?? ''}
                  onChange={(e) => set(key, e.target.value)}
                  required={required}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {fieldErrors[key] && (
                  <p className="text-red-600 text-xs mt-1">{fieldErrors[key][0]}</p>
                )}
              </div>
            ))}

            {/* Transport Zone dropdown */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Transport Zone
              </label>
              {zonesLoading ? (
                <div className="h-9 bg-gray-100 rounded-lg animate-pulse" />
              ) : (
                <select
                  value={form.transport_zone ?? ''}
                  onChange={(e) => set('transport_zone', e.target.value || null)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">— No zone assigned —</option>
                  {zones.map((zone) => (
                    <option key={zone.id} value={zone.id}>
                      {zone.zone_name}
                      {zone.base_transport_fee
                        ? ` — KES ${parseFloat(zone.base_transport_fee).toLocaleString()}`
                        : ''}
                    </option>
                  ))}
                </select>
              )}
              {zones.length === 0 && !zonesLoading && (
                <p className="text-xs text-gray-400 mt-1">
                  No transport zones configured yet. Contact admin.
                </p>
              )}
              {fieldErrors.transport_zone && (
                <p className="text-red-600 text-xs mt-1">{fieldErrors.transport_zone[0]}</p>
              )}
            </div>

            {/* GPS Map Picker */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Pickup Location (GPS)</label>
              <div className="rounded-xl overflow-hidden border border-gray-200 mb-2" style={{ height: '260px' }}>
                <MapContainer
                  center={[
                    parseFloat(form.gps_latitude) || -1.286389,
                    parseFloat(form.gps_longitude) || 36.817223,
                  ]}
                  zoom={form.gps_latitude ? 14 : 6}
                  style={{ height: '100%', width: '100%' }}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  />
                  <DraggableMarker
                    position={[parseFloat(form.gps_latitude) || null, parseFloat(form.gps_longitude) || null]}
                    onChange={(lat, lng) => { set('gps_latitude', lat); set('gps_longitude', lng); }}
                  />
                </MapContainer>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!navigator.geolocation) return;
                  navigator.geolocation.getCurrentPosition(
                    (pos) => { set('gps_latitude', pos.coords.latitude); set('gps_longitude', pos.coords.longitude); },
                    () => {},
                  );
                }}
                className="text-xs text-blue-600 hover:underline"
              >
                Detect my location
              </button>
              {form.gps_latitude && form.gps_longitude && (
                <p className="text-[10px] text-gray-400 mt-1">
                  Lat: {parseFloat(form.gps_latitude).toFixed(6)}, Lng: {parseFloat(form.gps_longitude).toFixed(6)}
                  {' '}
                  <button type="button" className="text-red-400 hover:text-red-600" onClick={() => { set('gps_latitude', ''); set('gps_longitude', ''); }}>
                    Clear
                  </button>
                </p>
              )}
            </div>

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
          <>
            <dl className="space-y-3 text-sm">
              {[
                ['School Name',     profile?.school_name],
                ['Contact Person',  profile?.contact_person],
                ['Designation',     profile?.contact_designation],
                ['Physical Address',profile?.physical_address],
                ['Email',           profile?.user_email],
                ['Transport Zone',  profile?.transport_zone_name],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-3">
                  <dt className="text-gray-500 shrink-0">{label}</dt>
                  <dd className="font-medium text-gray-900 text-right">{value || '—'}</dd>
                </div>
              ))}
            </dl>
            {/* GPS read-only map */}
            {profile?.gps_latitude && profile?.gps_longitude ? (
              <div className="mt-4">
                <p className="text-xs font-medium text-gray-500 mb-1">School Location</p>
                <div className="rounded-xl overflow-hidden border border-gray-200" style={{ height: '200px' }}>
                  <MapContainer
                    center={[parseFloat(profile.gps_latitude), parseFloat(profile.gps_longitude)]}
                    zoom={14}
                    style={{ height: '100%', width: '100%' }}
                    scrollWheelZoom={false}
                  >
                    <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    />
                    <Marker position={[parseFloat(profile.gps_latitude), parseFloat(profile.gps_longitude)]} />
                  </MapContainer>
                </div>
              </div>
            ) : (
              <p className="text-xs text-gray-400 mt-3">No location set — click Edit Profile to add your GPS location.</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
