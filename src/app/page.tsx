import Link from "next/link";
import { Suspense } from "react";
import { CatalogNotice } from "@/components/catalog-notice";
import { ProductCard } from "@/components/product-card";
import { store } from "@/config/store";
import { getCategories, getProducts, type ProductSummary } from "@/server/catalog";

export default function Home() {
  return (
    <>
      <section className="px-5 pb-16 pt-14 text-center sm:pt-24">
        <p className="text-[17px] font-semibold text-pink sm:text-[21px]">Packs para redes sociais</p>
        <h1 className="titulo mx-auto mt-3 max-w-4xl text-[44px] sm:text-[80px]">Conteúdo pronto pra postar.</h1>
        <p className="mx-auto mt-5 max-w-2xl text-[19px] leading-snug text-bege sm:text-[24px]">{store.description}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/catalogo" className="btn btn-pink">
            Ver catálogo
          </Link>
          <Link href="/catalogo?personalizavel=1" className="btn btn-contorno">
            Quero nas minhas cores
          </Link>
        </div>
      </section>

      <section className="bg-creme-2 px-5 py-16">
        <div className="mx-auto max-w-[1024px]">
          <h2 className="titulo text-center text-[32px] sm:text-[48px]">Do pagamento ao Canva em minutos.</h2>
          <ol className="mt-10 grid gap-4 sm:grid-cols-3">
            {[
              ["Escolha o pack", "Posts, stories e stickers prontos por segmento."],
              ["Pague com Pix ou cartão", "Confirmação automática em segundos."],
              ["Edite no Canva", "O link chega no seu e-mail e no WhatsApp."],
            ].map(([title, text], i) => (
              <li key={title} className="rounded-[28px] bg-white p-7">
                <span className="text-[15px] font-semibold text-bege">Passo {i + 1}</span>
                <p className="titulo mt-2 text-[24px]">{title}</p>
                <p className="mt-2 text-[17px] text-bege">{text}</p>
              </li>
            ))}
          </ol>
        </div>
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
      <section className="mx-auto mt-16 max-w-[1024px] px-5">
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
    <div className="mt-16 space-y-16">
      {categories.configured && categories.data.length > 0 && (
        <section className="mx-auto max-w-[1024px] px-5">
          <SectionTitle title="Categorias" />
          <div className="flex gap-2 overflow-x-auto pb-2">
            {categories.data.map((c) => (
              <Link
                key={c.id}
                href={`/catalogo?categoria=${c.slug}`}
                className="pilula shrink-0 bg-creme-2 px-4 py-2 text-sm hover:bg-[#e8e8ed]"
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
    <section className="mx-auto max-w-[1024px] px-5">
      <SectionTitle title={title} href={href} />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
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
      <h2 className="titulo text-[28px] sm:text-[40px]">{title}</h2>
      {href && (
        <Link href={href} className="shrink-0 text-[17px] text-pink hover:underline">
          Ver todos ›
        </Link>
      )}
    </div>
  );
}

function SectionSkeleton() {
  return (
    <div className="mx-auto mt-16 grid max-w-[1024px] grid-cols-2 gap-4 px-5 sm:gap-5 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="aspect-[4/5] animate-pulse rounded-[24px] bg-creme-2" />
      ))}
    </div>
  );
}
