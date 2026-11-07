import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireEnv } from "@/lib/env";

export const MODEL = "claude-opus-5-5";
// preço por milhão de tokens (US$) — usado para estimar o custo de cada tarefa
const PRICE_IN = 4;
const PRICE_OUT = 20;

function client() {
  return new Anthropic({ apiKey: requireEnv("ANTHROPIC_API_KEY") });
}

const VOICE = `Você trabalha para uma loja brasileira de produtos digitais para redes sociais (packs de posts e stories no Canva, stickers, frases).
Escreva em português do Brasil, natural e comercial, sem clichês de IA ("eleve", "transforme", "descubra o poder", "jornada", "potencialize"), sem exageros e sem promessas que o produto não cumpre. Frases curtas, concretas, com benefício claro. Nunca invente números, depoimentos ou dados.`;

async function record(db: SupabaseClient, kind: string, input: unknown, output: unknown, usage: { input_tokens: number; output_tokens: number } | null, userId: string | null, error?: string) {
  const cost = usage ? (usage.input_tokens * PRICE_IN + usage.output_tokens * PRICE_OUT) / 1_000_000 : null;
  const { data } = await db
    .from("ai_jobs")
    .insert({
      kind,
      input,
      output,
      status: error ? "falhou" : "sucesso",
      model: MODEL,
      input_tokens: usage?.input_tokens ?? null,
      output_tokens: usage?.output_tokens ?? null,
      cost_usd: cost,
      error: error ?? null,
      created_by: userId,
      finished_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  return data?.id as string | undefined;
}

async function structured<T extends z.ZodType>(schema: T, content: Anthropic.MessageParam["content"], effort: "low" | "medium" | "high" = "medium") {
  const res = await client().messages.parse({
    model: MODEL,
    max_tokens: 16000,
    system: VOICE,
    messages: [{ role: "user", content }],
    output_config: { format: zodOutputFormat(schema), effort },
  });
  if (res.stop_reason === "refusal") throw new Error("A IA recusou este pedido. Reformule a descrição.");
  if (!res.parsed_output) throw new Error("A IA não retornou um resultado válido. Tente de novo.");
  return { data: res.parsed_output as z.infer<T>, usage: res.usage };
}

// ---------------------------------------------------------------------------
// Cadastro auxiliado
// ---------------------------------------------------------------------------
export const ProductSuggestion = z.object({
  creative_name: z.string(),
  commercial_name: z.string(),
  description: z.string(),
  target_audience: z.string(),
  ideal_for: z.string(),
  benefits: z.array(z.string()),
  differentials: z.array(z.string()),
  keywords: z.array(z.string()),
  product_type: z.enum(["pack_posts", "pack_stories", "stickers", "kit_identidade", "elementos", "frases", "planner", "papelaria"]),
  suggested_price_brl: z.number(),
  price_reasoning: z.string(),
  customization_notes: z.string(),
});

export async function suggestProduct(db: SupabaseClient, userId: string, input: { description: string; image?: { mediaType: "image/jpeg" | "image/png" | "image/webp" | "image/gif"; base64: string } }) {
  const content: Anthropic.ContentBlockParam[] = [];
  if (input.image) content.push({ type: "image", source: { type: "base64", media_type: input.image.mediaType, data: input.image.base64 } });
  content.push({
    type: "text",
    text: `Monte o cadastro de um produto digital para a loja a partir das informações abaixo${input.image ? " e da imagem" : ""}.
- Nome criativo: curto e memorável. Nome comercial: claro, com o que é e para quem (ex.: "Pack Pet · 25 posts para clínicas veterinárias").
- Descrição: 2 a 4 parágrafos curtos, dizendo o que vem, para quem é e como usar no Canva.
- Benefícios e diferenciais: 3 a 5 itens cada, concretos.
- Palavras-chave: 8 a 15, como as pessoas buscam no Pinterest e no Google.
- Preço sugerido em reais para o mercado brasileiro de templates digitais, com a justificativa.
- customization_notes: o que faria sentido personalizar (cores, textos) ou "não se aplica".

Informações da proprietária:
${input.description}`,
  });
  try {
    const { data, usage } = await structured(ProductSuggestion, content, "medium");
    const jobId = await record(db, "cadastro_produto", { description: input.description, image: Boolean(input.image) }, data, usage, userId);
    return { suggestion: data, jobId };
  } catch (e) {
    await record(db, "cadastro_produto", { description: input.description }, null, null, userId, e instanceof Error ? e.message : String(e));
    throw e;
  }
}

// ---------------------------------------------------------------------------
// Gerador de frases e conteúdos (com revisão antes de entregar)
// ---------------------------------------------------------------------------
const ContentPack = z.object({ titulo: z.string(), itens: z.array(z.object({ texto: z.string(), uso: z.string() })) });
const Review = z.object({ itens: z.array(z.object({ texto: z.string(), uso: z.string() })), observacoes: z.string() });

export type ContentRequest = { tipo: string; segmento: string; quantidade: number; tom: string; objetivo: string; estilo: string; publico: string };

export async function generateContent(db: SupabaseClient, userId: string, req: ContentRequest) {
  const quantidade = Math.max(1, Math.min(60, req.quantidade));
  const brief = `Tipo: ${req.tipo}\nSegmento: ${req.segmento}\nQuantidade: ${quantidade}\nTom: ${req.tom}\nObjetivo: ${req.objetivo}\nEstilo de escrita: ${req.estilo}\nPúblico: ${req.publico}`;
  const first = await structured(
    ContentPack,
    `Crie exatamente ${quantidade} itens de conteúdo para redes sociais conforme o briefing. Cada item tem o texto pronto e uma linha "uso" (onde/como usar: feed, story, legenda, CTA...). Varie estrutura e começo das frases; nada repetitivo ou genérico.\n\n${brief}`,
    "medium",
  );
  // revisão textual: corrige português, remove clichês e repetições, mantém a quantidade
  const review = await structured(
    Review,
    `Revise estes ${first.data.itens.length} itens: corrija ortografia e concordância, troque clichês e frases genéricas por versões específicas para o segmento, elimine repetições de abertura e de ideia. Mantenha a mesma quantidade. Em "observacoes", diga em uma frase o que mudou.\n\nBriefing:\n${brief}\n\nItens:\n${JSON.stringify(first.data.itens)}`,
    "low",
  );
  const usage = {
    input_tokens: first.usage.input_tokens + review.usage.input_tokens,
    output_tokens: first.usage.output_tokens + review.usage.output_tokens,
  };
  const output = { titulo: first.data.titulo, itens: review.data.itens, revisao: review.data.observacoes };
  const jobId = await record(db, "gerador_conteudo", req, output, usage, userId);
  return { ...output, jobId };
}

// ---------------------------------------------------------------------------
// Pins para Pinterest
// ---------------------------------------------------------------------------
const PinSet = z.object({ pins: z.array(z.object({ titulo: z.string(), descricao: z.string(), pasta: z.string() })) });

export async function generatePins(db: SupabaseClient, userId: string, product: { commercial_name: string; description: string; keywords: string[] }, quantidade = 5) {
  const { data, usage } = await structured(
    PinSet,
    `Crie ${quantidade} Pins diferentes para divulgar este produto no Pinterest (busca orgânica, sem anúncio).
Título: até 100 caracteres, com a palavra-chave principal no começo. Descrição: até 450 caracteres, natural, com 3 a 5 palavras-chave encaixadas e uma chamada para clicar. "pasta": nome de pasta temática (ex.: "Posts para docerias"). Varie o ângulo de cada Pin (benefício, público, ocasião, antes/depois, ideia de uso). Sem hashtags em excesso (no máximo 3, no fim).

Produto: ${product.commercial_name}
Descrição: ${product.description}
Palavras-chave: ${product.keywords.join(", ")}`,
    "low",
  );
  await record(db, "pins", { product: product.commercial_name, quantidade }, data, usage, userId);
  return data.pins;
}

// ---------------------------------------------------------------------------
// Pesquisa de oportunidades (busca na web, com fontes)
// ---------------------------------------------------------------------------
export async function researchOpportunities(db: SupabaseClient, userId: string, foco: string) {
  const res = await client().messages.create({
    model: MODEL,
    max_tokens: 16000,
    system: VOICE,
    tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 6, user_location: { type: "approximate", country: "BR" } }],
    messages: [
      {
        role: "user",
        content: `Pesquise na web tendências e oportunidades recentes para produtos digitais (templates de Canva, packs de posts/stories, stickers, frases) com foco em: ${foco}.
Considere datas sazonais brasileiras próximas, nichos de pequenos negócios e o que está em alta no Pinterest e no Instagram.
Responda com 5 a 8 ideias de produto. Para cada uma: nome, público, por que agora (citando a fonte com data quando houver), e formato sugerido. Diga claramente quando algo é inferência sua e não dado da fonte.`,
      },
    ],
  });
  const text = res.content.filter((b): b is Anthropic.TextBlock => b.type === "text").map((b) => b.text).join("\n");
  const sources = res.content
    .filter((b) => b.type === "web_search_tool_result")
    .flatMap((b) => (Array.isArray((b as { content: unknown }).content) ? ((b as { content: { url: string; title: string }[] }).content) : []))
    .map((r) => ({ url: r.url, title: r.title }));
  await record(db, "pesquisa_oportunidades", { foco }, { text, sources }, res.usage, userId);
  return { text, sources };
}
