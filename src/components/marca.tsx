/** Elementos gráficos da identidade isadsign. */
export function BarrasLaterais() {
  return (
    <>
      <div aria-hidden className="pointer-events-none fixed bottom-3 left-2 top-3 z-40 w-2 rounded-full bg-grafite sm:w-2.5" />
      <div aria-hidden className="pointer-events-none fixed bottom-3 right-2 top-3 z-40 w-2 rounded-full bg-grafite sm:w-2.5" />
    </>
  );
}

export function Estrela({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" aria-hidden className={className}>
      <path d="M50 0 61 39 100 50 61 61 50 100 39 61 0 50 39 39Z" fill="currentColor" />
    </svg>
  );
}

export function Seta() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 17 17 7M8 7h9v9" />
    </svg>
  );
}
