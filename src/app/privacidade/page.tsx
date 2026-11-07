import type { Metadata } from "next";
import { DraftNotice, ProsePage } from "@/components/prose-page";
import { store } from "@/config/store";

export const metadata: Metadata = { title: "Política de privacidade" };

export default function PrivacyPage() {
  return (
    <ProsePage title="Política de privacidade">
      <DraftNotice />
      <p>
        Esta política explica como a {store.name} trata dados pessoais, em conformidade com a Lei Geral de Proteção de
        Dados (Lei 13.709/2018).
      </p>
      <h2>Dados coletados</h2>
      <p>Nome, e-mail, telefone (opcional), histórico de pedidos, escolhas de personalização e dados técnicos de navegação. Dados de cartão são tratados exclusivamente pelo Mercado Pago e não são armazenados pela loja.</p>
      <h2>Finalidades e bases legais</h2>
      <p>Execução do contrato (processar pedidos, entregar produtos e prestar suporte); cumprimento de obrigação legal (registros fiscais); consentimento (comunicações promocionais por e-mail e WhatsApp, que você pode revogar a qualquer momento).</p>
      <h2>Compartilhamento</h2>
      <p>Com prestadores necessários à operação: processamento de pagamentos, hospedagem, banco de dados, envio de e-mail e WhatsApp e a plataforma Canva. Alguns desses serviços armazenam dados fora do Brasil.</p>
      <h2>Seus direitos</h2>
      <p>Você pode solicitar acesso, correção, portabilidade e exclusão dos seus dados e revogar consentimentos pela área do cliente ou pelos canais de contato.</p>
    </ProsePage>
  );
}
