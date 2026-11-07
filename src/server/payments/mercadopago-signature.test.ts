import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildManifest, parseSignatureHeader, verifyMercadoPagoSignature } from "./mercadopago-signature";

const SECRET = "segredo-de-teste";

function sign(manifest: string, secret = SECRET) {
  return createHmac("sha256", secret).update(manifest).digest("hex");
}

describe("assinatura do webhook do Mercado Pago", () => {
  const ts = "1794070000000";
  const requestId = "bb56a2f1-6aae-46ac-982e-9dcd3581d08e";
  const dataId = "123456789";
  const header = `ts=${ts},v1=${sign(`id:${dataId};request-id:${requestId};ts:${ts};`)}`;

  it("monta o manifesto no formato documentado", () => {
    expect(buildManifest(dataId, requestId, ts)).toBe(`id:${dataId};request-id:${requestId};ts:${ts};`);
    expect(buildManifest("ABC123", null, ts)).toBe(`id:abc123;ts:${ts};`);
  });

  it("lê o header x-signature", () => {
    expect(parseSignatureHeader("ts=1,v1=abc")).toEqual({ ts: "1", v1: "abc" });
    expect(parseSignatureHeader("v1=abc")).toBeNull();
    expect(parseSignatureHeader(null)).toBeNull();
  });

  it("aceita assinatura correta", () => {
    expect(verifyMercadoPagoSignature({ secret: SECRET, signatureHeader: header, requestId, dataId }).valid).toBe(true);
  });

  it("recusa segredo errado", () => {
    const r = verifyMercadoPagoSignature({ secret: "outro", signatureHeader: header, requestId, dataId });
    expect(r).toEqual({ valid: false, reason: "assinatura_invalida" });
  });

  it("recusa id de pagamento trocado (tentativa de fraude)", () => {
    const r = verifyMercadoPagoSignature({ secret: SECRET, signatureHeader: header, requestId, dataId: "999" });
    expect(r.valid).toBe(false);
  });

  it("recusa header ausente ou malformado", () => {
    expect(verifyMercadoPagoSignature({ secret: SECRET, signatureHeader: null, requestId, dataId })).toEqual({
      valid: false,
      reason: "header_ausente",
    });
    expect(
      verifyMercadoPagoSignature({ secret: SECRET, signatureHeader: "lixo", requestId, dataId }),
    ).toEqual({ valid: false, reason: "header_malformado" });
    expect(
      verifyMercadoPagoSignature({ secret: SECRET, signatureHeader: `ts=${ts},v1=zz`, requestId, dataId }).valid,
    ).toBe(false);
  });

  it("recusa notificação antiga quando há tolerância configurada", () => {
    const r = verifyMercadoPagoSignature({
      secret: SECRET,
      signatureHeader: header,
      requestId,
      dataId,
      maxAgeSeconds: 600,
      now: new Date(Number(ts) + 3600_000),
    });
    expect(r).toEqual({ valid: false, reason: "expirada" });
  });
});
