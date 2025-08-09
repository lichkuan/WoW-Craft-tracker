import { NextRequest, NextResponse } from "next/server";
import { resolveSpellFromUrlPreferSpell, resolveItemFromSpellUrl } from "../../../lib/wowhead2";

/**
 * POST /api/enrich-batch
 * Body: { rows: Array<{ ID?: string|number, Name?: string, Source?: string, Type?: string, URL?: string, SPELL_ID?: string|number, SPELL_URL?: string }> }
 * Returns: same shape, with SPELL_ID/SPELL_URL (and ITEM URL if missing) filled when possible.
 */
export async function POST(req: NextRequest) {
  const { rows } = await req.json();
  if (!Array.isArray(rows)) {
    return NextResponse.json({ error: "Body must be { rows: [...] }" }, { status: 400 });
  }

  const out = await Promise.all(rows.map(async (r: any) => {
    const ret: any = { ...r };
    const url: string = r.URL || r.url || "";
    const spellUrl: string = r.SPELL_URL || r.spellUrl || "";

    try {
      // 1) If we have a URL (item or spell), try to resolve to a SPELL URL
      let finalSpellUrl = spellUrl;
      if (!finalSpellUrl && url) {
        finalSpellUrl = await resolveSpellFromUrlPreferSpell(url);
      }
      if (finalSpellUrl) {
        ret.SPELL_URL = finalSpellUrl;
        const m = finalSpellUrl.match(/\/spell=(\d+)/);
        if (m) ret.SPELL_ID = Number(m[1]);
      }

      // 2) If we only had a SPELL URL, try to resolve back an ITEM URL
      if (!ret.URL && finalSpellUrl) {
        const itemUrl = await resolveItemFromSpellUrl(finalSpellUrl);
        if (itemUrl) ret.URL = itemUrl;
      }
    } catch {}

    return ret;
  }));

  return NextResponse.json({ rows: out });
}
