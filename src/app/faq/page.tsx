import type { Metadata } from "next";
import { ProsePage } from "@/components/prose-page";

export const metadata: Metadata = { title: "Perguntas frequentes" };

const faqs = [
  ["Como recebo o produto?", "Assim que o pagamento é confirmado, você recebe o link de acesso por e-mail. Se quiser, também pode receber pelo WhatsApp. O produto fica disponível na sua área do cliente."],
  ["Preciso pagar o Canva?", "Os templates são editáveis no Canva gratuito. Se algum produto usar recursos do Canva Pro, isso estará indicado na página do produto."],
  ["Quanto tempo leva para chegar?", "Produtos prontos chegam em poucos minutos após a confirmação do pagamento. Pix costuma confirmar em segundos."],
  ["Como funciona a personalização de cores?", "Nos produtos marcados como personalizáveis, você escolhe as cores da sua marca antes de comprar. Depois do pagamento, preparamos a sua versão, você aprova as prévias e recebe o link com as suas cores."],
  ["Quais formas de pagamento?", "Pix e cartão de crédito, processados pelo Mercado Pago. Não armazenamos dados do seu cartão."],
  ["Perdi meu link, e agora?", "Acesse a sua área do cliente com o e-mail usado na compra. Todos os seus produtos ficam lá."],
] as const;

export default function FaqPage() {
  return (
    <ProsePage title="Perguntas frequentes">
      {faqs.map(([q, a]) => (
        <details key={q} className="group rounded-2xl border border-line bg-paper p-5">
          <summary className="cursor-pointer list-none font-medium text-ink">{q}</summary>
          <p className="mt-3">{a}</p>
        </details>
      ))}
    </ProsePage>
  );
}
