import { describe, expect, it } from "vitest";
import { classificarArte, descreverContagem, escolherVitrine, nomeDoArquivo, resumirPack, tipoDeProduto } from "./packs-zip";

const ZIP = [
  "estaticos/estatico-01.png",
  "estaticos/estatico-02.png",
  "carrosseis/carrossel-01-slide-01.png",
  "carrosseis/carrossel-01-slide-02.png",
  "carrosseis/carrossel-02-slide-01.png",
  "stories/story-01.png",
  "capas-reels/capa-reels-01.png",
  "legendas.txt",
  "__MACOSX/estaticos/._estatico-01.png",
  "outra-pasta/foto.png",
];

describe("ZIP do Packs isadsign", () => {
  it("reconhece só os PNGs das pastas do Packs", () => {
    expect(classificarArte("legendas.txt")).toBeNull();
    expect(classificarArte("outra-pasta/foto.png")).toBeNull();
    expect(classificarArte("__MACOSX/estaticos/._estatico-01.png")).toBeNull();
    expect(classificarArte("carrosseis/carrossel-02-slide-03.png")).toEqual({ path: "carrosseis/carrossel-02-slide-03.png", tipo: "carrossel", ordem: 2, slide: 3 });
  });

  it("conta peças (um carrossel conta uma vez) e arquivos", () => {
    const r = resumirPack(ZIP);
    expect(r.contagem).toEqual({ estatico: 2, carrossel: 2, story: 1, reels: 1 });
    expect(r.totalArquivos).toBe(7);
    expect(descreverContagem(r.contagem)).toBe("2 posts estáticos, 2 carrosséis, 1 Story e 1 capa de Reels");
  });

  it("escolhe a vitrine com um de cada tipo primeiro, sem slides internos", () => {
    const v = escolherVitrine(resumirPack(ZIP), 5).map((a) => a.path);
    expect(v.slice(0, 4)).toEqual(["estaticos/estatico-01.png", "carrosseis/carrossel-01-slide-01.png", "stories/story-01.png", "capas-reels/capa-reels-01.png"]);
    expect(v).not.toContain("carrosseis/carrossel-01-slide-02.png");
    expect(v).toHaveLength(5);
  });

  it("define o tipo de produto e o nome", () => {
    expect(tipoDeProduto({ estatico: 0, carrossel: 0, story: 4, reels: 2 })).toBe("pack_stories");
    expect(tipoDeProduto({ estatico: 1, carrossel: 0, story: 4, reels: 0 })).toBe("pack_posts");
    expect(nomeDoArquivo("pack-confeitaria-novembro.zip")).toBe("Pack confeitaria novembro");
  });
});
