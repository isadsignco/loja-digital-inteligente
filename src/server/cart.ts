import "server-only";
import { cookies } from "next/headers";
import type { CartLine } from "./pricing";

const COOKIE = "carrinho";
const MAX_ITEMS = 30;
const HEX = /^#[0-9a-f]{6}$/i;
const UUID = /^[0-9a-f-]{36}$/;

function sanitize(raw: unknown): CartLine[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((l): l is CartLine => !!l && typeof l === "object" && typeof (l as CartLine).productId === "string" && UUID.test((l as CartLine).productId))
    .slice(0, MAX_ITEMS)
    .map((l) => ({
      productId: l.productId,
      cores: l.cores
        ? Object.fromEntries(
            Object.entries(l.cores)
              .filter(([k, v]) => /^[a-z0-9_]{1,30}$/.test(k) && typeof v === "string" && HEX.test(v))
              .slice(0, 8),
          )
        : undefined,
    }));
}

export async function readCart(): Promise<CartLine[]> {
  const v = (await cookies()).get(COOKIE)?.value;
  if (!v) return [];
  try {
    return sanitize(JSON.parse(v));
  } catch {
    return [];
  }
}

export async function writeCart(lines: CartLine[]) {
  (await cookies()).set(COOKIE, JSON.stringify(sanitize(lines)), {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

/** Origem da visita (link rastreável/UTM), gravada quando o visitante chega por /r/... */
export async function readAttribution() {
  const v = (await cookies()).get("origem")?.value;
  if (!v) return { utm: {}, trackingLinkId: null as string | null };
  try {
    const o = JSON.parse(v) as { utm?: Record<string, string>; t?: string };
    return { utm: o.utm ?? {}, trackingLinkId: o.t && UUID.test(o.t) ? o.t : null };
  } catch {
    return { utm: {}, trackingLinkId: null };
  }
}
