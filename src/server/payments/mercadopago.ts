import "server-only";
import { requireEnv, siteUrl } from "@/lib/env";

/**
 * Cliente mínimo da API do Mercado Pago (REST), compatível com Cloudflare Workers.
 * Pix: pagamento transparente (QR Code na nossa página).
 * Cartão: Checkout Pro (o cliente digita o cartão no ambiente do Mercado Pago;
 * a loja nunca recebe nem guarda dados de cartão).
 */
const API = "https://api.mercadopago.com";

async function mp<T>(path: string, init: RequestInit & { idempotencyKey?: string } = {}): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${requireEnv("MERCADOPAGO_ACCESS_TOKEN")}`,
      "Content-Type": "application/json",
      ...(init.idempotencyKey ? { "X-Idempotency-Key": init.idempotencyKey } : {}),
      ...init.headers,
    },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Mercado Pago ${res.status} em ${path}: ${text.slice(0, 300)}`);
  return JSON.parse(text) as T;
}

export type MpPayment = {
  id: number;
  status: string;
  status_detail?: string;
  transaction_amount: number;
  payment_method_id?: string;
  payment_type_id?: string;
  external_reference?: string;
  date_approved?: string | null;
  point_of_interaction?: {
    transaction_data?: { qr_code?: string; qr_code_base64?: string; ticket_url?: string };
  };
};

const webhookUrl = () => `${siteUrl()}/api/webhooks/mercadopago`;

export async function createPixPayment(input: {
  orderId: string;
  orderNumber: number;
  amountCents: number;
  email: string;
  firstName: string;
  expiresAt: Date;
}) {
  return mp<MpPayment>("/v1/payments", {
    method: "POST",
    idempotencyKey: `pix-${input.orderId}`, // impede cobrança duplicada do mesmo pedido
    body: JSON.stringify({
      transaction_amount: input.amountCents / 100,
      description: `Pedido #${input.orderNumber}`,
      payment_method_id: "pix",
      external_reference: input.orderId,
      notification_url: webhookUrl(),
      date_of_expiration: input.expiresAt.toISOString().replace("Z", "-00:00"),
      payer: { email: input.email, first_name: input.firstName },
    }),
  });
}

export async function createCardCheckout(input: {
  orderId: string;
  orderNumber: number;
  accessToken: string;
  email: string;
  items: { title: string; unitPriceCents: number }[];
}) {
  const back = `${siteUrl()}/pedido/${input.orderId}?t=${input.accessToken}`;
  return mp<{ id: string; init_point: string }>("/checkout/preferences", {
    method: "POST",
    idempotencyKey: `pref-${input.orderId}`,
    body: JSON.stringify({
      items: input.items.map((i) => ({
        title: i.title.slice(0, 250),
        quantity: 1,
        unit_price: i.unitPriceCents / 100,
        currency_id: "BRL",
      })),
      payer: { email: input.email },
      external_reference: input.orderId,
      notification_url: webhookUrl(),
      statement_descriptor: "LOJA DIGITAL",
      back_urls: { success: back, failure: back, pending: back },
      auto_return: "approved",
      payment_methods: {
        excluded_payment_types: [{ id: "ticket" }, { id: "atm" }],
        installments: 12,
      },
    }),
  });
}

export async function getPayment(paymentId: string) {
  return mp<MpPayment>(`/v1/payments/${encodeURIComponent(paymentId)}`);
}

export async function refundPayment(paymentId: string, amountCents?: number) {
  return mp<{ id: number; amount: number; status: string }>(`/v1/payments/${encodeURIComponent(paymentId)}/refunds`, {
    method: "POST",
    idempotencyKey: `refund-${paymentId}-${amountCents ?? "total"}`,
    body: JSON.stringify(amountCents ? { amount: amountCents / 100 } : {}),
  });
}

/** Busca pagamentos de um pedido (usado pela conferência periódica). */
export async function searchPaymentsByOrder(orderId: string) {
  return mp<{ results: MpPayment[] }>(
    `/v1/payments/search?external_reference=${encodeURIComponent(orderId)}&sort=date_created&criteria=desc`,
  );
}
