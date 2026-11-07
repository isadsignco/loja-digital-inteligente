import type { Metadata } from "next";
import { ProsePage } from "@/components/prose-page";
import { store } from "@/config/store";

export const metadata: Metadata = { title: "Sobre a loja" };

export default function AboutPage() {
  return (
    <ProsePage title="Sobre a loja">
      <p>
        A <strong>{store.name}</strong> cria materiais digitais para quem vende pelas redes sociais: packs de posts e
        stories, stickers, frases e conteúdos prontos para pequenos negócios, profissionais autônomos e criadores.
      </p>
      <h2>Três linhas de produtos</h2>
      <p>
        <strong>Original</strong>: materiais criados à mão pela nossa direção criativa. <strong>AI Design</strong>:
        produtos desenvolvidos com auxílio de inteligência artificial e revisados antes de publicar.{" "}
        <strong>Personalizados</strong>: adaptados às cores e informações da sua marca.
      </p>
    </ProsePage>
  );
}
