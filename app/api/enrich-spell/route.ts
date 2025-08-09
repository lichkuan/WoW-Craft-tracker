import { NextRequest, NextResponse } from "next/server";
import { resolveSpellFromItemUrl, itemTeachesAnchor } from "@/lib/wowhead";

export async function POST(req: NextRequest) {
  const { url } = await req.json();
  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "Missing url" }, { status: 400 });
  }

  if (url.includes("/item=")) {
    const trial = itemTeachesAnchor(url);
    let spellId = await resolveSpellFromItemUrl(trial);
    let method = "redirect-anchor";
    if (!spellId) {
      spellId = await resolveSpellFromItemUrl(url);
      method = "body-scan";
    }
    if (spellId) {
      const spellUrl = url.replace(/\/item=\d+.*/, `/spell=${spellId}`);
      return NextResponse.json({ spellId, spellUrl, method });
    }
  }

  return NextResponse.json({});
}
