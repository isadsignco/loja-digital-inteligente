# Loja Digital Inteligente — Análise técnica, arquitetura e plano de execução

> Documento da **Etapa 0** (antes de programar). Data: 07/11/2026.
> Legenda usada em todo o documento:
> - ✅ **Nativo** — construído dentro do próprio sistema, sem depender de terceiros.
> - 🔌 **Externo** — depende de serviço/API de terceiro (conta, aprovação, custo).
> - ⚠️ **Limitação** — restrição real da plataforma que muda o que é possível.
> - 💲 Valores de terceiros são **estimativas** com base nas tabelas públicas conhecidas; precisam ser conferidos no momento da contratação (preços e regras de API mudam com frequência).

---

## 1. Resumo executivo

O projeto é viável como sistema real. Os pontos que exigem mais atenção são:

| # | Ponto crítico | Por quê | Decisão proposta |
|---|---|---|---|
| 1 | **Personalizador com prévia = arquivo final** | É o coração do produto e o item tecnicamente mais difícil | Um **motor de renderização único (SVG)** usado no navegador (prévia) e no servidor (arquivo final), com as mesmas fontes, o mesmo cálculo de quebra de linha e teste automático de comparação de pixels |
| 2 | **Canva personalizado por cliente** | A API do Canva que preenche templates automaticamente (*Autofill*) exige **Canva Enterprise**. Links de template (“Template link”) só são gerados manualmente na interface do Canva | Produtos personalizados entregam **arquivos gerados pelo sistema** automaticamente; link do Canva personalizado entra numa **fila semiautomática** (a proprietária cria a cópia e cola o link; o sistema entrega) até o volume justificar o Enterprise |
| 3 | **Publicação automática em redes sociais** | Instagram e Pinterest permitem publicar via API **após aprovação do app**; TikTok, sem auditoria, só publica como **privado** — o caminho realista é enviar o vídeo para os **rascunhos** do app | Integrações oficiais com status explícito “requer ação manual” quando a API não permitir. Pedir aprovações **na semana 1** (demoram semanas) |
| 4 | **“Pesquisar tendências”** | Instagram e TikTok **não têm API pública de tendências** | Usar fontes que existem: busca na web via Claude, Pinterest Trends (verificar disponibilidade para BR), Google Trends, e métricas dos próprios posts. Sempre indicar a fonte e a data |
| 5 | **Pagamento confiável** | Página de sucesso não prova pagamento | Liberação **só por webhook validado + consulta à API do Mercado Pago**, com idempotência no banco |
| 6 | **Proteção do arquivo antes do pagamento** | Tudo que aparece na tela pode ser capturado | Prévia usa imagens em baixa resolução + marca de prévia; alta resolução só existe no servidor e só é gerada após pagamento confirmado |
| 7 | **Jurídico/fiscal** | LGPD, direito de arrependimento (CDC art. 49) aplicado a produto digital, emissão de nota fiscal | O sistema suporta; o texto jurídico final e a parte fiscal precisam de validação de contador/advogado |

Prazo estimado: **~23 a 29 semanas** para as 8 fases com um desenvolvedor, mais o tempo de aprovação das plataformas (em paralelo). Custo fixo mensal inicial: **~US$ 70–150/mês** (≈ R$ 400–850) + taxas por venda. Detalhes nas seções 8 e 9.

---

## 2. Viabilidade funcionalidade por funcionalidade

### 2.1 Loja (Fase 1 e 4)
| Funcionalidade | Tipo | Observação |
|---|---|---|
| Home, catálogo, categorias, produto, busca, filtros, FAQ, páginas institucionais | ✅ | Busca com PostgreSQL full-text (com acentuação em português) — sem custo extra. Serviço de busca dedicado só se o catálogo passar de milhares de itens |
| Carrinho | ✅ | Carrinho no banco (funciona entre dispositivos após login) + carrinho anônimo por cookie |
| Checkout Pix e cartão | 🔌 Mercado Pago | Checkout transparente com *Bricks* (formulário de cartão do próprio MP → **nunca tocamos no número do cartão**). Pix com QR Code e “copia e cola” |
| Área do cliente, histórico, downloads | ✅ | Login por e-mail (link mágico ou senha) via Supabase Auth |

### 2.2 Painel administrativo (Fase 2)
Tudo ✅ nativo. Inclui editor de produto com upload múltiplo, ordenação de imagens por arrastar, gestão de arquivos privados, categorias, descontos, clientes, pedidos, mensagens automáticas editáveis, liga/desliga de automações.

