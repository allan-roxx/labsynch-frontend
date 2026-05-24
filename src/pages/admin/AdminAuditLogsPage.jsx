import { useState, useEffect, useCallback } from 'react';
import { auditLogsApi, downloadPdf } from '../../api/endpoints';

const ALL_ACTIONS = [
  'ALL', 'CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT',
  'CANCEL', 'APPROVE', 'DISPATCH', 'ISSUE', 'RETURN', 'COMPLETE', 'PAYMENT', 'RESOLVE',
];

const ACTION_COLORS = {
  CREATE:   'bg-green-100 text-green-800',
  UPDATE:   'bg-blue-100 text-blue-800',
  DELETE:   'bg-red-100 text-red-800',
  LOGIN:    'bg-gray-100 text-gray-700',
  LOGOUT:   'bg-gray-100 text-gray-500',
  CANCEL:   'bg-orange-100 text-orange-800',
  APPROVE:  'bg-emerald-100 text-emerald-800',
  DISPATCH: 'bg-indigo-100 text-indigo-800',
  ISSUE:    'bg-purple-100 text-purple-800',
  RETURN:   'bg-teal-100 text-teal-800',
  COMPLETE: 'bg-emerald-100 text-emerald-700',
  PAYMENT:  'bg-yellow-100 text-yellow-800',
  RESOLVE:  'bg-cyan-100 text-cyan-800',
};

