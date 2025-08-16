export function parseWowheadId(url: string): { type: "item"|"spell"|null, id: number|null } {
  const m = url.match(/\/(item|spell)=(\d+)/);
  if (!m) return { type: null, id: null };
  return { type: m[1] as any, id: Number(m[2]) };
}

export function withMopFr(url: string) {
  if (!/wowhead\.com\/.+\/fr\//.test(url)) {
    const m = url.match(/\/(item|spell)=(\d+)/);
    if (m) {
      const type = m[1], id = m[2];
      return `https://www.wowhead.com/mop-classic/fr/${type}=${id}`;
    }
  }
  return url;
}

export async function resolveSpellFromUrlPreferSpell(url: string): Promise<string> {
  const normalized = withMopFr(url);
  if (/\/spell=\d+/.test(normalized)) return normalized;
  if (/\/item=\d+/.test(normalized)) {
    try {
      const teach = normalized.replace(/(#.*)?$/, "#created-by-spell");
      let res = await fetch(teach, { redirect: "follow", cache: "no-store" });
      let finalUrl = res.url || "";
      let m = finalUrl.match(/\/spell=(\d+)/);
      if (!m) {
        const html = await res.text();
        m = html.match(/\/spell=(\d+)/);
      }
      if (m) return `https://www.wowhead.com/mop-classic/fr/spell=${m[1]}`;
    } catch {}
  }
  return normalized;
}

export async function resolveItemFromSpellUrl(spellUrl: string): Promise<string | null> {
  try {
    const normalized = withMopFr(spellUrl);
    const res = await fetch(normalized, { redirect: "follow", cache: "no-store" });
    const html = await res.text();
    // Heuristic: first /item=ID link on the spell page (often the taught item)
    const m = html.match(/\/(?:mop-classic\/fr\/)?item=(\d+)/);
    return m ? `https://www.wowhead.com/mop-classic/fr/item=${m[1]}` : null;
  } catch {
    return null;
  }
}