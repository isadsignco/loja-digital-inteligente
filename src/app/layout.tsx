import type { Metadata } from "next";
import { Bricolage_Grotesque, Figtree } from "next/font/google";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { store } from "@/config/store";
import "./globals.css";

// Títulos em Bricolage Grotesque e textos em Figtree (identidade isakit.co).
const bricolage = Bricolage_Grotesque({ variable: "--font-bricolage", subsets: ["latin"], display: "swap" });
const figtree = Figtree({ variable: "--font-figtree", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: { default: store.name, template: `%s · ${store.name}` },
  description: store.description,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${bricolage.variable} ${figtree.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
