// app/api/reagents/route.ts
// Returns ONLY first-level reagents as an ARRAY of nodes [{ id, name, url, quantity }].
// Names are hydrated via Wowhead tooltip JSON (fr_FR).
// TS-safe getLocalePrefix.

export const dynamic = 'force-dynamic';

type Node = {
  id: number;
  name: string;
  url: string;
  quantity: number;
};

type ReagentEntry = { id: number; qty: number };

function isSpellUrl(url: URL) { return /\/spell=/.test(url.pathname); }
function isItemUrl(url: URL) { return /\/item=/.test(url.pathname); }

function getLocalePrefix(u: URL): string {
  const m = u.pathname.match(/^(\/mop-classic\/[a-z]{2})/i);
  return m?.[1] ?? '/mop-classic/fr';
}

async function fetchText(input: string, init?: RequestInit): Promise<string> {
  const res = await fetch(input, {
    headers: {
      'user-agent': 'Mozilla/5.0 (compatible; WoW-Craft-Tracker/1.0)',
      'accept-language': 'fr,en;q=0.9',
    },
    redirect: 'follow',
    // @ts-ignore
    cache: 'no-store',
    ...init,
  });
  if (!res.ok) throw new Error(`Fetch failed ${res.status} ${res.statusText}`);
  return await res.text();
}

