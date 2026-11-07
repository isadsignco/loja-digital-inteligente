import Link from "next/link";
import { store } from "@/config/store";

const links = [
  { href: "/sobre", label: "Sobre a loja" },
  { href: "/faq", label: "Perguntas frequentes" },
  { href: "/contato", label: "Contato" },
  { href: "/privacidade", label: "Política de privacidade" },
  { href: "/termos", label: "Termos de uso" },
] as const;

export function SiteFooter() {
  return (
    <footer className="mt-24 bg-creme-2 text-xs text-bege">
      <div className="mx-auto max-w-[1024px] px-5 py-8">
        <p className="border-b border-linha pb-4">{store.tagline}. Pagamentos processados pelo Mercado Pago.</p>
        <div className="flex flex-col gap-3 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p>
            Copyright © {new Date().getFullYear()} {store.name}. Todos os direitos reservados.
          </p>
          <ul className="flex flex-wrap gap-x-4 gap-y-2">
            {links.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="hover:text-grafite hover:underline">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
