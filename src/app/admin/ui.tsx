import { formatPrice } from "@/lib/format";

export const ORDER_STATUS: Record<string, string> = {
  pendente: "Aguardando pagamento", pago: "Pago", cancelado: "Cancelado", expirado: "Expirado",
  reembolsado: "Reembolsado", reembolso_parcial: "Reembolso parcial",
};
export const DELIVERY_STATUS: Record<string, string> = {
  aguardando_pagamento: "Aguardando pagamento", na_fila: "Na fila", gerando: "Gerando",
  aguardando_aprovacao_cliente: "Aguardando aprovação do cliente", aguardando_link_manual: "Aguardando personalização",
  entregue: "Entregue", falhou: "Falhou",
};

export function Badge({ children, tone = "neutro" }: { children: React.ReactNode; tone?: "ok" | "erro" | "aviso" | "neutro" }) {
  const t = { ok: "bg-[#e8f5ec] text-lima", erro: "bg-[#fff1f0] text-[#c4291c]", aviso: "bg-[#fff6e5] text-[#a05a00]", neutro: "bg-white text-grafite" }[tone];
  return <span className={`pilula px-2.5 py-1 text-xs ${t}`}>{children}</span>;
}

export function toneFor(status: string): "ok" | "erro" | "aviso" | "neutro" {
  if (["pago", "entregue", "enviado", "sucesso", "publicado", "ativo"].includes(status)) return "ok";
  if (["falhou", "cancelado", "expirado", "reembolsado"].includes(status)) return "erro";
  if (["pendente", "aguardando_link_manual", "requer_acao_manual", "agendado", "aguardando_aprovacao"].includes(status)) return "aviso";
  return "neutro";
}

export function Money({ cents }: { cents: number }) {
  return <>{formatPrice(cents)}</>;
}

export function dateTime(d: string | null | undefined) {
  return d ? new Date(d).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" }) : "—";
}

export function PageTitle({ children, sub }: { children: React.ReactNode; sub?: string }) {
  return (
    <>
      <h1 className="titulo text-[40px]">{children}</h1>
      {sub && <p className="mt-2 text-bege">{sub}</p>}
    </>
  );
}
