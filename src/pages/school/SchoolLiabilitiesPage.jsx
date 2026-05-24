import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { damagesApi } from '../../api/endpoints';

export default function SchoolLiabilitiesPage() {
  const [damages, setDamages]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [phone, setPhone]         = useState('');
  const [payingId, setPayingId]   = useState('');
  const [successId, setSuccessId] = useState('');
  const [error, setError]         = useState('');

  const fetchDamages = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await damagesApi.list({ page_size: 100 });
      const data = res?.data ?? res;
      const all  = data?.results ?? (Array.isArray(data) ? data : []);
      setDamages(
        all.filter((d) => {
          const status      = d.resolution_status ?? 'PENDING';
          const outstanding = parseFloat(d.amount_outstanding ?? 0);
          return ['PENDING', 'CHARGED'].includes(status) && outstanding > 0;
        }),
      );
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDamages(); }, [fetchDamages]);

  const handleSettle = async (damage) => {
    if (!phone.trim()) {
      setError('Please enter your M-Pesa phone number.');
      return;
    }
    setError('');
    setPayingId(damage.id);
    try {
      await damagesApi.settle(damage.id, { phone_number: phone });
      setSuccessId(damage.id);
      setTimeout(() => { setSuccessId(''); fetchDamages(); }, 3000);
    } catch (err) {
      setError(err?.message || 'Failed to initiate payment. Please try again.');
    } finally {
      setPayingId('');
    }
  };

  const totalOutstanding = damages.reduce(
    (sum, d) => sum + parseFloat(d.amount_outstanding ?? 0),
    0,
  );

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Liabilities</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Damage liabilities that must be settled before new bookings can be made.
        </p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 rounded-xl border border-gray-200 bg-white animate-pulse" />
          ))}
        </div>
      ) : damages.length === 0 ? (
        /* ── Empty state ── */
        <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-white py-20 text-center">
          <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center mb-4">
            <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-gray-800">No outstanding liabilities</p>
          <p className="text-xs text-gray-400 mt-1">You&apos;re all clear to make new bookings.</p>
          <Link to="/school/catalog" className="mt-4 text-sm text-blue-600 hover:underline font-medium">
            Browse Equipment →
          </Link>
        </div>
      ) : (
        <>
          {/* ── Summary banner ── */}
          <div className="flex items-center gap-4 rounded-xl border border-red-200 bg-red-50 px-5 py-4">
            <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
              <svg className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-red-800">
                {damages.length} outstanding {damages.length === 1 ? 'liability' : 'liabilities'}
              </p>
              <p className="text-sm text-red-700">
                Total: <strong>KES {totalOutstanding.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>
              </p>
            </div>
          </div>

          {/* ── Shared M-Pesa phone input ── */}
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              M-Pesa Phone Number
            </label>
            <p className="text-xs text-gray-400 mb-3">
              Enter once — used for all STK push payments below.
            </p>
            <input
              type="tel"
              value={phone}
              onChange={(e) => { setPhone(e.target.value); setError(''); }}
              placeholder="e.g. 254712345678"
              className="w-full max-w-xs border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
          </div>

          {/* ── Liability cards ── */}
          <div className="space-y-3">
            {damages.map((damage) => (
              <div key={damage.id} className="rounded-xl border border-gray-200 bg-white p-5">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-sm font-semibold text-gray-900">
                        {damage.equipment_name}
                      </span>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        damage.resolution_status === 'CHARGED'
                          ? 'bg-orange-100 text-orange-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {damage.resolution_status ?? 'PENDING'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">{damage.description}</p>
                    {damage.booking_reference && (
                      <p className="text-xs text-gray-400 mt-1">
                        Booking:{' '}
                        <Link
                          to={`/school/bookings/${damage.booking || ''}`}
                          className="text-blue-600 hover:underline"
                        >
                          {damage.booking_reference}
                        </Link>
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <div className="text-right">
                      <p className="text-xs text-gray-400">Outstanding</p>
                      <p className="text-lg font-bold text-red-700">
                        KES {parseFloat(damage.amount_outstanding ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    {successId === damage.id ? (
                      <span className="px-3 py-1.5 bg-green-50 border border-green-200 text-green-700 text-xs rounded-lg font-medium">
                        ✓ STK push sent — check your phone
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSettle(damage)}
                        disabled={!!payingId}
                        className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                      >
                        {payingId === damage.id ? 'Sending…' : 'Pay via M-Pesa'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
