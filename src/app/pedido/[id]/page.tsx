import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { formatPrice } from "@/lib/format";
import { getAdminSupabase } from "@/lib/supabase-admin";
import { handlePaymentNotification, orderCode } from "@/server/orders";
import { AutoRefresh, CopyButton } from "./auto-refresh";

export const metadata: Metadata = { title: "Seu pedido", robots: { index: false } };

export default function OrderPage({ params, searchParams }: PageProps<"/pedido/[id]">) {
  return (
    <div className="mx-auto max-w-[560px] px-5 py-12">
      <Suspense fallback={<p className="text-bege">Carregando pedido…</p>}>
        <Order params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

const UUID = /^[0-9a-f-]{36}$/;

async function Order({ params, searchParams }: { params: PageProps<"/pedido/[id]">["params"]; searchParams: PageProps<"/pedido/[id]">["searchParams"] }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const token = typeof sp.t === "string" ? sp.t : "";
  if (!UUID.test(id) || !UUID.test(token)) notFound();
  const db = getAdminSupabase();

  // retorno do cartão: confirma consultando a API do Mercado Pago (nunca confiando no retorno)
  const returnedPayment = typeof sp.payment_id === "string" && /^\d+$/.test(sp.payment_id) ? sp.payment_id : null;
  if (returnedPayment) {
    const { data: o } = await db.from("orders").select("status, access_token").eq("id", id).maybeSingle();
    if (o?.access_token === token && o.status === "pendente") await handlePaymentNotification(db, returnedPayment).catch(() => null);
  }

  const { data: o } = await db
    .from("orders")
    .select("id, number, status, total_cents, access_token, payment_method, pix_qr_code, pix_qr_base64, pix_expires_at, checkout_url, created_at, customers(name), order_items(id, product_snapshot, customization_id, deliveries(status, canva_link))")
    .eq("id", id)
    .maybeSingle();
  if (!o || o.access_token !== token) notFound();

  type Item = { id: string; product_snapshot: { commercial_name: string }; customization_id: string | null; deliveries: { status: string; canva_link: string | null } | { status: string; canva_link: string | null }[] | null };
  const items = o.order_items as unknown as Item[];
  const deliv = (i: Item) => (Array.isArray(i.deliveries) ? i.deliveries[0] : i.deliveries);
  const pixExpired = o.pix_expires_at ? new Date(o.pix_expires_at).getTime() < Date.now() : false;
  const whats = (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "").replace(/\D/g, "");
  const waText = encodeURIComponent(`Quero receber meu pedido #${o.number} código ${orderCode(o.access_token)}`);

  return (
    <>
      <p className="text-sm text-bege">Pedido #{o.number}</p>
      <h1 className="titulo mt-1 text-[36px]">
        {o.status === "pago" ? "Pagamento confirmado" : o.status === "pendente" ? "Aguardando pagamento" : o.status === "reembolsado" ? "Pedido reembolsado" : "Pedido " + o.status}
      </h1>
      <p className="mt-2 text-[17px] text-bege">Total: {formatPrice(o.total_cents)}</p>

      {o.status === "pendente" && <AutoRefresh />}

      {o.status === "pendente" && o.payment_method === "pix" && o.pix_qr_code && !pixExpired && (
        <div className="painel mt-8 p-6 text-center">
          <p className="font-semibold">Pague com Pix</p>
          <p className="mt-1 text-sm text-bege">Abra o app do seu banco e escaneie o QR Code ou use o Pix copia e cola.</p>
          {o.pix_qr_base64 && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`data:image/png;base64,${o.pix_qr_base64}`} alt="QR Code Pix" className="mx-auto mt-5 h-56 w-56 rounded-xl bg-white p-2" />
          )}
          <p className="mt-4 break-all rounded-xl bg-white p-3 text-left font-mono text-xs">{o.pix_qr_code}</p>
          <div className="mt-4"><CopyButton text={o.pix_qr_code} /></div>
          <p className="mt-3 text-xs text-bege">Esta página atualiza sozinha quando o pagamento for confirmado.</p>
        </div>
      )}
      {o.status === "pendente" && o.payment_method === "pix" && pixExpired && (
        <p className="painel mt-8 p-6">O código Pix expirou. Volte ao catálogo e faça um novo pedido.</p>
      )}
      {o.status === "pendente" && o.payment_method === "cartao" && o.checkout_url && (
        <div className="painel mt-8 p-6 text-center">
          <p className="font-semibold">Pagamento com cartão</p>
          <p className="mt-1 text-sm text-bege">Você vai para o ambiente seguro do Mercado Pago.</p>
          <a href={o.checkout_url} className="btn btn-pink mt-5">Pagar com cartão</a>
        </div>
      )}

      {o.status === "pago" && (
        <section className="mt-8 grid gap-4">
          {items.map((i) => {
            const d = deliv(i);
            return (
              <div key={i.id} className="painel p-5">
                <p className="font-semibold">{i.product_snapshot.commercial_name}</p>
                {d?.status === "entregue" && d.canva_link ? (
                  <>
                    <a href={d.canva_link} target="_blank" rel="noopener" className="btn btn-pink mt-4">Abrir no Canva</a>
                    <p className="mt-3 text-sm text-bege">Entre na sua conta do Canva e clique em “Usar modelo”. Uma cópia fica salva para você editar.</p>
                  </>
                ) : d?.status === "aguardando_link_manual" ? (
                  <p className="mt-2 text-sm text-bege">Estamos preparando sua versão personalizada. Avisamos por e-mail quando estiver pronta.</p>
                ) : (
                  <p className="mt-2 text-sm text-bege">Preparando a entrega… se demorar, fale com a gente.</p>
                )}
              </div>
            );
          })}
          <p className="text-sm text-bege">Também enviamos os links para o seu e-mail.</p>
          {whats && (
            <a href={`https://wa.me/${whats}?text=${waText}`} className="btn btn-contorno justify-center" target="_blank" rel="noopener">
              Receber os links no WhatsApp
            </a>
          )}
        </section>
      )}
    </>
  );
}
