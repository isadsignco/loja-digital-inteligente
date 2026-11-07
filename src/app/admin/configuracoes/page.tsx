import { Suspense } from "react";
import { requireAdmin } from "@/server/auth";
import { salvarConfiguracao } from "../config-actions";
import { Badge, PageTitle } from "../ui";

/** Mostra apenas SE cada integração está configurada (nunca o valor das chaves). */
const INTEGRATIONS: { name: string; vars: string[]; what: string }[] = [
  { name: "Banco (chave do servidor)", vars: ["SUPABASE_SERVICE_ROLE_KEY"], what: "Checkout, webhooks e entregas" },
  { name: "Mercado Pago", vars: ["MERCADOPAGO_ACCESS_TOKEN", "MERCADOPAGO_WEBHOOK_SECRET"], what: "Pix, cartão, confirmação e estorno" },
  { name: "E-mail (Resend)", vars: ["RESEND_API_KEY", "EMAIL_FROM"], what: "Envio dos links e avisos" },
  { name: "WhatsApp Business", vars: ["WHATSAPP_TOKEN", "WHATSAPP_PHONE_NUMBER_ID", "WHATSAPP_APP_SECRET", "WHATSAPP_VERIFY_TOKEN"], what: "Resposta automática com os links" },
  { name: "Claude (IA)", vars: ["ANTHROPIC_API_KEY"], what: "Central de Criação, cadastro e conteúdo" },
  { name: "Pinterest", vars: ["PINTEREST_ACCESS_TOKEN", "PINTEREST_BOARD_ID"], what: "Publicação de Pins e métricas" },
  { name: "Instagram", vars: ["INSTAGRAM_USER_ID", "INSTAGRAM_ACCESS_TOKEN"], what: "Publicação de posts" },
  { name: "Rotina automática", vars: ["CRON_SECRET"], what: "Conferência de pagamentos, reenvios, agendamentos" },
];

export default function IntegrationsAdmin({ searchParams }: PageProps<"/admin/configuracoes">) {
  return (
    <>
      <PageTitle sub="As chaves ficam guardadas na Cloudflare (Settings → Variables and Secrets). Aqui só aparece se cada uma está configurada.">Integrações</PageTitle>
      <Suspense fallback={<p className="mt-6 text-bege">Carregando…</p>}><Status searchParams={searchParams} /></Suspense>
    </>
  );
}

async function Status({ searchParams }: { searchParams: PageProps<"/admin/configuracoes">["searchParams"] }) {
  const sp = await searchParams;
  const { supabase } = await requireAdmin();
  const { data: whats } = await supabase.from("store_settings").select("value").eq("key", "whatsapp_numero").maybeSingle();
  return (
    <>
      <ul className="mt-6 grid gap-3">
        {INTEGRATIONS.map((i) => {
          const missing = i.vars.filter((v) => !process.env[v]);
          return (
            <li key={i.name} className="painel flex flex-wrap items-center justify-between gap-3 p-5">
              <div>
                <p className="font-semibold">{i.name}</p>
                <p className="text-sm text-bege">{i.what}</p>
                {missing.length > 0 && <p className="mt-1 text-xs text-bege">Falta: {missing.join(", ")}</p>}
              </div>
              <Badge tone={missing.length ? "aviso" : "ok"}>{missing.length ? "Não conectado" : "Configurado"}</Badge>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-xs text-bege">“Configurado” significa que a chave existe. A integração só é considerada funcionando depois de um teste real (ex.: uma compra de R$ 1 no Pix).</p>
      <form action={salvarConfiguracao} className="painel mt-8 grid gap-3 p-5">
        <p className="font-semibold">Número de WhatsApp da loja</p>
        <input name="whatsapp_numero" defaultValue={String(whats?.value ?? "")} placeholder="5511912345678" className="campo" />
        <p className="text-xs text-bege">Usado no botão “Receber os links no WhatsApp”. Com DDI e DDD, só números.</p>
        <button className="btn btn-pink w-fit py-2">Salvar</button>
        {sp.ok && <p className="text-sm text-lima">Salvo.</p>}
      </form>
    </>
  );
}
