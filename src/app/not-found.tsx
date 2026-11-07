import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <p className="font-display text-5xl">404</p>
      <p className="mt-3 text-ink-soft">Não encontramos esta página.</p>
      <Link href="/catalogo" className="mt-6 inline-block rounded-full bg-ink px-6 py-3 text-sm text-cream">
        Ir para o catálogo
      </Link>
    </div>
  );
}
