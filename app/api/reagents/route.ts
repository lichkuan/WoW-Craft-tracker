import { NextRequest, NextResponse } from "next/server";

function normFR(url: string) {
  const m = url.match(/https:\/\/www\.wowhead\.com\/(?:mop-classic\/..\/)?(item|spell)=(\d+)/);
  if (!m) return url;
  return `https://www.wowhead.com/mop-classic/fr/${m[1]}=${m[2]}`;
}

async function resolveToSpell(url: string): Promise<string> {
  const base = normFR(url);
  if (/\/spell=\d+/.test(base)) return base;
  if (/\/item=\d+/.test(base)) {
    const teach = base + "#teaches-recipe";
    try {
      const r = await fetch(teach, { redirect: "follow", cache: "no-store" });
      if (/\/spell=\d+/.test(r.url)) return r.url;
      const html = await r.text();
      const m = html.match(/\/spell=(\d+)/);
      if (m) return `https://www.wowhead.com/mop-classic/fr/spell=${m[1]}`;
    } catch {}
  }
  return base;
}

/**
 * Ne récupère QUE les composants de 1er niveau :
 * - On localise "Composants"
 * - On prend le PREMIER <ul> qui suit
 * - On parcourt uniquement ses <li> directs
 * - On ignore tout <ul> imbriqué (sous-composants)
 */
function collectReagentsFromHtml(html: string) {
  type Reag = { id: number; name: string; url: string; qty: number };
  const out: Reag[] = [];

  // 1) Localise la section "Composants"
  const compIdx = html.search(/Composants/i);
  if (compIdx === -1) return out;

  const after = html.slice(compIdx);

  // 2) Récupère UNIQUEMENT le PREMIER <ul> après "Composants"
  const ulOpenMatch = after.match(/<ul[^>]*>/i);
  if (!ulOpenMatch) return out;

  const ulOpenIdx = after.indexOf(ulOpenMatch[0]) + ulOpenMatch[0].length;
  const rest = after.slice(ulOpenIdx);

  // On coupe au premier </ul> (ce UL peut contenir des UL imbriqués,
  // mais ils seront fermés avant ce </ul> principal)
  const ulCloseIdx = rest.search(/<\/ul>/i);
  const ulHtml = ulCloseIdx !== -1 ? rest.slice(0, ulCloseIdx) : rest;

  // 3) Ne lit que les <li> de CE UL (niveau 1)
  const liRE = /<li[^>]*>([\s\S]*?)<\/li>/gi;
  let liMatch: RegExpExecArray | null;

  while ((liMatch = liRE.exec(ulHtml)) !== null) {
    const li = liMatch[1] ?? "";
    if (!li) continue;

    // Lien de l’item au 1er niveau
    const aMatch = li.match(
      /href="[^"]*\/(?:mop-classic\/..\/)?(item|spell)=(\d+)[^"]*".*?>([^<]+)<\/a>/i
    );
    if (!aMatch) continue;

    const type = aMatch[1];
    const id = Number(aMatch[2]);
    const name = (aMatch[3] ?? "").trim();
    const url = `https://www.wowhead.com/mop-classic/fr/${type}=${id}`;

    // On supprime tout UL imbriqué du LI pour éviter de lire les quantités des sous-niveaux
    const liTopOnly = li.replace(/<ul[\s\S]*?<\/ul>/gi, "");

    // Quantité : cherche "(3)" sinon "x 3" dans le LI de niveau 1
    let qty = 1;
    const mParen = liTopOnly.match(/\((\d{1,3})\)/);
    const mX = liTopOnly.match(/x\s*(\d{1,3})/i);
    if (mParen && mParen[1]) qty = Number(mParen[1]);
    else if (mX && mX[1]) qty = Number(mX[1]);

    out.push({ id, name, url, qty });
  }

  // 4) Dédupe par id (au cas où)
  const map = new Map<number, Reag>();
  for (const it of out) {
    if (!map.has(it.id)) map.set(it.id, it);
  }
  return Array.from(map.values());
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url") || "";
  if (!url) return NextResponse.json([], { status: 200 });

  try {
    const spellUrl = await resolveToSpell(url);
    const res = await fetch(spellUrl, { cache: "no-store" });
    const html = await res.text();
    const reagents = collectReagentsFromHtml(html);

    return NextResponse.json(
      reagents.map((p) => ({ id: p.id, name: p.name, url: p.url, quantity: p.qty })),
      { status: 200 }
    );
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}
