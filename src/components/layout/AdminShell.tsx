import type { ReactNode } from 'react';
import { AdminHeader } from './AdminHeader';
import { Sidebar } from './Sidebar';
import type { Profile } from '../../types';

type AdminShellProps = {
  profile: Profile;
  children: ReactNode;
};

export function AdminShell({ profile, children }: AdminShellProps) {
  return (
    <div className="min-h-screen bg-surface-50 lg:flex">
      <Sidebar profile={profile} />
      <div className="min-w-0 flex-1">
        <AdminHeader profile={profile} />
        <main className="px-4 py-6 lg:px-6">{children}</main>
      </div>
    </div>
  );
}