### 2.3 Personalização em tempo real (Fase 3) — ✅ nativo, alta complexidade
Ver seção 4. Totalmente construível sem serviço externo.

### 2.4 Pagamentos (Fase 4) — 🔌 Mercado Pago
- Webhooks com validação de assinatura (`x-signature`, HMAC-SHA256 com o segredo do painel MP).
- Após o webhook, o sistema **consulta o pagamento na API** (`GET /v1/payments/{id}`) — essa consulta é a fonte da verdade.
- Reembolso total/parcial pela API.
- ⚠️ **Pix no ambiente de testes** do MP não é aprovado de forma real; a validação final de Pix exige um pagamento real de baixo valor (ex.: R$ 1,00) em produção, depois estornado. Cartão tem cartões de teste.

### 2.5 Entrega automática (Fase 5)
| Canal | Tipo | Limitação |
|---|---|---|
| E-mail | 🔌 Resend | Exige domínio próprio com registros DNS (SPF/DKIM/DMARC) para não cair em spam |
| WhatsApp | 🔌 WhatsApp Business Platform (Cloud API, Meta) | ⚠️ Exige **verificação da empresa no Meta Business**; mensagens iniciadas pela loja só com **modelos (templates) aprovados** pela Meta; cobrança **por mensagem**; o cliente precisa ter **autorizado** receber WhatsApp. O número usado precisa ser registrado na Cloud API (há um recurso de “coexistência” com o app WhatsApp Business — verificar se está disponível para o número dela) |
| Downloads | ✅ + armazenamento privado | Links assinados e temporários, gerados na hora do clique, após checar login e posse do pedido |
| Link do Canva (produto pronto) | ✅ (link cadastrado manualmente) | ⚠️ O “Template link” é criado pela proprietária no Canva e colado no cadastro |
| Link do Canva (personalizado) | ⚠️ | Ver item 2 do resumo. Sem Enterprise, não há como gerar uma cópia personalizada por API |

### 2.6 Inteligência artificial (Fase 6)
| Funcionalidade | Tipo | Observação |
|---|---|---|
| Cadastro auxiliado (texto a partir de descrição/imagem/arquivo) | 🔌 Claude API | Claude lê imagens e PDFs. Resultado sempre salvo como **rascunho** |
| Gerador de frases, legendas, calendários, carrosséis | 🔌 Claude API | Com etapa de revisão automática (segunda passada que busca clichês, repetição e erros) + revisão humana opcional |
| Stickers tipográficos (palavras/frases) | ✅ **nativo** | Gerados pelo motor SVG com fontes licenciadas → legibilidade perfeita e **transparência real**. IA de imagem não escreve texto de forma confiável; tipografia deve ser feita por código |
| Ilustrações, elementos, texturas, fundos | 🔌 Serviço de geração de imagem | Ex.: OpenAI gpt-image (suporta fundo transparente), Recraft (gera vetor/SVG, bom para elementos e stickers), Ideogram, Flux. Recomendo começar com 1–2 e comparar qualidade |
| Remoção de fundo quando necessário | 🔌 ou ✅ | Serviço externo ou modelo próprio; sempre seguido de verificação automática do canal alfa |
| Central de Criação (pipeline de 13 etapas) | ✅ orquestração + 🔌 IA | Cada etapa é um passo de fluxo com registro, custo estimado e possibilidade de refazer. Nada é publicado sem aprovação |
| Pesquisa de tendências | 🔌 / ⚠️ | Ver item 4 do resumo |

### 2.7 Marketing orgânico (Fase 7)
| Plataforma | O que a API oficial permite | Limitações ⚠️ |
|---|---|---|
| **Instagram** (Graph API / Instagram API) | Publicar imagem, carrossel, Reels e Stories em conta **Profissional (Business/Creator)**; ler métricas | App precisa passar pela **revisão da Meta** para a permissão de publicação; limite diário de publicações por API; **não** dá para usar músicas da biblioteca do Instagram, stickers interativos, enquetes ou marcar produtos via API — esses casos ficam como “requer publicação manual” |
| **Pinterest** (API v5) | Criar Pins e pastas com link para a loja; métricas de Pins | Acesso de teste (“trial”) é limitado; publicar normalmente exige solicitar acesso padrão (“standard”) |
| **TikTok** (Content Posting API) | Enviar vídeo para os **rascunhos/caixa de entrada** do app (a proprietária finaliza com som em alta e publica) ou postar direto | ⚠️ Sem **auditoria aprovada**, posts diretos ficam **privados**. Métricas básicas por vídeo. Recomendo o modo “rascunho” como padrão — é o que permite usar sons em alta |
| Agendamento | ✅ | Fila própria agenda e publica no horário; falhas aparecem no painel |
| Links rastreáveis | ✅ | Links curtos próprios (`/r/codigo`) com UTM; a origem fica gravada no pedido |

