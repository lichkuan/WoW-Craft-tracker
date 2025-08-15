import { NextRequest, NextResponse } from "next/server";

function slugify(s: string) {
  return (s || "")
    .trim().toLowerCase()
    .replace(/[’,']/g, "-")
    .replace(/[,:;\/\\()\[\]]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\s/g, "-");
}

async function followForSpellId(url: string): Promise<number | null> {
  try {
    const r = await fetch(url, { redirect: "follow", cache: "no-store" });
    const m1 = r.url.match(/\/spell=(\d+)/);
    if (m1) return Number(m1[1]);
    const html = await r.text();
    const m2 = html.match(/\/spell=(\d+)/);
    return m2 ? Number(m2[1]) : null;
  } catch { return null; }
}

export async function POST(req: NextRequest) {
  const { url, name } = await req.json();
  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "Missing url" }, { status: 400 });
  }
  const base = "https://www.wowhead.com/mop-classic/fr";
  const itemUrlFR = url.replace(/https:\/\/www\.wowhead\.com\/mop-classic\/..\//, base + "/");

  // 1) direct item#teaches-recipe redirect
  {
    const sid = await followForSpellId(itemUrlFR.replace(/(#.*)?$/, "#teaches-recipe"));
    if (sid) return NextResponse.json({ spellId: sid, spellUrl: `${base}/spell=${sid}`, method: "redirect" });
  }
  // 2) item/<slug>#teaches-recipe
  if (name) {
    const u = `${itemUrlFR}/${slugify(name)}#teaches-recipe`;
    const sid = await followForSpellId(u);
    if (sid) return NextResponse.json({ spellId: sid, spellUrl: `${base}/spell=${sid}`, method: "slug" });
  }
  // 3) fallback: item brut
  {
    const sid = await followForSpellId(itemUrlFR);
    if (sid) return NextResponse.json({ spellId: sid, spellUrl: `${base}/spell=${sid}`, method: "body" });
  }
  return NextResponse.json({});
}
