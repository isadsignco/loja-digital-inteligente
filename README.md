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

## Testes
```bash
npm test
```
- `supabase/tests/schema.test.ts` aplica as migrações num Postgres em memória (PGlite) e testa as regras de segurança (RLS).
- `src/server/payments/mercadopago-signature.test.ts` testa a validação dos webhooks do Mercado Pago.

## Banco de dados
Migrações em `supabase/migrations/`. Para aplicar num projeto Supabase: SQL Editor → colar o arquivo, ou `supabase db push` com a CLI.

## Status das fases
| Fase | Status |
|---|---|
| 0 — Fundação (projeto, banco, segurança) | em andamento: esquema + RLS testados; falta conectar Supabase real e login do painel |
| 1 — Loja (home, catálogo, busca, produto, páginas institucionais) | primeira versão pronta; sem produtos até conectar o banco |
| 2 a 8 | não iniciadas |
