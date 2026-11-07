import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <p className="titulo text-[80px]">404</p>
      <p className="mt-3 text-bege">Não encontramos esta página.</p>
      <Link href="/catalogo" className="btn btn-pink mt-6">
        Ir para o catálogo
      </Link>
    </div>
  );
}
