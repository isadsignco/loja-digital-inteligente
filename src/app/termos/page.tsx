import type { Metadata } from "next";
import { DraftNotice, ProsePage } from "@/components/prose-page";

export const metadata: Metadata = { title: "Termos de uso" };

export default function TermsPage() {
  return (
    <ProsePage title="Termos de uso">
      <DraftNotice />
      <h2>Licença de uso</h2>
      <p>Ao comprar, você recebe uma licença pessoal e intransferível para usar os materiais no seu próprio negócio e redes sociais. Não é permitido revender, redistribuir ou compartilhar os arquivos e links como se fossem seus produtos.</p>
      <h2>Entrega</h2>
      <p>Produtos digitais são entregues por link após a confirmação do pagamento pelo gateway.</p>
      <h2>Arrependimento e reembolso</h2>
      <p>A política de arrependimento para produtos digitais (art. 49 do Código de Defesa do Consumidor) está em definição e será publicada antes da abertura da loja.</p>
    </ProsePage>
  );
}