### 2.8 Relatórios (Fase 8) — ✅ nativo
Todos os números vêm do banco. Cada indicador terá selo: **Real** (medido), **Estimado** (calculado/inferido) ou **Indisponível** (API não fornece ou integração não conectada). Nada de dado de exemplo em produção.

---

## 3. Arquitetura proposta

### 3.1 Escolhas e justificativas

| Camada | Escolha | Por quê | Alternativa |
|---|---|---|---|
| Frontend + API | **Next.js (App Router) + TypeScript + Tailwind CSS** | Uma base só para loja, painel e API; ótimo SEO (importante para orgânico); renderização no servidor | — |
| Banco | **Supabase (PostgreSQL)** | Postgres real + autenticação + armazenamento privado + segurança por linha (RLS) num só serviço | Neon + Auth.js + S3 |
| Armazenamento | **Supabase Storage** (buckets privados) | Links assinados e temporários; mesmas regras de acesso do banco | Cloudflare R2 (sem custo de saída de dados — considerar se downloads crescerem muito) |
| Tarefas em segundo plano | **Inngest** (ou Trigger.dev) | Entrega, geração de arquivos, publicação agendada e IA precisam de **filas com nova tentativa, etapas e histórico**. Funções serverless sozinhas têm tempo limite e não reexecutam sozinhas | Worker próprio com fila no Postgres |
| Renderização de arquivos | **Motor SVG próprio** (pacote TypeScript compartilhado) + **resvg** (SVG→PNG no servidor) + **pdf-lib** (PDF) + **ZIP em streaming** | Mesmo código gera prévia e arquivo final → correspondência garantida | Navegador headless (mais pesado e caro em serverless) |
| Pagamento | **Mercado Pago** (Checkout Transparente/Bricks) | Pix + cartão, padrão no Brasil | — |
| E-mail | **Resend** + modelos em React Email | Simples, bom envio, plano gratuito inicial | Amazon SES (mais barato em volume) |
| WhatsApp | **WhatsApp Cloud API** direto na Meta | Sem intermediário pago | Provedor BSP (Twilio, 360dialog, Zenvia) — cobra taxa adicional |
| IA de texto | **Claude API** — modelo padrão **Claude Opus 5.5** | Melhor qualidade para textos comerciais, planejamento e leitura de imagens | Para tarefas de alto volume e simples (ex.: classificar, revisar ortografia) dá para usar Sonnet 5.5 ou Haiku 5.5 e reduzir custo — **decisão sua** |
| IA de imagem | **gpt-image e/ou Recraft** (definir após teste comparativo) | Transparência real / vetor | Ideogram, Flux |
| Hospedagem | **Vercel (plano Pro)** | Integração natural com Next.js. ⚠️ O plano gratuito (Hobby) **proíbe uso comercial** | Railway, Render, VPS |
| Limite de requisições | Upstash Redis | Proteção contra abuso em login, checkout e geração de prévia | — |
| Monitoramento de erros | Sentry | Erros com contexto, alerta para a proprietária | — |

### 3.2 Diagrama lógico

```
                       ┌───────────────────────────┐
  Cliente (celular) ──▶│  Next.js (Vercel)         │◀── Proprietária (painel /admin, 2FA)
                       │  • Loja / Área do cliente │
                       │  • Painel administrativo  │
                       │  • API (rotas servidor)   │
                       │  • Personalizador (SVG)   │
                       └──────┬─────────┬──────────┘
                              │         │ eventos
             ┌────────────────┘         ▼
             ▼                 ┌───────────────────────┐
   ┌──────────────────┐        │ Inngest (filas/fluxos)│
   │ Supabase         │◀──────▶│ • processar pagamento │
   │ • Postgres + RLS │        │ • gerar arquivos      │
   │ • Auth (+MFA)    │        │ • entregar (outbox)   │
   │ • Storage privado│        │ • publicar post       │
   └──────────────────┘        │ • jobs de IA          │
             ▲                 │ • coletar métricas    │
             │                 └───┬───┬───┬───┬───┬───┘
  Webhook ───┘ (Mercado Pago)      │   │   │   │   │
                                   ▼   ▼   ▼   ▼   ▼
                     Mercado Pago  Resend  WhatsApp  Claude/IA imagem  Instagram/Pinterest/TikTok
```

