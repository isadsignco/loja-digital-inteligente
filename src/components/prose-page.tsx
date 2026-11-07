export function ProsePage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl px-7 py-12 sm:px-10">
      <h1 className="titulo text-[clamp(44px,9vw,88px)]">{title}</h1>
      <div className="mt-8 space-y-5 leading-relaxed text-bege [&_h2]:mt-10 [&_h2]:text-2xl [&_h2]:font-black [&_h2]:italic [&_h2]:text-grafite [&_strong]:text-grafite">
        {children}
      </div>
    </div>
  );
}

export function DraftNotice() {
  return (
    <p className="rounded-[20px] border-[1.5px] border-pink bg-creme-2 p-4 text-sm font-bold text-grafite">
      Rascunho em elaboração. Este texto será revisado juridicamente antes da abertura da loja.
    </p>
  );
}
