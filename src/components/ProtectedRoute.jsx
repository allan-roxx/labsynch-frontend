/**
 * ProtectedRoute — guards a route behind authentication.
 * Optionally restricts to a specific role ('ADMIN' | 'SCHOOL').
 *
 * Flow:
 * 1. If not authenticated  → redirect to /login
 * 2. If role mismatch      → redirect to the correct portal root
 * 3. If user not yet loaded (e.g. page refresh) → fetch /me first
 */

import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import { Spinner } from './ui';

export default function ProtectedRoute({ role }) {
  const { isAuthenticated, user, fetchMe } = useAuthStore();
  const [checking, setChecking] = useState(!user && isAuthenticated);

  useEffect(() => {
    if (!user && isAuthenticated) {
      fetchMe().finally(() => setChecking(false));
    }
  }, []);

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (checking) return <Spinner />;

  if (role && user?.role !== role) {
    // Redirect to the correct portal instead of showing a blank page
    return <Navigate to={user?.role === 'ADMIN' ? '/admin' : '/school'} replace />;
  }

  return <Outlet />;
}
