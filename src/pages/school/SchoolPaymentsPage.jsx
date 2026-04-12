import { useState, useEffect, useCallback } from 'react';
import { paymentsApi, downloadPdf } from '../../api/endpoints';
import StatusBadge from '../../components/ui/StatusBadge';

export default function SchoolPaymentsPage() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ count: 0, next: null, previous: null });
  const [downloadingId, setDownloadingId] = useState(null);

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await paymentsApi.list({ page, page_size: 10, ordering: '-created_at' });
      const payload = res?.data ?? res;
      const results = payload?.results || (Array.isArray(payload) ? payload : []);
      setPayments(results);
      setPagination({ count: payload?.count || 0, next: payload?.next, previous: payload?.previous });
    } catch (err) {
      console.error('Failed to fetch payments:', err);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { fetchPayments(); }, [fetchPayments]);

  const handleDownloadReceipt = async (payment) => {
    setDownloadingId(payment.id);
    try {
      const res = await paymentsApi.receipt(payment.id);
      downloadPdf(res, `receipt-${payment.transaction_id || payment.id}.pdf`);
    } catch (err) {
      alert(err?.message || 'Failed to download receipt.');
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-gray-900">Payment History</h1>
        <p className="text-sm text-gray-500 mt-0.5">All M-Pesa transactions for your bookings.</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                Transaction ID
              </th>
              <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide hidden md:table-cell">
                Booking
              </th>
              <th className="text-right px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                Amount
              </th>
              <th className="text-center px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                Status
              </th>
              <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide hidden sm:table-cell">
                Date
              </th>
              <th className="text-right px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                Receipt
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td className="px-5 py-3"><div className="h-4 bg-gray-200 rounded w-32" /></td>
                  <td className="px-5 py-3 hidden md:table-cell"><div className="h-4 bg-gray-200 rounded w-24" /></td>
                  <td className="px-5 py-3"><div className="h-4 bg-gray-200 rounded w-20 ml-auto" /></td>
                  <td className="px-5 py-3"><div className="h-5 bg-gray-200 rounded-full w-16 mx-auto" /></td>
                  <td className="px-5 py-3 hidden sm:table-cell"><div className="h-4 bg-gray-200 rounded w-24" /></td>
                  <td className="px-5 py-3"><div className="h-7 bg-gray-200 rounded w-20 ml-auto" /></td>
                </tr>
              ))
            ) : payments.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-14 text-center text-gray-400">
                  <p className="text-sm">No payments yet.</p>
                </td>
              </tr>
            ) : (
              payments.map((payment) => (
                <tr key={payment.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 font-mono text-xs text-gray-700">
                    {payment.transaction_id || payment.mpesa_receipt_number || '—'}
                  </td>
                  <td className="px-5 py-3 text-gray-600 hidden md:table-cell text-xs">
                    {payment.booking_reference || payment.booking || '—'}
                  </td>
                  <td className="px-5 py-3 text-right font-medium text-gray-900">
                    KES {parseFloat(payment.amount || 0).toLocaleString()}
                  </td>
                  <td className="px-5 py-3 text-center">
                    <StatusBadge status={payment.payment_status ?? payment.status} />
                  </td>
                  <td className="px-5 py-3 text-gray-600 hidden sm:table-cell text-xs">
                    {payment.created_at
                      ? new Date(payment.created_at).toLocaleDateString('en-KE', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })
                      : '—'}
                  </td>
                  <td className="px-5 py-3 text-right">
                    {(payment.payment_status === 'SUCCESS' || payment.status === 'SUCCESS') ? (
                      <button
                        onClick={() => handleDownloadReceipt(payment)}
                        disabled={downloadingId === payment.id}
                        className="px-3 py-1.5 text-xs text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 disabled:opacity-50 transition-colors"
                      >
                        {downloadingId === payment.id ? 'Downloading…' : 'Receipt'}
                      </button>
                    ) : (
                      <span className="text-xs text-gray-300">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {pagination.count > 10 && (
          <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
            <span>{pagination.count} total</span>
            <div className="flex gap-2">
              <button
                disabled={!pagination.previous}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1 border rounded disabled:opacity-40 hover:bg-gray-50"
              >
                ← Prev
              </button>
              <span className="px-3 py-1">Page {page}</span>
              <button
                disabled={!pagination.next}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1 border rounded disabled:opacity-40 hover:bg-gray-50"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
