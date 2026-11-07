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
    <footer className="mt-16 border-t border-line bg-paper">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-2">
        <div>
          <p className="font-display text-lg font-semibold">{store.name}</p>
          <p className="mt-2 max-w-sm text-sm text-ink-soft">{store.tagline}</p>
        </div>
        <ul className="grid gap-2 text-sm sm:justify-end">
          {links.map((l) => (
            <li key={l.href}>
              <Link href={l.href} className="text-ink-soft hover:text-ink">
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </footer>
  );
}
