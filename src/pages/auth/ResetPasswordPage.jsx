import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { authApi } from '../../api/endpoints';
import { Button, Input, Alert } from '../../components/ui';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const uid = params.get('uid') ?? '';
  const token = params.get('token') ?? '';

  const [form, setForm] = useState({ new_password: '', confirm_password: '' });
  const [fieldErrors, setFieldErrors] = useState({});
  const [bannerError, setBannerError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setFieldErrors((prev) => ({ ...prev, [e.target.name]: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBannerError('');
    if (form.new_password.length < 8) {
      setFieldErrors({ new_password: 'Password must be at least 8 characters.' });
      return;
    }
    if (form.new_password !== form.confirm_password) {
      setFieldErrors({ confirm_password: 'Passwords do not match.' });
      return;
    }
    setLoading(true);
    try {
      await authApi.confirmPasswordReset(uid, token, form.new_password);
      navigate('/login?reset=true', { replace: true });
    } catch (err) {
      if (err?.errors) {
        const mapped = {};
        Object.entries(err.errors).forEach(([k, v]) => { mapped[k] = Array.isArray(v) ? v[0] : v; });
        setFieldErrors(mapped);
        setBannerError(err.errors.non_field_errors?.[0] ?? err.message ?? 'Failed to reset password.');
      } else {
        setBannerError(err?.message ?? 'An unexpected error occurred.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!uid || !token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <Alert type="error">Invalid or expired password reset link. Please request a new one.</Alert>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="rounded-2xl bg-white shadow-sm ring-1 ring-gray-200 p-8">
          <h2 className="mb-1 text-xl font-semibold text-gray-900">Set new password</h2>
          <p className="mb-6 text-sm text-gray-500">Choose a strong password for your account.</p>

          {bannerError && <Alert type="error" className="mb-4">{bannerError}</Alert>}

          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
            <Input id="new_password" name="new_password" type="password" label="New password"
              placeholder="Min. 8 characters" value={form.new_password} onChange={handleChange}
              error={fieldErrors.new_password} />
            <Input id="confirm_password" name="confirm_password" type="password" label="Confirm password"
              placeholder="Repeat password" value={form.confirm_password} onChange={handleChange}
              error={fieldErrors.confirm_password} />
            <Button type="submit" loading={loading} className="w-full mt-1">
              Reset password
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-gray-500">
          <Link to="/login" className="font-medium text-blue-600 hover:underline">← Back to login</Link>
        </p>
      </div>
    </div>
  );
}
