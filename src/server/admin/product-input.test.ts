import { describe, expect, it } from "vitest";
import { canvaDesignIdFromLink, parsePriceToCents, productFormSchema, slugify, type ProductFormValues } from "./product-input";

const base: ProductFormValues = {
  creative_name: "Coração Apertado",
  commercial_name: "Pack Pet · 25 posts para clínicas",
  slug: "",
  line: "original",
  status: "rascunho",
  category_id: "",
  description: "Posts prontos.",
  target_audience: "",
  ideal_for: "",
  benefits: "Economiza tempo\n\nVisual profissional",
  differentials: "",
  price: "27,90",
  promo_price: "",
  keywords: "pet, veterinária , clínica",
  product_type: "pack_posts",
  formats: "PNG, Canva",
  file_count: "25",
  canva_template_url: "",
  canva_master_link: "",
  usage_instructions: "",
  customizable: false,
  color_slots: "",
  featured: false,
  is_new: true,
  available: true,
  access_days: "",
  commercial_valid_until: "",
};

describe("cadastro de produto", () => {
  it("converte preço brasileiro para centavos", () => {
    expect(parsePriceToCents("27,90")).toBe(2790);
    expect(parsePriceToCents("R$ 1.234,50")).toBe(123450);
    expect(parsePriceToCents("19.9")).toBe(1990);
    expect(parsePriceToCents("")).toBeNull();
    expect(parsePriceToCents("abc")).toBeNaN();
  });

  it("gera endereço amigável sem acentos", () => {
    expect(slugify("Pack Pet · 25 posts para clínicas")).toBe("pack-pet-25-posts-para-clinicas");
  });

  it("extrai o id do design do Canva", () => {
    expect(canvaDesignIdFromLink("https://www.canva.com/design/DAHZxtCrxyc/j_9IN1/edit?utm=1")).toBe("DAHZxtCrxyc");
    expect(canvaDesignIdFromLink("https://canva.link/xg52lve34gbg5ut")).toBe("https://canva.link/xg52lve34gbg5ut");
  });

  it("monta o produto a partir do formulário", () => {
    const r = productFormSchema.parse(base);
    expect(r.product.slug).toBe("pack-pet-25-posts-para-clinicas");
    expect(r.product.price_cents).toBe(2790);
    expect(r.product.benefits).toEqual(["Economiza tempo", "Visual profissional"]);
    expect(r.product.keywords).toEqual(["pet", "veterinária", "clínica"]);
    expect(r.product.file_count).toBe(25);
    expect(r.product.category_id).toBeNull();
  });

  it("recusa preço promocional maior que o preço", () => {
    const r = productFormSchema.safeParse({ ...base, promo_price: "30,00" });
    expect(r.success).toBe(false);
  });

  it("não publica sem o link de template do Canva", () => {
    const r = productFormSchema.safeParse({ ...base, status: "ativo" });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].path).toEqual(["canva_template_url"]);
  });

  it("produto personalizável exige o design original e as cores", () => {
    expect(productFormSchema.safeParse({ ...base, customizable: true }).success).toBe(false);
    expect(productFormSchema.safeParse({ ...base, customizable: true, canva_master_link: "https://www.canva.com/design/ABC/edit" }).success).toBe(false);
    const ok = productFormSchema.parse({
      ...base,
      customizable: true,
      canva_master_link: "https://www.canva.com/design/ABC/edit",
      color_slots: "Cor principal #B793D6\nCor de destaque: #4b0f35",
    });
    expect(ok.product.customization_options).toEqual({
      cores: [
        { chave: "cor_principal", rotulo: "Cor principal", padrao: "#b793d6" },
        { chave: "cor_de_destaque", rotulo: "Cor de destaque", padrao: "#4b0f35" },
      ],
    });
  });

  it("recusa linha de cor mal escrita", () => {
    expect(productFormSchema.safeParse({ ...base, color_slots: "rosa" }).success).toBe(false);
  });

  it("aceita só links do Canva no template", () => {
    expect(productFormSchema.safeParse({ ...base, canva_template_url: "https://drive.google.com/x" }).success).toBe(false);
    expect(
      productFormSchema.safeParse({ ...base, status: "ativo", canva_template_url: "https://www.canva.com/design/ABC/view?mode=preview" })
        .success,
    ).toBe(true);
  });
});
