# Revisão 1 — Custo mínimo, entrega pelo Canva e Pinterest como canal principal

> 07/11/2026. Este documento **substitui** as partes do `01-analise-arquitetura-plano.md` que entrarem em conflito (custos, hospedagem, personalização e entrega). O resto do pedido original continua valendo.

## 1. O que a proprietária definiu

1. **Gastar o mínimo possível.** Nada de planos pagos enquanto não houver vendas que justifiquem.
2. **Entrega pelo Canva.** Packs de posts e stories são entregues pelo **link de template do Canva** que a proprietária cadastra em cada produto.
3. **Personalização de cor feita por um agente de IA dentro do site.** O agente copia o design original no Canva, troca as cores pelas do cliente e entrega o link da cópia.
4. **Venda por tráfego orgânico**, com o **Pinterest como canal principal**. A IA cria os criativos de divulgação (sem anúncio pago), publica, ajuda a cadastrar produtos e confirma a entrega por e-mail e WhatsApp.

## 2. Infraestrutura de custo mínimo

| Item | Antes | Agora | Custo | O que se perde no plano gratuito |
|---|---|---|---|---|
| Hospedagem | Vercel Pro (US$ 20) | **Netlify ou Cloudflare, plano gratuito** (permitem uso comercial; confirmo os termos na Fase 0) | R$ 0 | Limites de banda e de minutos de build, suficientes no início |
| Banco + login | Supabase Pro (US$ 25) | **Supabase gratuito** | R$ 0 | ⚠️ Pausa o projeto se ficar 7 dias sem uso e não faz backup. **Solução:** uma tarefa diária mantém o projeto ativo e um backup semanal automático é salvo fora do Supabase |
| Arquivos | Storage pago | Os packs ficam **no Canva**. O site guarda só imagens de vitrine (1 GB grátis) | R$ 0 | — |
| Tarefas em segundo plano | Inngest | **Inngest gratuito** | R$ 0 | Cota mensal de execuções, sobra no início |
| E-mail | Resend | **Resend gratuito** (3.000 e-mails/mês, 100 por dia) | R$ 0 | Limite diário |
| WhatsApp | Mensagens pagas | **Estratégia sem custo** (seção 4) | R$ 0 na maioria dos casos | — |
| Imagens de IA | US$ 10–60 | **Desligado.** Os criativos de divulgação saem dos mockups que você já tem no Canva | R$ 0 | — |
| Pinterest, Instagram, TikTok (APIs) | — | Gratuitas | R$ 0 | Dependem de aprovação dos apps |
| Domínio .com.br | — | **Necessário** para o e-mail não cair no spam e para a verificação da Meta | ≈ R$ 40 por ano | — |
| Mercado Pago | — | Só a taxa por venda | ≈ 0,99% no Pix, ≈ 4–5% no cartão | — |
| **Claude API (o agente)** | — | **Único custo variável real.** Pagamento por uso, com teto de gasto mensal no painel | Estimativa abaixo | — |

**Custo do agente (estimado com Claude Opus 5.5):**

| Uso | Custo estimado |
|---|---|
| Analisar um template na hora do cadastro (feito uma vez por produto) | US$ 0,10–0,30 |
| Personalizar um pedido | ≈ US$ 0 em tokens, porque é o script automático da seção 3 que faz a troca de cores |
| Criar o texto de um Pin (título, descrição, palavras-chave) | US$ 0,01–0,03 |
| Cadastro de produto auxiliado | US$ 0,05–0,10 |
| **Total por mês no início** | **US$ 3–15 (≈ R$ 20–90)** |

O total cresce com o volume. Se quiser gastar ainda menos, o agente pode usar o Claude Sonnet 5.5 ou o Haiku 5.5 nas tarefas simples. Essa decisão é sua.

**Total fixo: ≈ R$ 40 por ano (domínio).** Além disso há a taxa por venda e o uso do agente. Quando as vendas crescerem, o primeiro upgrade recomendado é o Supabase Pro (US$ 25/mês), que traz backups gerenciados e acaba com o risco de pausa.

## 3. Personalização de cor pelo Canva: como funciona

**Confirmado:** a integração do Canva oferece duas operações que cobrem a ideia.
- **Copiar um design** (`copy-design`): cria uma cópia nova e o original não é alterado.
- **Editar a cópia** (`edit-design`): recolorir elementos (`recolor_element`), mudar a cor dos textos (`format_text`), a cor de fundo e trocar textos.

### No cadastro do produto (uma vez)
1. Você cola no cadastro:
   - o **link de template**, que é o que o cliente recebe no produto sem personalização;
   - o **link do design mestre**, que é o original que o agente copia.
2. O agente lê o design mestre e monta um **mapa de cores**. Exemplo: "rosa #E8A0BF aparece em 14 elementos, nas páginas 1 a 10".
3. Você revisa o mapa e define quais cores o cliente pode trocar (principal, secundária, destaque, fundo) e quais ficam fixas.

### Na compra
1. **Antes de comprar:** o cliente escolhe as cores, digitando o código ou usando sugestões de paletas. Vê na hora uma **prévia aproximada** sobre o mockup.
2. **Depois do pagamento confirmado:** um **script automático, sem gastar IA**, faz o trabalho:
   - copia o design mestre;
   - aplica o mapa de cores;
   - exporta miniaturas da cópia.
3. O cliente vê as **miniaturas reais da cópia** e aprova, ou pede um ajuste (1 ajuste incluso).
4. O sistema entrega o link por e-mail e WhatsApp e registra no pedido qual cópia pertence a qual cliente.

