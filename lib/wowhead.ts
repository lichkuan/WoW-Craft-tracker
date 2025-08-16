export async function resolveSpellFromItemUrl(url: string): Promise<number | null> {
  try {
    const res = await fetch(url, { redirect: "follow", cache: "no-store" });
    const finalUrl = res.url || "";
    const m = finalUrl.match(/\/spell=(\d+)/);
    if (m) return Number(m[1]);
    const text = await res.text();
    const m2 = text.match(/\/spell=(\d+)/);
    return m2 ? Number(m2[1]) : null;
  } catch {
    return null;
  }
}

export function itemTeachesAnchor(url: string) {
  return url.replace(/(#.*)?$/, "#created-by-spell");
}