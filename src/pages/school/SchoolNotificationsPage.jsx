import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { notificationsApi } from '../../api/endpoints';

// ── Type metadata ─────────────────────────────────────────────────────────────
const TYPE_META = {
  BOOKING_CREATED: {
    label: 'Booking Created',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
    color: 'text-blue-600 bg-blue-100',
    link: (n) => n.booking_id ? `/school/bookings/${n.booking_id}` : null,
  },
  BOOKING_CONFIRMED: {
    label: 'Booking Confirmed',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    ),
    color: 'text-green-600 bg-green-100',
    link: (n) => n.booking_id ? `/school/bookings/${n.booking_id}` : null,
  },
  BOOKING_CANCELLED: {
    label: 'Booking Cancelled',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    ),
    color: 'text-red-600 bg-red-100',
    link: (n) => n.booking_id ? `/school/bookings/${n.booking_id}` : null,
  },
  EQUIPMENT_RETURNED: {
    label: 'Equipment Returned',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
      </svg>
    ),
    color: 'text-teal-600 bg-teal-100',
    link: (n) => n.booking_id ? `/school/bookings/${n.booking_id}` : null,
  },
  PENALTY_CLEARED: {
    label: 'Penalty Cleared',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    color: 'text-green-700 bg-green-100',
    link: (n) => n.booking_id ? `/school/bookings/${n.booking_id}` : null,
  },
  PAYMENT_RECEIVED: {
    label: 'Payment Received',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    ),
    color: 'text-indigo-600 bg-indigo-100',
    link: () => '/school/payments',
  },
};

const DEFAULT_META = {
  label: 'Notification',
  icon: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
  ),
  color: 'text-gray-500 bg-gray-100',
  link: () => null,
};

function getMeta(type) {
  return TYPE_META[type] ?? DEFAULT_META;
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

// ── Filter pills ──────────────────────────────────────────────────────────────
const FILTER_OPTIONS = [
  { label: 'All', value: '' },
  { label: 'Unread', value: 'unread' },
  { label: 'Bookings', value: 'BOOKING_CREATED' },
  { label: 'Payments', value: 'PAYMENT_RECEIVED' },
  { label: 'Penalties', value: 'PENALTY_CLEARED' },
];

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function SchoolNotificationsPage() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ count: 0, next: null, previous: null });
  const [markingAll, setMarkingAll] = useState(false);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, page_size: 20, ordering: '-created_at' };
      if (activeFilter === 'unread') {
        params.is_read = false;
      } else if (activeFilter) {
        params.notification_type = activeFilter;
      }
      const res = await notificationsApi.list(params);
      const payload = res?.data ?? res;
      const results = payload?.results ?? (Array.isArray(payload) ? payload : []);
      setNotifications(results);
      setPagination({ count: payload?.count ?? 0, next: payload?.next, previous: payload?.previous });
    } catch (err) {
      console.error('[Notifications] fetch failed:', err);
    } finally {
      setLoading(false);
    }
  }, [page, activeFilter]);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  const handleFilterChange = (val) => {
    setActiveFilter(val);
    setPage(1);
  };

  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    try {
      await notificationsApi.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (err) {
      console.error('[Notifications] mark-all-read failed:', err);
    } finally {
      setMarkingAll(false);
    }
  };

  const handleNotificationClick = async (notification) => {
    // Mark as read if not already
    if (!notification.is_read) {
      try {
        await notificationsApi.markRead(notification.id);
        setNotifications((prev) =>
          prev.map((n) => n.id === notification.id ? { ...n, is_read: true } : n)
        );
      } catch {
        // non-critical — still navigate
      }
    }
    const meta = getMeta(notification.notification_type);
    const link = meta.link(notification);
    if (link) navigate(link);
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            disabled={markingAll}
            className="px-4 py-2 text-sm font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 disabled:opacity-50 transition-colors"
          >
            {markingAll ? 'Marking…' : 'Mark all as read'}
          </button>
        )}
      </div>

      {/* Filter pills */}
      <div className="flex gap-1.5 flex-wrap mb-5">
        {FILTER_OPTIONS.map((f) => (
          <button
            key={f.value}
            onClick={() => handleFilterChange(f.value)}
            className={`px-3 py-1.5 text-xs rounded-full transition-colors ${
              activeFilter === f.value
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="divide-y divide-gray-100">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3 px-5 py-4 animate-pulse">
                <div className="w-9 h-9 rounded-full bg-gray-200 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 bg-gray-200 rounded w-1/3" />
                  <div className="h-3 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-100 rounded w-1/4" />
                </div>
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-16 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
              <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
            <p className="text-sm text-gray-500">No notifications here.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {notifications.map((notification) => {
              const meta = getMeta(notification.notification_type);
              const isClickable = !!meta.link(notification);
              return (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`flex items-start gap-4 px-5 py-4 transition-colors ${
                    isClickable ? 'cursor-pointer hover:bg-gray-50' : ''
                  } ${!notification.is_read ? 'bg-blue-50/40' : ''}`}
                >
                  {/* Icon */}
                  <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${meta.color}`}>
                    {meta.icon}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm ${!notification.is_read ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
                        {notification.title ?? meta.label}
                      </p>
                      <span className="text-xs text-gray-400 shrink-0 mt-0.5">
                        {timeAgo(notification.created_at)}
                      </span>
                    </div>
                    {notification.message && (
                      <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                        {notification.message}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">
                        {meta.label}
                      </span>
                      {!notification.is_read && (
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500" />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {pagination.count > 20 && (
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
