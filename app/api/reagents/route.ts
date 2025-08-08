// app/api/reagents/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { parse } from "node-html-parser";

function getParam(req: NextRequest, key: string) {
  const url = new URL(req.url);
  return url.searchParams.get(key);
}

async function fetchHtml(url: string) {
  const res = await fetch(url, {
    headers: {
      "user-agent": "Mozilla/5.0 (compatible; WoWCraftingTracker/1.0)",
      "accept-language": "fr,fr-FR;q=0.9,en;q=0.8",
    },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Wowhead fetch failed: ${res.status}`);
  return await res.text();
}

type Reagent = { id: number; name: string; url: string; count: number };

function parseReagents(html: string, baseUrl: string): Reagent[] {
  const root = parse(html);
  const reagents: Reagent[] = [];

  // 1) Récupère tous les liens d'items
  root.querySelectorAll('a[href*="item="]').forEach((a) => {
    const href = a.getAttribute("href") || "";
    const text = a.text.trim();
    const idMatch = href.match(/item=(\d+)/);
    if (!idMatch) return;
    const id = Number(idMatch[1]);

    // 2) Tente de lire le "(X)" juste après le lien
    //   - parent innerText peut contenir "Nom (6)"
    //   - sinon regarde le nœud suivant
    let after = a.parentNode?.innerText || "";
    let countMatch = after.replace(text, "").match(/\((\d+)\)/);
    if (!countMatch) {
      const next = a.nextSibling?.text || "";
      countMatch = next.match(/\((\d+)\)/);
    }
    const count = countMatch ? Number(countMatch[1]) : 1;

    const fullUrl = href.startsWith("http") ? href : new URL(href, baseUrl).toString();
    const existing = reagents.find((r) => r.id === id);
    if (existing) {
      existing.count = Math.max(existing.count, count);
    } else {
      reagents.push({ id, name: text, url: fullUrl, count });
    }
  });

  // 3) Ne garder que ce qui est proche d’un titre Reagents/Composants/Ingredients (heuristique)
  const titles = ["reagents", "composants", "ingrédients", "ingredients"];
  const filtered = reagents.filter((r) => {
    const selector = `a[href*="item=${r.id}"]`;
    const first = root.querySelector(selector);
    if (!first) return false;
    // remonte quelques niveaux et cherche un heading avant
    let node = first.parentNode;
    for (let i = 0; i < 5 && node; i++) node = node.parentNode;
    const nearbyText = node?.innerText?.toLowerCase() || "";
    return titles.some((t) => nearbyText.includes(t));
  });

  return filtered.length > 0 ? filtered : reagents.slice(0, 10);
}

export async function GET(req: NextRequest) {
  const urlParam = getParam(req, "url");
  const idParam = getParam(req, "id");

  if (!urlParam && !idParam) {
    return NextResponse.json({ error: "Provide ?url=WowheadURL or ?id=12345" }, { status: 400 });
  }

  const base = "https://www.wowhead.com/";
  const url = urlParam ? urlParam : `${base}mop-classic/fr/item=${encodeURIComponent(idParam!)}`;

  try {
    const html = await fetchHtml(url);
    const reagents = parseReagents(html, url);
    return NextResponse.json({ url, reagents });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "failed" }, { status: 500 });
  }
}
