// /app/api/reagents/route.ts (Next.js App Router) 
// or /pages/api/reagents.ts (Pages Router) — see comment at bottom for Pages version
// Fetches reagents from a Wowhead item/recipe URL by scraping the HTML (non‑officiel).
// Install: npm i cheerio
import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

type Reagent = {
  id: number;
  name: string;
  url: string;
  count: number;
};

function parseReagents(html: string, baseUrl: string): Reagent[] {
  const $ = cheerio.load(html);

  const reagents: Reagent[] = [];

  // Strategy 1: Look for the Reagents block list items (generic parsing, FR/EN tolerant)
  // Matches links like <a href="/mop-classic/fr/item=72104">Acier vivant</a> (6)
  // and grabs the number in parentheses right after.
  $("a[href*='item=']").each((_, el) => {
    const href = $(el).attr("href") || "";
    const text = $(el).text().trim();
    const after = $(el).parent().text(); // may contain "(6)"

    const idMatch = href.match(/item=(\d+)/);
    if (!idMatch) return;
    const id = Number(idMatch[1]);

    // find a (number) close by
    let countMatch = after.replace(text, "").match(/\((\d+)\)/);
    if (!countMatch) {
      // try sibling text
      const nextText = $(el).next().text();
      countMatch = nextText.match(/\((\d+)\)/);
    }
    const count = countMatch ? Number(countMatch[1]) : 1;

    // Keep only unique items & prefer biggest count seen
    const existing = reagents.find(r => r.id === id);
    const fullUrl = href.startsWith("http") ? href : new URL(href, baseUrl).toString();
    if (existing) {
      existing.count = Math.max(existing.count, count);
    } else {
      reagents.push({ id, name: text, url: fullUrl, count });
    }
  });

  // Heuristic filter: many links on the page are unrelated; keep those near a Reagents/Composants header
  // Keep items that appear in blocks with titles containing Reagents/Composants/Ingredients.
  const titles = ["reagents", "composants", "ingrédients", "ingredients"];
  if (reagents.length > 0) {
    const filtered = reagents.filter(r => {
      const link = $(`a[href*='item=${r.id}']`).first();
      const section = link.closest("div,section,li");
      const heading = section.prevAll("h2,h3,h4").first().text().toLowerCase();
      return titles.some(t => heading.includes(t));
    });
    if (filtered.length > 0) return filtered;
  }

  // Fallback: return first few unique items found (better than nothing)
  return reagents.slice(0, 10);
}

export async function GET(req: NextRequest) {
  const urlParam = getParam(req, "url");
  const idParam = getParam(req, "id");

  if (!urlParam && !idParam) {
    return NextResponse.json({ error: "Provide ?url=WowheadURL or ?id=12345" }, { status: 400 });
  }

  const base = "https://www.wowhead.com/";
  const url = urlParam
    ? urlParam
    : `${base}mop-classic/fr/item=${encodeURIComponent(idParam!)}`;

  try {
    const html = await fetchHtml(url);
    const reagents = parseReagents(html, url);
    return NextResponse.json({ url, reagents });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "failed" }, { status: 500 });
  }
}

/* ----- Pages Router version (drop into /pages/api/reagents.ts) -----
import type { NextApiRequest, NextApiResponse } from "next";
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const urlParam = (req.query.url as string) || "";
  const idParam = (req.query.id as string) || "";
  if (!urlParam && !idParam) return res.status(400).json({ error: "Provide ?url or ?id" });
  const base = "https://www.wowhead.com/";
  const url = urlParam ? urlParam : `${base}mop-classic/fr/item=${encodeURIComponent(idParam)}`;
  try {
    const html = await fetch(url, { headers: { "user-agent": "Mozilla/5.0" } }).then(r => r.text());
    const reagents = parseReagents(html, url);
    res.status(200).json({ url, reagents });
  } catch (e: any) {
    res.status(500).json({ error: e.message ?? "failed" });
  }
}
*/
