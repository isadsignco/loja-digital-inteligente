import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Validação da assinatura dos webhooks do Mercado Pago.
 *
 * O Mercado Pago envia:
 *  - header `x-signature`: "ts=<timestamp>,v1=<hmac-sha256-hex>"
 *  - header `x-request-id`
 *  - query `data.id` (id do recurso, ex.: pagamento)
 *
 * O manifesto assinado é: `id:<data.id>;request-id:<x-request-id>;ts:<ts>;`
 * (partes ausentes são omitidas; data.id alfanumérico vai em minúsculas),
 * assinado com HMAC-SHA256 usando o segredo configurado no painel do MP.
 *
 * IMPORTANTE: assinatura válida NÃO significa pagamento aprovado. Depois de
 * validar, o sistema consulta o pagamento na API do Mercado Pago e só então
 * libera a entrega.
 */

export type SignatureCheck =
  | { valid: true; ts: string }
  | { valid: false; reason: "header_ausente" | "header_malformado" | "assinatura_invalida" | "expirada" };

export function parseSignatureHeader(header: string | null | undefined): { ts: string; v1: string } | null {
  if (!header) return null;
  const parts = Object.fromEntries(
    header.split(",").map((part) => {
      const [k, ...rest] = part.trim().split("=");
      return [k?.trim(), rest.join("=").trim()];
    }),
  );
  if (!parts.ts || !parts.v1) return null;
  return { ts: parts.ts, v1: parts.v1 };
}

export function buildManifest(dataId: string | null | undefined, requestId: string | null | undefined, ts: string) {
  let manifest = "";
  if (dataId) {
    const id = /^[a-z0-9]+$/i.test(dataId) ? dataId.toLowerCase() : dataId;
    manifest += `id:${id};`;
  }
  if (requestId) manifest += `request-id:${requestId};`;
  manifest += `ts:${ts};`;
  return manifest;
}

export function verifyMercadoPagoSignature(params: {
  secret: string;
  signatureHeader: string | null | undefined;
  requestId: string | null | undefined;
  dataId: string | null | undefined;
  /** tolerância opcional contra reenvio de notificações antigas, em segundos */
  maxAgeSeconds?: number;
  now?: Date;
}): SignatureCheck {
  if (!params.signatureHeader) return { valid: false, reason: "header_ausente" };
  const parsed = parseSignatureHeader(params.signatureHeader);
  if (!parsed) return { valid: false, reason: "header_malformado" };

  const manifest = buildManifest(params.dataId, params.requestId, parsed.ts);
  const expected = createHmac("sha256", params.secret).update(manifest).digest("hex");

  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(parsed.v1, "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { valid: false, reason: "assinatura_invalida" };
  }

  if (params.maxAgeSeconds !== undefined) {
    // o MP envia ts em milissegundos; aceita também segundos
    const tsNum = Number(parsed.ts);
    const tsMs = tsNum > 1e12 ? tsNum : tsNum * 1000;
    const now = (params.now ?? new Date()).getTime();
    if (!Number.isFinite(tsMs) || Math.abs(now - tsMs) > params.maxAgeSeconds * 1000) {
      return { valid: false, reason: "expirada" };
    }
  }

  return { valid: true, ts: parsed.ts };
}
