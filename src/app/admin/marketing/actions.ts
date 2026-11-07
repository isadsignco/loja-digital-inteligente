"use server";

import { redirect } from "next/navigation";
import { getAdminSupabase } from "@/lib/supabase-admin";
import { publicMediaUrl } from "@/lib/supabase-public";
import { slugify } from "@/server/admin/product-input";
import { generatePins } from "@/server/ai/claude";
import { requireAdmin } from "@/server/auth";
import { publishItem } from "@/server/social/scheduler";

async function trackingLink(productSlug: string, platform: string, campaign: string) {
  const db = getAdminSupabase();
  const code = `${platform.slice(0, 2)}-${slugify(productSlug).slice(0, 20)}-${Math.random().toString(36).slice(2, 7)}`;
  const { data } = await db
    .from("tracking_links")
    .insert({ code, target_path: `/produto/${productSlug}`, utm_source: platform, utm_medium: "organico", utm_campaign: campaign, utm_content: code })
    .select("id")
    .single();
  return data?.id ?? null;
}

/** Claude cria Pins (rascunhos) para um produto, com imagem do produto e link rastreável. */
export async function gerarPinsParaProduto(form: FormData) {
  const { supabase, user } = await requireAdmin();
  const productId = String(form.get("produto") ?? "");
  const qtd = Math.min(10, Math.max(1, Number(form.get("quantidade")) || 5));
  const { data: p } = await supabase.from("products").select("id, slug, commercial_name, description, keywords, product_media(storage_path, alt, position)").eq("id", productId).single();
  if (!p) redirect("/admin/marketing?erro=produto");
  const media = [...(p.product_media as { storage_path: string; alt: string; position: number }[])].sort((a, b) => a.position - b.position);
  if (!media.length) redirect("/admin/marketing?erro=sem-imagem");

  let pins;
  try {
    pins = await generatePins(getAdminSupabase(), user.id, { commercial_name: p.commercial_name, description: p.description, keywords: p.keywords }, qtd);
  } catch (e) {
    redirect(`/admin/marketing?erro=${encodeURIComponent(e instanceof Error ? e.message : "ia")}`);
  }
  for (const [i, pin] of pins.entries()) {
    const img = media[i % media.length];
    await supabase.from("content_items").insert({
      platform: "pinterest",
      format: "pin",
      product_id: p.id,
      title: pin.titulo,
      caption: pin.descricao,
      board: null,
      media: [{ url: publicMediaUrl(img.storage_path), alt: img.alt || pin.titulo }],
      tracking_link_id: await trackingLink(p.slug, "pinterest", slugify(pin.pasta)),
      status: "rascunho",
    });
  }
  redirect("/admin/marketing?ok=pins");
}

export async function criarConteudoManual(form: FormData) {
  const { supabase } = await requireAdmin();
  const platform = String(form.get("plataforma")) as "instagram" | "tiktok" | "pinterest";
  const productId = String(form.get("produto") ?? "") || null;
  let slug: string | null = null;
  let media: { url: string; alt: string }[] = [];
  if (productId) {
    const { data: p } = await supabase.from("products").select("slug, product_media(storage_path, alt, position)").eq("id", productId).single();
    slug = p?.slug ?? null;
    const m = [...((p?.product_media ?? []) as { storage_path: string; alt: string; position: number }[])].sort((a, b) => a.position - b.position)[0];
    if (m) media = [{ url: publicMediaUrl(m.storage_path), alt: m.alt }];
  }
  await supabase.from("content_items").insert({
    platform,
    format: String(form.get("formato") ?? "post"),
    product_id: productId,
    title: String(form.get("titulo") ?? "") || null,
    caption: String(form.get("legenda") ?? ""),
    media,
    tracking_link_id: slug ? await trackingLink(slug, platform, "manual") : null,
    status: "rascunho",
  });
  redirect("/admin/marketing?ok=criado");
}

export async function aprovarEAgendar(id: string, form: FormData) {
  const { supabase } = await requireAdmin();
  const when = String(form.get("quando") ?? "");
  const scheduled = when ? new Date(`${when}:00-03:00`) : new Date();
  await supabase.from("content_items").update({ status: "agendado", approved_at: new Date().toISOString(), scheduled_at: scheduled.toISOString() }).eq("id", id);
  redirect("/admin/marketing?ok=agendado");
}

export async function publicarAgora(id: string) {
  await requireAdmin();
  const db = getAdminSupabase();
  const { data } = await db.from("content_items").select("id, platform, format, title, caption, media, board, tracking_link_id").eq("id", id).single();
  if (data) await publishItem(db, data as Parameters<typeof publishItem>[1]);
  redirect("/admin/marketing");
}

export async function cancelarConteudo(id: string) {
  const { supabase } = await requireAdmin();
  await supabase.from("content_items").update({ status: "cancelado" }).eq("id", id);
  redirect("/admin/marketing");
}

export async function marcarPublicadoManual(id: string) {
  const { supabase } = await requireAdmin();
  await supabase.from("content_items").update({ status: "publicado", published_at: new Date().toISOString(), manual_action_reason: "publicado manualmente" }).eq("id", id);
  redirect("/admin/marketing");
}

export async function salvarTexto(id: string, form: FormData) {
  const { supabase } = await requireAdmin();
  await supabase.from("content_items").update({ title: String(form.get("titulo") ?? "") || null, caption: String(form.get("legenda") ?? "") }).eq("id", id);
  redirect("/admin/marketing?ok=salvo");
}
