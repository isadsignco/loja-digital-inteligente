import Link from "next/link";
import { brandParts } from "@/config/store";

const nav = [
  { href: "/catalogo", label: "Catálogo", desktopOnly: false },
  { href: "/catalogo?q=sticker", label: "Sticker Club", desktopOnly: true },
  { href: "/catalogo?personalizavel=1", label: "Personalizáveis", desktopOnly: true },
  { href: "/faq", label: "Ajuda", desktopOnly: true },
  { href: "/conta", label: "Minha conta", desktopOnly: false },
] as const;

export function SiteHeader() {
  const [base, fim] = brandParts();
  return (
    <header className="sticky top-0 z-30 border-b border-linha bg-white/90 backdrop-blur-xl">
      <div className="mx-auto flex min-h-16 max-w-[1200px] flex-wrap items-center gap-x-5 gap-y-2 px-5 py-2">
        <Link href="/" className="flex items-center gap-2 whitespace-nowrap" aria-label={`${base}${fim}, página inicial`}>
          <span aria-hidden="true" className="h-[11px] w-[11px] rounded-full bg-rosa" />
          <span className="titulo text-[26px] leading-none">
            {base}
            <span className="text-pink">{fim}</span>
          </span>
        </Link>
        <nav aria-label="Principal" className="ml-auto flex flex-wrap items-center gap-1 text-[15px] font-semibold">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`${item.desktopOnly ? "hidden md:inline-flex" : "inline-flex"} min-h-11 items-center whitespace-nowrap rounded-full px-3 hover:bg-creme-2`}
            >
              {item.label}
            </Link>
          ))}
          <Link href="/carrinho" className="btn btn-pink ml-1 min-h-11 px-5 text-[15px]">
            Carrinho
          </Link>
        </nav>
      </div>
    </header>
  );
}
