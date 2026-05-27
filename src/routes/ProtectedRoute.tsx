import { useEffect, useState } from 'react';
import { Navigate, Outlet, useOutletContext } from 'react-router-dom';
import { AdminShell } from '../components/layout/AdminShell';
import { LoadingState } from '../components/public/LoadingState';
import { getAdminRedirectPath, getCurrentProfile } from '../lib/auth';
import type { AppRole, Profile } from '../types';

type ProtectedRouteProps = {
  roles?: AppRole[];
};

type AdminOutletContext = {
  profile: Profile;
};

export function ProtectedRoute({ roles }: ProtectedRouteProps) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setProfile(await getCurrentProfile());
      setLoading(false);
    }

    void load();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-50 p-6">
        <LoadingState label="Verificando acesso..." />
      </div>
    );
  }

  if (!profile) return <Navigate to="/admin/login" replace />;
  if (roles && !roles.includes(profile.role)) return <Navigate to={getAdminRedirectPath(profile)} replace />;

  return (
    <AdminShell profile={profile}>
      <Outlet context={{ profile } satisfies AdminOutletContext} />
    </AdminShell>
  );
}

export function useAdminProfile() {
  return useOutletContext<AdminOutletContext>().profile;
}
