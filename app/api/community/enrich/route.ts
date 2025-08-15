import { NextRequest, NextResponse } from "next/server";
import { getRedis } from "../../../../lib/redis";
import { resolveSpellFromUrlPreferSpell, resolveItemFromSpellUrl } from "../../../../lib/wowhead2";
import { Craft } from "../../../../lib/types";
import { log } from "../../../../lib/logger";

export const dynamic = "force-dynamic";

async function enrichCraftArray(rows: Craft[]): Promise<{ out: Craft[]; updated: number }> {
  let updated = 0;
  const out: Craft[] = [];
  for (const r of rows) {
    const ret: Craft = { ...r };
    const url = (r as any).url || (r as any).URL || "";
    const spellUrl = (r as any).SPELL_URL || (r as any).spellUrl || "";

    // ITEM -> SPELL
    if (!spellUrl && url) {
      const s = await resolveSpellFromUrlPreferSpell(url);
      if (s && s !== url) {
        ret.SPELL_URL = s;
        const m = s.match(/\/spell=(\d+)/);
        if (m) ret.SPELL_ID = Number(m[1]);
        updated++;
      }
    }

    // SPELL -> ITEM
    if (!ret.url && spellUrl) {
      const item = await resolveItemFromSpellUrl(spellUrl);
      if (item) {
        (ret as any).url = item;
        updated++;
      }
    }

    out.push(ret);
  }
  return { out, updated };
}

export async function POST(req: NextRequest) {
  const { key, dryRun } = await req.json();
  const dry = !!dryRun;
  if (!key || typeof key !== "string") {
    return NextResponse.json({ error: "Missing Redis key" }, { status: 400 });
  }

  const redis = await getRedis();
  const raw = await redis.get(key);
  if (!raw) return NextResponse.json({ key, count: 0, updated: 0, message: "Key not found or empty." });

  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Stored value is not JSON" }, { status: 400 });
  }

  // Case A: array of Craft
  if (Array.isArray(parsed)) {
    const { out, updated } = await enrichCraftArray(parsed);
    if (!dry && updated > 0) await redis.set(key, JSON.stringify(out));
    return NextResponse.json({ key, count: out.length, updated, dryRun: dry });
  }

  // Case B: character doc with crafts by profession
  if (parsed && typeof parsed === "object" && parsed.crafts && typeof parsed.crafts === "object") {
    let totalUpdated = 0;
    let totalCount = 0;
    const nextCrafts: Record<string, Craft[]> = {};

    for (const prof of Object.keys(parsed.crafts)) {
      const arr = parsed.crafts[prof];
      if (Array.isArray(arr)) {
        const { out, updated } = await enrichCraftArray(arr);
        nextCrafts[prof] = out;
        totalUpdated += updated;
        totalCount += out.length;
      } else {
        nextCrafts[prof] = arr;
      }
    }

    const nextDoc = { ...parsed, crafts: nextCrafts };
    if (!dry && totalUpdated > 0) await redis.set(key, JSON.stringify(nextDoc));
    return NextResponse.json({ key, count: totalCount, updated: totalUpdated, dryRun: dry });
  }

  // Other format → untouched
  return NextResponse.json({ key, count: 0, updated: 0, message: "Unsupported value shape", dryRun: dry });
}
