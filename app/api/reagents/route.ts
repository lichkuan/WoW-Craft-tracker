import { NextRequest, NextResponse } from "next/server";
import { resolveSpellFromUrlPreferSpell } from "../../../lib/wowhead2";

/**
 * GET /api/reagents?url=<wowhead item or spell url>
 * - Préfère le SPELL: si 'url' est un ITEM, tente de résoudre le SPELL associé.
 * - Parse le HTML et en extrait les principaux réactifs (heuristique).
 */
export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("url") || "";
  if (!raw) return NextResponse.json([], { status: 200 });
  try {
    const resolved = await resolveSpellFromUrlPreferSpell(raw);
    const res = await fetch(resolved, { cache: "no-store" });
    const html = await res.text();

    // Cherche des lignes de réactifs (icône + qty)
    const rows = Array.from(html.matchAll(/<tr[^>]*>\s*<td[^>]*class=\"iconlarge[^\"]*\"[\s\S]*?<\/tr>/g));
    const items: { id: number; name: string; url: string; qty: number }[] = [];

    for (const r of rows) {
      const row = r[0];
      const idm = row.match(/href=\"[^\"]*\/(item|spell)=(\d+)[^\"]*\"/);
      const nm = row.match(/>([^<]+)<\/a>/);
      const qtm = row.match(/<td[^>]*>\s*x?\s*(\d{1,3})\s*<\/td>/);
      if (idm && nm) {
        const type = idm[1];
        const id = Number(idm[2]);
        const name = nm[1].trim();
        const qty = qtm ? Number(qtm[1]) : 1;
        const url = `https://www.wowhead.com/mop-classic/fr/${type}=${id}`;
        items.push({ id, name, url, qty });
      }
    }

    // Heuristique "principaux"
    const blacklist = [/fil/i, /teinture/i, /ficelle/i, /thread/i, /ink/i, /vial/i, /resin/i, /dye/i];
    let primary = items.filter((it) => it.qty >= 2 && !blacklist.some((r) => r.test(it.name)));
    if (primary.length === 0) {
      const pool = items.filter((it) => !blacklist.some((r) => r.test(it.name)));
      primary = pool.sort((a, b) => b.qty - a.qty).slice(0, 2);
    }

    return NextResponse.json(primary.map((p) => ({
      id: p.id, name: p.name, url: p.url, quantity: p.qty
    })));
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}
