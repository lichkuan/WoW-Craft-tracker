import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url") || "";
  if (!url) return NextResponse.json([], { status: 200 });

  try {
    const res = await fetch(url, { cache: "no-store" });
    const html = await res.text();

    const reagBlocks = Array.from(html.matchAll(/<td[^>]*class="iconlarge[^"]*"[^>]*>[\s\S]*?<\/tr>/g));
    const items: { id: number; name: string; url: string; qty: number }[] = [];

    for (const b of reagBlocks) {
      const block = b[0];
      const idm = block.match(/href="[^"]*\/(item|spell)=(\d+)[^"]*"/);
      const nm = block.match(/>([^<]+)<\/a>/);
      const qtm = block.match(/<td[^>]*>\s*x?\s*(\d{1,3})\s*<\/td>/);
      if (idm && nm) {
        const type = idm[1];
        const id = Number(idm[2]);
        const name = nm[1].trim();
        const qty = qtm ? Number(qtm[1]) : 1;
        const itemUrl = `https://www.wowhead.com/mop-classic/fr/${type}=${id}`;
        items.push({ id, name, url: itemUrl, qty });
      }
    }

    const blacklist = [/fil/i, /teinture/i, /ficelle/i, /thread/i, /ink/i, /vial/i, /resin/i, /dye/i];
    let primary = items.filter((it) => it.qty >= 2 && !blacklist.some((r) => r.test(it.name)));

    if (primary.length === 0) {
      const pool = items.filter((it) => !blacklist.some((r) => r.test(it.name)));
      primary = pool.sort((a, b) => b.qty - a.qty).slice(0, 2);
    }

    return NextResponse.json(
      primary.map((p) => ({
        id: p.id,
        name: p.name,
        url: p.url,
        quantity: p.qty,
      }))
    );
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}
