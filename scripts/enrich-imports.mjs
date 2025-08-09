#!/usr/bin/env node
// Usage: node scripts/enrich-imports.mjs input.csv output.csv
import fs from "node:fs/promises";

const [,, inputPath, outputPath] = process.argv;
if (!inputPath || !outputPath) {
  console.error("Usage: node scripts/enrich-imports.mjs input.csv output.csv");
  process.exit(1);
}

// Lightweight CSV parse (expects header)
function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(Boolean);
  const headers = lines.shift().split(",").map(s => s.trim());
  return lines.map(line => {
    const cells = line.split(","); // naive; OK for simple CSVs without commas in fields
    const obj = {};
    headers.forEach((h, i) => obj[h] = (cells[i] ?? "").trim());
    return obj;
  });
}

function toCSV(rows) {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(",")];
  for (const r of rows) {
    lines.push(headers.map(h => (r[h] ?? "")).join(","));
  }
  return lines.join("\n");
}

// Enrichment using Wowhead redirects (same heuristics as API)
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
  const csv = await fs.readFile(inputPath, "utf8");
  const rows = parseCSV(csv);
  for (const r of rows) {
    const url = r.URL || r.url || "";
    const spellUrl = r.SPELL_URL || r.spellUrl || "";
    let finalSpell = spellUrl;
    if (!finalSpell && url) finalSpell = await resolveSpellFromUrlPreferSpell(url);
    if (finalSpell) {
      r.SPELL_URL = finalSpell;
      const m = finalSpell.match(/\/spell=(\d+)/);
      if (m) r.SPELL_ID = m[1];
    }
    if (!r.URL && finalSpell) {
      const itemUrl = await resolveItemFromSpellUrl(finalSpell);
      if (itemUrl) r.URL = itemUrl;
    }
  }
  await fs.writeFile(outputPath, toCSV(rows), "utf8");
  console.log("Enrich done ->", outputPath);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
