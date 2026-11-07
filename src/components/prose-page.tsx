export function ProsePage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="font-display text-4xl tracking-tight">{title}</h1>
      <div className="mt-8 space-y-5 leading-relaxed text-ink-soft [&_h2]:mt-10 [&_h2]:font-display [&_h2]:text-2xl [&_h2]:text-ink [&_strong]:text-ink">
        {children}
      </div>
    </div>
  );
}

export function DraftNotice() {
  return (
    <p className="rounded-xl border border-accent/40 bg-blush/30 p-4 text-sm text-ink">
      Rascunho em elaboração. Este texto será revisado juridicamente antes da abertura da loja.
    </p>
  );
}
