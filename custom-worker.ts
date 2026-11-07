// Worker da Cloudflare: o site (OpenNext) + a rotina automática a cada 10 minutos.
// A rotina chama /api/cron, que confere pagamentos pendentes, reenvia mensagens,
// expira Pix vencidos e publica conteúdos agendados.
import handler from "./.open-next/worker.js";

type Env = { CRON_SECRET?: string; NEXT_PUBLIC_SITE_URL?: string };

export default {
  fetch: handler.fetch,
  async scheduled(_event: unknown, env: Env, ctx: { waitUntil(p: Promise<unknown>): void }) {
    if (!env.CRON_SECRET) return;
    const base = env.NEXT_PUBLIC_SITE_URL ?? "https://loja-digital-inteligente.isadsignco.workers.dev";
    const req = new Request(`${base}/api/cron`, { headers: { authorization: `Bearer ${env.CRON_SECRET}` } });
    ctx.waitUntil(handler.fetch(req, env, ctx));
  },
};

export { DOQueueHandler, DOShardedTagCache, BucketCachePurge } from "./.open-next/worker.js";
