/** Generic status badge chip used across tables. */

const STATUS_COLORS = {
  // ── Booking state machine (new) ──────────────────────────────────────────
  PENDING:    'bg-gray-100 text-gray-700',
  APPROVED:   'bg-blue-100 text-blue-800',
  RESERVED:   'bg-purple-100 text-purple-800',
  DISPATCHED: 'bg-orange-100 text-orange-800',
  IN_USE:     'bg-green-100 text-green-800',
  RETURNED:   'bg-teal-100 text-teal-800',
  COMPLETED:  'bg-emerald-100 text-emerald-800',
  OVERDUE:    'bg-red-100 text-red-800',
  CANCELLED:  'bg-gray-100 text-gray-500',

  // ── Damage resolution ────────────────────────────────────────────────────
  CHARGED:    'bg-orange-100 text-orange-800',
  WAIVED:     'bg-green-100 text-green-700',
  RESOLVED:   'bg-green-100 text-green-800',
  PAID:       'bg-emerald-100 text-emerald-800',

  // ── School account status ────────────────────────────────────────────────
  ACTIVE:     'bg-green-100 text-green-800',
  SUSPENDED:  'bg-yellow-100 text-yellow-800',
  BLOCKED:    'bg-red-100 text-red-800',

  // ── Liability status ─────────────────────────────────────────────────────
  CLEAR:           'bg-green-100 text-green-800',
  HAS_OUTSTANDING: 'bg-red-100 text-red-800',

  // ── Maintenance ──────────────────────────────────────────────────────────
  SCHEDULED:   'bg-blue-100 text-blue-700',
  IN_PROGRESS: 'bg-purple-100 text-purple-700',

  // ── Payment ──────────────────────────────────────────────────────────────
  SUCCESS: 'bg-emerald-100 text-emerald-800',
  FAILED:  'bg-red-100 text-red-800',
  PENDING_PAYMENT: 'bg-yellow-100 text-yellow-800',
};

const STATUS_LABELS = {
  IN_USE:          'In Use',
  IN_PROGRESS:     'In Progress',
  HAS_OUTSTANDING: 'Outstanding',
  PENDING_PAYMENT: 'Pending',
};

export default function StatusBadge({ status }) {
  const color = STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-600';
  const label = STATUS_LABELS[status] ?? status?.replace(/_/g, ' ');
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${color}`}>
      {label}
    </span>
  );
}
