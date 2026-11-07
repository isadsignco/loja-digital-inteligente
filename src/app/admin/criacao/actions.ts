"use server";

import { redirect } from "next/navigation";
import { getAdminSupabase } from "@/lib/supabase-admin";
import { slugify } from "@/server/admin/product-input";
import { generateContent, researchOpportunities, suggestProduct } from "@/server/ai/claude";
import { requireAdmin } from "@/server/auth";

export type AiState = { erro?: string; resultado?: unknown };

const IMG = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;

/** Claude preenche o cadastro e salva como RASCUNHO aguardando aprovação (nunca publica sozinho). */
export async function criarRascunhoComIA(_p: AiState, form: FormData): Promise<AiState> {
  const { supabase, user } = await requireAdmin();
  const description = String(form.get("descricao") ?? "").trim();
  const file = form.get("imagem");
  if (description.length < 10 && !(file instanceof File && file.size)) return { erro: "Descreva o produto (ou envie uma imagem)." };

  let image: { mediaType: (typeof IMG)[number]; base64: string } | undefined;
  if (file instanceof File && file.size) {
    if (!IMG.includes(file.type as (typeof IMG)[number]) || file.size > 5 * 1024 * 1024) return { erro: "Imagem deve ser JPG, PNG, WEBP ou GIF de até 5 MB." };
    image = { mediaType: file.type as (typeof IMG)[number], base64: Buffer.from(await file.arrayBuffer()).toString("base64") };
  }

  let s;
  let jobId;
  try {
    ({ suggestion: s, jobId } = await suggestProduct(getAdminSupabase(), user.id, { description: description || "(veja a imagem)", image }));
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Falha na IA." };
  }

  const baseSlug = slugify(s.commercial_name);
  const { data, error } = await supabase
    .from("products")
    .insert({
      slug: `${baseSlug}-${Date.now().toString(36)}`,
      line: "ai_design",
      status: "aguardando_aprovacao",
      origin: "ia",
      ai_job_id: jobId ?? null,
      creative_name: s.creative_name,
      commercial_name: s.commercial_name,
      description: s.description,
      usage_instructions: /não se aplica/i.test(s.customization_notes) ? null : `Personalização sugerida pela IA: ${s.customization_notes}`,
      target_audience: s.target_audience,
      ideal_for: s.ideal_for,
      benefits: s.benefits,
      differentials: s.differentials,
      keywords: s.keywords,
      product_type: s.product_type,
      price_cents: Math.max(100, Math.round(s.suggested_price_brl * 100)),
      formats: ["PNG", "Canva"],
      is_new: true,
    })
    .select("id")
    .single();
  if (error) return { erro: `Rascunho não salvo: ${error.message}` };
  await getAdminSupabase().from("admin_notifications").insert({ kind: "produto_aguardando_aprovacao", title: `Rascunho da IA: ${s.commercial_name}`, ref: data.id });
  redirect(`/admin/produtos/${data.id}?ia=1`);
}

export async function gerarConteudo(_p: AiState, form: FormData): Promise<AiState> {
  const { user } = await requireAdmin();
  const get = (k: string) => String(form.get(k) ?? "").trim();
  try {
    const r = await generateContent(getAdminSupabase(), user.id, {
      tipo: get("tipo") || "frases para Instagram",
      segmento: get("segmento") || "pequenos negócios",
      quantidade: Number(get("quantidade")) || 20,
      tom: get("tom") || "acolhedor",
      objetivo: get("objetivo") || "engajamento",
      estilo: get("estilo") || "direto",
      publico: get("publico") || "clientes do negócio",
    });
    return { resultado: r };
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Falha na IA." };
  }
}

export async function pesquisarOportunidades(_p: AiState, form: FormData): Promise<AiState> {
  const { user } = await requireAdmin();
  try {
    return { resultado: await researchOpportunities(getAdminSupabase(), user.id, String(form.get("foco") ?? "pequenos negócios").slice(0, 300)) };
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Falha na IA." };
  }
}
