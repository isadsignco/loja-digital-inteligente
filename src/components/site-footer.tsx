import Link from "next/link";
import { brandParts, store } from "@/config/store";

const loja = [
  { href: "/catalogo", label: "Catálogo" },
  { href: "/catalogo?q=sticker", label: "Sticker Club" },
  { href: "/conta", label: "Área do cliente" },
  { href: "/faq", label: "Perguntas frequentes" },
] as const;

const institucional = [
  { href: "/sobre", label: "Sobre a loja" },
  { href: "/contato", label: "Contato" },
  { href: "/privacidade", label: "Política de privacidade" },
  { href: "/termos", label: "Termos de uso" },
] as const;

export function SiteFooter() {
  const [base, fim] = brandParts();
  return (
    <footer className="mt-24 bg-grafite text-white">
      <div className="mx-auto flex max-w-[1200px] flex-wrap justify-between gap-x-14 gap-y-8 px-5 pb-8 pt-12">
        <div className="flex max-w-sm flex-col gap-3">
          <p className="titulo flex items-center gap-2 text-[34px]">
            <span aria-hidden="true" className="h-3 w-3 rounded-full bg-rosa" />
            {base}
            {fim}
          </p>
          <p className="text-[15px] text-[#e8e1d1]">{store.description}</p>
        </div>
        <FooterList title="Loja" items={loja} />
        <FooterList title="Institucional" items={institucional} />
        <div className="flex flex-col gap-2 text-[14px] text-[#e8e1d1]">
          <p className="olho text-[#d8cfba]">Pagamento</p>
          <p>Processado pelo Mercado Pago</p>
          <p className="flex gap-2">
            <span className="rounded-lg border border-[#6b6352] px-2.5 py-1 font-bold text-white">Pix</span>
            <span className="rounded-lg border border-[#6b6352] px-2.5 py-1 font-bold text-white">Cartão</span>
          </p>
        </div>
      </div>
      <p className="mx-auto max-w-[1200px] border-t border-white/10 px-5 py-5 text-xs text-[#d8cfba]">
        © {new Date().getFullYear()} {store.name}. Todos os direitos reservados.
      </p>
    </footer>
  );
}

function FooterList({ title, items }: { title: string; items: readonly { href: string; label: string }[] }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="olho mb-1 text-[#d8cfba]">{title}</p>
      {items.map((l) => (
        <Link key={l.href} href={l.href} className="py-1 text-[15px] text-[#e8e1d1] hover:text-white hover:underline">
          {l.label}
        </Link>
      ))}
    </div>
  );
}
