import type { LucideIcon } from 'lucide-react';
import { Card } from '../ui/Card';

type AdminStatCardProps = {
  title: string;
  value: string | number;
  icon: LucideIcon;
  hint?: string;
};

export function AdminStatCard({ title, value, icon: Icon, hint }: AdminStatCardProps) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-ink-500">{title}</p>
          <p className="mt-2 text-3xl font-black text-ink-900">{value}</p>
          {hint ? <p className="mt-2 text-xs text-ink-500">{hint}</p> : null}
        </div>
        <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-redde-50 text-redde-600">
          <Icon size={22} />
        </span>
      </div>
    </Card>
  );
}
