import { NextRequest, NextResponse } from "next/server";

/* ============================= Cache mémoire ============================= */
type ApiReagent = { id: number; name: string; url: string; quantity: number };
const MEMO = new Map<string, { at: number; data: ApiReagent[] }>();
const TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 jours

/* ================================= GET ================================== */
export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("url") || "";
  if (!raw) return NextResponse.json([], { status: 200 });

  try {
    // cache mémoire (par instance) — évite les rafales pendant la même vie de lambda
    const k = raw;
    const hit = MEMO.get(k);
    if (hit && Date.now() - hit.at < TTL_MS) {
      return NextResponse.json(hit.data, {
        status: 200,
        headers: {
          // cache CDN/edge (Vercel) + SWR
          "Cache-Control": "public, s-maxage=604800, stale-while-revalidate=86400",
        },
      });
    }

    const spellUrl = await resolveToSpell(raw);

    // ⚠️ on ACTIVE le cache Next.js sur l'appel HTML (7 jours)
    const res = await fetch(spellUrl, {
      redirect: "follow",
      // @ts-ignore – `next.revalidate` est OK dans Next 14 sur route handlers
      next: { revalidate: 60 * 60 * 24 * 7 },
    });
    const html = await res.text();

    // 1) on tente l’onglet “Recettes” (#recipes)
    let reagents = parseRecipesReagentsFromListview(html);
    if (reagents.length) {
      reagents = hydrateNamesFromHtml(html, reagents);
    }
    // 2) secours : section “Composants”
    if (!reagents.length) {
      reagents = fallbackParseFromComposants(html);
    }

    const payload: ApiReagent[] = reagents.map((r) => ({
      id: r.id,
      name: r.name ?? `Item #${r.id}`,
      url: r.url ?? `https://www.wowhead.com/mop-classic/fr/item=${r.id}`,
      quantity: r.qty ?? 1,
    }));

    MEMO.set(k, { at: Date.now(), data: payload });

    return NextResponse.json(payload, {
      status: 200,
      headers: {
        "Cache-Control": "public, s-maxage=604800, stale-while-revalidate=86400",
      },
    });
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}

/* =============================== Helpers ================================ */

/** Force l’URL sur le domaine FR de MoP Classic + garde (item|spell)=id */
function normFR(url: string) {
  const m = url.match(/https:\/\/www\.wowhead\.com\/(?:mop-classic\/..\/)?(item|spell)=(\d+)/);
  if (!m) return url;
  return `https://www.wowhead.com/mop-classic/fr/${m[1]}=${m[2]}`;
}

/** Si on reçoit un item qui “enseigne une recette”, on résout vers la page du spell, sinon on garde l’URL */
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
    } catch { /* ignore */ }
  }
  return base;
}

type Reag = { id: number; qty: number; name?: string; url?: string };

/* ========= STRAT A : lire le JSON Listview de l’onglet “Recettes” (#recipes) ========= */
/**
 * L’onglet Recettes est rendu via `new Listview({ id:'recipes', ... data:[ ... ] })`
 * (ou parfois via `g_listviews['recipes'] = { data:[ ... ] }`).
 * Les lignes contiennent les réactifs sous différentes formes :
 *  - e.reagents: [[itemId, qty], ...]  OU  [{id, qty|count}, ...]
 *  - e.reagent1, e.reagent1count, e.reagent2, e.reagent2count, ...
 */
