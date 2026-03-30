import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authApi } from '../../api/endpoints';
import { Button, Input, Alert } from '../../components/ui';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) { setError('Please enter your email address.'); return; }
    setLoading(true);
    setError('');
    try {
      await authApi.requestPasswordReset(email);
      setSent(true);
    } catch (err) {
      setError(err?.message ?? 'Failed to send reset email. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="rounded-2xl bg-white shadow-sm ring-1 ring-gray-200 p-8">
          <h2 className="mb-1 text-xl font-semibold text-gray-900">Reset password</h2>
          <p className="mb-6 text-sm text-gray-500">
            Enter the email address associated with your account and we&apos;ll send a reset link.
          </p>

          {sent ? (
            <Alert type="success">
              If that email exists in our system, a reset link has been sent. Check your inbox.
            </Alert>
          ) : (
            <>
              {error && <Alert type="error" className="mb-4">{error}</Alert>}
              <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
                <Input
                  id="email" name="email" type="email" label="Email"
                  placeholder="you@school.ac.ke"
                  value={email} onChange={(e) => { setEmail(e.target.value); setError(''); }}
                />
                <Button type="submit" loading={loading} className="w-full">
                  Send reset link
                </Button>
              </form>
            </>
          )}
        </div>

        <p className="mt-6 text-center text-sm text-gray-500">
          <Link to="/login" className="font-medium text-blue-600 hover:underline">← Back to login</Link>
        </p>
      </div>
    </div>
  );
}