### 3.3 Fluxo de pagamento e entrega (à prova de duplicidade)

1. Checkout cria **pedido** (`pendente`) com instantâneo do produto, preço e personalização **travada** (não pode mais ser alterada).
2. Pagamento é criado no MP com `X-Idempotency-Key` = id do pedido → impede cobrança duplicada por clique duplo/repetição.
3. MP chama o webhook → o sistema valida a assinatura, grava o evento (id único — evento repetido é ignorado) e responde 200 rapidamente.
4. Uma tarefa em segundo plano **consulta o pagamento na API do MP**, confere valor e pedido, e muda o status numa transação (`pendente → pago`) — só uma execução consegue fazer essa transição.
5. Para cada item: gera arquivos (se personalizado) → **verifica** (dimensão, transparência, tamanho, checksum) → grava a entrega (restrição única por item: **nunca duas entregas**).
6. Mensagens vão para uma **caixa de saída** (*outbox*) com chave única por pedido+tipo → e-mail e WhatsApp nunca saem duplicados; falhas são reprocessadas com intervalo crescente.
7. Falhou após as tentativas → status `falha_entrega`, notificação para a proprietária, botão **Reenviar** no painel.
8. Uma rotina de conferência periódica consulta pedidos pendentes no MP (cobre webhook perdido).

---

## 4. Personalizador: como garantir “prévia = arquivo entregue”

**Princípio:** existe **uma única função** `render(template, escolhas) → SVG`, escrita em TypeScript, executada no navegador (prévia) e no servidor (arquivo final).

- **Template** = descrição em JSON de cada página/arte: camadas de texto, imagem, forma, grupo; cada camada marcada como **fixa** ou **editável** com limites (paleta permitida, fontes permitidas, máximo de caracteres, posição travada, área do logotipo).
- **Fontes**: os mesmos arquivos de fonte são carregados no navegador e no servidor; a **quebra de linha e o ajuste de tamanho são calculados pelo nosso código** (com as métricas da fonte), não pelo navegador → o resultado é idêntico nos dois lados.
- **Prévia**: imagens ilustrativas em **baixa resolução** + marca “PRÉVIA” discreta; atualização instantânea a cada alteração, sem recarregar; zoom; navegação entre páginas; botão “restaurar original”; escolhas salvas automaticamente (rascunho por 30 dias, por exemplo).
- **Arquivo final**: o servidor executa o mesmo `render` com as imagens em **alta resolução**, sem a marca de prévia, e converte para PNG/JPG/PDF. Só acontece após pagamento confirmado.
- **Teste automático de correspondência**: para cada template, o sistema compara a prévia renderizada no navegador com o arquivo final reduzido ao mesmo tamanho; diferença acima do limite bloqueia a publicação do template.
- **Como a proprietária cria templates sem programar**: um **editor de template no painel** — ela envia o fundo e os elementos (PNG/SVG exportados do Canva, Figma ou Illustrator), posiciona caixas de texto, define o que é editável, cores e fontes permitidas. ⚠️ Não é possível importar automaticamente um design do Canva com todas as camadas editáveis; a arte base vem como imagens/SVG.
- ⚠️ **Limite honesto de proteção**: qualquer coisa visível pode ser fotografada da tela. A proteção real é: a prévia nunca contém a alta resolução, e o arquivo final só é gerado e liberado depois do pagamento.

**Stickers** (Sticker Club): as palavras/frases são renderizadas pelo mesmo motor com contorno, sombra, gradiente e textura por estilo (minimalista, retrô, Y2K…), exportadas como PNG com **transparência real** em alta resolução. Verificação automática: canal alfa presente, cantos transparentes, nada cortado na borda, contraste/contorno mínimo para legibilidade, resolução mínima. Entrega: PNGs individuais + ZIP + PDF de pré-visualização (folha de contato), **sem marca-d'água**.

⚠️ **Licença de fontes**: só usar fontes que permitem uso comercial em produtos vendidos (ex.: Google Fonts sob licença OFL) ou fontes com licença comprada que cubra esse uso.

---

## 5. Estrutura de pastas

