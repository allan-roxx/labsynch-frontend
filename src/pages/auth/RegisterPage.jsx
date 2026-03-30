import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../../api/endpoints';
import { Button, Input, Alert } from '../../components/ui';

const INITIAL = {
  email: '',
  password: '',
  confirm_password: '',
  full_name: '',
  phone_number: '',
  school_name: '',
  registration_number: '',
  physical_address: '',
  county: '',
  contact_person: '',
  contact_designation: '',
};

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState(INITIAL);
  const [fieldErrors, setFieldErrors] = useState({});
  const [bannerError, setBannerError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setFieldErrors((prev) => ({ ...prev, [e.target.name]: '' }));
  };

  const validate = () => {
    const errors = {};
    if (!form.email) errors.email = 'Email is required.';
    if (!form.full_name) errors.full_name = 'Full name is required.';
    if (!form.password) errors.password = 'Password is required.';
    else if (form.password.length < 8) errors.password = 'Password must be at least 8 characters.';
    if (form.password !== form.confirm_password)
      errors.confirm_password = 'Passwords do not match.';
    if (!form.school_name) errors.school_name = 'School name is required.';
    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBannerError('');
    const errors = validate();
    if (Object.keys(errors).length > 0) { setFieldErrors(errors); return; }

    setLoading(true);
    try {
      await authApi.register(form);
      setSuccess(true);
    } catch (err) {
      if (err?.errors) {
        const mapped = {};
        Object.entries(err.errors).forEach(([k, v]) => {
          mapped[k] = Array.isArray(v) ? v[0] : v;
        });
        setFieldErrors(mapped);
        const nonField = err.errors.non_field_errors?.[0] ?? '';
        setBannerError(nonField || err.message || 'Registration failed.');
      } else {
        setBannerError(err?.message ?? 'An unexpected error occurred.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm ring-1 ring-gray-200 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900">Registration submitted</h2>
          <p className="mt-2 text-sm text-gray-500">
            Check your email inbox to verify your address before logging in.
          </p>
          <Button className="mt-6 w-full" onClick={() => navigate('/login')}>
            Go to Login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600">
            <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Register your school</h1>
          <p className="mt-1 text-sm text-gray-500">Create an account to start renting lab equipment</p>
        </div>

        <div className="rounded-2xl bg-white shadow-sm ring-1 ring-gray-200 p-8">
          {bannerError && (
            <Alert type="error" className="mb-6">{bannerError}</Alert>
          )}

          <form onSubmit={handleSubmit} noValidate>
            {/* Section: Account */}
            <fieldset className="mb-6">
              <legend className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-400">
                Account details
              </legend>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input id="full_name" name="full_name" label="Full name" placeholder="Jane Doe"
                  value={form.full_name} onChange={handleChange} error={fieldErrors.full_name} />
                <Input id="email" name="email" type="email" label="Email" placeholder="you@school.ac.ke"
                  value={form.email} onChange={handleChange} error={fieldErrors.email} />
                <Input id="phone_number" name="phone_number" label="Phone number" placeholder="+254 700 000 000"
                  value={form.phone_number} onChange={handleChange} error={fieldErrors.phone_number} />
                <div /> {/* spacer */}
                <Input id="password" name="password" type="password" label="Password"
                  placeholder="Min. 8 characters" value={form.password} onChange={handleChange}
                  error={fieldErrors.password} />
                <Input id="confirm_password" name="confirm_password" type="password" label="Confirm password"
                  placeholder="Repeat password" value={form.confirm_password} onChange={handleChange}
                  error={fieldErrors.confirm_password} />
              </div>
            </fieldset>

            {/* Divider */}
            <hr className="my-4 border-gray-100" />

            {/* Section: School */}
            <fieldset className="mb-6">
              <legend className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-400">
                School information
              </legend>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input id="school_name" name="school_name" label="School name" placeholder="Nairobi High School"
                  value={form.school_name} onChange={handleChange} error={fieldErrors.school_name} />
                <Input id="registration_number" name="registration_number" label="Registration number (optional)"
                  placeholder="REG/001/2020" value={form.registration_number} onChange={handleChange}
                  error={fieldErrors.registration_number} />
                <Input id="county" name="county" label="County" placeholder="Nairobi"
                  value={form.county} onChange={handleChange} error={fieldErrors.county} />
                <Input id="contact_person" name="contact_person" label="Contact person"
                  placeholder="Head of Science" value={form.contact_person} onChange={handleChange}
                  error={fieldErrors.contact_person} />
                <Input id="contact_designation" name="contact_designation" label="Designation"
                  placeholder="Lab Coordinator" value={form.contact_designation} onChange={handleChange}
                  error={fieldErrors.contact_designation} />
                <div className="sm:col-span-2">
                  <Input id="physical_address" name="physical_address" label="Physical address"
                    placeholder="P.O Box 123, Nairobi" value={form.physical_address} onChange={handleChange}
                    error={fieldErrors.physical_address} />
                </div>
              </div>
            </fieldset>

            <Button type="submit" loading={loading} className="w-full">
              Create account
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-gray-500">
          Already registered?{' '}
          <Link to="/login" className="font-medium text-blue-600 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
