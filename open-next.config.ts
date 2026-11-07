// Configuração do adaptador OpenNext para Cloudflare Workers.
// Sem cache incremental em R2 por enquanto (evita custo e cadastro de cartão);
// o catálogo usa cache curto em memória e é atualizado ao salvar no painel.
import { defineCloudflareConfig } from "@opennextjs/cloudflare";

export default defineCloudflareConfig({});
