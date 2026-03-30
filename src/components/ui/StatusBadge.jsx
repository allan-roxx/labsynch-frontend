/** Generic status badge chip used across tables. */

const STATUS_COLORS = {
  // Booking statuses
  PENDING: 'bg-yellow-100 text-yellow-800',
  CONFIRMED: 'bg-blue-100 text-blue-800',
  PAID: 'bg-indigo-100 text-indigo-800',
  ISSUED: 'bg-purple-100 text-purple-800',
  RETURNED: 'bg-teal-100 text-teal-800',
  COMPLETED: 'bg-green-100 text-green-800',
  OVERDUE: 'bg-red-100 text-red-800',
  CANCELLED: 'bg-gray-100 text-gray-600',
  // Resolution statuses
  CHARGED: 'bg-orange-100 text-orange-800',
  WAIVED: 'bg-green-100 text-green-700',
  RESOLVED: 'bg-green-100 text-green-800',
  // Account statuses
  ACTIVE: 'bg-green-100 text-green-800',
  SUSPENDED: 'bg-yellow-100 text-yellow-800',
  BLOCKED: 'bg-red-100 text-red-800',
  // Maintenance statuses
  SCHEDULED: 'bg-blue-100 text-blue-700',
  IN_PROGRESS: 'bg-purple-100 text-purple-700',
};

export default function StatusBadge({ status }) {
  const color = STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-600';
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${color}`}>
      {status?.replace(/_/g, ' ')}
    </span>
  );
}
