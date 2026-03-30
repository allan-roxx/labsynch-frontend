/** Admin Dashboard — placeholder with key stat cards. */
export default function AdminDashboard() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {['Total Bookings', 'Pending Approval', 'Equipment Items', 'Active Schools'].map((label) => (
          <div key={label} className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
            <p className="text-sm text-gray-500">{label}</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">—</p>
          </div>
        ))}
      </div>
      <p className="mt-8 text-sm text-gray-400">Dashboard widgets coming soon.</p>
    </div>
  );
}
