import Link from "next/link";
import { Suspense } from "react";
import { CatalogNotice } from "@/components/catalog-notice";
import { ProductCard } from "@/components/product-card";
import { store } from "@/config/store";
import { getCategories, getProducts, type ProductSummary } from "@/server/catalog";

const CAT_CORES = ["bg-rosa", "bg-creme-marca", "bg-amarelo", "bg-grafite", "bg-lima-vivo", "bg-[#fce3f1]", "bg-[#e3d3d3]", "bg-[#dde5d7]"];

export default function Home() {
  return (
    <>
      {/* herói */}
      <section className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-12 px-5 pb-10 pt-12 sm:pt-16">
        <div className="flex min-w-0 flex-[1_1_440px] flex-col gap-6">
          <span className="pilula w-fit bg-creme-2 px-3.5 py-1.5 text-[13px]">Produtos digitais para quem posta todo dia</span>
          <h1 className="titulo text-[46px] sm:text-[84px]">
            Conteúdo pronto pra sua marca <span className="text-rosa">postar hoje.</span>
          </h1>
          <p className="max-w-[34em] text-[19px] leading-snug text-bege">{store.description}</p>
          <div className="flex flex-wrap gap-3">
            <Link href="/catalogo" className="btn btn-pink">
              Ver catálogo
            </Link>
            <Link href="/catalogo?personalizavel=1" className="btn btn-contorno">
              Quero nas minhas cores
            </Link>
          </div>
          <p className="flex flex-wrap gap-x-5 gap-y-1 text-[14px] font-semibold text-bege">
            <span>Pix ou cartão</span>
            <span>Entrega automática por e-mail e WhatsApp</span>
            <span>Edite no Canva</span>
          </p>
        </div>
        <HeroCollage />
      </section>

      <Suspense fallback={<SectionSkeleton />}>
        <CatalogSections />
      </Suspense>
    </>
  );
}

/** Colagem decorativa do herói: só formas e texto, sem imagem externa. */
function HeroCollage() {
  return (
    <div aria-hidden="true" className="relative aspect-[1/0.92] min-w-0 max-w-full flex-[1_1_380px]">
      <div className="absolute left-[4%] top-[6%] flex aspect-[4/5] w-1/2 -rotate-6 flex-col justify-between overflow-hidden rounded-[22px] bg-[#f7d6dc] p-[7%] shadow-[0_0_0_6px_#fff,0_20px_40px_rgba(40,40,40,.16)]">
        <span className="text-[11px] font-bold uppercase tracking-[.1em] text-[#7a1530]">Doce Ateliê</span>
        <span className="titulo text-[clamp(22px,2.6vw,36px)] text-[#7a1530]">Bolo de pote que abraça</span>
        <span className="pilula w-fit bg-[#d23c5e] px-3 py-1 text-[12px] text-white">Encomendas abertas</span>
      </div>
      <div className="absolute right-[2%] top-0 flex aspect-[9/16] w-[42%] rotate-[5deg] flex-col gap-2 overflow-hidden rounded-[22px] bg-creme-marca p-[7%] shadow-[0_0_0_6px_#fff,0_20px_40px_rgba(40,40,40,.16)]">
        <span className="titulo text-[clamp(20px,2.2vw,32px)]">Agenda aberta</span>
        <span className="text-[12px] font-semibold">Seg · 14h · 16h</span>
        <span className="text-[12px] font-semibold">Qua · 10h · 15h</span>
        <span className="mt-auto rounded-full bg-grafite px-3 py-1.5 text-center text-[12px] font-bold text-white">Reserve seu horário</span>
      </div>
      <span className="adesivo absolute bottom-[8%] left-[30%] -rotate-3 text-[clamp(22px,2.6vw,34px)] font-extrabold text-pink">Bom dia!</span>
      <span className="adesivo absolute bottom-[2%] right-[8%] rotate-3 bg-lima-vivo text-[clamp(15px,1.6vw,21px)] font-extrabold">Faça seu pedido</span>
      <span className="adesivo absolute bottom-[30%] left-0 rotate-6 bg-amarelo text-[clamp(14px,1.4vw,19px)] font-bold">Novidades</span>
    </div>
  );
}

