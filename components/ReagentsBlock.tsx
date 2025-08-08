// components/ReagentsBlock.tsx
// Renders a Reagents list like the screenshot, using Wowhead tooltips on each reagent link.
import React, { useEffect, useState } from "react";

type Reagent = {
  id: number;
  name: string;
  url: string;
  count: number;
};

export default function ReagentsBlock({ recipeUrl, recipeId }: { recipeUrl?: string; recipeId?: number }) {
  const [reagents, setReagents] = useState<Reagent[]>([]);
  const [expanded, setExpanded] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function run() {
      try {
        setLoading(true);
        setError(null);
        const qs = recipeUrl ? `url=${encodeURIComponent(recipeUrl)}` : `id=${recipeId}`;
        const res = await fetch(`/api/reagents?${qs}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "API error");
        if (active) setReagents(data.reagents || []);
      } catch (e: any) {
        setError(e.message ?? "Erreur inconnue");
      } finally {
        setLoading(false);
      }
    }
    if (recipeUrl || recipeId) run();
    return () => { active = false; };
  }, [recipeUrl, recipeId]);

  return (
    <div className="mt-2">
      <div className="flex items-center justify-between">
        <h5 className="text-sm font-semibold text-gray-200">Reagents</h5>
        <div className="space-x-2">
          <button
            onClick={() => setExpanded(true)}
            className="px-2 py-1 text-xs bg-green-700 hover:bg-green-600 rounded"
          >
            + Expand All
          </button>
          <button
            onClick={() => setExpanded(false)}
            className="px-2 py-1 text-xs bg-green-700 hover:bg-green-600 rounded"
          >
            − Collapse All
          </button>
        </div>
      </div>

      {loading && <div className="text-gray-400 text-xs mt-2">Chargement des composants…</div>}
      {error && <div className="text-red-400 text-xs mt-2">Erreur: {error}</div>}

      {expanded && reagents.length > 0 && (
        <ul className="mt-2 space-y-1">
          {reagents.map((r) => (
            <li key={r.id} className="flex items-center justify-between bg-gray-700 rounded px-2 py-1">
              <div className="flex items-center space-x-2">
                {/* Lien Wowhead avec tooltip */}
                <a
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline text-sm"
                >
                  {r.name || `Item #${r.id}`}
                </a>
              </div>
              <span className="text-xs bg-gray-800 border border-gray-600 rounded px-2 py-0.5">
                × {r.count}
              </span>
            </li>
          ))}
        </ul>
      )}

      {expanded && reagents.length === 0 && !loading && !error && (
        <div className="text-gray-400 text-xs mt-2">Aucun composant trouvé.</div>
      )}
    </div>
  );
}
