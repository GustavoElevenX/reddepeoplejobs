import type { ReactNode } from 'react';
export function ProcessActivityPanel({ children }: { children: ReactNode }) { return <aside className="h-fit overflow-hidden rounded-xl border border-surface-200 bg-white shadow-card">{children}</aside>; }
