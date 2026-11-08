import Link from "next/link";
import { formatPrice } from "@/lib/format";
import type { ProductSummary } from "@/server/catalog";

const LINHA: Record<string, { nome: string; cls: string }> = {
  original: { nome: "Original", cls: "bg-grafite text-white" },
  ai_design: { nome: "AI Design", cls: "bg-[#fce3f1] text-[#a3115f]" },
  personalizado: { nome: "Personalizados", cls: "bg-[#eef4d6] text-[#3f5200]" },
};

export function ProductCard({ product }: { product: ProductSummary }) {
  const onSale = product.promoPriceCents !== null && product.promoPriceCents < product.priceCents;
  const linha = LINHA[product.line];
  return (
    <Link
      href={`/produto/${product.slug}`}
      className="group flex flex-col gap-3 rounded-[22px] bg-creme-2 p-3 pb-4 transition hover:-translate-y-1 hover:shadow-[0_14px_30px_rgba(40,40,40,0.12)]"
    >
      <div className="relative aspect-[4/5] overflow-hidden rounded-[14px] bg-creme-marca">
        {product.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.coverUrl} alt={product.coverAlt} className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="titulo flex h-full items-end p-5 text-[28px]">{product.creativeName}</div>
        )}
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          {product.isNew && <Badge>Lançamento</Badge>}
          {product.customizable && <Badge tone="lima">Personalize ao vivo</Badge>}
          {onSale && <Badge tone="amarelo">Oferta</Badge>}
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-1.5 px-1">
        {linha && <span className={`pilula w-fit px-2.5 py-0.5 text-[12px] ${linha.cls}`}>{linha.nome}</span>}
        <h3 className="text-[17px] font-bold leading-snug">{product.commercialName}</h3>
        <p className="mt-auto pt-1 text-[15px] tabular-nums">
          {onSale ? (
            <>
              <span className="mr-2 font-bold">{formatPrice(product.promoPriceCents!)}</span>
              <span className="text-bege line-through">{formatPrice(product.priceCents)}</span>
            </>
          ) : (
            <span className="font-bold">{formatPrice(product.priceCents)}</span>
          )}
        </p>
      </div>
    </Link>
  );
}

function Badge({ children, tone = "claro" }: { children: React.ReactNode; tone?: "claro" | "lima" | "amarelo" }) {
  const tones = {
    claro: "bg-white/95 text-grafite",
    lima: "bg-lima-vivo text-grafite",
    amarelo: "bg-amarelo text-grafite",
  };
  return <span className={`pilula px-2.5 py-1 text-[11px] ${tones[tone]}`}>{children}</span>;
}
