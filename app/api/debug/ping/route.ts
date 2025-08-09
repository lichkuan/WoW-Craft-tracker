import { NextResponse } from "next/server";
import { getRedis } from "../../../../lib/redis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const r = await getRedis();
    const pong = await r.ping();
    return NextResponse.json({ ok: true, pong });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || String(e) },
      { status: 500 }
    );
  }
}
