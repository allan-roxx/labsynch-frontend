import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  bookingsApi,
  issuancesApi,
  returnsApi,
  usersApi,
  downloadPdf,
} from '../../api/endpoints';
import StatusBadge from '../../components/ui/StatusBadge';

// ── Progress stepper ─────────────────────────────────────────────────────────
const STEPS = [
  { key: 'PENDING',    label: 'Pending' },
  { key: 'APPROVED',   label: 'Approved' },
  { key: 'RESERVED',   label: 'Reserved' },
  { key: 'DISPATCHED', label: 'Dispatched' },
  { key: 'IN_USE',     label: 'In Use' },
  { key: 'RETURNED',   label: 'Returned' },
  { key: 'COMPLETED',  label: 'Completed' },
];

function stepIndex(status) {
  const idx = STEPS.findIndex((s) => s.key === status);
  return idx === -1 ? 0 : idx;
}

function ProgressStepper({ status }) {
  const current = stepIndex(status);
  const isCancelled = status === 'CANCELLED';
  const isOverdue   = status === 'OVERDUE';

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5">
      {(isCancelled || isOverdue) && (
        <div className={`mb-4 px-3 py-2 rounded-lg text-sm font-medium ${
          isCancelled ? 'bg-gray-100 text-gray-600' : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {isCancelled ? 'This booking has been cancelled.' : 'This booking is overdue.'}
        </div>
      )}
      <div className="flex items-start overflow-x-auto pb-1">
        {STEPS.map((step, idx) => {
          const isDone    = !isCancelled && idx < current;
          const isCurrent = !isCancelled && idx === current;
          return (
            <div key={step.key} className="flex items-center flex-1 last:flex-none min-w-0">
              <div className="flex flex-col items-center min-w-fit">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                  isCancelled               ? 'bg-gray-100 text-gray-400'
                  : isOverdue && isCurrent  ? 'bg-red-500 text-white'
                  : isDone || isCurrent     ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-400'
                }`}>
                  {isDone ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : idx + 1}
                </div>
                <span className={`mt-1.5 text-xs text-center leading-tight w-16 ${
                  (isDone || isCurrent) && !isCancelled ? 'text-gray-800 font-medium' : 'text-gray-400'
                }`}>
                  {step.label}
                </span>
              </div>
              {idx < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-1 mb-4 ${
                  !isCancelled && idx < current ? 'bg-blue-500' : 'bg-gray-200'
                }`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── UserSearchInput — live search combobox for school users ───────────────────
/**
 * Props:
 *   label       — field label text
 *   value       — currently selected user { id, full_name, email } | null
 *   onChange    — called with selected user object (or null on clear)
 *   initialSearch — optional search string to pre-populate (e.g. school_name)
 */
function UserSearchInput({ label, value, onChange, initialSearch = '' }) {
  const [query, setQuery]       = useState(value ? `${value.full_name} (${value.email})` : initialSearch);
  const [results, setResults]   = useState([]);
  const [open, setOpen]         = useState(false);
  const [searching, setSearching] = useState(false);
  const debounceRef             = useRef(null);
  const wrapperRef              = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Run initial search to pre-populate with school's users
  useEffect(() => {
    if (initialSearch && !value) doSearch(initialSearch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const doSearch = async (q) => {
    if (!q || q.trim().length < 2) { setResults([]); setOpen(false); return; }
    setSearching(true);
    try {
      const res = await usersApi.list({ search: q, user_type: 'SCHOOL', page_size: 8 });
      const d = res?.data ?? res;
      const list = d?.results ?? (Array.isArray(d) ? d : []);
      setResults(list);
      setOpen(list.length > 0);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleInputChange = (e) => {
    const q = e.target.value;
    setQuery(q);
    if (value) onChange(null); // clear selection when typing again
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(q), 300);
  };

  const handleSelect = (user) => {
    setQuery(`${user.full_name} (${user.email})`);
    onChange(user);
    setOpen(false);
    setResults([]);
  };

  const handleClear = () => {
    setQuery('');
    onChange(null);
    setResults([]);
    setOpen(false);
  };

  return (
    <div ref={wrapperRef} className="relative">
      <label className="block text-xs font-medium text-gray-600 mb-1">
        {label} <span className="text-red-500">*</span>
      </label>
      <div className="relative flex items-center">
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => { if (results.length) setOpen(true); }}
          placeholder="Search by name or email…"
          autoComplete="off"
          className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 pr-8 ${
            value
              ? 'border-green-400 ring-1 ring-green-300 bg-green-50'
              : 'border-gray-300 focus:ring-blue-500'
          }`}
        />
        {/* State icon */}
        <span className="absolute right-2 text-gray-400 pointer-events-none">
          {searching ? (
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 100 16v-4l-3 3 3 3v-4a8 8 0 01-8-8z" />
            </svg>
          ) : value ? (
            <button type="button" onClick={handleClear} className="text-green-500 hover:text-red-500 pointer-events-auto">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 111 11a6 6 0 0116 0z" />
            </svg>
          )}
        </span>
      </div>

      {/* Selected chip */}
      {value && (
        <p className="mt-1 text-xs text-green-700 font-medium">
          Selected: {value.full_name} · {value.email}
        </p>
      )}

      {/* Dropdown */}
      {open && results.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-52 overflow-y-auto">
          {results.map((user) => (
            <li key={user.id}>
              <button
                type="button"
                onClick={() => handleSelect(user)}
                className="w-full text-left px-4 py-2.5 hover:bg-blue-50 transition-colors"
              >
                <p className="text-sm font-medium text-gray-900">{user.full_name}</p>
                <p className="text-xs text-gray-500">{user.email}</p>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function IssuanceModal({ booking, onClose, onDone }) {
  const [selectedUser, setSelectedUser] = useState(null);
  const [notes, setNotes]   = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr]       = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedUser) { setErr('Please select a school user who will receive the equipment.'); return; }
    setSaving(true);
    setErr('');
    try {
      await issuancesApi.create({
        booking:     booking.id,
        received_by: selectedUser.id,
        issue_notes: notes,
      });
      onDone();
    } catch (ex) {
      const msg = ex?.errors
        ? Object.values(ex.errors).flat().join(' ')
        : ex?.message || 'Failed to create issuance.';
      setErr(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Issue Equipment</h2>
            <p className="text-xs text-gray-500 mt-0.5">{booking.booking_reference} · {booking.school_name}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-2xl leading-none">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {err && <div className="px-3 py-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{err}</div>}

          <UserSearchInput
            label="Received by (school user)"
            value={selectedUser}
            onChange={setSelectedUser}
            initialSearch={booking.school_name ?? ''}
          />

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Issue Notes (optional)</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              disabled={saving || !selectedUser}
              className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Issuing…' : 'Confirm Issuance'}
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


// ── Return Modal ──────────────────────────────────────────────────────────────
function ReturnModal({ booking, onClose, onDone }) {
  const [selectedUser, setSelectedUser] = useState(null);
  const [notes, setNotes]     = useState('');
  const [hasDamage, setHasDamage] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [err, setErr]         = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedUser) { setErr('Please select the school user who is returning the equipment.'); return; }
    setSaving(true);
    setErr('');
    try {
      await returnsApi.create({
        booking:      booking.id,
        returned_by:  selectedUser.id,
        return_notes: notes,
        has_damage:   hasDamage,
      });
      onDone();
    } catch (ex) {
      const msg = ex?.errors
        ? Object.values(ex.errors).flat().join(' ')
        : ex?.message || 'Failed to record return.';
      setErr(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Record Equipment Return</h2>
            <p className="text-xs text-gray-500 mt-0.5">{booking.booking_reference} · {booking.school_name}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-2xl leading-none">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {err && <div className="px-3 py-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{err}</div>}

          <UserSearchInput
            label="Returned by (school user)"
            value={selectedUser}
            onChange={setSelectedUser}
            initialSearch={booking.school_name ?? ''}
          />

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Return Notes (optional)</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={hasDamage}
              onChange={(e) => setHasDamage(e.target.checked)}
              className="rounded accent-red-500"
            />
            <span className="text-sm text-gray-700">Equipment returned with damage</span>
          </label>
          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              disabled={saving || !selectedUser}
              className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Recording…' : 'Confirm Return'}
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

// ── Main page ─────────────────────────────────────────────────────────────────
export default function AdminBookingDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  // Action state
  const [acting, setActing]               = useState('');
  const [actionError, setActionError]     = useState('');
  const [showIssueModal, setShowIssueModal]   = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [downloadingPdf, setDownloadingPdf]   = useState(false);

  const fetchBooking = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await bookingsApi.retrieve(id);
      setBooking(res?.data ?? res);
    } catch (err) {
      setError(err?.message || 'Failed to load booking.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchBooking(); }, [fetchBooking]);

  // Generic simple action (no modal needed)
  const doAction = async (apiCall, label) => {
    if (!window.confirm(`${label} booking ${booking.booking_reference}?`)) return;
    setActing(label);
    setActionError('');
    try {
      await apiCall(booking.id);
      await fetchBooking();
    } catch (err) {
      setActionError(err?.message || `Failed to ${label.toLowerCase()} booking.`);
    } finally {
      setActing('');
    }
  };

  const handleDownloadContract = async () => {
    setDownloadingPdf(true);
    try {
      const res = await bookingsApi.contract(booking.id);
      downloadPdf(res, `contract-${booking.booking_reference}.pdf`);
    } catch {
      alert('Failed to download contract PDF.');
    } finally {
      setDownloadingPdf(false);
    }
  };

  // ── Loading skeleton ──
  if (loading) {
    return (
      <div className="animate-pulse space-y-4 max-w-3xl">
        <div className="h-6 bg-gray-200 rounded w-48" />
        <div className="h-24 bg-gray-200 rounded-xl" />
        <div className="h-64 bg-gray-200 rounded-xl" />
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="text-center py-20 text-gray-500">
        <p className="mb-4">{error || 'Booking not found.'}</p>
        <Link to="/admin/bookings" className="text-blue-600 hover:underline text-sm">
          Back to Bookings
        </Link>
      </div>
    );
  }

  const status = booking.status;

  // ── Derive which actions are available ──
  // PENDING → APPROVED
  const canApprove = status === 'PENDING';
  // RESERVED → DISPATCHED (transport=true) or RESERVED → IN_USE (transport=false)
  // DISPATCHED → IN_USE (second issuance confirms delivery)
  const canIssue = ['RESERVED', 'DISPATCHED'].includes(status);
  // IN_USE / OVERDUE → RETURNED
  const canReturn = ['IN_USE', 'OVERDUE'].includes(status);
  // RETURNED → COMPLETED
  const canComplete = status === 'RETURNED';
  // * → CANCELLED (early stages only)
  const canCancel = ['PENDING', 'APPROVED', 'RESERVED'].includes(status);

  // Cost
  const equipmentCost = booking.booking_items?.reduce(
    (s, i) => s + parseFloat(i.subtotal || 0), 0,
  ) ?? 0;
  const transportCost = parseFloat(booking.transport_cost || 0);
  const personnelCost = booking.booking_items?.reduce(
    (s, i) => s + parseFloat(i.personnel_cost || 0), 0,
  ) ?? 0;
  const totalAmount = parseFloat(booking.total_amount || 0);

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-KE', { dateStyle: 'medium' }) : '—';
  const fmtKes  = (n) => `KES ${parseFloat(n || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}`;

  return (
    <div className="max-w-3xl">
      {/* ── Back + title ── */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="text-gray-400 hover:text-gray-700 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            Booking #{booking.booking_reference}
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {booking.school_name} · Created {fmtDate(booking.created_at)}
          </p>
        </div>
        <div className="ml-auto">
          <StatusBadge status={status} />
        </div>
      </div>

      {/* ── Action error ── */}
      {actionError && (
        <div className="mb-4 px-4 py-2.5 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
          {actionError}
        </div>
      )}

      {/* ── Progress stepper ── */}
      <ProgressStepper status={status} />

      {/* ── Action bar ── */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-5 flex flex-wrap gap-2 items-center">
        <span className="text-xs text-gray-500 font-medium mr-auto">Actions</span>

        {/* Download contract */}
        <button
          onClick={handleDownloadContract}
          disabled={downloadingPdf}
          className="px-3 py-1.5 text-xs border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          {downloadingPdf ? 'Downloading…' : 'Download Contract'}
        </button>

        {canApprove && (
          <button
            disabled={!!acting}
            onClick={() => doAction(bookingsApi.approve, 'Approve')}
            className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {acting === 'Approve' ? '…' : 'Approve'}
          </button>
        )}

        {/* RESERVED → DISPATCHED or IN_USE; DISPATCHED → IN_USE */}
        {canIssue && (
          <button
            onClick={() => setShowIssueModal(true)}
            className="px-3 py-1.5 text-xs bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            {status === 'DISPATCHED'
              ? 'Confirm Delivery (IN_USE)'
              : booking.requires_transport
              ? 'Dispatch (Create Issuance)'
              : 'Issue to School (IN_USE)'}
          </button>
        )}

        {canReturn && (
          <button
            onClick={() => setShowReturnModal(true)}
            className="px-3 py-1.5 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            Record Return
          </button>
        )}

        {canComplete && (
          <button
            disabled={!!acting}
            onClick={() => doAction(bookingsApi.complete, 'Complete')}
            className="px-3 py-1.5 text-xs bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 transition-colors"
          >
            {acting === 'Complete' ? '…' : 'Mark Completed'}
          </button>
        )}

        {canCancel && (
          <button
            disabled={!!acting}
            onClick={() => doAction(bookingsApi.cancel, 'Cancel')}
            className="px-3 py-1.5 text-xs border border-red-200 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors"
          >
            {acting === 'Cancel' ? '…' : 'Cancel Booking'}
          </button>
        )}
      </div>

      {/* ── State machine hint ── */}
      <div className="mb-5 px-4 py-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-700">
        <p className="font-semibold mb-1">State Machine — current transitions available:</p>
        <ul className="space-y-0.5 list-disc list-inside">
          {canApprove   && <li>Approve → moves booking to APPROVED</li>}
          {canIssue && status === 'RESERVED' && !booking.requires_transport && <li>Issue to School → moves to IN_USE (self-collect)</li>}
          {canIssue && status === 'RESERVED' && booking.requires_transport  && <li>Dispatch → moves to DISPATCHED (transport delivery)</li>}
          {canIssue && status === 'DISPATCHED' && <li>Confirm Delivery → moves to IN_USE</li>}
          {canReturn    && <li>Record Return → moves to RETURNED</li>}
          {canComplete  && <li>Mark Completed → moves to COMPLETED</li>}
          {canCancel    && <li>Cancel → cancels booking from {status}</li>}
          {!canApprove && !canIssue && !canReturn && !canComplete && !canCancel && (
            <li>No admin actions available at this stage.</li>
          )}
        </ul>
      </div>

      {/* ── Booking details ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
        {/* Dates */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Dates</h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">Pickup</dt>
              <dd className="font-medium text-gray-900">{fmtDate(booking.pickup_date)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Return</dt>
              <dd className="font-medium text-gray-900">{fmtDate(booking.return_date)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Delivery</dt>
              <dd className="font-medium text-gray-900">
                {booking.requires_transport ? 'Transport Requested' : 'Self-Pickup'}
              </dd>
            </div>
          </dl>
        </div>

        {/* Cost summary */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Cost Summary</h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">Equipment</dt>
              <dd className="font-medium text-gray-900">{fmtKes(equipmentCost)}</dd>
            </div>
            {personnelCost > 0 && (
              <div className="flex justify-between">
                <dt className="text-gray-500">Personnel</dt>
                <dd className="font-medium text-gray-900">{fmtKes(personnelCost)}</dd>
              </div>
            )}
            {transportCost > 0 && (
              <div className="flex justify-between">
                <dt className="text-gray-500">Transport</dt>
                <dd className="font-medium text-gray-900">{fmtKes(transportCost)}</dd>
              </div>
            )}
            <div className="flex justify-between border-t border-gray-100 pt-2 mt-2">
              <dt className="font-semibold text-gray-900">Total</dt>
              <dd className="font-bold text-gray-900">{fmtKes(totalAmount)}</dd>
            </div>
          </dl>
        </div>
      </div>

      {/* ── Equipment items ── */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-5">
        <div className="px-5 py-3 border-b border-gray-100">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Equipment Items</h3>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-5 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Item</th>
              <th className="text-right px-5 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Qty</th>
              <th className="text-right px-5 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide hidden sm:table-cell">Unit/Day</th>
              <th className="text-right px-5 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Subtotal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {(booking.booking_items ?? []).map((item) => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="px-5 py-3">
                  <p className="font-medium text-gray-900">{item.equipment?.equipment_name ?? '—'}</p>
                  <p className="text-xs text-gray-400">{item.equipment?.equipment_code ?? ''}</p>
                </td>
                <td className="px-5 py-3 text-right text-gray-700">{item.quantity}</td>
                <td className="px-5 py-3 text-right text-gray-700 hidden sm:table-cell">
                  {fmtKes(item.unit_price)}
                </td>
                <td className="px-5 py-3 text-right font-medium text-gray-900">
                  {fmtKes(item.subtotal)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Special instructions ── */}
      {booking.special_instructions && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Special Instructions</h3>
          <p className="text-sm text-gray-700 whitespace-pre-line">{booking.special_instructions}</p>
        </div>
      )}

      {/* ── Modals ── */}
      {showIssueModal && (
        <IssuanceModal
          booking={booking}
          onClose={() => setShowIssueModal(false)}
          onDone={() => { setShowIssueModal(false); fetchBooking(); }}
        />
      )}
      {showReturnModal && (
        <ReturnModal
          booking={booking}
          onClose={() => setShowReturnModal(false)}
          onDone={() => { setShowReturnModal(false); fetchBooking(); }}
        />
      )}
    </div>
  );
}
