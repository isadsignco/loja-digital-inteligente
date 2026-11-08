import type { Metadata } from "next";
import Link from "next/link";
import { sair } from "@/app/entrar/actions";
import { brandParts } from "@/config/store";

export const metadata: Metadata = { title: "Painel", robots: { index: false } };

const MENU = [
  ["/admin", "Início"],
  ["/admin/produtos", "Produtos"],
  ["/admin/criacao", "Central de Criação"],
  ["/admin/stickers", "Sticker Club"],
  ["/admin/pedidos", "Pedidos"],
  ["/admin/personalizacoes", "Personalizações"],
  ["/admin/clientes", "Clientes"],
  ["/admin/marketing", "Marketing Inteligente"],
  ["/admin/automacoes", "Automações"],
  ["/admin/mensagens", "Mensagens"],
  ["/admin/relatorios", "Relatórios"],
  ["/admin/configuracoes", "Integrações"],
] as const;

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  const [base, fim] = brandParts();
  return (
    <div className="flex flex-wrap">
      <aside className="flex max-w-full flex-[1_1_250px] flex-col gap-5 bg-grafite px-3.5 py-6 text-white md:max-w-[280px]">
        <p className="titulo flex items-center gap-2 px-2 text-[24px]">
          <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-rosa" />
          {base}
          {fim}
          <span className="olho ml-auto text-[#8a8d95]">painel</span>
        </p>
        <nav aria-label="Painel" className="flex flex-col gap-0.5">
          {MENU.map(([href, label]) => (
            <Link key={href} href={href} className="flex min-h-11 items-center gap-2.5 rounded-xl px-3 text-[15px] font-semibold text-[#e8e1d1] hover:bg-white/10 hover:text-white">
              <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full bg-[#6b6352]" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto flex flex-col gap-2">
          <Link href="/" className="flex min-h-11 items-center justify-center rounded-full border-[1.5px] border-[#6b6352] text-[14px] font-bold text-creme-marca hover:border-creme-marca">
            Ver a loja como cliente
          </Link>
          <form action={sair}>
            <button className="w-full rounded-full py-2 text-sm text-[#d8cfba] hover:text-white">Sair</button>
          </form>
        </div>
      </aside>
      <div className="min-w-0 flex-[999_1_640px] px-[clamp(16px,3vw,40px)] pb-14 pt-7">{children}</div>
    </div>
  );
}
