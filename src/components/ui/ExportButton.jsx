/**
 * ExportButton — renders "Export CSV" and "Export PDF" buttons for admin list views.
 *
 * Props:
 *   endpoint  — API path, e.g. "/api/equipment/export/"
 *   params    — current filter/search params to forward alongside fmt
 *   filename  — base name for the downloaded file (no extension)
 */

import { useState } from 'react';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000';

const DownloadIcon = () => (
  <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
    <path
      fillRule="evenodd"
      d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
      clipRule="evenodd"
    />
  </svg>
);

const SpinnerIcon = () => (
  <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4l-3 3-3-3h4z"
    />
  </svg>
);

export default function ExportButton({ endpoint, params = {}, filename = 'export' }) {
  const [loading, setLoading] = useState('');

  const doExport = async (fmt) => {
    if (loading) return;
    setLoading(fmt);
    try {
      const token = localStorage.getItem('access_token');
      // Strip undefined / null / '' values then append fmt
      const cleanParams = Object.fromEntries(
        Object.entries({ ...params, fmt }).filter(
          ([, v]) => v !== undefined && v !== null && v !== '',
        ),
      );
      const query = new URLSearchParams(cleanParams);
      const url = `${BASE_URL}${endpoint}?${query}`;

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error(`Export failed (${response.status})`);
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = `${filename}.${fmt}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (err) {
      alert(err?.message || 'Export failed.');
    } finally {
      setLoading('');
    }
  };

  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={() => doExport('csv')}
        disabled={!!loading}
        title="Export as CSV"
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
      >
        {loading === 'csv' ? <SpinnerIcon /> : <DownloadIcon />}
        CSV
      </button>
      <button
        type="button"
        onClick={() => doExport('pdf')}
        disabled={!!loading}
        title="Export as PDF"
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-red-200 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors"
      >
        {loading === 'pdf' ? <SpinnerIcon /> : <DownloadIcon />}
        PDF
      </button>
    </div>
  );
}
