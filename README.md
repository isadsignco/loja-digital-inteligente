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

## Status das fases
| Fase | Status |
|---|---|
| 0 — Fundação (projeto, banco, segurança) | em andamento: esquema + RLS testados; falta conectar Supabase real e login do painel |
| 1 — Loja (home, catálogo, busca, produto, páginas institucionais) | primeira versão pronta; sem produtos até conectar o banco |
| 2 — Painel (login, produtos, fotos, categorias) | primeira versão: login e proteção testados com o Supabase real; cadastro aguardando conta admin para teste de ponta a ponta |
| 3 a 8 | não iniciadas |
