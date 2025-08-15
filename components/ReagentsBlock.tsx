/* eslint-disable react/no-unescaped-entities */
"use client";

import React, { useEffect, useState } from "react";

type Reagent = {
  id: number;
  name: string;
  url: string;
  quantity: number; // correspond à "qty" côté API
};

export default function ReagentsBlock({
  recipeUrl,
  spellUrl,
  recipeName,
}: {
  recipeUrl: string;
  spellUrl?: string;
  recipeName?: string;
}) {
  const [reagents, setReagents] = useState<Reagent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const urlToUse = spellUrl || recipeUrl;
    if (!urlToUse) {
      setReagents([]);
      return;
    }

    let aborted = false;
    setLoading(true);
    setError(null);

    // on encode correctement l’URL de wowhead dans la query
    fetch(`/api/reagents?url=${encodeURIComponent(urlToUse)}`, {
      cache: "no-store",
    })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: Reagent[] = await r.json();
        if (!aborted) setReagents(Array.isArray(data) ? data : []);
      })
      .catch((e) => {
        if (!aborted) setError(e?.message || "Erreur inconnue");
      })
      .finally(() => {
        if (!aborted) setLoading(false);
      });

    return () => {
      aborted = true;
    };
  }, [recipeUrl, spellUrl]);

  // UI
  if (loading) {
    return (
      <div className="mt-2 ml-10 text-xs text-gray-400">
        Recherche des composants…
      </div>
    );
  }

  if (error) {
    // on n’en fait pas un drame à l’écran, mais on laisse un petit indice
    return (
      <div className="mt-2 ml-10 text-xs text-gray-500">
        Composants indisponibles pour le moment.
      </div>
    );
  }

  if (!reagents || reagents.length === 0) {
    // Pas de composants détectés (ou wowhead ne liste rien) → on n’affiche rien.
    return null;
  }

  return (
    <div className="mt-2 ml-10">
      <div className="flex flex-wrap gap-2">
        {reagents.map((r) => (
          <a
            key={r.id}
            href={r.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-full border border-gray-700 bg-gray-900/60 px-2 py-1 text-xs text-gray-100 hover:border-[#C09A1A] transition"
            title={r.name}
          >
            <span className="font-medium text-[#C09A1A]">x{r.quantity}</span>
            <span className="truncate max-w-[220px]">{r.name}</span>
          </a>
        ))}
      </div>
    </div>
  );
}