async function fetchJson(input: string): Promise<any> {
  const res = await fetch(input, {
    headers: {
      'user-agent': 'Mozilla/5.0 (compatible; WoW-Craft-Tracker/1.0)',
      'accept': 'application/json',
    },
    redirect: 'follow',
    // @ts-ignore
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Fetch failed ${res.status} ${res.statusText}`);
  return await res.json();
}

// --- Generic Listview parser ---
function parseListviews(html: string): Array<{ id: string; data: any[] | null }> {
  const out: Array<{ id: string; data: any[] | null }> = [];
  const needle = 'new Listview({';
  let idx = 0;
  while (true) {
    const pos = html.indexOf(needle, idx);
    if (pos === -1) break;
    // Find the object literal by balancing braces
    let i = pos + needle.length - 1; // at '{'
    let depth = 0, end = -1;
    for (; i < html.length; i++) {
      const ch = html[i];
      if (ch === '{') depth++;
      else if (ch === '}') {
        depth--;
        if (depth === 0) { end = i + 1; break; }
      }
    }
    if (end === -1) break;
    const obj = html.slice(pos + needle.length - 1, end);
    idx = end;

    const idm = obj.match(/id\s*:\s*['"]([^'"]+)['"]/);
    const idVal = idm?.[1] ?? '';

    // data: [ ... ]
    let data: any[] | null = null;
    const dpos = obj.indexOf('data');
    if (dpos !== -1) {
      const colon = obj.indexOf(':', dpos);
      if (colon !== -1) {
        let start = obj.indexOf('[', colon);
        if (start !== -1) {
          let j = start, ddepth = 0, dend = -1;
          for (; j < obj.length; j++) {
            const c = obj[j];
            if (c === '[') ddepth++;
            else if (c === ']') {
              ddepth--;
              if (ddepth === 0) { dend = j + 1; break; }
            }
          }
          if (dend !== -1) {
            try {
              const slice = obj.slice(start, dend);
              const arr = JSON.parse(slice);
              if (Array.isArray(arr)) data = arr;
            } catch {}
          }
        }
      }
    }

    out.push({ id: idVal, data });
  }
  return out;
}

function collectRowsWithReagents(listviews: Array<{ id: string; data: any[] | null }>): any[] {
  const rows: any[] = [];
  for (const lv of listviews) {
    if (!lv.data) continue;
    for (const r of lv.data) {
      if (r && typeof r === 'object' && 'reagents' in r) rows.push(r);
    }
  }
  return rows;
}

function rowsToReagents(rows: any[]): ReagentEntry[] {
  const out: ReagentEntry[] = [];
  for (const r of rows) {
    const reag = (r as any).reagents;
    if (!reag) continue;
    if (Array.isArray(reag)) {
      for (const e of reag) {
        if (Array.isArray(e) && e.length >= 2) {
          const id = Number(e[0]); const qty = Number(e[1]) || 1;
          if (!Number.isNaN(id)) out.push({ id, qty });
        }
      }
    } else if (typeof reag === 'object') {
      for (const [k, v] of Object.entries(reag)) {
        const id = Number(k); const qty = Number(v) || 1;
        if (!Number.isNaN(id)) out.push({ id, qty });
      }
    }
  }
  // dedupe by keeping max qty
  const map = new Map<number, number>();
  for (const e of out) {
    map.set(e.id, Math.max(e.qty, map.get(e.id) ?? 0));
  }
  return Array.from(map.entries()).map(([id, qty]) => ({ id, qty }));
}

// Tooltip name fetch (fr_FR)
async function getItemName(id: number): Promise<string | null> {
  try {
    const url = `https://www.wowhead.com/tooltip/item/${id}?dataEnv=mop-classic&locale=fr_FR`;
    const data = await fetchJson(url);
    const name =
      data?.name ?? data?.item?.name ?? data?.json?.name ?? data?.data?.name;
    return typeof name === 'string' && name.trim() ? String(name) : null;
  } catch {
    return null;
  }
}

function getItemUrl(localePrefix: string, id: number): string {
  return `https://www.wowhead.com${localePrefix}/item=${id}`;
}

async function getReagentsForSpell(spellUrl: string): Promise<ReagentEntry[]> {
  const html = await fetchText(spellUrl);
  const lvs = parseListviews(html);
  const preferred = lvs.filter(l => l.id === 'reagents');
  let rows = collectRowsWithReagents(preferred.length ? preferred : lvs);
  return rowsToReagents(rows);
}

async function getReagentsForItem(itemUrl: string): Promise<ReagentEntry[]> {
  const html = await fetchText(itemUrl);
  const lvs = parseListviews(html);
  const created = lvs.filter(l => l.id === 'created-by' || l.id === 'created-by-spell');
  let rows = collectRowsWithReagents(created.length ? created : []);
  if (!rows.length) {
    const teaches = lvs.filter(l => l.id === 'teaches-recipe');
    rows = collectRowsWithReagents(teaches.length ? teaches : []);
  }
  if (!rows.length) rows = collectRowsWithReagents(lvs);
  return rowsToReagents(rows);
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const raw = searchParams.get('url');
    if (!raw) return new Response(JSON.stringify([]), { status: 400 });

    const inputUrl = new URL(raw);
    const localePrefix = getLocalePrefix(inputUrl);

    let fromCreatedBy = false;
    let entries: ReagentEntry[] = [];

    if (isSpellUrl(inputUrl)) {
      entries = await getReagentsForSpell(inputUrl.toString());
    } else if (isItemUrl(inputUrl)) {
      entries = await getReagentsForItem(`${inputUrl.origin}${inputUrl.pathname}`);
      fromCreatedBy = entries.length > 0;
    } else {
      return new Response(JSON.stringify([]), { headers: new Headers({ 'content-type': 'application/json; charset=utf-8', 'X-From-Created-By-Spell': '0' }) });
    }

    // Build first-level nodes with hydrated names
    const nodes: Node[] = [];
    for (const e of entries) {
      const name = (await getItemName(e.id)) ?? `Item #${e.id}`;
      nodes.push({
        id: e.id,
        name,
        url: getItemUrl(localePrefix, e.id),
        quantity: e.qty,
      });
    }

    const headers = new Headers({ 'content-type': 'application/json; charset=utf-8', 'X-From-Created-By-Spell': fromCreatedBy ? '1' : '0' });
    return new Response(JSON.stringify(nodes), { headers });
  } catch (e: any) {
    const headers = new Headers({ 'content-type': 'application/json; charset=utf-8', 'X-From-Created-By-Spell': '0' });
    return new Response(JSON.stringify([]), { status: 200, headers });
  }
}