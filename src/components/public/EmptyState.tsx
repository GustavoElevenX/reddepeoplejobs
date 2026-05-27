export function EmptyState({ title, text }: { title: string; text?: string }) {
  return (
    <div className="rounded-lg border border-dashed border-surface-200 bg-white p-8 text-center">
      <p className="text-base font-bold text-ink-900">{title}</p>
      {text ? <p className="mt-2 text-sm text-ink-500">{text}</p> : null}
    </div>
  );
}
