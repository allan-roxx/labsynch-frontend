import { Link } from 'react-router-dom';

const LAST_UPDATED = 'May 2026';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Nav ── */}
      <header className="bg-white border-b border-gray-100">
        <div className="mx-auto max-w-4xl px-6 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600">
              <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
            </div>
            <span className="font-bold text-gray-900">LabSynch</span>
          </Link>
          <Link to="/register" className="text-sm text-blue-600 hover:underline font-medium">
            &larr; Back to registration
          </Link>
        </div>
      </header>

      {/* ── Content ── */}
      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Terms &amp; Conditions</h1>
        <p className="text-sm text-gray-400 mb-10">Last updated: {LAST_UPDATED}</p>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 space-y-8 text-sm text-gray-700 leading-relaxed">

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">1. Agreement to Terms</h2>
            <p>
              By registering an account on the LabSynch platform ("Service"), you confirm that you
              are an authorised representative of the school or institution ("School") you are
              registering on behalf of, and that the School agrees to be bound by these Terms &amp;
              Conditions. If you do not agree, do not register.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">2. Use of the Platform</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Access to the Service is granted solely for the purpose of renting laboratory equipment from the operator ("LabSynch").</li>
              <li>You may not share account credentials or allow unauthorised third-party access.</li>
              <li>You must ensure all information provided during registration is accurate and kept up to date.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">3. Bookings &amp; Payments</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>A booking is confirmed only after full payment of the quoted rental fee via the M-Pesa gateway integrated into the platform.</li>
              <li>LabSynch reserves the right to reject or cancel a booking at its discretion (e.g. due to unpaid previous penalties or overdue returns).</li>
              <li>All prices shown are in Kenyan Shillings (KES) and are inclusive of any applicable taxes unless stated otherwise.</li>
              <li>Refunds for cancellations are processed at the discretion of the LabSynch administrator.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">4. Equipment Care &amp; Damage</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>The School is responsible for all rented equipment from the time of dispatch until confirmed return.</li>
              <li>Any damage, loss, or theft must be reported to LabSynch immediately.</li>
              <li>Damage fees will be assessed by the LabSynch team and billed to the School. Outstanding damage fees must be settled before future bookings can be made.</li>
              <li>Equipment must be returned in the same condition it was issued, ordinary wear and tear excepted.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">5. Late Returns &amp; Penalties</h2>
            <p>
              Equipment not returned by the agreed return date will accrue a daily overdue penalty
              calculated on the same per-day rental rate. Continued failure to return equipment may
              result in account suspension and legal recovery proceedings.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">6. Technician / Personnel Services</h2>
            <p>
              Where equipment requires a LabSynch-provided technician, personnel costs are charged
              per day and billed alongside the equipment rental. The School must ensure the
              technician has safe and adequate access to the relevant facilities.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">7. Data &amp; Privacy</h2>
            <p>
              LabSynch collects and processes School contact and transaction data solely to operate
              the platform. Data is not sold to third parties. All payment processing is handled by
              the Safaricom Daraja API and is subject to Safaricom&apos;s own privacy policy.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">8. Limitation of Liability</h2>
            <p>
              LabSynch is not liable for any indirect, incidental, or consequential damages arising
              from the use or inability to use the platform or rented equipment, including but not
              limited to loss of experimental results, academic impact, or personal injury.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">9. Amendments</h2>
            <p>
              LabSynch reserves the right to amend these Terms at any time. Material changes will
              be communicated via the platform. Continued use of the Service following notification
              constitutes acceptance of the revised Terms.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">10. Governing Law</h2>
            <p>
              These Terms are governed by the laws of the Republic of Kenya. Any disputes arising
              shall be subject to the exclusive jurisdiction of the courts of Kenya.
            </p>
          </section>
        </div>

        <div className="mt-8 text-center">
          <Link
            to="/register"
            className="inline-block px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to registration
          </Link>
        </div>
      </main>
    </div>
  );
}
