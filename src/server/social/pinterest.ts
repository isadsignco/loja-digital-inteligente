import "server-only";
import { optionalEnv, requireEnv } from "@/lib/env";

const API = "https://api.pinterest.com/v5";

async function pin<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${requireEnv("PINTEREST_ACCESS_TOKEN")}`, "Content-Type": "application/json", ...init.headers },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Pinterest ${res.status}: ${text.slice(0, 300)}`);
  return JSON.parse(text) as T;
}

export function pinterestConfigured() {
  return Boolean(optionalEnv("PINTEREST_ACCESS_TOKEN") && optionalEnv("PINTEREST_BOARD_ID"));
}

export async function createPin(input: { boardId?: string | null; title: string; description: string; link: string; imageUrl: string; alt: string }) {
  return pin<{ id: string }>("/pins", {
    method: "POST",
    body: JSON.stringify({
      board_id: input.boardId || requireEnv("PINTEREST_BOARD_ID"),
      title: input.title.slice(0, 100),
      description: input.description.slice(0, 500),
      link: input.link,
      alt_text: input.alt.slice(0, 500),
      media_source: { source_type: "image_url", url: input.imageUrl },
    }),
  });
}

/** Métricas dos últimos 30 dias de um Pin (impressões, cliques, salvamentos). */
export async function pinMetrics(pinId: string) {
  const end = new Date();
  const start = new Date(Date.now() - 29 * 86400_000);
  const d = (x: Date) => x.toISOString().slice(0, 10);
  const r = await pin<{ all?: { lifetime_metrics?: Record<string, number> }; summary_metrics?: Record<string, number> }>(
    `/pins/${pinId}/analytics?start_date=${d(start)}&end_date=${d(end)}&metric_types=IMPRESSION,PIN_CLICK,OUTBOUND_CLICK,SAVE`,
  );
  return r.all?.lifetime_metrics ?? r.summary_metrics ?? {};
}
