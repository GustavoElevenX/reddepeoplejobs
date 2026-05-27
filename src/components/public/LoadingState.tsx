export function LoadingState({ label = 'Carregando dados...' }: { label?: string }) {
  return (
    <div className="rounded-lg border border-surface-200 bg-white p-6 text-sm font-semibold text-ink-500 shadow-sm">
      {label}
    </div>
  );
}