function parseRecipesReagentsFromListview(html: string): Reag[] {
  const candidates: string[] = [];

  // new Listview({ id:'recipes', ... data: [...] });
  const reRecipes1 = /new\s+Listview\(\{\s*[^}]*?\bid\s*:\s*['"]recipes['"][\s\S]*?\bdata\s*:\s*(\[[\s\S]*?\])\s*\}\);/gi;
  let m: RegExpExecArray | null;
  while ((m = reRecipes1.exec(html))) candidates.push(m[1]);

  // g_listviews['recipes'] = { data:[ ... ] };
  const reRecipes2 = /g_listviews\[['"]recipes['"]]\s*=\s*\{[\s\S]*?"data"\s*:\s*(\[[\s\S]*?\])\s*\};/gi;
  while ((m = reRecipes2.exec(html))) candidates.push(m[1]);

  // Si pas explicitement “recipes”, scanner toutes les listviews
  if (!candidates.length) {
    const reAny = /new\s+Listview\(\{[\s\S]*?\bdata\s*:\s*(\[[\s\S]*?\])\s*\}\);/gi;
    while ((m = reAny.exec(html))) candidates.push(m[1]);
    const reAny2 = /g_listviews\[[^\]]+]\s*=\s*\{[\s\S]*?"data"\s*:\s*(\[[\s\S]*?\])\s*\};/gi;
    while ((m = reAny2.exec(html))) candidates.push(m[1]);
  }

  const out: Reag[] = [];
  for (const raw of candidates) {
    try {
      const arr = JSON.parse(raw) as any[];
      if (!Array.isArray(arr) || !arr.length) continue;

      for (const e of arr) {
        // 1) e.reagents [...]
        if (Array.isArray(e?.reagents)) {
          for (const r of e.reagents) {
            if (Array.isArray(r)) {
              const id = Number(r[0]) || 0;
              const qty = Number(r[1] ?? 1) || 1;
              if (id) out.push({ id, qty });
            } else if (r && typeof r === "object") {
              const id = Number(r.id ?? r.item ?? r.itemId ?? 0) || 0;
              const qty = Number(r.qty ?? r.count ?? r.stack ?? r.quantity ?? 1) || 1;
              if (id) out.push({ id, qty });
            }
          }
        }

        // 2) e.reagent1 / e.reagent1count ... e.reagent12
        for (let i = 1; i <= 12; i++) {
          const id = Number(e?.[`reagent${i}`] ?? 0) || 0;
          if (!id) continue;
          const qty = Number(
            e?.[`reagent${i}count`] ??
            e?.[`reagent${i}qty`] ??
            1
          ) || 1;
          out.push({ id, qty });
        }
      }
    } catch {
      // on passe au bloc suivant
    }
  }

  // dédoublonnage par id (on garde la plus grande qty vue)
  const map = new Map<number, Reag>();
  for (const it of out) {
    const had = map.get(it.id);
    if (!had || it.qty > had.qty) map.set(it.id, it);
  }
  return Array.from(map.values());
}

/* ========= STRAT B : hydrater les noms depuis les liens présents dans le HTML ========= */
function hydrateNamesFromHtml(html: string, reagents: Reag[]): Reag[] {
  const byId = new Map<number, Reag>();
  reagents.forEach((r) => byId.set(r.id, { ...r }));

  const linkRE = /<a\s+href="[^"]*\/(?:mop-classic\/..\/)?(?:item|spell)=(\d+)[^"]*"\s*[^>]*>([^<]+)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = linkRE.exec(html))) {
    const id = Number(m[1]);
    const name = (m[2] ?? "").trim();
    const row = byId.get(id);
    if (row && !row.name) {
      row.name = name;
    }
  }

  return Array.from(byId.values()).map((r) => ({
    ...r,
    name: r.name ?? `Item #${r.id}`,
    url: `https://www.wowhead.com/mop-classic/fr/item=${r.id}`,
  }));
}

/* ========= STRAT C (secours) : parser la section “Composants” du haut ========= */
function fallbackParseFromComposants(html: string): Reag[] {
  const out: Reag[] = [];
  const chunks = html.split(/Composants/i).slice(1);
  for (const ch of chunks) {
    const block = ch.split(/<h[12][^>]*>|<div class=".*?listview.*?">/i)[0] || ch;
    const linkRE = /href=\"[^\"]*\/(?:mop-classic\/..\/)?(item|spell)=(\d+)[^\"]*\"[^>]*>([^<]+)<\/a>/g;
    let m: RegExpExecArray | null;
    while ((m = linkRE.exec(block))) {
      const id = Number(m[2] ?? 0) || 0;
      if (!id) continue;
      const tail = block.slice(m.index, m.index + 200);
      const par = tail.match(/\((\d{1,3})\)/);
      const x = tail.match(/x\s*(\d{1,3})/i);
      const qty = Number(par?.[1] ?? x?.[1] ?? 1) || 1;
      out.push({ id, qty, name: (m[3] ?? "").trim(), url: `https://www.wowhead.com/mop-classic/fr/item=${id}` });
    }
  }
  // dédoublonne
  const map = new Map<number, Reag>();
  for (const it of out) {
    const had = map.get(it.id);
    if (!had || (it.qty ?? 1) > (had.qty ?? 1)) map.set(it.id, it);
  }
  return Array.from(map.values());
}
