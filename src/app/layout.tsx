import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { store } from "@/config/store";
import "./globals.css";

const display = Fraunces({ variable: "--font-display", subsets: ["latin"], axes: ["SOFT", "opsz"] });
const body = Inter({ variable: "--font-body", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: store.name, template: `%s · ${store.name}` },
  description: store.description,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${display.variable} ${body.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
