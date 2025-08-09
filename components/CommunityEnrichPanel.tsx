"use client";

import { useState } from "react";

type Result = {
  key: string;
  count: number;
  updated: number;
  dryRun?: boolean;
  message?: string;
  error?: string;
};

export default function CommunityEnrichPanel({
  defaultKey = "community:crafts",
}: {
  defaultKey?: string;
}) {
  const [key, setKey] = useState(defaultKey);
  const [dryRun, setDryRun] = useState(true);
  const [loading, setLoading] = useState(false);
  const [res, setRes] = useState<Result | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function run() {
    setLoading(true);
    setRes(null);
    setErr(null);
    try {
      const r = await fetch("/api/community/enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, dryRun }),
      });
      const json = await r.json();
      if (!r.ok)
        throw new Error(json?.error || "Erreur lors de l'enrichissement.");
      setRes(json);
    } catch (e: any) {
      setErr(e.message || "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-amber-700/40 bg-gray-900/60 p-4 shadow">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-amber-300">
          🔁 Enrichir les crafts Communauté
        </h3>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="text-sm text-gray-300">Clé Redis</span>
          <input
            type="text"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            className="rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-gray-100"
            placeholder="community:crafts"
          />
        </label>

        <label className="flex items-center gap-2 mt-6 sm:mt-0">
          <input
            type="checkbox"
            checked={dryRun}
            onChange={(e) => setDryRun(e.target.checked)}
            className="h-4 w-4"
          />
          <span className="text-sm text-gray-300">
            Dry run (prévisualisation uniquement)
          </span>
        </label>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          onClick={run}
          disabled={loading}
          className="rounded-lg bg-amber-700 hover:bg-amber-600 px-4 py-2 font-medium text-white disabled:opacity-60"
        >
          {loading
            ? "Traitement..."
            : dryRun
            ? "Prévisualiser"
            : "Enrichir maintenant"}
        </button>

        {res && (
          <span className="text-sm text-gray-300">
            Clé <span className="font-mono text-gray-100">{res.key}</span> —{" "}
            {res.count} items, {res.updated} modifiés{" "}
            {res.dryRun ? "(dry-run)" : ""}
          </span>
        )}
        {err && <span className="text-sm text-red-400">{err}</span>}
      </div>

      <p className="mt-3 text-xs text-gray-400">
        Ajoute/complète automatiquement{" "}
        <span className="text-gray-200">SPELL_URL</span> /{" "}
        <span className="text-gray-200">SPELL_ID</span> depuis l’URL ITEM (et
        inversement si besoin).
      </p>
    </div>
  );
}
