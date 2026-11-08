import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CatalogNotice } from "@/components/catalog-notice";
import { ProductCard } from "@/components/product-card";
import { getCategories, getProducts, type ProductLine } from "@/server/catalog";

export const metadata: Metadata = { title: "Catálogo" };

export default function CatalogPage({ searchParams }: PageProps<"/catalogo">) {
  return (
    <div className="mx-auto max-w-[1200px] px-5 py-12">
      <h1 className="titulo text-[44px] sm:text-[68px]">Catálogo</h1>
      <Suspense fallback={<p className="mt-6 text-bege">Carregando…</p>}>
        <CatalogResults searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

const LINHAS: { valor: ProductLine; nome: string }[] = [
  { valor: "original", nome: "Original" },
  { valor: "ai_design", nome: "AI Design" },
  { valor: "personalizado", nome: "Personalizados" },
];

function first(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

async function CatalogResults({ searchParams }: { searchParams: PageProps<"/catalogo">["searchParams"] }) {
  const sp = await searchParams;
  const query = first(sp.q)?.slice(0, 80) ?? "";
  const categorySlug = first(sp.categoria);
  const customizable = first(sp.personalizavel) === "1" ? true : undefined;
  const linhaParam = first(sp.linha);
  const line = LINHAS.some((l) => l.valor === linhaParam) ? (linhaParam as ProductLine) : undefined;

  const [products, categories] = await Promise.all([
    getProducts({ query, categorySlug, customizable, line }),
    getCategories(),
  ]);

  const chip = (active: boolean) =>
    `pilula min-h-10 shrink-0 border-[1.5px] px-4 text-sm ${active ? "border-grafite bg-grafite text-white" : "border-linha-forte bg-white hover:border-grafite"}`;

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
          className="w-full rounded-full bg-creme-2 px-5 py-3 text-[17px] outline-none placeholder:text-bege focus:ring-2 focus:ring-pink"
        />
        {categorySlug && <input type="hidden" name="categoria" value={categorySlug} />}
        {line && <input type="hidden" name="linha" value={line} />}
        <button className="btn btn-pink">Buscar</button>
      </form>

      <div className="mt-5 flex gap-2 overflow-x-auto pb-2">
        {LINHAS.map((l) => (
          <Link key={l.valor} href={line === l.valor ? "/catalogo" : `/catalogo?linha=${l.valor}`} className={chip(line === l.valor)}>
            {l.nome}
          </Link>
        ))}
      </div>

      <div className="mt-2 flex gap-2 overflow-x-auto pb-2">
        <Link href="/catalogo" className={chip(!categorySlug && !customizable && !line)}>
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
          products.configured && (query || categorySlug || customizable || line) ? (
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
