import Link from "next/link";
import { store } from "@/config/store";

const nav = [
  { href: "/catalogo", label: "Catálogo", desktopOnly: false },
  { href: "/catalogo?personalizavel=1", label: "Personalizáveis", desktopOnly: true },
  { href: "/faq", label: "Dúvidas", desktopOnly: false },
] as const;

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-cream/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="whitespace-nowrap font-display text-xl font-semibold tracking-tight">
          {store.name}
        </Link>
        <nav aria-label="Principal" className="flex items-center gap-1 text-sm">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`${item.desktopOnly ? "hidden sm:inline-block" : ""} whitespace-nowrap rounded-full px-3 py-2 text-ink-soft transition hover:bg-paper hover:text-ink`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
