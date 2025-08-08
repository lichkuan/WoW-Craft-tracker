"use client";

import React, { useState, useEffect } from "react";

interface Reagent {
  id: number;
  name: string;
  url: string;
  count: number;
}

interface Props {
  recipeUrl?: string;
  recipeId?: number;
}

const ReagentsBlock: React.FC<Props> = ({ recipeUrl, recipeId }) => {
  const [reagents, setReagents] = useState<Reagent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const fetchReagents = async () => {
      setLoading(true);
      setError(null);
      try {
        const param = recipeUrl
          ? `url=${encodeURIComponent(recipeUrl)}`
          : recipeId
          ? `id=${recipeId}`
          : "";
        if (!param) {
          setError("Pas d'URL ou d'ID fourni");
          setLoading(false);
          return;
        }
        const res = await fetch(`/api/reagents?${param}`);
        if (!res.ok) throw new Error(`Erreur API (${res.status})`);
        const data = await res.json();
        setReagents(data.reagents || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchReagents();
  }, [recipeUrl, recipeId]);

  if (loading) {
    return <p className="text-sm text-gray-400">Chargement des composants...</p>;
  }

  if (error) {
    return <p className="text-sm text-red-400">Erreur : {error}</p>;
  }

  if (!reagents.length) {
    return <p className="text-sm text-gray-400">Aucun composant trouvé.</p>;
  }

  return (
    <div className="mt-1">
      <button
        onClick={() => setExpanded((e) => !e)}
        className="text-xs text-red-400 hover:text-red-300 underline"
      >
        {expanded ? "Masquer les composants" : "Voir les composants"}
      </button>
      {expanded && (
        <ul className="mt-1 pl-4 list-disc space-y-1">
          {reagents.map((r) => (
            <li key={r.id} className="text-sm text-gray-200">
              <a
                href={r.url}
                className="qtooltip text-red-300 hover:text-red-200"
                data-wh-icon-size="small"
                target="_blank"
                rel="noopener noreferrer"
              >
                {r.name}
              </a>{" "}
              x{r.count}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ReagentsBlock;
