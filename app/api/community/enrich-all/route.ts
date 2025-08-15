// app/api/community/enrich-all/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getRedis } from "../../../../lib/redis";
import { resolveSpellFromUrlPreferSpell, resolveItemFromSpellUrl } from "../../../../lib/wowhead2";
import { Craft, CharacterDoc } from "../../../../lib/types";
import { log } from "../../../../lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function enrichCraftArray(rows: Craft[]): Promise<{ out: Craft[]; updated: number }> {
  let updated = 0;
  const out: Craft[] = [];
  for (const r of rows) {
    const ret: Craft = { ...r };
    const url = (r as any).url || (r as any).URL || "";
    const spellUrl = (r as any).SPELL_URL || (r as any).spellUrl || "";

    if (!spellUrl && url) {
      const s = await resolveSpellFromUrlPreferSpell(url);
      if (s && s !== url) {
        ret.SPELL_URL = s;
        const m = s.match(/\/spell=(\d+)/);
        if (m) ret.SPELL_ID = Number(m[1]);
        updated++;
      }
    }
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

async function enrichValue(raw: string): Promise<{ newValue: string; updated: number; count: number }> {
  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { newValue: raw, updated: 0, count: 0 };
  }

  if (Array.isArray(parsed)) {
    const { out, updated } = await enrichCraftArray(parsed);
    return { newValue: JSON.stringify(out), updated, count: out.length };
  }

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

    const nextDoc: CharacterDoc = { ...parsed, crafts: nextCrafts };
    return { newValue: JSON.stringify(nextDoc), updated: totalUpdated, count: totalCount };
  }

  return { newValue: raw, updated: 0, count: 0 };
}

export async function POST(req: NextRequest) {
  const { prefix = "character:", dryRun } = await req.json() || {};
  const dry = !!dryRun;
  const redis = await getRedis();

  const keys = await redis.keys(`${prefix}*`);
  let totalUpdated = 0;
  let totalCount = 0;
  const perKey: Array<{ key: string; updated: number; count: number }> = [];

  for (const key of keys) {
    const raw = await redis.get(key);
    if (!raw) continue;
    const { newValue, updated, count } = await enrichValue(raw);
    perKey.push({ key, updated, count });
    totalUpdated += updated;
    totalCount += count;
    if (!dry && updated > 0) {
      await redis.set(key, newValue);
    }
  }

  return NextResponse.json({ prefix, keys: keys.length, updated: totalUpdated, count: totalCount, dryRun: dry, perKey });
}
