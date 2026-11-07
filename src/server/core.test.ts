import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { renderTemplate, textToEmailHtml } from "./messaging/render";
import { parseOrderRequest, verifyMetaSignature } from "./messaging/whatsapp-signature";
import { orderStatusFromPayment } from "./payments/status";
import { priceOrder, type PricedProduct } from "./pricing";

const prod = (o: Partial<PricedProduct>): PricedProduct => ({
  id: "p1", commercial_name: "Pack", price_cents: 2790, promo_price_cents: null,
  status: "ativo", available: true, customizable: false, ...o,
});

describe("preço do pedido", () => {
  it("usa o preço do banco e aplica promoção válida", () => {
    const r = priceOrder([{ productId: "p1" }, { productId: "p2" }], [
      prod({}), prod({ id: "p2", price_cents: 5000, promo_price_cents: 3900 }),
    ]);
    expect(r.totalCents).toBe(2790 + 3900);
    expect(r.problems).toEqual([]);
  });

  it("ignora item repetido e produto inativo", () => {
    const r = priceOrder([{ productId: "p1" }, { productId: "p1" }, { productId: "p3" }], [
      prod({}), prod({ id: "p3", status: "inativo" }),
    ]);
    expect(r.items).toHaveLength(1);
    expect(r.problems).toHaveLength(1);
  });

  it("mantém cores só em produto personalizável", () => {
    const r = priceOrder([{ productId: "p1", cores: { principal: "#000000" } }], [prod({})]);
    expect(r.items[0].cores).toBeUndefined();
    const r2 = priceOrder([{ productId: "p1", cores: { principal: "#000000" } }], [prod({ customizable: true })]);
    expect(r2.items[0].cores).toEqual({ principal: "#000000" });
  });
});

describe("mensagens", () => {
  it("preenche marcadores", () => {
    expect(renderTemplate("Oi, {{nome}}! Pedido #{{pedido}} {{x}}", { nome: "Ana", pedido: 12 })).toBe("Oi, Ana! Pedido #12 ");
  });
  it("gera HTML seguro com links", () => {
    const h = textToEmailHtml("<b>Oi</b>\nhttps://canva.com/x");
    expect(h).toContain("&lt;b&gt;Oi&lt;/b&gt;<br>");
    expect(h).toContain('<a href="https://canva.com/x"');
  });
});

describe("status do pagamento", () => {
  it("aprovado vira pago; recusado não cancela; estorno vira reembolsado", () => {
    expect(orderStatusFromPayment("approved", "pendente")).toBe("pago");
    expect(orderStatusFromPayment("rejected", "pendente")).toBe("pendente");
    expect(orderStatusFromPayment("refunded", "pago")).toBe("reembolsado");
    expect(orderStatusFromPayment("approved", "reembolsado")).toBe("reembolsado");
  });
});

describe("WhatsApp", () => {
  it("valida assinatura da Meta", async () => {
    const body = '{"a":1}';
    const sig = "sha256=" + createHmac("sha256", "segredo").update(body).digest("hex");
    expect(await verifyMetaSignature("segredo", body, sig)).toBe(true);
    expect(await verifyMetaSignature("outro", body, sig)).toBe(false);
    expect(await verifyMetaSignature("segredo", body, null)).toBe(false);
  });
  it("lê número e código do pedido na mensagem", () => {
    expect(parseOrderRequest("Quero receber meu pedido #123 código AB12CD34")).toEqual({ number: 123, code: "ab12cd34" });
    expect(parseOrderRequest("oi")).toBeNull();
  });
});
