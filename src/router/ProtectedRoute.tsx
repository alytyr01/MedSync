import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { LoadingState } from '@/components/common';

export function ProtectedRoute() {
  const { user, initialized } = useAuthStore();

  if (!initialized) {
    return <LoadingState label="Loading..." />;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <Outlet />;
}