import { notFound } from "next/navigation";
import { Suspense } from "react";
import { adicionarAoCarrinho } from "@/app/carrinho/actions";
import { BuyBox } from "@/components/buy-box";
import { CatalogNotice } from "@/components/catalog-notice";
import { formatPrice } from "@/lib/format";
import { getProduct } from "@/server/catalog";

export default function ProductPage({ params }: PageProps<"/produto/[slug]">) {
  return (
    <div className="mx-auto max-w-[1024px] px-5 py-12">
      <Suspense fallback={<div className="aspect-[4/5] max-w-md animate-pulse rounded-[28px] bg-creme-2" />}>
        <ProductContent params={params} />
      </Suspense>
    </div>
  );
}

async function ProductContent({ params }: { params: PageProps<"/produto/[slug]">["params"] }) {
  const { slug } = await params;
  const result = await getProduct(slug);
  if (!result.configured) return <CatalogNotice configured={false} />;
  const p = result.data;
  if (!p) notFound();

  const onSale = p.promoPriceCents !== null && p.promoPriceCents < p.priceCents;
  const price = onSale ? p.promoPriceCents! : p.priceCents;

  return (
    <article className="grid gap-10 lg:grid-cols-[1.1fr_1fr]">
      <div className="grid gap-3">
        {p.media.length === 0 ? (
          <div className="titulo flex aspect-[4/5] items-center justify-center rounded-[28px] bg-creme-2 p-6 text-center text-3xl text-bege">
            {p.creativeName}
          </div>
        ) : (
          p.media.map((m, i) =>
            m.kind === "video" ? (
              <video key={i} src={m.url} controls playsInline className="w-full rounded-[28px]" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={m.url} alt={m.alt} className="w-full rounded-[28px]" loading={i === 0 ? "eager" : "lazy"} />
            ),
          )
        )}
      </div>

      <div className="lg:sticky lg:top-24 lg:self-start">
        <p className="text-[15px] font-semibold text-[#bf4800]">{p.creativeName}</p>
        <h1 className="titulo mt-2 text-[34px] sm:text-[48px]">{p.commercialName}</h1>
        <p className="mt-4 text-[21px]">
          {onSale && <span className="mr-3 text-base font-normal text-bege line-through">{formatPrice(p.priceCents)}</span>}
          {formatPrice(price)}
        </p>

        <BuyBox action={adicionarAoCarrinho.bind(null, p.id)} slots={p.colorSlots} cover={p.media[0]?.url ?? null} />
        <p className="mt-3 text-sm text-bege">Pix ou cartão · entrega automática por e-mail</p>

        {p.description && <p className="mt-6 whitespace-pre-line leading-relaxed">{p.description}</p>}

        <dl className="mt-6 grid gap-4 text-sm">
          {p.idealFor && <Info label="Ideal para">{p.idealFor}</Info>}
          {p.targetAudience && <Info label="Público">{p.targetAudience}</Info>}
          {p.benefits.length > 0 && (
            <Info label="Benefícios">
              <ul className="list-disc pl-5">{p.benefits.map((b) => <li key={b}>{b}</li>)}</ul>
            </Info>
          )}
          {p.differentials.length > 0 && (
            <Info label="Diferenciais">
              <ul className="list-disc pl-5">{p.differentials.map((b) => <li key={b}>{b}</li>)}</ul>
            </Info>
          )}
          <Info label="O que você recebe">
            {[p.fileCount ? `${p.fileCount} artes` : null, p.formats.length ? p.formats.join(", ") : null, "link de edição no Canva"]
              .filter(Boolean)
              .join(" · ")}
          </Info>
          <Info label="Acesso">{p.accessDays ? `${p.accessDays} dias após a compra` : "Sem prazo de expiração"}</Info>
          {p.customizable && <Info label="Personalização">Disponível nas cores da sua marca.</Info>}
        </dl>
      </div>
    </article>
  );
}

function Info({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-linha pt-4">
      <dt className="text-[15px] font-semibold">{label}</dt>
      <dd className="mt-1 text-bege">{children}</dd>
    </div>
  );
}
