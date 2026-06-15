import { LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { signOut } from '../../lib/auth';
import { roleLabels } from '../../lib/formatters';
import type { Profile } from '../../types';
import { Button } from '../ui/Button';

type AdminHeaderProps = {
  profile: Profile;
};

export function AdminHeader({ profile }: AdminHeaderProps) {
  const navigate = useNavigate();

  async function handleSignOut() {
    await signOut();
    navigate('/admin/login');
  }

  return (
    <header className="sticky top-0 z-30 border-b border-surface-200 bg-white">
      <div className="flex min-h-16 items-center justify-between gap-4 px-4 lg:px-6">
        <div>
          <p className="text-sm font-bold text-ink-900">{profile.full_name}</p>
          <p className="text-xs text-ink-500">{roleLabels[profile.role]} · {profile.email}</p>
        </div>
        <Button variant="secondary" size="sm" onClick={handleSignOut}>
          <LogOut size={16} />
          Sair
        </Button>
      </div>
    </header>
  );
}
