import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CatalogNotice } from "@/components/catalog-notice";
import { ProductCard } from "@/components/product-card";
import { getCategories, getProducts } from "@/server/catalog";

export const metadata: Metadata = { title: "Catálogo" };

export default function CatalogPage({ searchParams }: PageProps<"/catalogo">) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-display text-4xl tracking-tight">Catálogo</h1>
      <Suspense fallback={<p className="mt-6 text-ink-soft">Carregando…</p>}>
        <CatalogResults searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

function first(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

async function CatalogResults({ searchParams }: { searchParams: PageProps<"/catalogo">["searchParams"] }) {
  const sp = await searchParams;
  const query = first(sp.q)?.slice(0, 80) ?? "";
  const categorySlug = first(sp.categoria);
  const customizable = first(sp.personalizavel) === "1" ? true : undefined;

  const [products, categories] = await Promise.all([
    getProducts({ query, categorySlug, customizable }),
    getCategories(),
  ]);

  const chip = (active: boolean) =>
    `shrink-0 rounded-full border px-4 py-2 text-sm ${active ? "border-ink bg-ink text-cream" : "border-line bg-paper hover:border-ink/30"}`;

  return (
    <>
      <form action="/catalogo" className="mt-6 flex gap-2" role="search">
        <label htmlFor="busca" className="sr-only">
          Buscar produtos
        </label>
        <input
          id="busca"
          name="q"
          defaultValue={query}
          placeholder="Buscar: doceria, stories, Natal…"
          className="w-full rounded-full border border-line bg-paper px-5 py-3 text-sm outline-none focus:border-ink/40"
        />
        {categorySlug && <input type="hidden" name="categoria" value={categorySlug} />}
        <button className="rounded-full bg-ink px-5 py-3 text-sm font-medium text-cream">Buscar</button>
      </form>

      <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
        <Link href="/catalogo" className={chip(!categorySlug && !customizable)}>
          Todos
        </Link>
        <Link href="/catalogo?personalizavel=1" className={chip(!!customizable)}>
          Personalizáveis
        </Link>
        {categories.configured &&
          categories.data.map((c) => (
            <Link key={c.id} href={`/catalogo?categoria=${c.slug}`} className={chip(categorySlug === c.slug)}>
              {c.name}
            </Link>
          ))}
      </div>

      <div className="mt-6">
        {!products.configured || products.data.length === 0 ? (
          products.configured && (query || categorySlug || customizable) ? (
            <p className="text-ink-soft">Nenhum produto encontrado com esses filtros.</p>
          ) : (
            <CatalogNotice configured={products.configured} />
          )
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
            {products.data.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
