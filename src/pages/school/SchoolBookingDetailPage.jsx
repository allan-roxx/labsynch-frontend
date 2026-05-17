import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { bookingsApi, damagesApi, paymentsApi, usersApi, downloadPdf } from '../../api/endpoints';
import StatusBadge from '../../components/ui/StatusBadge';

// -----------------------------------------------------------------------------
// New 8-state Progress Stepper
// -----------------------------------------------------------------------------
const STEPS = [
  { key: 'PENDING', label: 'Pending Payment' },
  { key: 'RESERVED', label: 'Reserved' },
  { key: 'DISPATCHED', label: 'Dispatched' },
  { key: 'IN_USE', label: 'In Use' },
  { key: 'RETURNED', label: 'Returned' },
  { key: 'COMPLETED', label: 'Completed' },
];

function stepIndex(status) {
  const i = STEPS.findIndex((s) => s.key === status);
  if (i >= 0) return i;
  if (status === 'OVERDUE') return 4; // treat as IN_USE step
  return -1; // CANCELLED
}

function ProgressStepper({ status }) {
  const current = stepIndex(status);
  const cancelled = status === 'CANCELLED';
  const overdue = status === 'OVERDUE';

  return (
    <div>
      {(cancelled || overdue) && (
        <div className={`mb-4 px-4 py-2.5 rounded-lg text-sm font-medium ${cancelled ? 'bg-gray-100 text-gray-600' : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
          {cancelled ? 'This booking has been cancelled.' : 'This booking is overdue.'}
        </div>
      )}
      <div className="flex items-start overflow-x-auto pb-2">
        {STEPS.map((step, idx) => {
          const isDone = !cancelled && idx < current;
          const isCurrent = !cancelled && idx === current;
          return (
            <div key={step.key} className="flex items-center flex-1 last:flex-none min-w-0">
              <div className="flex flex-col items-center">
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 transition-colors ${cancelled
                      ? 'bg-gray-100 text-gray-400'
                      : overdue && isCurrent
                        ? 'bg-red-500 text-white'
                        : isDone
                          ? 'bg-blue-600 text-white'
                          : isCurrent
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-400'
                    }`}
                >
                  {isDone ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    idx + 1
                  )}
                </div>
                <span
                  className={`mt-2 text-xs text-center leading-tight w-16 ${(isDone || isCurrent) && !cancelled
                      ? 'text-gray-800 font-medium'
                      : 'text-gray-400'
                    }`}
                >
                  {step.label}
                </span>
              </div>
              {idx < STEPS.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-1 mb-6 ${!cancelled && idx < current ? 'bg-blue-500' : 'bg-gray-200'
                    }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// M-Pesa Payment Modal
// -----------------------------------------------------------------------------
function PaymentModal({ booking, onClose, onSuccess }) {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!phone.trim()) {
      setError('Please enter your M-Pesa phone number.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await paymentsApi.stkPush({ booking_id: booking.id, phone_number: phone });
      setSuccess(true);
      setTimeout(() => onSuccess(), 2500);
    } catch (err) {
      if (err?.errors?.non_field_errors) {
        setError(err.errors.non_field_errors[0]);
      } else {
        setError(err?.message || 'STK push failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-sm mx-4 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-900 text-lg">Pay via M-Pesa</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 text-2xl leading-none"
          >
            &times;
          </button>
        </div>

        {success ? (
          <div className="py-4 text-center">
            <p className="text-green-700 font-medium">
              STK Push sent! Check your phone to complete payment.
            </p>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-500 mb-4">
              An STK push will be sent to your M-Pesa phone. Amount:{' '}
              <strong>KES {parseFloat(booking.total_amount || 0).toLocaleString()}</strong>
            </p>
            <form onSubmit={handleSubmit}>
              {error && (
                <div className="mb-3 px-3 py-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
                  {error}
                </div>
              )}
              <label className="block text-sm font-medium text-gray-700 mb-1">
                M-Pesa Phone Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 254712345678"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Sending…' : 'Send STK Push'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

function DamageSettlementModal({ damages, onClose, onSuccess }) {
  const [phone, setPhone] = useState('');
  const [payingId, setPayingId] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleSettle = async (damage) => {
    if (!phone.trim()) {
      setError('Please enter your M-Pesa phone number.');
      return;
    }
    setError('');
    setSuccessMessage('');
    setPayingId(damage.id);
    try {
      await damagesApi.settle(damage.id, { phone_number: phone });
      setSuccessMessage('STK Push sent. Complete payment on your phone to settle liability.');
      setTimeout(() => onSuccess(), 2500);
    } catch (err) {
      setError(err?.message || 'Failed to initiate damage settlement payment.');
    } finally {
      setPayingId('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-2xl mx-4 p-6 shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-900 text-lg">Settle Damage Liability</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-2xl leading-none">&times;</button>
        </div>

        {error && (
          <div className="mb-3 px-3 py-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{error}</div>
        )}
        {successMessage && (
          <div className="mb-3 px-3 py-2 bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg">{successMessage}</div>
        )}

        <label className="block text-sm font-medium text-gray-700 mb-1">M-Pesa Phone Number</label>
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="e.g. 254712345678"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        <div className="space-y-3">
          {damages.map((damage) => (
            <div key={damage.id} className="border border-gray-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-gray-900">{damage.equipment_name}</p>
                <p className="text-xs text-gray-500">Damage: {damage.description}</p>
                <p className="text-xs text-gray-500">Status: {damage.resolution_status}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">Outstanding</p>
                <p className="text-sm font-semibold text-red-700">
                  KES {parseFloat(damage.amount_outstanding || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
                <button
                  type="button"
                  onClick={() => handleSettle(damage)}
                  disabled={payingId === damage.id}
                  className="mt-2 px-3 py-1.5 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {payingId === damage.id ? 'Sending…' : 'Pay via M-Pesa'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Main page
// -----------------------------------------------------------------------------
export default function SchoolBookingDetailPage() {
  const { id } = useParams();
  const [booking, setBooking] = useState(null);
  const [bookingDamages, setBookingDamages] = useState([]);
  const [schoolProfile, setSchoolProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelError, setCancelError] = useState('');
  const [showPayModal, setShowPayModal] = useState(false);
  const [showDamagePayModal, setShowDamagePayModal] = useState(false);
  const [downloadingContract, setDownloadingContract] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const [bkRes, profileRes, damagesRes] = await Promise.all([
          bookingsApi.retrieve(id),
          usersApi.mySchoolProfile(),
          damagesApi.list({ equipment_return__booking: id, page_size: 100 }),
        ]);
        setBooking(bkRes?.data ?? bkRes);
        setSchoolProfile(profileRes?.data ?? profileRes);
        const damagesPayload = damagesRes?.data ?? damagesRes;
        setBookingDamages(damagesPayload?.results ?? (Array.isArray(damagesPayload) ? damagesPayload : []));
      } catch (err) {
        console.error('Failed to load booking detail:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id]);

  const handleCancel = async () => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) return;
    setCancelLoading(true);
    setCancelError('');
    try {
      const res = await bookingsApi.cancel(id);
      setBooking(res?.data ?? res);
    } catch (err) {
      setCancelError(err?.message || 'Failed to cancel booking. Please try again.');
    } finally {
      setCancelLoading(false);
    }
  };

  const handlePaymentSuccess = async () => {
    setShowPayModal(false);
    try {
      const updated = await bookingsApi.retrieve(id);
      setBooking(updated?.data ?? updated);
    } catch {
      /* keep current state */
    }
  };

  const handleDownloadContract = async () => {
    setDownloadingContract(true);
    try {
      const res = await bookingsApi.contract(id);
      downloadPdf(res, `contract-${booking.booking_reference}.pdf`);
    } catch (err) {
      alert(err?.message || 'Failed to download contract.');
    } finally {
      setDownloadingContract(false);
    }
  };

  const totalDays = booking
    ? Math.max(
      0,
      (new Date(booking.return_date) - new Date(booking.pickup_date)) /
      (1000 * 60 * 60 * 24),
    )
    : 0;

  // ── Loading skeleton ──
  if (loading) {
    return (
      <div className="animate-pulse space-y-5">
        <div className="h-5 bg-gray-200 rounded w-1/3" />
        <div className="h-20 bg-gray-200 rounded-xl" />
        <div className="h-20 bg-gray-200 rounded-xl" />
        <div className="grid grid-cols-2 gap-4">
          <div className="h-44 bg-gray-200 rounded-xl" />
          <div className="h-44 bg-gray-200 rounded-xl" />
        </div>
        <div className="h-48 bg-gray-200 rounded-xl" />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500">Booking not found.</p>
        <Link
          to="/school/bookings"
          className="mt-3 inline-block text-blue-600 hover:underline text-sm"
        >
          ← Back to Bookings
        </Link>
      </div>
    );
  }

  // Updated state machine logic: payment now allowed from PENDING
  const canPay = booking.status === 'PENDING';
  const canCancel = ['PENDING', 'RESERVED'].includes(booking.status);
  const unresolvedDamages = bookingDamages.filter((d) => {
    const status = d.resolution_status ?? 'PENDING';
    const outstanding = parseFloat(d.amount_outstanding ?? 0);
    return ['PENDING', 'CHARGED'].includes(status) && outstanding > 0;
  });

  // Cost breakdown
  const rentalSubtotal = parseFloat(booking.total_amount || 0);
  const transportCost = parseFloat(booking.transport_cost || 0);
  const personnelCost = booking.booking_items?.reduce(
    (sum, item) => sum + parseFloat(item.personnel_cost || 0),
    0,
  ) ?? 0;
  const overduePenalty = parseFloat(booking.overdue_penalty || 0);
  const penaltyCarriedForward = parseFloat(booking.penalty_carried_forward || 0);
  const accruingPenalty = parseFloat(booking.accruing_penalty || 0);
  const penaltyCleared = booking.penalty_cleared ?? false;
  const deliveryStatus = booking.issuance?.delivery_status ?? booking.delivery_status ?? null;

  return (
    <div>
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-500 mb-5 flex items-center gap-1">
        <Link to="/school" className="hover:text-gray-800">Dashboard</Link>
        <span>/</span>
        <Link to="/school/bookings" className="hover:text-gray-800">My Bookings</Link>
        <span>/</span>
        <span className="text-gray-800 font-medium">{booking.booking_reference}</span>
      </nav>

      {cancelError && (
        <div className="mb-4 px-4 py-2.5 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
          {cancelError}
        </div>
      )}

      {/* ── Header card ── */}
      <div className="bg-white rounded-xl border border-gray-200 px-5 py-4 mb-5 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-0.5">
            <h1 className="text-xl font-bold text-gray-900">{booking.booking_reference}</h1>
            <StatusBadge status={booking.status} />
          </div>
          <p className="text-sm text-gray-500">
            Created:{' '}
            {new Date(booking.created_at).toLocaleDateString('en-KE', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canPay && (
            <button
              onClick={() => setShowPayModal(true)}
              className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
            >
              Make Payment
            </button>
          )}
          <button
            onClick={handleDownloadContract}
            disabled={downloadingContract}
            className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            {downloadingContract ? 'Downloading…' : 'Download Contract'}
          </button>
          {canCancel && (
            <button
              onClick={handleCancel}
              disabled={cancelLoading}
              className="px-4 py-2 border border-red-300 text-red-600 text-sm font-medium rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors"
            >
              {cancelLoading ? 'Cancelling…' : 'Cancel Booking'}
            </button>
          )}
          {unresolvedDamages.length > 0 && (
            <button
              onClick={() => setShowDamagePayModal(true)}
              className="px-4 py-2 bg-orange-600 text-white text-sm font-medium rounded-lg hover:bg-orange-700 transition-colors"
            >
              Settle Damage Liability
            </button>
          )}
        </div>
      </div>

      {/* ── Progress Stepper ── */}
      <div className="bg-white rounded-xl border border-gray-200 px-6 py-5 mb-5">
        <ProgressStepper status={booking.status} />
      </div>

      {/* ── Status banners ── */}
      {booking.status === 'OVERDUE' && (
        <div className="mb-5 px-4 py-3 bg-red-50 border border-red-200 text-red-800 text-sm rounded-xl">
          <p className="font-semibold mb-0.5">⚠ Your equipment is overdue.</p>
          <p>
            A penalty of 150% of the daily rate is being charged for every day past your agreed return date of{' '}
            {new Date(booking.return_date).toLocaleDateString('en-KE', { year: 'numeric', month: 'long', day: 'numeric' })}.{' '}
            Please return equipment immediately to stop the penalty clock.
          </p>
          {accruingPenalty > 0 && (
            <p className="mt-1.5 font-semibold text-red-700">
              Accruing penalty: KES {accruingPenalty.toLocaleString(undefined, { minimumFractionDigits: 2 })} (updating daily)
            </p>
          )}
        </div>
      )}
      {booking.status === 'IN_USE' && accruingPenalty > 0 && (
        <div className="mb-5 px-4 py-3 bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-xl">
          <p className="font-semibold">Accruing penalty: KES {accruingPenalty.toLocaleString(undefined, { minimumFractionDigits: 2 })} (updating daily)</p>
          <p className="text-xs mt-0.5">Your equipment is past its return date. Return as soon as possible to stop the penalty clock.</p>
        </div>
      )}
      {booking.status === 'RETURNED' && overduePenalty > 0 && (
        <div className="mb-5 px-4 py-3 bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-xl">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span>
              Your equipment was returned late. An overdue penalty of{' '}
              <strong>KES {overduePenalty.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong> has been added to your account.
            </span>
            {penaltyCleared ? (
              <span className="px-2.5 py-0.5 bg-green-100 text-green-700 text-xs font-semibold rounded-full shrink-0">
                Penalty Settled
              </span>
            ) : (
              <span className="px-2.5 py-0.5 bg-red-100 text-red-700 text-xs font-semibold rounded-full shrink-0">
                Penalty Unpaid – KES {overduePenalty.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            )}
          </div>
        </div>
      )}
      {unresolvedDamages.length > 0 && (
        <div className="mb-5 px-4 py-3 bg-red-50 border border-red-200 text-red-800 text-sm rounded-xl">
          <p className="font-semibold mb-0.5">Outstanding damage liability detected for this booking.</p>
          <p>Use "Settle Damage Liability" to trigger an M-Pesa STK payment and clear your balance.</p>
        </div>
      )}
      {booking.status === 'PENDING' && (
        <div className="mb-5 px-4 py-3 bg-blue-50 border border-blue-200 text-blue-800 text-sm rounded-xl">
          {penaltyCarriedForward > 0 ? (
            <>
              <p className="font-semibold mb-2">Complete payment to reserve equipment.</p>
              <p className="text-xs mb-1 text-blue-700">
                Your account has outstanding late-return penalties. These have been included in this payment to clear your balance.
              </p>
              <div className="space-y-1 mt-2 text-xs text-blue-800">
                <div className="flex justify-between">
                  <span>Equipment rental subtotal</span>
                  <span>KES {(parseFloat(booking.total_amount || 0) - penaltyCarriedForward - parseFloat(booking.transport_cost || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                {parseFloat(booking.transport_cost || 0) > 0 && (
                  <div className="flex justify-between">
                    <span>Transport</span>
                    <span>KES {parseFloat(booking.transport_cost || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
                <div className="flex justify-between text-red-700 font-medium">
                  <span>Outstanding penalty (previous late return)</span>
                  <span>KES {penaltyCarriedForward.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between font-bold border-t border-blue-200 pt-1 mt-1">
                  <span>Total due</span>
                  <span>KES {parseFloat(booking.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </>
          ) : (
            'Booking created — complete payment to reserve equipment.'
          )}
        </div>
      )}
      {deliveryStatus === 'FAILED' && (
        <div className="mb-5 px-4 py-3 bg-red-50 border border-red-200 text-red-800 text-sm rounded-xl">
          Your equipment was not delivered. Please contact LabSynch support.
        </div>
      )}
      {deliveryStatus === 'LATE' && (
        <div className="mb-5 px-4 py-3 bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-xl">
          Your equipment was delivered late. We apologise for the inconvenience.
        </div>
      )}

      {/* ── Info panels ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
        {/* School Information */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2 text-sm">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            School Information
          </h3>
          <dl className="space-y-2.5 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-gray-500 shrink-0">School Name</dt>
              <dd className="font-medium text-gray-900 text-right">
                {booking.school_name || schoolProfile?.school_name}
              </dd>
            </div>
            {schoolProfile?.contact_person && (
              <div className="flex justify-between gap-3">
                <dt className="text-gray-500 shrink-0">Contact Person</dt>
                <dd className="font-medium text-gray-900 text-right">{schoolProfile.contact_person}</dd>
              </div>
            )}
            {schoolProfile?.user_email && (
              <div className="flex justify-between gap-3">
                <dt className="text-gray-500 shrink-0">Email</dt>
                <dd className="font-medium text-gray-900 text-right break-all">{schoolProfile.user_email}</dd>
              </div>
            )}
            {schoolProfile?.liability_status && (
              <div className="flex justify-between gap-3">
                <dt className="text-gray-500 shrink-0">Liability</dt>
                <dd>
                  <StatusBadge status={schoolProfile.liability_status} />
                </dd>
              </div>
            )}
          </dl>
          <Link
            to="/school/profile"
            className="mt-4 inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
          >
            Edit Profile →
          </Link>
        </div>

        {/* Booking Details */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2 text-sm">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Booking Details
          </h3>
          <dl className="space-y-2.5 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-gray-500">Pickup Date</dt>
              <dd className="font-medium text-gray-900">
                {new Date(booking.pickup_date).toLocaleDateString('en-KE', { year: 'numeric', month: 'short', day: 'numeric' })}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-gray-500">Return Date</dt>
              <dd className="font-medium text-gray-900">
                {new Date(booking.return_date).toLocaleDateString('en-KE', { year: 'numeric', month: 'short', day: 'numeric' })}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-gray-500">Total Days</dt>
              <dd className="font-medium text-gray-900">{totalDays} day{totalDays !== 1 ? 's' : ''}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-gray-500">Delivery</dt>
              <dd className="font-medium text-gray-900">
                {booking.requires_transport ? (
                  <span className="text-blue-700">Delivery Requested</span>
                ) : (
                  <span className="text-gray-500">Self-Pickup</span>
                )}
              </dd>
            </div>
            {booking.special_instructions && (
              <div>
                <dt className="text-gray-500 mb-1">Special Instructions</dt>
                <dd className="text-gray-700 bg-gray-50 rounded-lg px-3 py-2 text-xs leading-relaxed">
                  {booking.special_instructions}
                </dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      {/* ── Booking items table ── */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-5">
        <div className="px-5 py-3 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800 text-sm">Booked Equipment</h3>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-5 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Equipment</th>
              <th className="text-right px-5 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Qty</th>
              <th className="text-right px-5 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide hidden sm:table-cell">Unit/Day</th>
              <th className="text-right px-5 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide hidden sm:table-cell">Personnel</th>
              <th className="text-right px-5 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Subtotal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {booking.booking_items?.map((item) => {
              const primaryImage =
                item.equipment.images?.find((img) => img.is_primary) ||
                item.equipment.images?.[0];
              return (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gray-100 overflow-hidden shrink-0 flex items-center justify-center">
                        {primaryImage ? (
                          <img src={primaryImage.image_url} alt={item.equipment.equipment_name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-gray-300 text-lg">—</span>
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{item.equipment.equipment_name}</p>
                        <p className="text-xs text-gray-400">{item.equipment.category?.category_name}</p>
                        {item.equipment.requires_personnel && (
                          <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-800">
                            Technician Required
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-right text-gray-700">{item.quantity}</td>
                  <td className="px-5 py-3 text-right text-gray-700 hidden sm:table-cell">
                    KES {parseFloat(item.unit_price).toLocaleString()}
                  </td>
                  <td className="px-5 py-3 text-right text-gray-700 hidden sm:table-cell">
                    {parseFloat(item.personnel_cost || 0) > 0
                      ? `KES ${parseFloat(item.personnel_cost).toLocaleString()}`
                      : '—'}
                  </td>
                  <td className="px-5 py-3 text-right font-semibold text-gray-900">
                    KES {parseFloat(item.subtotal).toLocaleString()}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Cost Summary ── */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-800 mb-4 text-sm">Cost Summary</h3>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between text-gray-600">
            <dt>Rental Subtotal</dt>
            <dd>KES {rentalSubtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</dd>
          </div>
          {personnelCost > 0 && (
            <div className="flex justify-between text-gray-600">
              <dt>Personnel Cost</dt>
              <dd>KES {personnelCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</dd>
            </div>
          )}
          {transportCost > 0 && (
            <div className="flex justify-between text-gray-600">
              <dt>Transport Cost</dt>
              <dd>KES {transportCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</dd>
            </div>
          )}
          {overduePenalty > 0 && (
            <div className="flex justify-between text-red-600 font-medium">
              <dt>Overdue Penalty</dt>
              <dd>KES {overduePenalty.toLocaleString(undefined, { minimumFractionDigits: 2 })}</dd>
            </div>
          )}
          {penaltyCarriedForward > 0 && (
            <div className="flex justify-between text-orange-600 font-medium">
              <dt>Carried-Forward Penalty</dt>
              <dd>KES {penaltyCarriedForward.toLocaleString(undefined, { minimumFractionDigits: 2 })}</dd>
            </div>
          )}
          <div className="border-t border-gray-100 pt-3 flex justify-between font-bold text-gray-900">
            <dt>Total</dt>
            <dd>KES {parseFloat(booking.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</dd>
          </div>
        </dl>
      </div>

      {/* M-Pesa payment modal */}
      {showPayModal && (
        <PaymentModal
          booking={booking}
          onClose={() => setShowPayModal(false)}
          onSuccess={handlePaymentSuccess}
        />
      )}
      {showDamagePayModal && (
        <DamageSettlementModal
          damages={unresolvedDamages}
          onClose={() => setShowDamagePayModal(false)}
          onSuccess={async () => {
            setShowDamagePayModal(false);
            try {
              const [updatedBooking, updatedProfile, updatedDamages] = await Promise.all([
                bookingsApi.retrieve(id),
                usersApi.mySchoolProfile(),
                damagesApi.list({ equipment_return__booking: id, page_size: 100 }),
              ]);
              setBooking(updatedBooking?.data ?? updatedBooking);
              setSchoolProfile(updatedProfile?.data ?? updatedProfile);
              const dp = updatedDamages?.data ?? updatedDamages;
              setBookingDamages(dp?.results ?? (Array.isArray(dp) ? dp : []));
            } catch {
              /* keep current state */
            }
          }}
        />
      )}
    </div>
  );
}
