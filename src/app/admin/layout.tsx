import type { Metadata } from "next";
import Link from "next/link";
import { sair } from "@/app/entrar/actions";

export const metadata: Metadata = { title: "Painel", robots: { index: false } };

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="mx-auto max-w-[1024px] px-5 py-8">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3 border-b border-linha pb-4">
        <nav aria-label="Painel" className="flex gap-1 text-[15px]">
          <Link href="/admin" className="rounded-full px-3 py-1.5 hover:bg-creme-2">
            Visão geral
          </Link>
          <Link href="/admin/produtos" className="rounded-full px-3 py-1.5 hover:bg-creme-2">
            Produtos
          </Link>
        </nav>
        <form action={sair}>
          <button className="text-sm text-bege hover:text-grafite">Sair</button>
        </form>
      </div>
      {children}
    </div>
  );
}
