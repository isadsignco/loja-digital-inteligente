import Link from "next/link";
import { Suspense } from "react";
import { CatalogNotice } from "@/components/catalog-notice";
import { ProductCard } from "@/components/product-card";
import { Estrela, Seta } from "@/components/marca";
import { store } from "@/config/store";
import { getCategories, getProducts, type ProductSummary } from "@/server/catalog";

export default function Home() {
  return (
    <>
      <section className="relative mx-auto max-w-6xl overflow-hidden px-7 pb-12 pt-10 sm:px-10 sm:pt-16">
        <div className="mb-6 flex justify-between text-[13px] font-bold text-bege">
          <span>packs pra postar</span>
          <span className="hidden sm:inline">entrega no Canva</span>
        </div>
        <h1 className="titulo text-[clamp(52px,12vw,132px)]">
          Conteúdo
          <span className="block text-pink">
            pronto
            <span className="pilula ml-3 translate-y-[-0.55em] bg-grafite px-4 py-1.5 align-middle text-[0.2em] normal-case tracking-[-0.01em] text-creme">
              pra postar
            </span>
          </span>
        </h1>
        <p className="mt-6 max-w-xl text-lg text-bege">{store.description}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/catalogo" className="btn btn-pink text-lg">
            Ver catálogo <Seta />
          </Link>
          <Link href="/catalogo?personalizavel=1" className="btn btn-contorno text-lg">
            Quero nas minhas cores
          </Link>
        </div>
        <ol className="mt-12 grid gap-3 sm:grid-cols-3">
          {[
            ["Escolha o pack", "Posts, stories e stickers prontos por segmento."],
            ["Pague com Pix ou cartão", "Confirmação automática em segundos."],
            ["Edite no Canva", "O link chega no seu e-mail e no WhatsApp."],
          ].map(([title, text], i) => (
            <li key={title} className="painel relative overflow-hidden p-6">
              <span className="titulo text-5xl text-pink">{i + 1}</span>
              <p className="mt-3 text-lg font-black italic">{title}</p>
              <p className="mt-1 text-bege">{text}</p>
            </li>
          ))}
        </ol>
        <Estrela className="pointer-events-none absolute -right-8 top-4 h-28 w-28 animate-[spin_22s_linear_infinite] text-grafite opacity-[0.08]" />
      </section>

      <Suspense fallback={<SectionSkeleton />}>
        <CatalogSections />
      </Suspense>
    </>
  );
}

async function CatalogSections() {
  const [products, categories] = await Promise.all([getProducts(), getCategories()]);
  if (!products.configured || products.data.length === 0) {
    return (
      <section className="mx-auto max-w-6xl px-7 sm:px-10">
        <CatalogNotice configured={products.configured} />
      </section>
    );
  }

  const all = products.data;
  const featured = all.filter((p) => p.featured);
  const launches = all.filter((p) => p.isNew);
  const customizable = all.filter((p) => p.customizable);
  const offers = all.filter((p) => p.promoPriceCents !== null && p.promoPriceCents < p.priceCents);

  return (
    <div className="space-y-14">
      {categories.configured && categories.data.length > 0 && (
        <section className="mx-auto max-w-6xl px-7 sm:px-10">
          <SectionTitle title="Categorias" />
          <div className="flex gap-2 overflow-x-auto pb-2">
            {categories.data.map((c) => (
              <Link
                key={c.id}
                href={`/catalogo?categoria=${c.slug}`}
                className="pilula shrink-0 border-[1.5px] border-linha-forte px-4 py-2 hover:border-grafite"
              >
                {c.name}
              </Link>
            ))}
          </div>
        </section>
      )}
      <ProductRow title="Destaques" products={featured} />
      <ProductRow title="Lançamentos" products={launches} />
      <ProductRow title="Personalize com as suas cores" products={customizable} href="/catalogo?personalizavel=1" />
      <ProductRow title="Ofertas" products={offers} />
      {featured.length === 0 && launches.length === 0 && <ProductRow title="Produtos" products={all.slice(0, 8)} href="/catalogo" />}
    </div>
  );
}

function ProductRow({ title, products, href }: { title: string; products: ProductSummary[]; href?: string }) {
  if (products.length === 0) return null;
  return (
    <section className="mx-auto max-w-6xl px-7 sm:px-10">
      <SectionTitle title={title} href={href} />
      <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
        {products.slice(0, 8).map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </section>
  );
}

function SectionTitle({ title, href }: { title: string; href?: string }) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <h2 className="titulo text-4xl sm:text-6xl">{title}</h2>
      {href && (
        <Link href={href} className="pilula shrink-0 bg-grafite px-4 py-1.5 text-sm text-creme hover:bg-pink">
          Ver todos
        </Link>
      )}
    </div>
  );
}

function SectionSkeleton() {
  return (
    <div className="mx-auto grid max-w-6xl grid-cols-2 gap-3 px-7 sm:px-10 sm:gap-5 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="aspect-[4/5] animate-pulse rounded-[26px] bg-creme-2" />
      ))}
    </div>
  );
}
