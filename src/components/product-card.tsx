import Link from "next/link";
import { formatPrice } from "@/lib/format";
import type { ProductSummary } from "@/server/catalog";

export function ProductCard({ product }: { product: ProductSummary }) {
  const onSale = product.promoPriceCents !== null && product.promoPriceCents < product.priceCents;
  return (
    <Link
      href={`/produto/${product.slug}`}
      className="group flex flex-col overflow-hidden rounded-[26px] border-[1.5px] border-grafite transition hover:-translate-y-1"
    >
      <div className="relative aspect-[4/5] bg-creme-2">
        {product.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.coverUrl} alt={product.coverAlt} className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="titulo flex h-full items-center justify-center p-5 text-center text-2xl text-grafite/70">
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
        <p className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-bege">{product.creativeName}</p>
        <h3 className="font-black italic leading-tight">{product.commercialName}</h3>
        <p className="mt-auto pt-2 text-sm">
          {onSale ? (
            <>
              <span className="mr-2 text-bege line-through">{formatPrice(product.priceCents)}</span>
              <span className="font-black text-pink">{formatPrice(product.promoPriceCents!)}</span>
            </>
          ) : (
            <span className="font-black">{formatPrice(product.priceCents)}</span>
          )}
        </p>
      </div>
    </Link>
  );
}

function Badge({ children, tone = "ink" }: { children: React.ReactNode; tone?: "ink" | "sage" | "accent" }) {
  const tones = {
    ink: "bg-grafite text-creme",
    sage: "bg-lima text-creme",
    accent: "bg-pink text-creme",
  };
  return <span className={`pilula px-2.5 py-1 text-[11px] ${tones[tone]}`}>{children}</span>;
}
