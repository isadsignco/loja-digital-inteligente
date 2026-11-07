import Link from "next/link";
import { Suspense } from "react";
import { CatalogNotice } from "@/components/catalog-notice";
import { ProductCard } from "@/components/product-card";
import { store } from "@/config/store";
import { getCategories, getProducts, type ProductSummary } from "@/server/catalog";

export default function Home() {
  return (
    <>
      <section className="mx-auto max-w-6xl px-4 pb-10 pt-12 sm:pt-20">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-accent">Pronto pra postar</p>
        <h1 className="mt-4 max-w-3xl font-display text-4xl leading-[1.05] tracking-tight sm:text-6xl">
          Conteúdo bonito pro seu negócio, sem começar do zero.
        </h1>
        <p className="mt-5 max-w-xl text-lg text-ink-soft">{store.description}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/catalogo" className="rounded-full bg-ink px-6 py-3 text-sm font-medium text-cream hover:bg-ink/85">
            Ver catálogo
          </Link>
          <Link
            href="/catalogo?personalizavel=1"
            className="rounded-full border border-ink/20 px-6 py-3 text-sm font-medium hover:bg-paper"
          >
            Quero nas minhas cores
          </Link>
        </div>
        <ol className="mt-12 grid gap-4 text-sm sm:grid-cols-3">
          {[
            ["Escolha o pack", "Posts, stories e stickers prontos por segmento."],
            ["Pague com Pix ou cartão", "Confirmação automática em segundos."],
            ["Edite no Canva", "O link chega no seu e-mail e no WhatsApp."],
          ].map(([title, text], i) => (
            <li key={title} className="rounded-2xl border border-line bg-paper p-5">
              <span className="font-display text-2xl text-accent">{i + 1}</span>
              <p className="mt-2 font-medium">{title}</p>
              <p className="mt-1 text-ink-soft">{text}</p>
            </li>
          ))}
        </ol>
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
      <section className="mx-auto max-w-6xl px-4">
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
        <section className="mx-auto max-w-6xl px-4">
          <SectionTitle title="Categorias" />
          <div className="flex gap-2 overflow-x-auto pb-2">
            {categories.data.map((c) => (
              <Link
                key={c.id}
                href={`/catalogo?categoria=${c.slug}`}
                className="shrink-0 rounded-full border border-line bg-paper px-4 py-2 text-sm hover:border-ink/30"
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
    <section className="mx-auto max-w-6xl px-4">
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
    <div className="mb-4 flex items-end justify-between">
      <h2 className="font-display text-2xl tracking-tight sm:text-3xl">{title}</h2>
      {href && (
        <Link href={href} className="text-sm text-ink-soft underline-offset-4 hover:underline">
          Ver todos
        </Link>
      )}
    </div>
  );
}

function SectionSkeleton() {
  return (
    <div className="mx-auto grid max-w-6xl grid-cols-2 gap-3 px-4 sm:gap-5 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="aspect-[4/5] animate-pulse rounded-2xl bg-paper" />
      ))}
    </div>
  );
}
