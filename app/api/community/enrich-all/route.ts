import { NextRequest, NextResponse } from "next/server";
import { getRedis } from "../../../../lib/redis";
import {
  resolveSpellFromUrlPreferSpell,
  resolveItemFromSpellUrl,
} from "../../../../lib/wowhead2";

type Craft = {
  id?: string | number;
  name?: string;
  source?: string;
  type?: string;
  url?: string;
  SPELL_ID?: number | string;
  SPELL_URL?: string;
  spellUrl?: string;
};

export const dynamic = "force-dynamic";

async function enrichArray(
  rows: Craft[]
): Promise<{ out: Craft[]; updated: number }> {
  let updated = 0;
  const out: Craft[] = [];
  for (const r of rows) {
    const ret: Craft = { ...r };
    const url = r.url || (r as any).URL || "";
    const spellUrl = r.SPELL_URL || (r as any).spellUrl || "";

    if (!spellUrl && url) {
      const s = await resolveSpellFromUrlPreferSpell(url);
      if (s && s !== url) {
        ret.SPELL_URL = s;
        const m = s.match(/\/spell=(\d+)/);
        if (m) ret.SPELL_ID = Number(m[1]);
      }
    }
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
  return { out, updated };
}

export async function POST(req: NextRequest) {
  const { pattern = "community:crafts:*", dryRun = true } = await req
    .json()
    .catch(() => ({}));
  const redis = await getRedis();

  // --- BOUCLE SCAN corrigée ---
  let cursor = 0;
  const keys: string[] = [];
  do {
    const { cursor: next, keys: batch } = await redis.scan(cursor, {
      MATCH: pattern,
      COUNT: 200,
    });
    cursor = next;
    keys.push(...batch);
  } while (cursor !== 0);

  if (keys.length === 0) {
    return NextResponse.json({
      pattern,
      keys: [],
      totalUpdated: 0,
      count: 0,
      dryRun,
    });
  }

  let totalUpdated = 0;
  const results: Array<{ key: string; count: number; updated: number }> = [];

  for (const key of keys) {
    const raw = await redis.get(key);
    if (!raw) {
      results.push({ key, count: 0, updated: 0 });
      continue;
    }

    let arr: Craft[] = [];
    try {
      arr = JSON.parse(raw);
      if (!Array.isArray(arr)) throw new Error("not array");
    } catch {
      results.push({ key, count: 0, updated: 0 });
      continue;
    }

    const { out, updated } = await enrichArray(arr);
    totalUpdated += updated;
    results.push({ key, count: arr.length, updated });

    if (!dryRun) {
      await redis.set(key, JSON.stringify(out));
    }
  }

  return NextResponse.json({
    pattern,
    keys: results,
    totalUpdated,
    count: results.reduce((a, r) => a + r.count, 0),
    dryRun,
  });
}
