import Link from "next/link";
import { store } from "@/config/store";

const nav = [
  { href: "/catalogo", label: "Catálogo", desktopOnly: false },
  { href: "/catalogo?personalizavel=1", label: "Nas suas cores", desktopOnly: true },
  { href: "/faq", label: "Dúvidas", desktopOnly: false },
] as const;

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-linha bg-creme/92 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-8 py-3 sm:px-10">
        <Link href="/" className="whitespace-nowrap text-base font-black italic tracking-tight sm:text-xl">
          {store.name}
        </Link>
        <nav aria-label="Principal" className="flex items-center gap-1.5">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`${item.desktopOnly ? "hidden sm:inline-flex" : "inline-flex"} pilula whitespace-nowrap border-[1.5px] border-linha-forte px-3 py-1.5 text-[13px] transition sm:px-3.5 sm:text-sm hover:border-grafite`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
