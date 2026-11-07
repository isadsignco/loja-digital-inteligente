import Link from "next/link";
import { store } from "@/config/store";

const nav = [
  { href: "/catalogo", label: "Catálogo", desktopOnly: false },
  { href: "/catalogo?personalizavel=1", label: "Nas suas cores", desktopOnly: true },
  { href: "/faq", label: "Ajuda", desktopOnly: true },
  { href: "/conta", label: "Conta", desktopOnly: false },
  { href: "/carrinho", label: "Carrinho", desktopOnly: false },
] as const;

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-linha bg-white/80 backdrop-blur-xl backdrop-saturate-150">
      <div className="mx-auto flex h-12 max-w-[1024px] items-center justify-between gap-4 px-5">
        <Link href="/" className="whitespace-nowrap text-[17px] font-semibold tracking-tight">
          {store.name}
        </Link>
        <nav aria-label="Principal" className="flex items-center gap-4 text-[13px] sm:gap-5 text-grafite/80">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`${item.desktopOnly ? "hidden sm:inline" : ""} whitespace-nowrap transition hover:text-grafite`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
