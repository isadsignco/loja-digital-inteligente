"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getAdminSupabase } from "@/lib/supabase-admin";
import { publicMediaUrl } from "@/lib/supabase-public";
import { descreverContagem, tipoDeProduto } from "@/lib/packs-zip";
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

// ---------------------------------------------------------------------------
// Importar pack do "Packs isadsign"
// O navegador já abriu o ZIP, subiu o ZIP para o bucket privado "arquivos" e as
// artes de vitrine para "vitrine". Aqui só criamos o rascunho (leve para o servidor).
// ---------------------------------------------------------------------------
const ImportPack = z.object({
  nome: z.string().trim().min(1).max(120),
  arquivoZip: z.string().regex(/^packs\/[0-9a-f-]{36}\/[^/]+\.zip$/i),
  tamanhoZip: z.number().int().positive(),
  contagem: z.object({ estatico: z.number().int().min(0), carrossel: z.number().int().min(0), story: z.number().int().min(0), reels: z.number().int().min(0) }),
  totalArquivos: z.number().int().positive(),
  legendas: z.string().max(6000).default(""),
  vitrine: z.array(z.object({ path: z.string().regex(/^importacoes\/[0-9a-f-]{36}\/[\w.-]+\.png$/i), alt: z.string().max(200) })).min(1).max(8),
});

export type ImportPackInput = z.input<typeof ImportPack>;
export type ImportPackResult = { erro?: string; id?: string; aviso?: string };

/** Cria o produto como "aguardando aprovação" a partir de um pack do Packs isadsign. Nunca publica sozinho. */
export async function importarPackDoPacks(entrada: ImportPackInput): Promise<ImportPackResult> {
  const { supabase, user } = await requireAdmin();
  const parsed = ImportPack.safeParse(entrada);
  if (!parsed.success) return { erro: "O pacote enviado não está no formato esperado. Baixe o ZIP de novo no Packs e tente outra vez." };
  const p = parsed.data;
  const pecas = descreverContagem(p.contagem);

  // a IA lê a capa e escreve o cadastro; se ela não estiver configurada, o rascunho sai com o básico
  let s: Awaited<ReturnType<typeof suggestProduct>>["suggestion"] | null = null;
  let jobId: string | undefined;
  let aviso: string | undefined;
  try {
    const capa = await fetch(publicMediaUrl(p.vitrine[0].path));
    const bytes = capa.ok ? Buffer.from(await capa.arrayBuffer()) : null;
    const image = bytes && bytes.length <= 5 * 1024 * 1024 ? { mediaType: "image/png" as const, base64: bytes.toString("base64") } : undefined;
    const descricao = [
      `Pack "${p.nome}" criado no gerador Packs isadsign, com ${pecas} (${p.totalArquivos} arquivos PNG prontos para postar).`,
      "Entrega: ZIP com os PNGs em alta resolução, organizados por formato.",
      p.legendas ? `Legendas que acompanham o pack (amostra):\n${p.legendas.slice(0, 2500)}` : "",
    ].filter(Boolean).join("\n\n");
    ({ suggestion: s, jobId } = await suggestProduct(getAdminSupabase(), user.id, { description: descricao, image }));
  } catch (e) {
    aviso = `A IA não preencheu o cadastro (${e instanceof Error ? e.message : "erro desconhecido"}). Complete os textos antes de aprovar.`;
  }

  const nomeComercial = s?.commercial_name || `${p.nome} · ${pecas}`;
  const { data, error } = await supabase
    .from("products")
    .insert({
      slug: `${slugify(nomeComercial)}-${Date.now().toString(36)}`,
      line: "ai_design",
      status: "aguardando_aprovacao",
      origin: "packs",
      ai_job_id: jobId ?? null,
      creative_name: s?.creative_name || p.nome,
      commercial_name: nomeComercial,
      description: s?.description || `Pack com ${pecas}, pronto para postar.`,
      target_audience: s?.target_audience ?? null,
      ideal_for: s?.ideal_for ?? null,
      benefits: s?.benefits ?? [],
      differentials: s?.differentials ?? [],
      keywords: s?.keywords ?? [],
      product_type: tipoDeProduto(p.contagem),
      price_cents: s ? Math.max(100, Math.round(s.suggested_price_brl * 100)) : 0,
      formats: ["PNG", "ZIP"],
      file_count: p.totalArquivos,
      usage_instructions: p.legendas ? "As legendas de cada peça estão no arquivo legendas.txt, dentro do ZIP." : null,
      is_new: true,
    })
    .select("id")
    .single();
  if (error) return { erro: `Rascunho não salvo: ${error.message}` };

  const midias = await supabase.from("product_media").insert(
    p.vitrine.map((v, i) => ({ product_id: data.id, storage_path: v.path, kind: "imagem", alt: v.alt, position: i })),
  );
  const arquivo = await supabase.from("product_files").insert({ product_id: data.id, kind: "final", storage_path: p.arquivoZip, format: "ZIP", size_bytes: p.tamanhoZip });
  if (midias.error || arquivo.error) {
    aviso = [aviso, `Produto criado, mas ${midias.error ? "as imagens" : "o ZIP"} não ficou ligado a ele: ${(midias.error ?? arquivo.error)!.message}`].filter(Boolean).join(" ");
  }

  await getAdminSupabase()
    .from("admin_notifications")
    .insert({ kind: "produto_aguardando_aprovacao", title: `Pack importado do Packs: ${nomeComercial}`, body: `${pecas}. Revise e aprove para publicar.`, ref: data.id });
  return { id: data.id, aviso };
}
