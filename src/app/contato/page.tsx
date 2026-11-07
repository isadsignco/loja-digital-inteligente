import type { Metadata } from "next";
import { ProsePage } from "@/components/prose-page";
import { store } from "@/config/store";

export const metadata: Metadata = { title: "Contato" };

export default function ContactPage() {
  const wa = store.whatsappNumber.replace(/\D/g, "");
  return (
    <ProsePage title="Contato">
      <p>Dúvidas sobre um pedido? Fale com a gente. Se já comprou, tenha o número do pedido em mãos.</p>
      <div className="flex flex-wrap gap-3">
        {store.contactEmail && (
          <a href={`mailto:${store.contactEmail}`} className="btn btn-pink">
            {store.contactEmail}
          </a>
        )}
        {wa && (
          <a href={`https://wa.me/${wa}`} className="btn btn-contorno">
            WhatsApp
          </a>
        )}
        {!store.contactEmail && !wa && <p>Canais de contato serão publicados na abertura da loja.</p>}
      </div>
    </ProsePage>
  );
}
