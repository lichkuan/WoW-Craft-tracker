import { NextRequest, NextResponse } from "next/server";
import { resolveSpellFromUrlPreferSpell, resolveItemFromSpellUrl } from "../../../lib/wowhead2";
import { parseWowheadId, withMopFr } from "../../../lib/wowhead2";
import { log } from "../../../lib/logger";

/**
 * POST /api/enrich-batch
 * Body: { rows: Array<{ ID?: string|number, Name?: string, Source?: string, URL?: string, SPELL_ID?: string|number, SPELL_URL?: string }> }
 * Returns: { rows: [...] } with SPELL_ID/SPELL_URL (and URL if resolvable) filled when possible.
 */
export async function POST(req: NextRequest) {
  const { rows } = await req.json();
  if (!Array.isArray(rows)) {
    return NextResponse.json({ error: "Body must be { rows: [...] }" }, { status: 400 });
  }

  const out = await Promise.all(rows.map(async (r: any) => {
    const ret: any = { ...r };
    const url: string = r.URL || r.url || "";
    const rawSpellUrl: string = r.SPELL_URL || r.spellUrl || "";

    // Normalize inputs
    const itemUrl = url ? withMopFr(url) : "";
    const spellUrl = rawSpellUrl ? withMopFr(rawSpellUrl) : "";

    try {
      // 1) If we have an ITEM URL but no SPELL_URL, resolve it
      if (!spellUrl && itemUrl) {
        const s = await resolveSpellFromUrlPreferSpell(itemUrl);
        if (s) {
          ret.SPELL_URL = s;
          const id = parseWowheadId(s).id;
          if (id) ret.SPELL_ID = Number(id);
        }
      }

      // 2) If we only had a SPELL URL, try to resolve back an ITEM URL
      if (!ret.URL && (spellUrl || ret.SPELL_URL)) {
        const final = spellUrl || ret.SPELL_URL;
        const item = await resolveItemFromSpellUrl(final);
        if (item) ret.URL = item;
      }
    } catch (e) {
      log("enrich-batch error for row:", r, e);
    }

    return ret;
  }));

  return NextResponse.json({ rows: out });
}
