import { NextRequest, NextResponse } from "next/server";
import { getRedis } from "../../../../lib/redis";
import {
  resolveSpellFromUrlPreferSpell,
  resolveItemFromSpellUrl,
} from "../../../../lib/wowhead2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Craft = {
  id?: string | number;
  name?: string;
  source?: string;
  type?: string;
  url?: string;
  SPELL_ID?: number;
  SPELL_URL?: string;
  spellUrl?: string;
};

type CharacterDoc = {
  crafts?: Record<string, Craft[]>;
};

async function enrichOneCraftArray(
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

async function enrichValue(
  raw: string
): Promise<{ newValue: string; updated: number; count: number }> {
  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { newValue: raw, updated: 0, count: 0 };
  }

  // A) clé = Craft[]
  if (Array.isArray(parsed)) {
    const { out, updated } = await enrichOneCraftArray(parsed);
    return { newValue: JSON.stringify(out), updated, count: out.length };
  }
  // B) clé = document personnage avec crafts par métier
  if (
    parsed &&
    typeof parsed === "object" &&
    parsed.crafts &&
    typeof parsed.crafts === "object"
  ) {
    let totalUpdated = 0,
      totalCount = 0;
    const nextCrafts: Record<string, Craft[]> = {};
    for (const k of Object.keys(parsed.crafts)) {
      const list = parsed.crafts[k];
      if (Array.isArray(list)) {
        const { out, updated } = await enrichOneCraftArray(list);
        nextCrafts[k] = out;
        totalUpdated += updated;
        totalCount += out.length;
      } else {
        nextCrafts[k] = list;
      }
    }
    const nextDoc: CharacterDoc = { ...parsed, crafts: nextCrafts };
    return {
      newValue: JSON.stringify(nextDoc),
      updated: totalUpdated,
      count: totalCount,
    };
  }
  return { newValue: raw, updated: 0, count: 0 };
}

export async function POST(req: NextRequest) {
  const { pattern = "*", dryRun = true } = await req.json().catch(() => ({}));
  const redis = await getRedis();

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

  let totalUpdated = 0,
    totalCount = 0;
  const results: Array<{ key: string; count: number; updated: number }> = [];

  for (const key of keys) {
    const raw = await redis.get(key);
    if (!raw) {
      results.push({ key, count: 0, updated: 0 });
      continue;
    }
    const { newValue, updated, count } = await enrichValue(raw);
    totalUpdated += updated;
    totalCount += count;
    results.push({ key, count, updated });
    if (!dryRun && updated > 0) await redis.set(key, newValue);
  }

  return NextResponse.json({
    pattern,
    keys: results,
    totalUpdated,
    count: totalCount,
    dryRun,
  });
}
