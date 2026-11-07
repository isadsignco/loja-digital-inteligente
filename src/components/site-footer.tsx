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
    <footer className="mt-20 bg-grafite text-creme">
      <div className="mx-auto grid max-w-6xl gap-8 px-7 py-12 sm:grid-cols-2 sm:px-10">
        <div>
          <p className="titulo text-4xl">{store.name}</p>
          <p className="mt-3 max-w-sm text-sm text-creme/70">{store.tagline}</p>
        </div>
        <ul className="grid gap-2 text-sm font-bold sm:justify-end">
          {links.map((l) => (
            <li key={l.href}>
              <Link href={l.href} className="text-creme/80 hover:text-pink">
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </footer>
  );
}