```
loja-digital-inteligente/
├── apps/
│   └── web/                         # Next.js (loja + painel + API)
│       ├── src/app/
│       │   ├── (loja)/              # home, catalogo, categoria/[slug], produto/[slug],
│       │   │                        # busca, carrinho, checkout, faq, sobre, contato,
│       │   │                        # privacidade, termos
│       │   ├── (cliente)/conta/     # pedidos, downloads, suporte, dados, privacidade (LGPD)
│       │   ├── admin/               # dashboard, produtos, templates, clientes, pedidos,
│       │   │                        # central-criacao, marketing, automacoes, mensagens,
│       │   │                        # relatorios, configuracoes
│       │   ├── api/
│       │   │   ├── webhooks/mercadopago/
│       │   │   ├── webhooks/whatsapp/
│       │   │   ├── inngest/         # ponto de entrada das tarefas em segundo plano
│       │   │   └── downloads/[token]/
│       │   └── r/[code]/            # links rastreáveis
│       ├── src/components/          # UI (design system próprio)
│       ├── src/server/              # regras de negócio (somente servidor)
│       │   ├── orders/ payments/ delivery/ messaging/ ai/ social/ reports/
│       │   └── auth/ (papéis e permissões)
│       ├── src/jobs/                # funções Inngest (fluxos com etapas)
│       └── tests/e2e/               # Playwright
├── packages/
│   ├── render/                      # motor SVG compartilhado (navegador + servidor)
│   │   ├── src/ (layout de texto, camadas, validação de escolhas)
│   │   └── tests/ (determinismo + comparação de pixels)
│   ├── exporters/                   # PNG (resvg), PDF (pdf-lib), ZIP, verificações
│   └── shared/                      # tipos, schemas (Zod), constantes
├── supabase/
│   ├── migrations/                  # SQL versionado (tabelas + RLS)
│   └── seed/                        # apenas dados de DESENVOLVIMENTO, nunca em produção
├── docs/                            # este plano + guias de configuração de cada integração
└── .github/workflows/               # CI: lint, tipos, testes
```

---

## 6. Banco de dados (modelo inicial)

Valores monetários em **centavos (inteiro)**. Todas as tabelas com `created_at/updated_at`. Segurança por linha (RLS): cliente só enxerga o que é dele; painel exige papel `admin`.

**Catálogo**
- `categories` (hierarquia simples), `collections`, `collection_products`
- `products` — linha (`original | ai_design | personalizado`), status (`rascunho | aguardando_aprovacao | ativo | inativo | arquivado`), origem (`manual | ia`), nome criativo, nome comercial, descrição, público-alvo, ideal para, benefícios[], diferenciais[], preço, preço promocional, palavras-chave[], tipo, formatos[], qtd. de arquivos, link do Canva, instruções de uso, personalizável, datas (cadastro/publicação/atualização), validade comercial, prazo de acesso, disponibilidade, `search_vector`
- `product_media` — imagem/mockup/vídeo, ordem, texto alternativo
- `product_files` — arquivos originais e finais (bucket privado), formato, tamanho, checksum
- `templates` + `template_versions` — JSON do template, páginas, regras de edição (versão fica congelada no pedido)
- `template_assets` — fontes e imagens (versão de prévia e versão em alta resolução)
- `discounts` / `coupons`

**Clientes e vendas**
- `customers` — nome, e-mail, telefone, vínculo com login, observações internas
- `consents` — registro de consentimento LGPD por finalidade (transacional, e-mail marketing, WhatsApp marketing), data, origem, revogação
- `customizations` — escolhas do cliente (JSON), versão do template, status (`rascunho | travada`), expiração
- `carts`, `cart_items`
- `orders` — número, status, totais, desconto, **origem/UTM** da venda
- `order_items` — **instantâneo** do produto e preço no momento da compra, personalização vinculada, status de entrega
- `payments` — `provider_payment_id` **único**, método, status, valor, resposta bruta
- `webhook_events` — id do evento **único**, assinatura válida?, processado em
- `refunds`

**Entrega e atendimento**
- `deliveries` (única por item de pedido), `delivery_files` (verificados, checksum), `download_grants` (validade, contagem)
- `canva_tasks` — fila de links do Canva personalizados (quando aplicável)
- `outbox_messages` — canal, tipo (**transacional × promocional**), modelo, destinatário, status, tentativas, id do provedor, chave única
- `message_templates` — textos editáveis pela proprietária
- `support_tickets`, `support_messages`, `customer_interactions` (registro de contato)

