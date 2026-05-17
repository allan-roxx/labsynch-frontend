import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  bookingsApi,
  issuancesApi,
  returnsApi,
  downloadPdf,
} from '../../api/endpoints';
import StatusBadge from '../../components/ui/StatusBadge';

// ── Delivery status badge ─────────────────────────────────────────────────────
const DELIVERY_STATUS_STYLES = {
  PENDING:  'bg-gray-100 text-gray-600',
  ON_TIME:  'bg-green-100 text-green-700',
  LATE:     'bg-amber-100 text-amber-700',
  FAILED:   'bg-red-100 text-red-700',
};
const DELIVERY_STATUS_LABELS = {
  PENDING: 'Pending Delivery',
  ON_TIME: 'Delivered On Time',
  LATE:    'Delivered Late',
  FAILED:  'Delivery Failed',
};
function DeliveryBadge({ status }) {
  const s = status || 'PENDING';
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${DELIVERY_STATUS_STYLES[s] || DELIVERY_STATUS_STYLES.PENDING}`}>
      {DELIVERY_STATUS_LABELS[s] || s}
    </span>
  );
}

// ── Mark Delivery Modal ───────────────────────────────────────────────────────
function MarkDeliveryModal({ issuanceId, onClose, onDone }) {
  const [deliveryStatus, setDeliveryStatus] = useState('ON_TIME');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErr('');
    try {
      await issuancesApi.markDelivery(issuanceId, {
        delivery_status: deliveryStatus,
        delivery_notes: notes,
      });
      onDone();
    } catch (ex) {
      setErr(ex?.message || 'Failed to update delivery status.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Mark Delivery</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-2xl leading-none">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {err && <div className="px-3 py-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{err}</div>}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Delivery Status <span className="text-red-500">*</span></label>
            <select
              value={deliveryStatus}
              onChange={(e) => setDeliveryStatus(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ON_TIME">Delivered On Time</option>
              <option value="LATE">Delivered Late</option>
              <option value="FAILED">Delivery Failed</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Delivery Notes (optional)</label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Update Delivery'}
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

// ── Progress stepper ─────────────────────────────────────────────────────────
const STEPS = [
  { key: 'PENDING',    label: 'Pending Payment' },
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

function IssuanceModal({ booking, onClose, onDone }) {
  const [notes, setNotes]   = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr]       = useState('');

  const recipientName = booking.school_user_name || booking.school_name || 'Booking school';
  const recipientEmail = booking.school_user_email || '';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErr('');
    try {
      await issuancesApi.create({
        booking:     booking.id,
        received_by: booking.school_user_id,
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

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Received by</label>
            <div className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
              <div className="font-medium text-gray-900">{recipientName}</div>
              {recipientEmail && <div className="text-xs text-gray-500">{recipientEmail}</div>}
            </div>
          </div>

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
              disabled={saving || !booking.school_user_id}
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


// ── Confirm Delivery Modal (DISPATCHED → IN_USE) ────────────────────────────
function ConfirmDeliveryModal({ booking, onClose, onDone }) {
  const [notes, setNotes]   = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr]       = useState('');

  const recipientName = booking.school_user_name || booking.school_name || 'Booking school';
  const recipientEmail = booking.school_user_email || '';
  const recipientId = booking.school_user_id || booking.school_profile?.user?.id || null;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!recipientId) {
      setErr('Cannot confirm delivery: school recipient account is missing on this booking.');
      return;
    }

    setSaving(true);
    setErr('');
    try {
      await issuancesApi.create({
        booking:     booking.id,
        received_by: recipientId,
        issue_notes: notes || 'Equipment delivered by transport.',
      });
      onDone();
    } catch (ex) {
      const msg = ex?.errors
        ? Object.values(ex.errors).flat().join(' ')
        : ex?.message || 'Failed to confirm delivery.';
      setErr(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Confirm Equipment Delivery</h2>
            <p className="text-xs text-gray-500 mt-0.5">{booking.booking_reference} · {booking.school_name}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-2xl leading-none">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {err && <div className="px-3 py-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{err}</div>}

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Delivered to</label>
            <div className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
              <div className="font-medium text-gray-900">{recipientName}</div>
              {recipientEmail && <div className="text-xs text-gray-500">{recipientEmail}</div>}
            </div>
          </div>

          <p className="text-sm text-gray-600">
            Confirm that the equipment has been delivered to the school via LabSynch transport. This will move the booking to <strong>IN USE</strong>.
          </p>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Delivery Notes (optional)</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Equipment delivered to school reception, signed off."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              disabled={saving || !recipientId}
              className="px-5 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? 'Confirming…' : 'Confirm Delivery'}
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
  const [notes, setNotes]     = useState('');
  const [hasDamage, setHasDamage] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [err, setErr]         = useState('');

  const returnerName = booking.school_user_name || booking.school_name || 'Booking school';
  const returnerEmail = booking.school_user_email || '';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErr('');
    try {
      await returnsApi.create({
        booking:      booking.id,
        returned_by:  booking.school_user_id,
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

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Returned by</label>
            <div className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
              <div className="font-medium text-gray-900">{returnerName}</div>
              {returnerEmail && <div className="text-xs text-gray-500">{returnerEmail}</div>}
            </div>
          </div>

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
              disabled={saving || !booking.school_user_id}
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
  const [showIssueModal, setShowIssueModal]           = useState(false);
  const [showConfirmDeliveryModal, setShowConfirmDeliveryModal] = useState(false);
  const [showReturnModal, setShowReturnModal]         = useState(false);
  const [downloadingPdf, setDownloadingPdf]           = useState(false);
  const [clearingPenalty, setClearingPenalty]         = useState(false);
  const [issuances, setIssuances]                     = useState([]);
  const [markDeliveryIssuanceId, setMarkDeliveryIssuanceId] = useState(null);

  const fetchBooking = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [bkRes, issuancesRes] = await Promise.all([
        bookingsApi.retrieve(id),
        issuancesApi.list({ booking: id, page_size: 10 }),
      ]);
      setBooking(bkRes?.data ?? bkRes);
      const iData = issuancesRes?.data ?? issuancesRes;
      setIssuances(iData?.results ?? (Array.isArray(iData) ? iData : []));
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
  // No approval needed; payment transitions PENDING → RESERVED
  // RESERVED → DISPATCHED (transport=true) or RESERVED → IN_USE (transport=false)
  // DISPATCHED → IN_USE (second issuance confirms delivery)
  const canIssue = ['RESERVED', 'DISPATCHED'].includes(status);
  // IN_USE / OVERDUE → RETURNED
  const canReturn = ['IN_USE', 'OVERDUE'].includes(status);
  // RETURNED → COMPLETED
  const canComplete = status === 'RETURNED';
  // * → CANCELLED (early stages only)
  const canCancel = ['PENDING', 'RESERVED'].includes(status);

  // Cost
  const equipmentCost = booking.booking_items?.reduce(
    (s, i) => s + parseFloat(i.subtotal || 0), 0,
  ) ?? 0;
  const transportCost = parseFloat(booking.transport_cost || 0);
  const personnelCost = booking.booking_items?.reduce(
    (s, i) => s + parseFloat(i.personnel_cost || 0), 0,
  ) ?? 0;
  const overduePenalty = parseFloat(booking.overdue_penalty || 0);
  const penaltyCarriedForward = parseFloat(booking.penalty_carried_forward || 0);
  const totalAmount = parseFloat(booking.total_amount || 0);

  // Personnel-required items for technician panel
  const personnelItems = booking.booking_items?.filter((i) => i.equipment?.requires_personnel) ?? [];

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

        {/* RESERVED → DISPATCHED (with user) or DISPATCHED → IN_USE (transport confirm) */}
        {status === 'RESERVED' && (
          <button
            onClick={() => setShowIssueModal(true)}
            className="px-3 py-1.5 text-xs bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            {booking.requires_transport ? 'Dispatch (Create Issuance)' : 'Issue to School (IN_USE)'}
          </button>
        )}
        {status === 'DISPATCHED' && (
          <button
            onClick={() => setShowConfirmDeliveryModal(true)}
            className="px-3 py-1.5 text-xs bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Confirm Delivery (IN_USE)
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

        {/* Admin clears a settled penalty to unblock new bookings */}
        {overduePenalty > 0 && !booking.penalty_cleared && (
          <button
            disabled={clearingPenalty}
            onClick={async () => {
              if (!window.confirm('Mark this penalty as cleared? This will unblock the school from making new bookings.')) return;
              setClearingPenalty(true);
              try {
                const res = await bookingsApi.clearPenalty(booking.id);
                setBooking(res?.data ?? res);
              } catch (ex) {
                setActionError(ex?.message || 'Failed to clear penalty.');
              } finally {
                setClearingPenalty(false);
              }
            }}
            className="px-3 py-1.5 text-xs bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 transition-colors"
          >
            {clearingPenalty ? '…' : `Clear Penalty (KES ${overduePenalty.toLocaleString('en-KE', { minimumFractionDigits: 2 })})`}
          </button>
        )}
        {booking.penalty_cleared && overduePenalty > 0 && (
          <span className="px-2.5 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
            Penalty Cleared
          </span>
        )}
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
            {overduePenalty > 0 && (
              <div className="flex justify-between text-red-600">
                <dt>Overdue Penalty</dt>
                <dd className="font-medium">{fmtKes(overduePenalty)}</dd>
              </div>
            )}
            {penaltyCarriedForward > 0 && (
              <div className="flex justify-between text-orange-600">
                <dt>Penalty Carried Forward</dt>
                <dd className="font-medium">{fmtKes(penaltyCarriedForward)}</dd>
              </div>
            )}
            <div className="border-t border-gray-100 pt-2 flex justify-between font-semibold text-gray-900">
              <dt>Total</dt>
              <dd>{fmtKes(totalAmount)}</dd>
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
              <th className="text-left px-5 py-2 text-xs font-medium text-gray-500">Equipment</th>
              <th className="text-right px-5 py-2 text-xs font-medium text-gray-500">Qty</th>
              <th className="text-right px-5 py-2 text-xs font-medium text-gray-500 hidden sm:table-cell">Unit Price</th>
              <th className="text-right px-5 py-2 text-xs font-medium text-gray-500">Subtotal</th>
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

      {/* ── Issuances ── */}
      {issuances.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-5">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Issuance Records</h3>
          </div>
          {issuances.some((i) => i.delivery_status === 'FAILED') && (
            <div className="mx-5 mt-3 px-4 py-2.5 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg font-medium">
              Delivery failed — follow up required.
            </div>
          )}
          <div className="divide-y divide-gray-100">
            {issuances.map((iss) => (
              <div key={iss.id} className="px-5 py-3 flex flex-wrap items-center gap-3 text-sm">
                <div className="flex-1 min-w-0">
                  <p className="text-gray-700">Issued to: <span className="font-medium">{iss.received_by_name ?? iss.received_by_email ?? '—'}</span></p>
                  {iss.issue_notes && <p className="text-xs text-gray-400 mt-0.5">{iss.issue_notes}</p>}
                  {iss.delivery_notes && (
                    <p className="text-xs text-gray-500 mt-0.5">Delivery note: {iss.delivery_notes}</p>
                  )}
                </div>
                <DeliveryBadge status={iss.delivery_status} />
                <button
                  onClick={() => setMarkDeliveryIssuanceId(iss.id)}
                  className="px-2.5 py-1 text-xs border border-blue-200 text-blue-600 rounded hover:bg-blue-50 transition-colors"
                >
                  Mark Delivery
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Technician Assignment Panel (Section 10 — scaffolding) ── */}
      {status === 'RESERVED' && personnelItems.length > 0 && (
        <div className="bg-white rounded-xl border border-amber-200 p-5 mb-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="px-2.5 py-1 bg-amber-100 text-amber-800 text-xs font-semibold rounded-full">
              Technician Assignment Required
            </span>
          </div>
          <div className="mb-3 px-4 py-2.5 bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-lg">
            Technician assignment required before dispatch.
          </div>
          <div className="space-y-2">
            {personnelItems.map((item) => (
              <div key={item.id} className="flex items-center justify-between text-sm border border-gray-100 rounded-lg px-3 py-2">
                <div>
                  <p className="font-medium text-gray-900">{item.equipment?.equipment_name}</p>
                  {item.equipment?.personnel_description && (
                    <p className="text-xs text-gray-500">{item.equipment.personnel_description}</p>
                  )}
                </div>
                <select
                  disabled
                  className="border border-gray-200 rounded-lg px-2 py-1 text-xs text-gray-400 bg-gray-50 cursor-not-allowed"
                >
                  <option>Select Technician</option>
                </select>
              </div>
            ))}
          </div>
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
      {showConfirmDeliveryModal && (
        <ConfirmDeliveryModal
          booking={booking}
          onClose={() => setShowConfirmDeliveryModal(false)}
          onDone={() => { setShowConfirmDeliveryModal(false); fetchBooking(); }}
        />
      )}
      {showReturnModal && (
        <ReturnModal
          booking={booking}
          onClose={() => setShowReturnModal(false)}
          onDone={() => { setShowReturnModal(false); fetchBooking(); }}
        />
      )}
      {markDeliveryIssuanceId && (
        <MarkDeliveryModal
          issuanceId={markDeliveryIssuanceId}
          onClose={() => setMarkDeliveryIssuanceId(null)}
          onDone={() => { setMarkDeliveryIssuanceId(null); fetchBooking(); }}
        />
      )}
    </div>
  );
}
