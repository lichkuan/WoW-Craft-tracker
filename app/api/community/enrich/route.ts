import { NextRequest, NextResponse } from "next/server";
import { getRedis } from "../../../../lib/redis";
import { resolveSpellFromUrlPreferSpell, resolveItemFromSpellUrl } from "../../../../lib/wowhead2";

type Craft = {
  id?: string | number;
  name?: string;
  source?: string;
  type?: string;
  url?: string;
  SPELL_ID?: number | string;
  SPELL_URL?: string;
  spellUrl?: string; // alias toléré
};

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const key = (body?.key || process.env.COMMUNITY_REDIS_KEY || "community:crafts") as string;
  const dry = Boolean(body?.dryRun);

  const redis = await getRedis();
  const raw = await redis.get(key);
  if (!raw) return NextResponse.json({ key, count: 0, updated: 0, message: "Key not found or empty." });

  let rows: Craft[] = [];
  try {
    rows = JSON.parse(raw);
    if (!Array.isArray(rows)) throw new Error("Value is not an array");
  } catch {
    return NextResponse.json({ key, error: "Value at key is not valid JSON array" }, { status: 400 });
  }

  let updated = 0;
  const out: Craft[] = [];
  for (const r of rows) {
    const ret: Craft = { ...r };
    const url = r.url || (r as any).URL || "";
    const spellUrl = r.SPELL_URL || (r as any).spellUrl || "";

    // ITEM -> SPELL
    if (!spellUrl && url) {
      const s = await resolveSpellFromUrlPreferSpell(url);
      if (s && s !== url) {
        ret.SPELL_URL = s;
        const m = s.match(/\/spell=(\d+)/);
        if (m) ret.SPELL_ID = Number(m[1]);
      }
    }

    // SPELL -> ITEM (si URL manquante)
    if (!ret.url && (ret.SPELL_URL || spellUrl)) {
      const itemUrl = await resolveItemFromSpellUrl(ret.SPELL_URL || spellUrl!);
      if (itemUrl) ret.url = itemUrl;
    }

    if (
      ret.SPELL_URL !== (r as any).SPELL_URL ||
      ret.SPELL_ID !== (r as any).SPELL_ID ||
      ret.url !== (r as any).url
    ) {
      updated++;
    }
    out.push(ret);
  }

  if (!dry) {
    await redis.set(key, JSON.stringify(out));
  }
  return NextResponse.json({ key, count: rows.length, updated, dryRun: dry });
}