**IA, marketing, automação**
- `ai_jobs` — tipo, entrada, etapas, saída, custo estimado, status, produto/rascunho gerado
- `social_accounts` — tokens **criptografados**, validade
- `content_items` — plataforma, formato, legenda, mídias, status (`rascunho | aprovado | agendado | publicado | falhou | requer_acao_manual`), data agendada, id externo
- `tracking_links`, `link_clicks`, `post_metrics` (métrica, valor, coletado em, fonte)
- `automations` (liga/desliga + configuração), `automation_runs` (início, fim, status, erro)
- `admin_notifications`, `audit_logs` (quem fez o quê no painel)

---

## 7. Integrações, dependências e contas necessárias

| Serviço | O que a proprietária precisa criar/fornecer | Tempo de liberação |
|---|---|---|
| Domínio (.com.br) | Registro no Registro.br | 1 dia |
| GitHub | Repositório para o código (**necessário**: este ambiente de trabalho é temporário) | imediato |
| Vercel | Conta + plano Pro | imediato |
| Supabase | Conta + projeto (região São Paulo) | imediato |
| Mercado Pago | Conta vendedor (idealmente CNPJ/MEI), credenciais de produção e teste, segredo do webhook | 1–3 dias |
| Resend | Conta + DNS do domínio | 1 dia |
| Meta (WhatsApp + Instagram) | Meta Business Manager, **verificação da empresa**, app de desenvolvedor, número de telefone, conta Instagram Profissional vinculada, **revisão do app** | **2–6 semanas** ⚠️ |
| Pinterest | Conta empresarial + app + pedido de acesso padrão | 1–4 semanas ⚠️ |
| TikTok | Conta + app de desenvolvedor + auditoria do Content Posting API | 2–6 semanas ⚠️ |
| Anthropic (Claude API) | Conta na Console + chave de API + limite de gasto | imediato |
| IA de imagem | Conta no(s) provedor(es) escolhido(s) | imediato |
| Inngest, Sentry, Upstash | Contas (planos gratuitos no início) | imediato |
| Canva | Plano atual (Pro/Teams). Enterprise só se quiser automação total de links personalizados | — |

**Credenciais**: todas ficam em variáveis de ambiente na Vercel/Inngest — **nunca no código, nunca no navegador e nunca coladas no chat**. Tokens de redes sociais ficam criptografados no banco.

Principais bibliotecas: `next`, `react`, `typescript`, `tailwindcss`, `@supabase/supabase-js`, `@supabase/ssr`, `zod`, `inngest`, `@resvg/resvg-js`, `opentype.js` ou `fontkit`, `pdf-lib`, `archiver`, `@anthropic-ai/sdk`, `mercadopago` (SDK oficial), `resend`, `react-email`, `@upstash/ratelimit`, `@sentry/nextjs`, `vitest`, `@playwright/test`, `pixelmatch`.

---

## 8. Custos

### 8.1 Custos recorrentes estimados (fase inicial, até ~300 pedidos/mês) 💲

| Item | Estimativa mensal | Observação |
|---|---|---|
| Vercel Pro | US$ 20 | Obrigatório para uso comercial |
| Supabase Pro | US$ 25 | Plano gratuito **pausa** projetos inativos e tem limites — serve só para desenvolvimento. Inclui backups diários |
| Inngest | US$ 0 → ~US$ 50+ | Plano gratuito cobre o início; pago quando o volume crescer |
| Resend | US$ 0 → US$ 20 | Grátis até ~3.000 e-mails/mês (100/dia) |
| Sentry / Upstash | US$ 0 | Planos gratuitos no início |
| Claude API (Opus 5.5: US$ 4 por milhão de tokens de entrada / US$ 20 de saída) | US$ 15–60 | Ex.: um cadastro auxiliado ≈ US$ 0,05–0,10; um pack de 30 legendas com revisão ≈ US$ 0,10–0,25. Busca na web: US$ 10 por 1.000 buscas. Com Sonnet 5.5 (US$ 2/US$ 10) o custo cai ~50% |
| Geração de imagens | US$ 10–60 | ~US$ 0,01–0,20 por imagem conforme provedor e qualidade; depende de quantas coleções forem criadas |
| WhatsApp Cloud API | ~US$ 0,01 por mensagem de serviço (utilidade) fora da janela de 24 h; marketing é bem mais caro (~US$ 0,06) | Ex.: 300 pedidos × 2 mensagens ≈ US$ 5. Mensagens dentro da janela de atendimento aberta pelo cliente não são cobradas |
| Domínio | ≈ R$ 40/ano | |
| Canva Pro | (provavelmente já possui) | Enterprise tem custo bem maior — só se justificar |
| **Total fixo aproximado** | **US$ 70–150/mês (≈ R$ 400–850)** | Cresce com volume de IA e mensagens |

