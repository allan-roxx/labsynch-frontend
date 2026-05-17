import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi, usersApi } from '../../api/endpoints';
import { Button, Input, Alert } from '../../components/ui';

// Fields accepted by the registration endpoint
const ACCOUNT_FIELDS = {
  email: '',
  password: '',
  confirm_password: '',
  full_name: '',
  phone_number: '',
  school_name: '',
  registration_number: '',
  terms_accepted: false,
};

// Extra profile fields — patched after registration
const PROFILE_FIELDS = {
  contact_person: '',
  contact_designation: '',
  county: '',
  physical_address: '',
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const FULL_NAME_REGEX = /^[A-Za-z][A-Za-z\s'.-]{1,98}[A-Za-z.]$/;
const SCHOOL_NAME_REGEX = /^[A-Za-z0-9][A-Za-z0-9\s&'().,/:-]{1,118}[A-Za-z0-9)]$/;
const REG_NO_REGEX = /^[A-Za-z0-9][A-Za-z0-9/-]{2,49}$/;
const PERSON_NAME_REGEX = /^[A-Za-z][A-Za-z\s'.-]{1,78}[A-Za-z.]$/;
const DESIGNATION_REGEX = /^[A-Za-z][A-Za-z\s&'().,/:-]{1,78}$/;
const COUNTY_REGEX = /^[A-Za-z][A-Za-z\s'.-]{1,58}$/;
const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;

function normalizePhoneNumber(value) {
  return (value || '').trim();
}

function isValidKenyaPhone(value) {
  const phone = normalizePhoneNumber(value);
  if (!/^\+?\d+$/.test(phone)) return false;

  if (phone.startsWith('+2547')) return phone.length === 13;
  if (phone.startsWith('2547')) return phone.length === 12;
  if (phone.startsWith('07')) return phone.length === 10;

  return false;
}

export default function RegisterPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState({ ...ACCOUNT_FIELDS, ...PROFILE_FIELDS });
  const [fieldErrors, setFieldErrors] = useState({});
  const [bannerError, setBannerError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [devVerifyUrl, setDevVerifyUrl] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === 'email') {
      setForm((prev) => ({ ...prev, [name]: value.toLowerCase() }));
      setFieldErrors((prev) => ({ ...prev, [name]: '' }));
      return;
    }

    if (name === 'phone_number') {
      // Allow only digits and a single leading '+' for international format.
      let sanitized = value.replace(/[^\d+]/g, '');
      if (sanitized.includes('+')) {
        sanitized = `${sanitized.startsWith('+') ? '+' : ''}${sanitized.replace(/\+/g, '')}`;
      }

      setForm((prev) => ({ ...prev, [name]: sanitized }));
      setFieldErrors((prev) => ({ ...prev, [name]: '' }));
      return;
    }

    setForm((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => ({ ...prev, [e.target.name]: '' }));
  };

  const validate = () => {
    const errors = {};
    const email = form.email.trim();
    const fullName = form.full_name.trim();
    const schoolName = form.school_name.trim();
    const regNo = form.registration_number.trim();
    const contactPerson = form.contact_person.trim();
    const contactDesignation = form.contact_designation.trim();
    const county = form.county.trim();

    if (!email) {
      errors.email = 'Email is required.';
    } else if (!EMAIL_REGEX.test(email)) {
      errors.email = 'Enter a valid email address.';
    }

    if (!fullName) {
      errors.full_name = 'Full name is required.';
    } else if (!FULL_NAME_REGEX.test(fullName)) {
      errors.full_name = 'Enter a valid full name (letters, spaces, hyphen, apostrophe only).';
    }

    if (!form.phone_number.trim()) {
      errors.phone_number = 'Phone number is required.';
    } else if (!/^\+?\d+$/.test(form.phone_number.trim())) {
      errors.phone_number = 'Phone number can only contain digits and an optional leading +.';
    } else if (!isValidKenyaPhone(form.phone_number)) {
      errors.phone_number = 'Use 07XXXXXXXX (10), 2547XXXXXXXX (12), or +2547XXXXXXXX (13).';
    }

    if (!form.password) {
      errors.password = 'Password is required.';
    } else if (!STRONG_PASSWORD_REGEX.test(form.password)) {
      errors.password = 'Password must include uppercase, lowercase, number, and symbol.';
    }

    if (form.password !== form.confirm_password)
      errors.confirm_password = 'Passwords do not match.';

    if (!schoolName) {
      errors.school_name = 'School name is required.';
    } else if (!SCHOOL_NAME_REGEX.test(schoolName)) {
      errors.school_name = 'Enter a valid school name.';
    }

    if (regNo && !REG_NO_REGEX.test(regNo)) {
      errors.registration_number = 'Registration number can only include letters, numbers, / and -.';
    }

    if (contactPerson && !PERSON_NAME_REGEX.test(contactPerson)) {
      errors.contact_person = 'Enter a valid contact person name.';
    }

    if (contactDesignation && !DESIGNATION_REGEX.test(contactDesignation)) {
      errors.contact_designation = 'Enter a valid designation.';
    }

    if (county && !COUNTY_REGEX.test(county)) {
      errors.county = 'Enter a valid county name.';
    }

    if (!form.terms_accepted) errors.terms_accepted = 'You must accept the Terms and Conditions to create an account.';
    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBannerError('');
    const errors = validate();
    if (Object.keys(errors).length > 0) { setFieldErrors(errors); return; }

    setLoading(true);
    try {
      // Step 1 — Create the account (only sends fields the endpoint accepts)
      const registrationPayload = {
        email:               form.email.trim().toLowerCase(),
        password:            form.password,
        confirm_password:    form.confirm_password,
        full_name:           form.full_name.trim(),
        phone_number:        normalizePhoneNumber(form.phone_number),
        school_name:         form.school_name.trim(),
        registration_number: form.registration_number.trim(),
        terms_accepted:      true,
      };
      const regRes = await authApi.register(registrationPayload);
      const regData = regRes?.data ?? regRes;

      // Capture the direct verification URL when the backend returns one.
      if (regData?.dev_verification_url) {
        setDevVerifyUrl(regData.dev_verification_url);
        localStorage.setItem('latest_verification_url', regData.dev_verification_url);
      }

      // Step 2 — If the user provided extra profile details, persist them.
      // We need a token to call the profile endpoint, so we log in silently first.
      const hasExtraFields = Object.keys(PROFILE_FIELDS).some((k) => form[k]?.trim());
      if (hasExtraFields) {
        try {
          const loginRes = await authApi.login({ email: form.email.trim().toLowerCase(), password: form.password });
          // The login endpoint returns tokens inside data.tokens per AGENTS.md
          const tokens = loginRes?.data?.tokens ?? loginRes?.tokens ?? loginRes?.data;
          if (tokens?.access) {
            // Temporarily write the access token so the client interceptor picks it up
            localStorage.setItem('access_token', tokens.access);
            const profilePayload = {};
            Object.keys(PROFILE_FIELDS).forEach((k) => {
              if (form[k]?.trim()) profilePayload[k] = form[k].trim();
            });
            await usersApi.updateMySchoolProfile(profilePayload);
            // Remove immediately — user hasn't verified email yet
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
          }
        } catch {
          // Profile patch failed — non-fatal, user can fill in via profile page
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
        }
      }

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

  // ── Success screen ──
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
          {devVerifyUrl && (
            <div className="mt-4 rounded-lg bg-yellow-50 border border-yellow-200 p-3 text-left">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider bg-yellow-300 text-yellow-900 rounded px-1.5 py-0.5">
                  No SMTP Mode
                </span>
                <span className="text-xs text-yellow-700">Verify directly using this link:</span>
              </div>
              <a
                href={devVerifyUrl}
                className="text-xs text-blue-600 break-all hover:underline font-mono"
              >
                {devVerifyUrl}
              </a>
            </div>
          )}
          <Button className="mt-6 w-full" onClick={() => navigate('/login')}>
            Go to Login
          </Button>
        </div>
      </div>
    );
  }

  // ── Form ──
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
            {/* ── Section: Account ── */}
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
                  placeholder="Upper, lower, number, symbol" value={form.password} onChange={handleChange}
                  error={fieldErrors.password} />
                <Input id="confirm_password" name="confirm_password" type="password" label="Confirm password"
                  placeholder="Repeat password" value={form.confirm_password} onChange={handleChange}
                  error={fieldErrors.confirm_password} />
              </div>
            </fieldset>

            <hr className="my-4 border-gray-100" />

            {/* ── Section: School (required) ── */}
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
              </div>
            </fieldset>

            <hr className="my-4 border-gray-100" />

            {/* ── Section: Contact details (optional, saved post-registration) ── */}
            <fieldset className="mb-6">
              <legend className="mb-1 text-sm font-semibold uppercase tracking-wide text-gray-400">
                Contact details
              </legend>
              <p className="text-xs text-gray-400 mb-4">
                Optional — you can also fill these in from your profile after logging in.
              </p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input id="contact_person" name="contact_person" label="Contact person"
                  placeholder="Johnson Ouma" value={form.contact_person} onChange={handleChange}
                  error={fieldErrors.contact_person} />
                <Input id="contact_designation" name="contact_designation" label="Designation"
                  placeholder="Lab Coordinator" value={form.contact_designation} onChange={handleChange}
                  error={fieldErrors.contact_designation} />
                <Input id="county" name="county" label="County"
                  placeholder="Nairobi" value={form.county} onChange={handleChange}
                  error={fieldErrors.county} />
                {/* <div className="sm:col-span-2">
                  <Input id="physical_address" name="physical_address" label="Physical address"
                    placeholder="P.O Box 123, Nairobi" value={form.physical_address} onChange={handleChange}
                    error={fieldErrors.physical_address} />
                </div> */}
              </div>
            </fieldset>

            {/* ── Terms acceptance ── */}
            <div className="space-y-1">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="terms_accepted"
                  checked={form.terms_accepted}
                  onChange={(e) => {
                    setForm((prev) => ({ ...prev, terms_accepted: e.target.checked }));
                    setFieldErrors((prev) => ({ ...prev, terms_accepted: '' }));
                  }}
                  className="mt-0.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">
                  I have read and agree to the{' '}
                  <Link
                    to="/terms"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline font-medium"
                  >
                    Terms &amp; Conditions
                  </Link>
                </span>
              </label>
              {fieldErrors.terms_accepted && (
                <p className="text-red-600 text-xs pl-6">{fieldErrors.terms_accepted}</p>
              )}
            </div>

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
