import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CatalogNotice } from "@/components/catalog-notice";
import { ProductCard } from "@/components/product-card";
import { getCategories, getProducts } from "@/server/catalog";

export const metadata: Metadata = { title: "Catálogo" };

export default function CatalogPage({ searchParams }: PageProps<"/catalogo">) {
  return (
    <div className="mx-auto max-w-[1024px] px-5 py-12">
      <h1 className="titulo text-[40px] sm:text-[56px]">Catálogo</h1>
      <Suspense fallback={<p className="mt-6 text-bege">Carregando…</p>}>
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
    `pilula shrink-0 px-4 py-2 text-sm ${active ? "bg-grafite text-white" : "bg-creme-2 hover:bg-[#e8e8ed]"}`;

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
          className="w-full rounded-xl bg-creme-2 px-4 py-3 text-[17px] outline-none placeholder:text-bege focus:ring-2 focus:ring-pink"
        />
        {categorySlug && <input type="hidden" name="categoria" value={categorySlug} />}
        <button className="btn btn-pink">Buscar</button>
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
            <p className="text-bege">Nenhum produto encontrado com esses filtros.</p>
          ) : (
            <CatalogNotice configured={products.configured} />
          )
        ) : (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {products.data.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
