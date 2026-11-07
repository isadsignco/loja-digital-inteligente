import Link from "next/link";
import { Suspense } from "react";
import { formatPrice } from "@/lib/format";
import { requireAdmin } from "@/server/auth";

const STATUS: Record<string, string> = {
  rascunho: "Rascunho",
  aguardando_aprovacao: "Aguardando aprovação",
  ativo: "Publicado",
  inativo: "Inativo",
  arquivado: "Arquivado",
};

export default function ProductsAdmin() {
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="titulo text-[40px]">Produtos</h1>
        <Link href="/admin/produtos/novo" className="btn btn-pink">
          Novo produto
        </Link>
      </div>
      <Suspense fallback={<p className="mt-6 text-bege">Carregando…</p>}>
        <ProductList />
      </Suspense>
    </>
  );
}

async function ProductList() {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase
    .from("products")
    .select("id, slug, commercial_name, creative_name, status, origin, price_cents, promo_price_cents, customizable, updated_at")
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);

  if (!data.length) {
    return (
      <div className="painel mt-8 p-10 text-center">
        <p className="titulo text-[24px]">Nenhum produto cadastrado</p>
        <p className="mt-2 text-bege">Comece pelo botão “Novo produto”.</p>
      </div>
    );
  }

  return (
    <ul className="mt-8 divide-y divide-linha overflow-hidden rounded-[24px] bg-creme-2">
      {data.map((p) => (
        <li key={p.id}>
          <Link href={`/admin/produtos/${p.id}`} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 hover:bg-[#ececf0]">
            <div>
              <p className="font-semibold">{p.commercial_name}</p>
              <p className="text-sm text-bege">
                {p.creative_name}
                {p.origin === "ia" && " · criado com IA"}
                {p.customizable && " · personalizável"}
              </p>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <span>{formatPrice(p.promo_price_cents ?? p.price_cents)}</span>
              <span className={`pilula px-3 py-1 text-xs ${p.status === "ativo" ? "bg-lima text-white" : "bg-white text-grafite"}`}>
                {STATUS[p.status] ?? p.status}
              </span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
