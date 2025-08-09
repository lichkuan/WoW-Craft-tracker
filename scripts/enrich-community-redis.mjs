mkdir -p scripts
cat > scripts/enrich-community-redis.mjs <<'EOF'
#!/usr/bin/env node
// Usage: node scripts/enrich-community-redis.mjs REDIS_URL 'community:crafts' [--dry]
import { createClient } from "redis";

async function resolveSpellFromUrlPreferSpell(url) {
  if (!url) return null;
  if (/\/spell=\d+/.test(url)) return url;
  if (!/\/item=\d+/.test(url)) return url;
  try {
    const teach = url.replace(/(#.*)?$/, "#teaches-recipe");
    let res = await fetch(teach, { redirect: "follow" });
    let finalUrl = res.url || "";
    let m = finalUrl.match(/\/spell=(\d+)/);
    if (!m) {
      const html = await res.text();
      m = html.match(/\/spell=(\d+)/);
    }
    if (m) return `https://www.wowhead.com/mop-classic/fr/spell=${m[1]}`;
  } catch {}
  return url;
}

async function resolveItemFromSpellUrl(spellUrl) {
  try {
    const res = await fetch(spellUrl, { redirect: "follow" });
    const html = await res.text();
    const m = html.match(/\/(?:mop-classic\/fr\/)?item=(\d+)/);
    return m ? `https://www.wowhead.com/mop-classic/fr/item=${m[1]}` : null;
  } catch {
    return null;
  }
}

async function main() {
  const [,, redisUrl, key = "community:crafts", flag] = process.argv;
  const dryRun = flag === "--dry";
  if (!redisUrl) {
    console.error("Usage: node scripts/enrich-community-redis.mjs REDIS_URL 'community:crafts' [--dry]");
    process.exit(1);
  }
  const client = createClient({ url: redisUrl });
  client.on("error", (e) => console.error("Redis error:", e));
  await client.connect();

  const raw = await client.get(key);
  if (!raw) {
    console.log("Key not found or empty:", key);
    process.exit(0);
  }
  let arr;
  try { arr = JSON.parse(raw); } catch { console.error("Invalid JSON at key"); process.exit(1); }
  if (!Array.isArray(arr)) { console.error("Value is not an array"); process.exit(1); }

  let updated = 0;
  const out = [];
  for (const r of arr) {
    const ret = { ...r };
    const url = r.url || r.URL || "";
    const spellUrl = r.SPELL_URL || r.spellUrl || "";
    if (!spellUrl && url) {
      const s = await resolveSpellFromUrlPreferSpell(url);
      if (s && s !== url) {
        ret.SPELL_URL = s;
        const m = s.match(/\/spell=(\d+)/);
        if (m) ret.SPELL_ID = Number(m[1]);
      }
    }
    if (!ret.url && (ret.SPELL_URL || spellUrl)) {
      const itemUrl = await resolveItemFromSpellUrl(ret.SPELL_URL || spellUrl);
      if (itemUrl) ret.url = itemUrl;
    }
    if (ret.SPELL_URL !== r.SPELL_URL || ret.SPELL_ID !== r.SPELL_ID || ret.url !== r.url) updated++;
    out.push(ret);
  }

  if (!dryRun) {
    await client.set(key, JSON.stringify(out));
    console.log(`Updated ${updated}/${arr.length} rows in ${key}`);
  } else {
    console.log(`[dry-run] Would update ${updated}/${arr.length} rows in ${key}`);
  }
  await client.quit();
}
main();
EOF
chmod +x scripts/enrich-community-redis.mjs

