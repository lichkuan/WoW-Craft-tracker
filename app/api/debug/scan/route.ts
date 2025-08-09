import { NextRequest, NextResponse } from "next/server";
import { getRedis } from "../../../../lib/redis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const pattern = searchParams.get("pattern") || "*";
  const count = Number(searchParams.get("count") || 200);

  try {
    const redis = await getRedis();
    let cursor = 0;
    const keys: string[] = [];
    do {
      const { cursor: next, keys: batch } = await redis.scan(cursor, {
        MATCH: pattern,
        COUNT: count,
      });
      cursor = next;
      keys.push(...batch);
    } while (cursor !== 0 && keys.length < 5000);

    return NextResponse.json({ pattern, total: keys.length, keys });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || String(e) },
      { status: 500 }
    );
  }
}
