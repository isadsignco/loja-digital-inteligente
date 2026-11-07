import Link from "next/link";
import { formatPrice } from "@/lib/format";
import type { ProductSummary } from "@/server/catalog";

export function ProductCard({ product }: { product: ProductSummary }) {
  const onSale = product.promoPriceCents !== null && product.promoPriceCents < product.priceCents;
  return (
    <Link
      href={`/produto/${product.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-paper transition hover:-translate-y-0.5 hover:shadow-[0_10px_30px_-12px_rgba(31,26,23,0.25)]"
    >
      <div className="relative aspect-[4/5] bg-blush/40">
        {product.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.coverUrl} alt={product.coverAlt} className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="flex h-full items-center justify-center p-6 text-center font-display text-lg text-ink-soft">
            {product.creativeName}
          </div>
        )}
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          {product.isNew && <Badge>Lançamento</Badge>}
          {product.customizable && <Badge tone="sage">Personalizável</Badge>}
          {onSale && <Badge tone="accent">Oferta</Badge>}
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-1 p-4">
        <p className="text-xs uppercase tracking-wider text-ink-soft">{product.creativeName}</p>
        <h3 className="font-medium leading-snug">{product.commercialName}</h3>
        <p className="mt-auto pt-2 text-sm">
          {onSale ? (
            <>
              <span className="mr-2 text-ink-soft line-through">{formatPrice(product.priceCents)}</span>
              <span className="font-semibold text-accent">{formatPrice(product.promoPriceCents!)}</span>
            </>
          ) : (
            <span className="font-semibold">{formatPrice(product.priceCents)}</span>
          )}
        </p>
      </div>
    </Link>
  );
}

function Badge({ children, tone = "ink" }: { children: React.ReactNode; tone?: "ink" | "sage" | "accent" }) {
  const tones = {
    ink: "bg-ink text-cream",
    sage: "bg-sage text-white",
    accent: "bg-accent text-accent-ink",
  };
  return <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${tones[tone]}`}>{children}</span>;
}
