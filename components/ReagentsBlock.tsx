"use client";
import useSWR from "swr";
import { useEffect, useState } from "react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

/**
 * ReagentsBlock v2
 * - Préfère l'URL du SPELL si dispo (meilleur taux de réussite).
 * - Si seule une URL ITEM est fournie, essaye d'enrichir pour obtenir le SPELL.
 */
export default function ReagentsBlock({
  recipeUrl,
  spellUrl,
}: { recipeUrl?: string; spellUrl?: string }) {
  const [resolvedUrl, setResolvedUrl] = useState<string | undefined>(spellUrl || recipeUrl);

  // Si on n'a qu'une URL ITEM, tente d'obtenir le SPELL côté serveur (une seule fois)
  useEffect(() => {
    let mounted = true;
    async function enrich() {
      if (!resolvedUrl || /\/spell=\d+/.test(resolvedUrl)) return;
      if (!/\/item=\d+/.test(resolvedUrl)) return;
      try {
        const res = await fetch("/api/enrich-spell", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: resolvedUrl }),
        });
        const json = await res.json();
        if (mounted && json?.spellUrl) {
          setResolvedUrl(json.spellUrl);
        }
      } catch {}
    }
    enrich();
    return () => { mounted = false };
  }, [resolvedUrl]);

  const { data } = useSWR(
    resolvedUrl ? `/api/reagents?url=${encodeURIComponent(resolvedUrl)}` : null,
    fetcher
  );

  if (!resolvedUrl || !data || data.length === 0) return null;

  return (
    <div className="mt-2 text-xs text-gray-300 flex flex-wrap gap-2 items-center">
      {data.map((r: any) => (
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