async function CatalogSections() {
  const [products, categories] = await Promise.all([getProducts(), getCategories()]);
  const temProdutos = products.configured && products.data.length > 0;
  const all = temProdutos ? products.data : [];
  const featured = all.filter((p) => p.featured);
  const launches = all.filter((p) => p.isNew);
  const offers = all.filter((p) => p.promoPriceCents !== null && p.promoPriceCents < p.priceCents);

  return (
    <div className="space-y-16">
      {categories.configured && categories.data.length > 0 && (
        <section className="mx-auto max-w-[1200px] px-5">
          <SectionTitle title="Categorias" href="/catalogo" />
          <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3">
            {categories.data.map((c, i) => (
              <Link
                key={c.id}
                href={`/catalogo?categoria=${c.slug}`}
                className="flex min-h-[120px] flex-col justify-between gap-3 rounded-[18px] bg-creme-2 p-4 transition hover:-translate-y-0.5"
              >
                <span aria-hidden="true" className={`h-[34px] w-[34px] rounded-[10px] shadow-[0_0_0_3px_#fff] ${CAT_CORES[i % CAT_CORES.length]} ${i % 2 ? "rotate-[8deg]" : "-rotate-[8deg]"}`} />
                <span className="font-bold leading-tight">{c.name}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <PersonalizeBand />

      {temProdutos ? (
        <>
          <ProductRow title="Mais vendidos" products={featured} href="/catalogo" />
          <ProductRow title="Lançamentos" products={launches} />
          <ProductRow title="Ofertas" products={offers} />
          {featured.length === 0 && launches.length === 0 && <ProductRow title="Produtos" products={all.slice(0, 8)} href="/catalogo" />}
        </>
      ) : (
        <section className="mx-auto max-w-[1200px] px-5">
          <CatalogNotice configured={products.configured} />
        </section>
      )}

      <StickerBand />
      <LinesBand />
    </div>
  );
}

function PersonalizeBand() {
  const passos = [
    "Escolha as cores da sua marca",
    "Veja a prévia da paleta na hora",
    "Pague com Pix ou cartão",
    "Aprove as imagens da sua versão e receba o link do Canva",
  ];
  return (
    <section className="bg-grafite text-white">
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-12 px-5 py-16">
        <div className="flex min-w-0 flex-[1_1_440px] flex-col gap-5">
          <span className="olho text-creme-marca">Personalize antes de comprar</span>
          <h2 className="titulo text-[36px] sm:text-[58px]">
            Nas cores da sua marca, <span className="text-rosa">do seu jeito.</span>
          </h2>
          <ol className="flex flex-col gap-3">
            {passos.map((t, i) => (
              <li key={t} className="flex items-center gap-3.5 text-[17px]">
                <span
                  className={`grid h-[34px] w-[34px] shrink-0 place-items-center rounded-full font-extrabold text-grafite ${i === passos.length - 1 ? "bg-lima-vivo" : "bg-creme-marca"}`}
                >
                  {i + 1}
                </span>
                {t}
              </li>
            ))}
          </ol>
          <div>
            <Link href="/catalogo?personalizavel=1" className="btn btn-claro">
              Ver produtos personalizáveis
            </Link>
          </div>
        </div>
        <div aria-hidden="true" className="flex min-w-0 flex-[1_1_340px] flex-wrap justify-center gap-3.5">
          {[
            ["Morango", "#f7d6dc", "#7a1530", "#d23c5e", "-rotate-3"],
            ["Pistache", "#e2ebcf", "#2e4320", "#5e8a2e", "rotate-2"],
            ["Noite", "#1f1b2d", "#f6e7c1", "#f2b544", "rotate-[5deg]"],
          ].map(([nome, bg, ink, acc, giro]) => (
            <div
              key={nome}
              className={`flex aspect-[4/5] w-[30%] min-w-[130px] flex-col justify-between rounded-[18px] p-3.5 ${giro}`}
              style={{ background: bg, color: ink }}
            >
              <span className="text-[10px] font-extrabold uppercase tracking-[.1em]">{nome}</span>
              <span className="titulo text-[22px]">Bolo de pote que abraça</span>
              <span className="h-[22px] w-[22px] rounded-full" style={{ background: acc }} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function StickerBand() {
  return (
    <section className="mx-auto max-w-[1200px] px-5">
      <div className="flex flex-wrap items-center gap-9 rounded-[32px] bg-creme-marca px-[clamp(20px,4vw,56px)] py-12">
        <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-4">
          <h2 className="titulo text-[44px] sm:text-[72px]">
            Sticker <span className="text-rosa">Club</span>
          </h2>
          <p className="max-w-[30em] text-[18px] font-medium">
            Palavras e frases para colar nos seus Stories, em PNG com transparência real e alta resolução.
          </p>
          <div>
            <Link href="/catalogo?q=sticker" className="btn btn-pink">
              Ver stickers
            </Link>
          </div>
        </div>
        <div aria-hidden="true" className="flex min-w-0 flex-[1_1_420px] flex-wrap items-center justify-center gap-x-3.5 gap-y-4">
          <span className="adesivo -rotate-3 text-[34px] font-extrabold text-pink">Bom dia</span>
          <span className="adesivo titulo rotate-3 text-[22px] uppercase">Novidades</span>
          <span className="adesivo -rotate-2 text-[22px] font-semibold italic">Amor em cada detalhe</span>
          <span className="adesivo titulo rotate-[5deg] bg-grafite text-[22px] text-creme-marca">Partiu!</span>
          <span className="adesivo -rotate-6 bg-rosa text-[30px] font-extrabold text-[#141414]">Gratidão</span>
          <span className="adesivo rotate-2 text-[16px] font-extrabold uppercase tracking-[.12em]">Já estamos atendendo</span>
          <span className="adesivo titulo -rotate-3 bg-amarelo text-[24px]">Promoção</span>
          <span className="adesivo rotate-[4deg] bg-lima-vivo text-[20px] font-semibold italic">Disponível</span>
        </div>
      </div>
    </section>
  );
}

function LinesBand() {
  const linhas = [
    { href: "/catalogo?linha=original", nome: "Original", texto: "Materiais criados à mão pela nossa designer.", cls: "bg-grafite text-white", sub: "text-[#e8e1d1]" },
    { href: "/catalogo?linha=ai_design", nome: "AI Design", texto: "Criados com auxílio de IA e aprovados um a um antes de entrar na loja.", cls: "bg-rosa text-[#141414]", sub: "font-semibold" },
    { href: "/catalogo?linha=personalizado", nome: "Personalizados", texto: "Ajustados às cores e informações da sua marca.", cls: "bg-lima-vivo text-[#141414]", sub: "font-semibold" },
  ];
  return (
    <section className="mx-auto max-w-[1200px] px-5">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-4">
        {linhas.map((l) => (
          <Link key={l.nome} href={l.href} className={`flex flex-col gap-2.5 rounded-[24px] p-7 transition hover:-translate-y-0.5 ${l.cls}`}>
            <span className="titulo text-[34px]">{l.nome}</span>
            <span className={`text-[16px] ${l.sub}`}>{l.texto}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function ProductRow({ title, products, href }: { title: string; products: ProductSummary[]; href?: string }) {
  if (products.length === 0) return null;
  return (
    <section className="mx-auto max-w-[1200px] px-5">
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
      <h2 className="titulo text-[30px] sm:text-[42px]">{title}</h2>
      {href && (
        <Link href={href} className="shrink-0 text-[16px] font-bold text-pink hover:underline">
          Ver tudo
        </Link>
      )}
    </div>
  );
}

function SectionSkeleton() {
  return (
    <div className="mx-auto mt-6 grid max-w-[1200px] grid-cols-2 gap-4 px-5 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="aspect-[4/5] animate-pulse rounded-[22px] bg-creme-2" />
      ))}
    </div>
  );
}
