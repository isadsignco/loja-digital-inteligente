import { PageTitle } from "../ui";
import { StickerStudio } from "./sticker-studio";

export default function StickersAdmin() {
  return (
    <>
      <PageTitle sub="Gere coleções de stickers tipográficos para Stories. Use o Gerador de conteúdos (Central de Criação → frases para stickers) para criar as frases. Depois suba o ZIP no Canva ou cadastre como produto.">Sticker Club</PageTitle>
      <div className="mt-6"><StickerStudio /></div>
    </>
  );
}
