import { Navigate } from 'react-router-dom';
import { getAdminRedirectPath } from '../../lib/auth';
import { useAdminProfile } from '../../routes/ProtectedRoute';

export function AdminRouter() {
  const profile = useAdminProfile();
  return <Navigate to={getAdminRedirectPath(profile)} replace />;
}
