// app/api/community/enrich/route.ts
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
  url?: string; // item URL
  SPELL_ID?: number; // optionnel
  SPELL_URL?: string; // spell URL
  spellUrl?: string; // alias toléré
};

type CharacterDoc = {
  // … autres champs éventuels
  crafts?: Record<string, Craft[]>;
};

async function enrichCraftArray(
  rows: Craft[]
): Promise<{ out: Craft[]; updated: number }> {
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
    // SPELL -> ITEM
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
    const { out, updated } = await enrichCraftArray(parsed);
    return { newValue: JSON.stringify(out), updated, count: out.length };
  }

  // B) clé = document personnage avec crafts par métier
  if (
    parsed &&
    typeof parsed === "object" &&
    parsed.crafts &&
    typeof parsed.crafts === "object"
  ) {
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
    return {
      newValue: JSON.stringify(nextDoc),
      updated: totalUpdated,
      count: totalCount,
    };
  }

  // Autre format → on ne touche pas
  return { newValue: raw, updated: 0, count: 0 };
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const key = (body?.key ||
    process.env.COMMUNITY_REDIS_KEY ||
    "character:UNKNOWN") as string;
  const dry = Boolean(body?.dryRun);

  const redis = await getRedis();
  const raw = await redis.get(key);
  if (!raw)
    return NextResponse.json({
      key,
      count: 0,
      updated: 0,
      message: "Key not found or empty.",
    });

  const { newValue, updated, count } = await enrichValue(raw);
  if (!dry && updated > 0) {
    await redis.set(key, newValue);
  }

  return NextResponse.json({ key, count, updated, dryRun: dry });
}