**Por venda (Mercado Pago)** 💲: Pix em torno de **0,99%**; cartão de crédito em torno de **3,99% a 4,99%** conforme o prazo de recebimento escolhido, mais custo de parcelamento se oferecido. Conferir as taxas atuais no painel da conta.

### 8.2 Custo de implementação
Estimativa de esforço técnico: **770 a 1.070 horas** (tabela da seção 9).
- Como referência de mercado, contratar desenvolvimento no Brasil a R$ 90–180/h resultaria em **≈ R$ 70 mil a R$ 190 mil**.
- Desenvolvendo com o Claude Code, o custo direto é a assinatura/uso do Claude, mas o projeto ainda exige **tempo seu** para: criar contas, aprovar decisões de design, cadastrar conteúdo real, testar compras e acompanhar aprovações das plataformas. Estimo **4–8 h/semana** do seu tempo.

---

## 9. Cronograma por fases

| Fase | Entregas | Semanas | Esforço (h) | Critério para avançar (testado de verdade) |
|---|---|---|---|---|
| **0 — Fundação** | Repositório, CI, Supabase, Vercel, autenticação com papéis, design system e identidade visual, **pedidos de aprovação Meta/Pinterest/TikTok iniciados** | 1–2 | 50–70 | Deploy funcionando; login admin com 2FA; RLS testado |
| **1 — Estrutura e identidade** | Layout, home, catálogo, categorias, produto, busca, filtros, páginas institucionais, responsividade mobile-first, SEO | 3 | 90–120 | Produtos reais do banco aparecem; Lighthouse mobile ≥ 90; testes em celular, tablet e desktop |
| **2 — Painel administrativo** | Cadastro/edição completo, upload e ordenação de mídia, arquivos privados, categorias, descontos, clientes, mensagens editáveis | 3 | 100–140 | Critérios 1 e 3 (cadastro manual, upload) |
| **3 — Personalização** | Motor SVG, editor de templates no painel, personalizador do cliente, rascunho, exportação PNG/JPG/PDF/ZIP, stickers | 4–5 | 140–200 | Critérios 4, 5, 6, 12; teste de correspondência de pixels passando |
| **4 — E-commerce** | Carrinho, checkout, Pix, cartão, webhooks, idempotência, histórico, reembolsos | 2–3 | 80–110 | Critérios 7, 8, 14; testes de pagamento recusado e webhook duplicado |
| **5 — Entrega automática** | Fluxo de entrega, outbox, e-mail, WhatsApp, Canva, área de downloads, falhas e reenvio | 2–3 | 70–100 | Critérios 9, 10, 11, 13, 15; teste com provedor de e-mail fora do ar |
| **6 — Inteligência artificial** | Cadastro auxiliado, gerador de frases/conteúdo, coleções de stickers, packs, imagens, Central de Criação, aprovação | 3–4 | 100–140 | Critérios 2 e 16 |
| **7 — Marketing orgânico** | Contas conectadas, calendário, aprovação, agendamento, publicação, links rastreáveis, métricas | 3–4 | 90–120 | Critério 17 — com aprovações das plataformas concluídas |
| **8 — Relatórios e otimização** | Dashboard, relatórios, selos Real/Estimado/Indisponível, desempenho, backups testados | 2 | 50–70 | Números conferidos contra o banco e o painel do MP |
| **Total** | | **~23–29** | **~770–1070** | |

⚠️ A Fase 7 depende das aprovações externas; por isso elas começam na Fase 0.

---

## 10. Plano de testes

1. **Unitários** (Vitest): motor de renderização (determinismo, quebra de linha, limites de personalização), cálculo de preços e descontos, validação de assinatura do webhook, transições de status de pedido.
2. **Integração** (Supabase local): políticas RLS (cliente A não vê pedido do cliente B; não-admin não acessa painel), idempotência (mesmo webhook 5×, mesma mensagem 2× → uma entrega e um envio), links de download expirados.
3. **Comparação visual**: prévia no navegador × arquivo final, por template, com tolerância definida.
4. **Ponta a ponta** (Playwright, celular e desktop): navegar → personalizar → carrinho → pagar (cartões de teste MP) → receber e-mail → baixar na área do cliente.
5. **Testes de falha**: pagamento recusado, Pix expirado, webhook perdido (rotina de conferência recupera), e-mail/WhatsApp/armazenamento/IA indisponíveis (nova tentativa + alerta + reenvio manual), clique duplo no “pagar”.
6. **Verificação de arquivos**: PNG com canal alfa real, resolução, ZIP íntegro, PDF abre corretamente.
7. **Segurança**: chaves fora do bundle do navegador (verificação automática no CI), limites de requisição, cabeçalhos de segurança, tentativa de acesso direto a arquivos privados.
8. **Produção controlada**: compra real por Pix de valor simbólico, entrega real por e-mail e WhatsApp, estorno.