### Limites ⚠️
1. **Prévia antes da compra é aproximada.** A cópia real no Canva só é criada depois do pagamento, para não gastar nem encher sua conta com cópias de quem não comprou. Por isso há a etapa de aprovação com as miniaturas reais antes de liberar o link.
2. **Só dá para recolorir** formas, gráficos vetoriais, textos e fundos. **Fotos e ilustrações em PNG/JPG não mudam de cor.** Os templates personalizáveis precisam ser montados com elementos recoloríveis. Vou preparar um guia curto de como montar esses templates.
3. **As cópias ficam na sua conta do Canva.** Vamos organizar tudo em uma pasta "Pedidos" por mês.
4. **⚠️ A dúvida que precisa de teste: compartilhar a cópia automaticamente.**
   - Não encontrei na integração uma função para ligar "qualquer pessoa com o link" ou criar um "link de template" para a cópia.
   - Perguntei à central de ajuda do Canva, que também não soube dizer se a cópia herda o compartilhamento do original.
   - **Teste necessário (5 minutos, antes de programar):** você me manda um design com "Template link" ou "Qualquer pessoa com o link" ativado. Eu crio uma cópia e troco uma cor por aqui. Você abre o link da cópia numa janela anônima.
   - **Se funcionar:** o fluxo é 100% automático.
   - **Se não funcionar:** o sistema faz todo o resto, e você recebe uma notificação no celular com um botão que abre a cópia. Você toca em Compartilhar → Copiar link e cola, cerca de 10 segundos. Enquanto isso, o cliente já recebe na hora os PNGs/PDF exportados nas cores dele.
5. A conexão com a sua conta do Canva precisa ser autorizada uma vez, e a autorização é renovada automaticamente. Vou confirmar na Fase 0 as cotas e os termos de uso da API do Canva para uso automatizado.

## 4. WhatsApp e e-mail sem custo

- **E-mail (sempre):** pedido recebido, pagamento aprovado, link do produto, instruções de edição, suporte. Gratuito até 3.000 por mês.
- **WhatsApp:** a Meta não cobra respostas dentro de uma conversa iniciada pelo cliente, que fica aberta por 24 h.
  1. Na página de pedido aprovado aparece o botão **"Receber meu link no WhatsApp"**.
  2. O botão abre o WhatsApp com uma mensagem pronta para a loja.
  3. Quando o cliente envia, o sistema responde automaticamente com o link e as instruções.
- Mensagens iniciadas pela loja (por exemplo, um lembrete dias depois) custam cerca de US$ 0,01 cada e exigem modelo aprovado pela Meta. Ficam **desligadas por padrão**, e você liga no painel se quiser.
- ⚠️ A conta da WhatsApp Business Platform continua exigindo a verificação da empresa na Meta e um número registrado.

## 5. Pinterest como canal principal

| O que o sistema faz | Como |
|---|---|
| Gera Pins de cada produto | Usa os mockups e páginas do pack exportados do Canva, em vários formatos (2:3, vídeo curto quando houver) |
| Escreve título, descrição e palavras-chave | Agente Claude, otimizado para a busca do Pinterest em português |
| Cria pastas por tema e segmento | Ex.: "Posts para docerias", "Stories para estética" |
| Publica e agenda | API oficial do Pinterest, com uma fila que distribui os Pins ao longo dos dias |
| Link rastreável em cada Pin | `/r/codigo`, para saber qual Pin gerou cada venda |
| Mede resultados | Impressões, cliques e salvamentos (API do Pinterest) + vendas (nosso banco) |
| Aprovação | Você aprova os Pins em lote no painel ou ativa o **piloto automático** por coleção |

⚠️ **Acesso:** o app do Pinterest precisa ter o **acesso padrão** aprovado para publicar normalmente. Peço isso na primeira semana.

**Anúncios:** "criar anúncios sozinho" aqui significa **criativos de divulgação orgânica** (Pins, posts, roteiros). Nada de mídia paga, conforme o pedido original. Instagram e TikTok continuam no plano (Fase 7) com as limitações já descritas no documento 01.

## 6. Nova ordem das fases (foco em começar a vender rápido e barato)

| Fase | Entrega | Semanas |
|---|---|---|
| 0 | Teste do Canva (seção 3.4), contas gratuitas, repositório, pedidos de aprovação ao Pinterest e à Meta | 1 |
| 1 | Loja: home, catálogo, produto, busca, mobile-first | 2–3 |
| 2 | Painel: cadastro de produto com link de template e design mestre, cadastro auxiliado por IA | 2 |
| 3 | Checkout Mercado Pago (Pix e cartão) + webhooks + entrega automática do link por e-mail e WhatsApp → **a loja já vende produtos sem personalização** | 2–3 |
| 4 | Personalização de cor pelo Canva (mapa de cores, cópia, aprovação, entrega) | 2–3 |
| 5 | Pinterest: geração de Pins, publicação, agendamento, links rastreáveis, métricas | 2–3 |
| 6 | Central de Criação, frases, stickers, packs com IA | 3–4 |
| 7 | Instagram e TikTok | 2–3 |
| 8 | Relatórios completos e otimização | 2 |

## 7. Pendências da proprietária

1. **Um design do Canva para o teste da seção 3.4**, com o link de compartilhamento ativado.
2. **Repositório no GitHub.** É obrigatório, porque este ambiente é temporário. Se não tiver, crio as instruções.
3. **Nome da marca e domínio.**
4. **CNPJ/MEI ou CPF**, por causa do Mercado Pago, da Meta e da nota fiscal.