// ── Change detail modal ───────────────────────────────────────────────────────
function ChangesModal({ log, onClose }) {
  const changesText = log.changes
    ? typeof log.changes === 'string'
      ? log.changes
      : JSON.stringify(log.changes, null, 2)
    : 'No change details recorded.';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-900">Change Details</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {log.action} · {log.model_name} · {log.object_repr}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-2xl leading-none">&times;</button>
        </div>
        <div className="px-6 py-4 overflow-y-auto flex-1">
          <pre className="text-xs text-gray-700 bg-gray-50 rounded-lg p-4 overflow-x-auto whitespace-pre-wrap break-all font-mono">
            {changesText}
          </pre>
        </div>
        <div className="px-6 py-3 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Page ─────
export default function AdminAuditLogsPage() {
  const [logs, setLogs]               = useState([]);
  const [loading, setLoading]         = useState(true);
  const [actionFilter, setActionFilter] = useState('ALL');
  const [search, setSearch]           = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [dateFrom, setDateFrom]       = useState('');
  const [dateTo, setDateTo]           = useState('');
  const [page, setPage]               = useState(1);
  const [pagination, setPagination]   = useState({ count: 0, next: null, previous: null });
  const [detailLog, setDetailLog]     = useState(null);
  const [exporting, setExporting]     = useState(false);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, page_size: 20, ordering: '-created_at' };
      if (search)                params.search = search;
      if (actionFilter !== 'ALL') params.action = actionFilter;
      if (dateFrom)              params['created_at__gte'] = dateFrom;
      if (dateTo)                params['created_at__lte'] = dateTo;
      const res     = await auditLogsApi.list(params);
      const payload = res?.data ?? res;
      const results = payload?.results || (Array.isArray(payload) ? payload : []);
      setLogs(results);
      setPagination({ count: payload?.count || 0, next: payload?.next, previous: payload?.previous });
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
    } finally {
      setLoading(false);
    }
  }, [page, search, actionFilter, dateFrom, dateTo]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const handleSearch = (e) => { e.preventDefault(); setSearch(searchInput); setPage(1); };

  const buildExportParams = () => {
    const params = { ordering: '-created_at' };
    if (search)                params.search = search;
    if (actionFilter !== 'ALL') params.action = actionFilter;
    if (dateFrom)              params['created_at__gte'] = dateFrom;
    if (dateTo)                params['created_at__lte'] = dateTo;
    return params;
  };

  const handleExport = async (fmt) => {
    setExporting(true);
    try {
      const res = await auditLogsApi.export({ ...buildExportParams(), fmt });
      downloadPdf(res, `audit_logs.${fmt}`);
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
          <p className="text-sm text-gray-500 mt-0.5">Immutable record of all significant system actions.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => handleExport('csv')}
            disabled={exporting}
            className="flex items-center gap-1.5 px-3 py-2 text-xs border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            <svg className="h-3.5 w-3.5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export CSV
          </button>
          <button
            onClick={() => handleExport('pdf')}
            disabled={exporting}
            className="flex items-center gap-1.5 px-3 py-2 text-xs border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            <svg className="h-3.5 w-3.5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            Export PDF
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 mb-5">
        <div className="flex flex-wrap gap-2 items-center">
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search actor, model, or object…"
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
            />
            <button type="submit" className="px-3 py-2 border border-gray-300 text-sm rounded-lg hover:bg-gray-50">
              Search
            </button>
          </form>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">From:</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
              className="border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-xs text-gray-400">To:</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
              className="border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {(dateFrom || dateTo) && (
              <button
                onClick={() => { setDateFrom(''); setDateTo(''); setPage(1); }}
                className="text-xs text-gray-400 hover:text-gray-700"
              >
                ✕ Clear dates
              </button>
            )}
          </div>
        </div>
        <div className="flex gap-1.5 flex-wrap items-center">
          <span className="text-xs text-gray-400 mr-1">Action:</span>
          {ALL_ACTIONS.map((a) => (
            <button
              key={a}
              onClick={() => { setActionFilter(a); setPage(1); }}
              className={`px-3 py-1.5 text-xs rounded-full transition-colors ${
                actionFilter === a ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {a === 'ALL' ? 'All Actions' : a}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Date &amp; Time</th>
              <th className="text-center px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Action</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide hidden md:table-cell">Actor</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide hidden lg:table-cell">Model</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide hidden xl:table-cell">Object</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide hidden xl:table-cell">IP Address</th>
              <th className="text-right px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide hidden lg:table-cell">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  {Array.from({ length: 7 }).map((__, j) => (
                    <td key={j} className="px-5 py-3"><div className="h-4 bg-gray-200 rounded" /></td>
                  ))}
                </tr>
              ))
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-14 text-center text-gray-400">
                  <p className="text-sm">No audit log entries found.</p>
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 text-gray-600 text-xs whitespace-nowrap">
                    {log.created_at
                      ? new Date(log.created_at).toLocaleString('en-KE', {
                          year: 'numeric', month: 'short', day: 'numeric',
                          hour: '2-digit', minute: '2-digit',
                        })
                      : '—'}
                  </td>
                  <td className="px-5 py-3 text-center">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${ACTION_COLORS[log.action] ?? 'bg-gray-100 text-gray-600'}`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-xs text-gray-700 hidden md:table-cell">{log.actor_email}</td>
                  <td className="px-5 py-3 hidden lg:table-cell">
                    <span className="text-xs font-mono bg-gray-50 border border-gray-100 px-1.5 py-0.5 rounded text-gray-700">
                      {log.model_name}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-xs text-gray-600 max-w-xs hidden xl:table-cell">
                    <p className="truncate">{log.object_repr}</p>
                  </td>
                  <td className="px-5 py-3 text-xs text-gray-500 font-mono hidden xl:table-cell">
                    {log.ip_address || '—'}
                  </td>
                  <td className="px-5 py-3 text-right hidden lg:table-cell">
                    {log.changes && (
                      <button
                        onClick={() => setDetailLog(log)}
                        className="px-2.5 py-1 text-xs border border-gray-300 text-gray-600 rounded hover:bg-gray-50 transition-colors"
                      >
                        View
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {pagination.count > 20 && (
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

      {detailLog && <ChangesModal log={detailLog} onClose={() => setDetailLog(null)} />}
    </div>
  );
}
