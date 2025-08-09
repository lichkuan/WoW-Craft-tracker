import { NextRequest, NextResponse } from "next/server";
import { getRedis } from "../../../lib/redis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CharacterDoc = {
  shareId?: string;
  name?: string;
  server?: string;
  level?: number;
  ttl?: number; // -1 = permanent, >0 = temp, <=0 = expired
  public?: boolean; // flag de partage
  crafts?: Record<string, any[]>;
  [k: string]: any;
};

function statusFromTtl(ttl?: number): "permanent" | "temporary" | "expired" {
  if (ttl === -1) return "permanent";
  if (typeof ttl === "number" && ttl > 0) return "temporary";
  return "expired";
}

export async function GET(req: NextRequest) {
  const redis = await getRedis();
  const { searchParams } = new URL(req.url);
  const all = searchParams.get("all") === "1";
  const pattern = "character:*";

  // SCAN toutes les clés character:*
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

  const characters: Array<{
    shareId: string;
    name: string;
    server: string;
    level: number;
    ttl: number;
    status: string;
  }> = [];

  let total = 0,
    permanent = 0,
    temporary = 0,
    expired = 0;

  for (const key of keys) {
    const raw = await redis.get(key);
    if (!raw) continue;

    let doc: CharacterDoc;
    try {
      doc = JSON.parse(raw);
    } catch {
      continue;
    }

    // Filtrage "public" par défaut, mais GET ?all=1 pour tout lister
    const isPublic = Boolean(doc.public) || Boolean(doc.shareId);
    if (!all && !isPublic) continue;

    const shareId = doc.shareId || key.replace("character:", "");
    const name = doc.name ?? "(inconnu)";
    const server = doc.server ?? "";
    const level = typeof doc.level === "number" ? doc.level : 0;
    const ttl = typeof doc.ttl === "number" ? doc.ttl : -1;
    const status = statusFromTtl(ttl);

    total++;
    if (status === "permanent") permanent++;
    else if (status === "temporary") temporary++;
    else expired++;

    characters.push({ shareId, name, server, level, ttl, status });
  }

  // Tri optionnel: permanents puis temporaires, nom asc
  characters.sort((a, b) => {
    const rank = (s: string) =>
      s === "permanent" ? 0 : s === "temporary" ? 1 : 2;
    const r = rank(a.status) - rank(b.status);
    if (r !== 0) return r;
    return a.name.localeCompare(b.name, "fr");
  });

  const summary = { total, permanent, temporary, expired };
  return NextResponse.json({ characters, summary });
}

export async function DELETE(req: NextRequest) {
  const redis = await getRedis();
  const body = await req.json().catch(() => ({} as any));
  const { action, shareId, confirmCode } = body as {
    action?: string;
    shareId?: string;
    confirmCode?: string;
  };

  if (action !== "delete_one" || !shareId) {
    return NextResponse.json(
      { success: false, error: "Bad request" },
      { status: 400 }
    );
  }
  if (confirmCode !== "DELETE_ALL_SHARES_2025") {
    return NextResponse.json(
      { success: false, error: "Invalid confirm code" },
      { status: 403 }
    );
  }

  const key = `character:${shareId}`;
  const existed = await redis.del(key);

  return NextResponse.json({ success: true, removed: existed, key });
}
