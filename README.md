# Loja Digital Inteligente

E-commerce de produtos digitais (packs de posts, stories, stickers) com entrega automática pelo Canva,
personalização de cores feita por agente de IA (Claude), Pix/cartão pelo Mercado Pago e marketing orgânico
com foco no Pinterest.

- Plano completo: [`docs/01-analise-arquitetura-plano.md`](docs/01-analise-arquitetura-plano.md)
- Revisão de custo mínimo e decisões: [`docs/02-revisao-custo-minimo-canva-pinterest.md`](docs/02-revisao-custo-minimo-canva-pinterest.md)

## Stack
Next.js 16 (App Router, Cache Components) · TypeScript · Tailwind CSS 4 · Supabase (Postgres + Auth + Storage) · Vitest

## Rodar localmente
```bash
npm install
cp .env.example .env.local   # preencha as chaves
npm run dev
```

> Em ambientes com proxy HTTPS (como as sessões em nuvem do Claude Code), rode com `NODE_USE_ENV_PROXY=1` para o `fetch` do Node usar o proxy.

## Hospedagem (Cloudflare Workers)
Deploy pelo adaptador OpenNext (`wrangler.jsonc`, `open-next.config.ts`).
- Build: `npx opennextjs-cloudflare build`
- Deploy: `npx opennextjs-cloudflare deploy`
- Os valores públicos do Supabase ficam em `.env.production` (versionado; só valores públicos).
- O Cache Components do Next fica desligado: o runtime da Cloudflare ainda não o executa de forma estável (teste local travou as páginas). O catálogo usa `unstable_cache` com a tag `catalogo`.

## Testes
```bash
npm test
```
- `supabase/tests/schema.test.ts` aplica as migrações num Postgres em memória (PGlite) e testa as regras de segurança (RLS).
- `src/server/payments/mercadopago-signature.test.ts` testa a validação dos webhooks do Mercado Pago.

## Banco de dados
Migrações em `supabase/migrations/`, aplicadas em ordem. Para aplicar: SQL Editor → colar o arquivo → Run (cada arquivo uma única vez), ou `supabase db push` com a CLI.

| Migração | Aplicada em produção |
|---|---|
| 20261107000001_schema_inicial | sim (07/11/2026) |
| 20261107000002_busca_publica | sim (08/11/2026) |
| 20261108000003_painel_admin | sim (08/11/2026) |
| 20261108000004_venda_entrega | pendente |
| 20261109000005_importacao_packs | sim (08/11/2026, pelo conector do Supabase) |

## Identidade visual (isakit.co)
- Nome padrão da loja: **isakit.co** (pode ser trocado com `NEXT_PUBLIC_STORE_NAME`).
- Fundo branco, superfícies creme claro `#F7F3EA`, texto grafite `#282828`.
- Destaques com as cores da isadsign, sem exagero: rosa `#E9349E` (detalhes e títulos grandes; `#B8136F` em links e textos pequenos), lima `#9ABC05` (botão de compra), amarelo `#FCDD6C` e creme `#F3E8CC` em selos e faixas.
- Títulos em Bricolage Grotesque e textos em Figtree (Google Fonts via `next/font`).
- Protótipos navegáveis da loja e do painel: canvas "Loja Digital Inteligente" no Claude.

## Importar packs do Packs isadsign
Central de Criação → **Importar do Packs isadsign**:
1. No Packs, gere o pack e baixe o ZIP.
2. No painel, envie o ZIP. O navegador abre o ZIP, sobe até 8 artes para a vitrine e guarda o ZIP no bucket privado `arquivos` (limite de 50 MB por arquivo no Supabase gratuito).
3. O servidor cria o produto como **Aguardando aprovação** (linha AI Design, origem `packs`), e o Claude escreve o cadastro a partir da capa e das legendas.
4. Para publicar, a regra atual continua: informe o link de template do Canva (o Packs também envia o pack para o Canva). A entrega do ZIP por download ainda não está ligada ao checkout.

Requer a migração `20261109000005_importacao_packs`.

## Segredos (Cloudflare → Settings → Variables and Secrets)
Nunca no código, nunca no chat. Tipo **Secret**:

| Nome | Para quê |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | checkout, webhooks, entregas (chave secreta do Supabase) |
| `MERCADOPAGO_ACCESS_TOKEN` | criar Pix/cartão, consultar e estornar |
| `MERCADOPAGO_WEBHOOK_SECRET` | validar avisos de pagamento |
| `RESEND_API_KEY`, `EMAIL_FROM` | e-mails (ex.: `Loja <pedidos@seudominio.com.br>`) |
| `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_APP_SECRET`, `WHATSAPP_VERIFY_TOKEN` | WhatsApp Business |
| `ANTHROPIC_API_KEY` | Claude (Central de Criação, Pins) |
| `PINTEREST_ACCESS_TOKEN`, `PINTEREST_BOARD_ID` | publicar Pins |
| `INSTAGRAM_USER_ID`, `INSTAGRAM_ACCESS_TOKEN` | publicar posts |
| `CRON_SECRET` | rotina automática a cada 10 min (`custom-worker.ts`) |

Webhooks a cadastrar: Mercado Pago → `/api/webhooks/mercadopago`; Meta (WhatsApp) → `/api/webhooks/whatsapp`.

## Status das fases
| Fase | Status |
|---|---|
| 0 — Fundação (projeto, banco, segurança) | em andamento: esquema + RLS testados; falta conectar Supabase real e login do painel |
| 1 — Loja (home, catálogo, busca, produto, páginas institucionais) | primeira versão pronta; sem produtos até conectar o banco |
| 2 — Painel (login, produtos, fotos, categorias) | primeira versão: login e proteção testados com o Supabase real; cadastro aguardando conta admin para teste de ponta a ponta |
| 3 a 8 | código pronto (venda, entrega, área do cliente, painel completo, IA, marketing, relatórios); integrações aguardando credenciais e teste real |