Cada item dos 17 critérios de aceitação terá status registrado: **não testado / testado em ambiente de teste / testado em produção**, com data e evidência. Integração só é marcada como funcional quando conectada e testada.

---

## 11. Segurança e LGPD

- Painel em rota protegida, papel `admin` verificado no servidor e no banco, **2FA obrigatório** para a proprietária, registro de auditoria.
- Chave de serviço do Supabase, chaves do MP, Claude, Meta etc. **apenas no servidor**.
- Nenhum dado de cartão armazenado (tokenização pelo Mercado Pago).
- Arquivos em buckets privados; download por link assinado de curta duração gerado após checar login e posse.
- LGPD: base legal por finalidade (execução do contrato para mensagens de pedido; **consentimento separado** para marketing por e-mail e por WhatsApp), descadastro em um clique, página “Meus dados” (exportar/excluir), política de retenção, banner de cookies para métricas, contato do encarregado. Os provedores armazenam dados fora do Brasil em parte (transferência internacional) — isso precisa constar na política.
- Backups: diários (Supabase Pro) + exportação semanal para outro local; **teste de restauração** documentado.
- Conteúdo: somente materiais próprios, licenciados ou gerados com serviços cujos termos permitem uso comercial; registro de qual ferramenta gerou cada arte.

---

## 12. Melhorias técnicas sugeridas (sem remover nada do pedido)

1. **Vender antes, em paralelo**: após as Fases 1, 2, 4 e 5, a loja já pode vender **produtos prontos** com entrega automática, enquanto o personalizador (Fase 3) é concluído. Isso não remove nada — só antecipa receita. Sugiro a ordem 0 → 1 → 2 → 4 → 5 → 3 → 6 → 7 → 8. **Preciso da sua aprovação para mudar a ordem**; sem ela, sigo a ordem original.
2. **Instantâneo do produto no pedido**: mudanças de preço ou arquivo depois não alteram o que o cliente comprou.
3. **Versão de template congelada** por pedido: reenviar daqui a 1 ano gera exatamente o mesmo arquivo.
4. **Caixa de saída de mensagens** separando transacional × promocional, com consentimento verificado antes de cada envio promocional.
5. **Painel de saúde das integrações**: mostra token expirado, webhook sem chegar, cota de API, falhas recentes.
6. **Limite de gasto de IA** configurável no painel (mensal), com custo estimado mostrado antes de rodar uma criação grande (ex.: “50 elementos ≈ US$ 4”).
7. **Nota fiscal**: deixar a estrutura pronta para integrar um emissor de NFS-e (ex.: eNotas, NFE.io) — a obrigação fiscal depende do enquadramento da empresa (verificar com contador).
8. **Direito de arrependimento (CDC art. 49)**: definir nos termos a política para produto digital já baixado, com orientação jurídica; o sistema registra se/quando o arquivo foi acessado.
9. **Assinatura mensal do Sticker Club**: modelar desde já produto do tipo “assinatura” para não refazer depois (Mercado Pago tem pagamentos recorrentes).

---

## 13. Decisões que preciso de você antes de programar

1. **Nome da marca e domínio** (já existe? ou desenvolvemos a identidade na Fase 0?).
2. **CNPJ/MEI ou CPF?** Afeta Mercado Pago, verificação da Meta (WhatsApp/Instagram) e nota fiscal.
3. **Repositório GitHub** onde o código ficará (este ambiente é temporário; sem repositório, o trabalho se perde).
4. **Plano do Canva** que você usa, e onde você cria as artes-base (Canva, Figma, Illustrator).
5. **Modelo de IA**: manter Claude Opus 5.5 em tudo (mais qualidade) ou usar modelos mais baratos em tarefas simples.
6. **Ordem das fases**: original ou a sugerida no item 12.1.
7. Aceite do **orçamento mensal** estimado (seção 8.1).
