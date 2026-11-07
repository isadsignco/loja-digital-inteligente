import "server-only";

/** Lê uma variável obrigatória do servidor. Mensagem clara quando falta configurar. */
export function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Configuração ausente: ${name}. Cadastre em Cloudflare → Settings → Variables and Secrets.`);
  return v;
}

export function optionalEnv(name: string): string | undefined {
  return process.env[name] || undefined;
}

/** Endereço público do site (para links em e-mails e webhooks). */
export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://loja-digital-inteligente.isadsignco.workers.dev").replace(/\/$/, "");
}
