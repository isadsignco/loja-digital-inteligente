export function ProsePage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-[692px] px-5 py-16">
      <h1 className="titulo text-[40px] sm:text-[56px]">{title}</h1>
      <div className="mt-8 space-y-5 text-[17px] leading-relaxed text-bege [&_h2]:mt-10 [&_h2]:text-[28px] [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:text-grafite [&_strong]:text-grafite">
        {children}
      </div>
    </div>
  );
}

export function DraftNotice() {
  return (
    <p className="rounded-2xl bg-creme-2 p-4 text-sm text-grafite">
      Rascunho em elaboração. Este texto será revisado juridicamente antes da abertura da loja.
    </p>
  );
}
