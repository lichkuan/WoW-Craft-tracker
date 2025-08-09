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

function collectReagentsFromHtml(html: string) {
  const items: { id: number; name: string; url: string; qty: number }[] = [];
  const chunks = html.split(/Composants/i).slice(1);
  for (const ch of chunks) {
    const block = ch.split(/<h[12][^>]*>|<div class=".*?listview.*?">/i)[0] || ch;
    const linkRE = /href=\"[^\"]*\/(?:mop-classic\/..\/)?(item|spell)=(\d+)[^\"]*\"[^>]*>([^<]+)<\/a>/g;
    let m: RegExpExecArray | null;
    const locals: { id: number; name: string; url: string; qty: number }[] = [];
    while ((m = linkRE.exec(block))) {
      const type = m[1];
      const id = Number(m[2]);
      const name = m[3].trim();
      const url = `https://www.wowhead.com/mop-classic/fr/${type}=${id}`;
      const tail = block.slice(m.index, m.index + 200);
      let qty = 1;
      const mParen = tail.match(/\((\d{1,3})\)/);
      const mX = tail.match(/x\s*(\d{1,3})/i);
      if (mParen) qty = Number(mParen[1]);
      else if (mX) qty = Number(mX[1]);
      locals.push({ id, name, url, qty });
    }
    if (locals.length) items.push(...locals);
  }

  if (items.length === 0) {
    const rowRE = /<tr[^>]*>\s*<td[^>]*class=\"iconlarge[^\"]*\"[\s\S]*?<\/tr>/g;
    let m: RegExpExecArray | null;
    while ((m = rowRE.exec(html))) {
      const row = m[0];
      const idm = row.match(/href=\"[^\"]*\/(item|spell)=(\d+)[^\"]*\"/);
      const nm = row.match(/>([^<]+)<\/a>/);
      const qtm = row.match(/<td[^>]*>\s*(?:x\s*)?(\d{1,3})\s*<\/td>/);
      if (idm && nm) {
        const type = idm[1];
        const id = Number(idm[2]);
        const name = nm[1].trim();
        const qty = qtm ? Number(qtm[1]) : 1;
        const url = `https://www.wowhead.com/mop-classic/fr/${type}=${id}`;
        items.push({ id, name, url, qty });
      }
    }
  }

  const map = new Map<number, { id: number; name: string; url: string; qty: number }>();
  for (const it of items) {
    const had = map.get(it.id);
    if (!had || it.qty > had.qty) map.set(it.id, it);
  }
  const unique = Array.from(map.values());
  unique.sort((a, b) => b.qty - a.qty);
  const primaries: typeof unique = [];
  const qty2 = unique.filter((x) => x.qty >= 2);
  primaries.push(...qty2);
  if (primaries.length === 0 && unique.length > 0) primaries.push(unique[0]);
  for (const it of unique) {
    if (primaries.length >= 4) break;
    if (!primaries.find((p) => p.id === it.id)) primaries.push(it);
  }
  return primaries;
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url") || "";
  if (!url) return NextResponse.json([], { status: 200 });
  try {
    const spellUrl = await resolveToSpell(url);
    const res = await fetch(spellUrl, { cache: "no-store" });
    const html = await res.text();
    const primaries = collectReagentsFromHtml(html);
    return NextResponse.json(primaries.map(p => ({ id: p.id, name: p.name, url: p.url, quantity: p.qty })));
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}
