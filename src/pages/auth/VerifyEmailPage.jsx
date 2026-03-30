import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { authApi } from '../../api/endpoints';
import { Alert, Spinner } from '../../components/ui';

export default function VerifyEmailPage() {
  const [params] = useSearchParams();
  const uid = params.get('uid') ?? '';
  const token = params.get('token') ?? '';

  const [status, setStatus] = useState('loading'); // 'loading' | 'success' | 'error'
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!uid || !token) { setStatus('error'); setMessage('Invalid verification link.'); return; }

    authApi.verifyEmail(uid, token)
      .then((res) => { setStatus('success'); setMessage(res.message ?? 'Email verified successfully!'); })
      .catch((err) => { setStatus('error'); setMessage(err.message ?? 'Verification failed. The link may have expired.'); });
  }, [uid, token]);

  if (status === 'loading') return <Spinner label="Verifying your email…" />;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm ring-1 ring-gray-200 text-center">
        {status === 'success' ? (
          <>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Email verified!</h2>
            <p className="mt-2 text-sm text-gray-500">{message}</p>
          </>
        ) : (
          <Alert type="error">{message}</Alert>
        )}
        <Link to="/login" className="mt-6 inline-block text-sm font-medium text-blue-600 hover:underline">
          Go to Login →
        </Link>
      </div>
    </div>
  );
}
