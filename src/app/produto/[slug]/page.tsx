import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CatalogNotice } from "@/components/catalog-notice";
import { formatPrice } from "@/lib/format";
import { getProduct } from "@/server/catalog";

export default function ProductPage({ params }: PageProps<"/produto/[slug]">) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <Suspense fallback={<div className="aspect-[4/5] max-w-md animate-pulse rounded-2xl bg-paper" />}>
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
          <div className="flex aspect-[4/5] items-center justify-center rounded-2xl bg-blush/40 font-display text-2xl text-ink-soft">
            {p.creativeName}
          </div>
        ) : (
          p.media.map((m, i) =>
            m.kind === "video" ? (
              <video key={i} src={m.url} controls playsInline className="w-full rounded-2xl" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={m.url} alt={m.alt} className="w-full rounded-2xl" loading={i === 0 ? "eager" : "lazy"} />
            ),
          )
        )}
      </div>

      <div className="lg:sticky lg:top-24 lg:self-start">
        <p className="text-sm uppercase tracking-wider text-ink-soft">{p.creativeName}</p>
        <h1 className="mt-2 font-display text-3xl leading-tight tracking-tight sm:text-4xl">{p.commercialName}</h1>
        <p className="mt-4 text-2xl font-semibold">
          {onSale && <span className="mr-3 text-base font-normal text-ink-soft line-through">{formatPrice(p.priceCents)}</span>}
          {formatPrice(price)}
        </p>

        {/* Compra e personalização entram nas próximas fases (checkout Mercado Pago e personalização no Canva). */}
        <p className="mt-6 rounded-xl border border-line bg-paper p-4 text-sm text-ink-soft">
          Compra online em breve.
        </p>

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
    <div className="border-t border-line pt-3">
      <dt className="font-medium">{label}</dt>
      <dd className="mt-1 text-ink-soft">{children}</dd>
    </div>
  );
}
