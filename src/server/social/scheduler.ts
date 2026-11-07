import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { siteUrl } from "@/lib/env";
import { instagramConfigured, publishInstagramImage } from "./instagram";
import { createPin, pinMetrics, pinterestConfigured } from "./pinterest";

type Item = {
  id: string;
  platform: "pinterest" | "instagram" | "tiktok";
  format: string;
  title: string | null;
  caption: string | null;
  media: { url: string; alt?: string }[];
  board: string | null;
  tracking_link_id: string | null;
};

async function linkFor(db: SupabaseClient, trackingLinkId: string | null) {
  if (!trackingLinkId) return siteUrl();
  const { data } = await db.from("tracking_links").select("code").eq("id", trackingLinkId).single();
  return data ? `${siteUrl()}/r/${data.code}` : siteUrl();
}

/** Publica um conteúdo agora. Quando a API não permite, marca como ação manual (nunca simula). */
export async function publishItem(db: SupabaseClient, item: Item) {
  const set = (patch: Record<string, unknown>) => db.from("content_items").update(patch).eq("id", item.id);
  const image = item.media[0]?.url;

  if (item.platform === "tiktok") {
    await set({ status: "requer_acao_manual", manual_action_reason: "TikTok: publique pelo app (a API só posta como privado sem auditoria). Use o roteiro e a legenda prontos." });
    return;
  }
  if (!image) {
    await set({ status: "falhou", error: "Conteúdo sem imagem." });
    return;
  }
  await set({ status: "publicando" });
  try {
    let externalId: string;
    if (item.platform === "pinterest") {
      if (!pinterestConfigured()) {
        await set({ status: "requer_acao_manual", manual_action_reason: "Pinterest ainda não conectado (token e pasta). Publique manualmente ou conecte nas configurações." });
        return;
      }
      const r = await createPin({
        boardId: item.board,
        title: item.title ?? "",
        description: item.caption ?? "",
        link: await linkFor(db, item.tracking_link_id),
        imageUrl: image,
        alt: item.media[0]?.alt ?? item.title ?? "",
      });
      externalId = r.id;
    } else {
      if (!instagramConfigured() || item.format !== "post") {
        await set({
          status: "requer_acao_manual",
          manual_action_reason: !instagramConfigured()
            ? "Instagram ainda não conectado."
            : "Este formato (Reels/Stories/carrossel) precisa ser publicado pelo app.",
        });
        return;
      }
      externalId = await publishInstagramImage(image, `${item.caption ?? ""}\n\n${await linkFor(db, item.tracking_link_id)}`);
    }
    await set({ status: "publicado", published_at: new Date().toISOString(), external_id: externalId, error: null });
  } catch (e) {
    await set({ status: "falhou", error: (e instanceof Error ? e.message : String(e)).slice(0, 1000) });
  }
}

export async function publishDueContent(db: SupabaseClient) {
  const { data } = await db
    .from("content_items")
    .select("id, platform, format, title, caption, media, board, tracking_link_id")
    .eq("status", "agendado")
    .lte("scheduled_at", new Date().toISOString())
    .limit(10);
  for (const item of (data ?? []) as Item[]) await publishItem(db, item);

  // métricas dos Pins publicados nos últimos 30 dias (1x por dia por Pin)
  if (pinterestConfigured()) {
    const { data: pins } = await db
      .from("content_items")
      .select("id, external_id")
      .eq("platform", "pinterest")
      .eq("status", "publicado")
      .gte("published_at", new Date(Date.now() - 30 * 86400_000).toISOString())
      .limit(20);
    for (const p of pins ?? []) {
      const { data: last } = await db.from("post_metrics").select("fetched_at").eq("content_item_id", p.id).order("fetched_at", { ascending: false }).limit(1);
      if (last?.[0] && Date.now() - new Date(last[0].fetched_at).getTime() < 20 * 3600_000) continue;
      const m = await pinMetrics(p.external_id).catch(() => null);
      if (!m) continue;
      await db.from("post_metrics").insert(
        Object.entries(m).map(([metric, value]) => ({ content_item_id: p.id, metric: metric.toLowerCase(), value, source: "pinterest_api" })),
      );
    }
  }
  return { publicados: data?.length ?? 0 };
}
