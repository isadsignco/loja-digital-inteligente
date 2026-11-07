import Link from "next/link";
import { formatPrice } from "@/lib/format";
import type { ProductSummary } from "@/server/catalog";

export function ProductCard({ product }: { product: ProductSummary }) {
  const onSale = product.promoPriceCents !== null && product.promoPriceCents < product.priceCents;
  return (
    <Link
      href={`/produto/${product.slug}`}
      className="group flex flex-col overflow-hidden rounded-[24px] bg-creme-2 transition hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)]"
    >
      <div className="relative aspect-[4/5] bg-[#e8e8ed]">
        {product.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.coverUrl} alt={product.coverAlt} className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="titulo flex h-full items-center justify-center p-5 text-center text-xl text-bege">
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
        <p className="text-xs font-semibold text-bege">{product.creativeName}</p>
        <h3 className="text-[17px] font-semibold leading-snug">{product.commercialName}</h3>
        <p className="mt-auto pt-2 text-sm">
          {onSale ? (
            <>
              <span className="mr-2 text-bege line-through">{formatPrice(product.priceCents)}</span>
              <span className="font-semibold text-grafite">{formatPrice(product.promoPriceCents!)}</span>
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
    ink: "bg-white/90 text-grafite",
    sage: "bg-pink text-white",
    accent: "bg-[#bf4800] text-white",
  };
  return <span className={`pilula px-2.5 py-1 text-[11px] backdrop-blur ${tones[tone]}`}>{children}</span>;
}
