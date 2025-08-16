// app/api/item-meta/route.ts
// TS-safe regex group access + merged tooltip/HTML for names & icons.

export const dynamic = 'force-dynamic';

async function fetchJson(input: string): Promise<any> {
  const res = await fetch(input, {
    headers: {
      'user-agent': 'Mozilla/5.0 (compatible; WoW-Craft-Tracker/1.0)',
      'accept': 'application/json,text/plain,*/*',
      'referer': 'https://www.wowhead.com/',
    },
    redirect: 'follow',
    // @ts-ignore
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Fetch failed ${res.status} ${res.statusText}`);
  return await res.json();
}

async function fetchText(input: string): Promise<string> {
  const res = await fetch(input, {
    headers: {
      'user-agent': 'Mozilla/5.0 (compatible; WoW-Craft-Tracker/1.0)',
      'accept-language': 'fr,en;q=0.9',
      'referer': 'https://www.wowhead.com/',
    },
    redirect: 'follow',
    // @ts-ignore
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Fetch failed ${res.status} ${res.statusText}`);
  return await res.text();
}

function parseNameFromItemHtml(html: string): string | null {
  // Prefer main <h1> on the page
  const m = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
  if (m?.[1]) return m[1].trim();
  // og:title as fallback
  const m2 = html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/i);
  if (m2?.[1]) return m2[1].trim();
  return null;
}

function parseIconFromItemHtml(html: string): string | null {
  // og:image like https://wow.zamimg.com/images/wow/icons/large/inv_ingot_ghostiron.jpg
  const m = html.match(/<meta\s+property="og:image"\s+content="[^"]*\/icons\/[^\/]+\/([a-z0-9_\-]+)\.(?:jpg|png)"/i);
  return m?.[1]?.trim() ?? null;
}

function iconUrlSmall(icon: string) {
  return `https://wow.zamimg.com/images/wow/icons/small/${icon}.jpg`;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const idsParam = (searchParams.get('ids') || '').trim();
    if (!idsParam) return new Response(JSON.stringify({}), { status: 400 });
    const ids = Array.from(new Set(idsParam.split(',').map(s => Number(s.trim())).filter(n => Number.isFinite(n))));
    if (!ids.length) return new Response(JSON.stringify({}), { status: 400 });

    const out: Record<string, { name?: string; icon?: string; iconUrl?: string }> = {};

    await Promise.all(ids.map(async (id) => {
      let name: string | undefined;
      let icon: string | undefined;

      // 1) Tooltip JSON (fr_FR)
      try {
        const data = await fetchJson(`https://www.wowhead.com/tooltip/item/${id}?dataEnv=mop-classic&locale=fr_FR`);
        const n = data?.name ?? data?.item?.name ?? data?.json?.name ?? data?.data?.name;
        const ic = data?.icon ?? data?.item?.icon ?? data?.json?.icon ?? data?.data?.icon;
        if (typeof n === 'string' && n.trim()) name = String(n);
        if (typeof ic === 'string' && ic.trim()) icon = String(ic);
      } catch {}

      // 2) HTML fallback or augmentation (fill whichever is missing)
      if (!name || !icon) {
        try {
          const html = await fetchText(`https://www.wowhead.com/mop-classic/fr/item=${id}`);
          if (!name) {
            const n2 = parseNameFromItemHtml(html);
            if (n2) name = n2;
          }
          if (!icon) {
            const ic2 = parseIconFromItemHtml(html);
            if (ic2) icon = ic2;
          }
        } catch {}
      }

      if (name || icon) {
        const entry: any = {};
        if (name) entry.name = name;
        if (icon) {
          entry.icon = icon;
          entry.iconUrl = iconUrlSmall(icon);
        }
        out[String(id)] = entry;
      }
    }));

    return new Response(JSON.stringify(out), { headers: { 'content-type': 'application/json; charset=utf-8' } });
  } catch (e: any) {
    return new Response(JSON.stringify({}), { status: 200, headers: { 'content-type': 'application/json; charset=utf-8' } });
  }
}