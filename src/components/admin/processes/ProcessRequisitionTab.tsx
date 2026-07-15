import type { ReactNode } from 'react';
export function ProcessRequisitionTab({ children }: { children: ReactNode }) { return <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">{children}</section>; }
