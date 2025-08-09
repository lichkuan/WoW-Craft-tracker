"use client";
import { useEffect, useState } from "react";

type Reagent = { id: number; name: string; url: string; quantity: number };

/**
 * ReagentsBlock
 * - Préfère l'URL du SPELL si dispo.
 * - Si seule une URL ITEM est fournie, tente d'enrichir pour obtenir le SPELL (avec slug du nom).
 */
export default function ReagentsBlock({
  recipeUrl,
  spellUrl,
  recipeName,
}: { recipeUrl?: string; spellUrl?: string; recipeName?: string }) {
  const [resolvedUrl, setResolvedUrl] = useState<string | undefined>(spellUrl || recipeUrl);
  const [data, setData] = useState<Reagent[] | null>(null);

  // Si on n'a qu'une URL ITEM, tenter d'obtenir le SPELL (une seule fois)
  useEffect(() => {
    let mounted = true;
    async function enrich() {
      if (!resolvedUrl || /\/spell=\d+/.test(resolvedUrl) || !/\/item=\d+/.test(resolvedUrl)) return;
      try {
        const res = await fetch("/api/enrich-spell", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: resolvedUrl, name: recipeName || "" }),
        });
        const json = await res.json();
        if (mounted && json?.spellUrl) setResolvedUrl(json.spellUrl);
      } catch {}
    }
    enrich();
    return () => { mounted = false };
  }, [resolvedUrl, recipeName]);

  // Charger les réactifs (idéalement via SPELL)
  useEffect(() => {
    let abort = false;
    async function load() {
      if (!resolvedUrl) return;
      try {
        const r = await fetch(`/api/reagents?url=${encodeURIComponent(resolvedUrl)}`, { cache: "no-store" });
        const json = await r.json();
        if (!abort) setData(Array.isArray(json) ? json : []);
      } catch {
        if (!abort) setData([]);
      }
    }
    load();
    return () => { abort = true };
  }, [resolvedUrl]);

  if (!resolvedUrl || !data || data.length === 0) return null;

  return (
    <div className="mt-2 text-xs text-gray-300 flex flex-wrap gap-2 items-center">
      {data.map((r) => (
        <span key={r.id} className="inline-flex items-center gap-1 bg-gray-800/70 border border-gray-700 rounded px-2 py-0.5">
          <span className="font-mono">{r.quantity}×</span>
          <a href={r.url} target="_blank" rel="noreferrer" className="hover:underline">
            {r.name}
          </a>
        </span>
      ))}
    </div>
  );
}
