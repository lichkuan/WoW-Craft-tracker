"use client";

import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { ChevronDown, ChevronRight, Package } from "lucide-react";

/** Structure renvoyée par /api/reagents (cf. route.ts) */
type ReagentNode = {
  id: number;
  name: string;
  url: string; // item url (FR)
  quantity: number;
  icon?: string; // small icon url (optional, fetched via /api/item-meta)
  children?: ReagentNode[];
};

type Props = {
  /** De préférence l’URL du spell; sinon item ou même l’URL Wowhead de la recette. */
  recipeUrl: string;
  /** Si fourni, on priorise cette URL (souvent l’URL du spell). */
  spellUrl?: string;
  /** Purement affichage (non obligatoire) */
  recipeName?: string;
  /** Profondeur max à demander à l’API (1 = seulement premier niveau) */
  maxDepth?: number;
};

/* ---------- couleurs de rareté ----------
  0: poor (gris), 1: commun (blanc), 2: inhabituel (vert), 3: rare (bleu),
  4: épique (violet), 5: légendaire (orange), 6: artefact (jaune)
----------------------------------------- */
const QUALITY_CLASS: Record<number, string> = {
  0: "text-gray-400 border-gray-600",
  1: "text-gray-100 border-gray-600",
  2: "text-emerald-400 border-emerald-600",
  3: "text-blue-400 border-blue-600",
  4: "text-purple-400 border-purple-600",
  5: "text-orange-400 border-orange-600",
  6: "text-yellow-300 border-yellow-600",
};

// cache qualité item en mémoire (clé: itemId)
const qualityCache = new Map<number, number | undefined>();

async function fetchItemQuality(itemId: number): Promise<number | undefined> {
  if (qualityCache.has(itemId)) return qualityCache.get(itemId);

  const url = `https://www.wowhead.com/tooltip/item/${itemId}?dataEnv=mop-classic&locale=fr_FR`;
  try {
    const r = await fetch(url, { cache: "force-cache" });
    if (!r.ok) throw new Error("tooltip fetch failed");
    const data = (await r.json()) as any;
    const q =
      Number(
        data?.quality ??
          data?.item?.quality ??
          data?.json?.quality ??
          data?.data?.quality
      ) || undefined;
    qualityCache.set(itemId, q);
    return q;
  } catch {
    qualityCache.set(itemId, undefined);
    return undefined;
  }
}

/** Petit chip quantité, compact (tailles augmentées) */
function Qty({ n }: { n: number }) {
  return (
    <span className="ml-2 inline-flex items-center rounded bg-gray-900/60 border border-gray-700 px-2 py-0.5 text-[12px] md:text-sm leading-none font-semibold text-gray-200">
      ×{n}
    </span>
  );
}

/** Une ligne de réactif (un nœud), avec toggle & récursif */
function ReagentRow({
  node,
  depth,
  expandedMap,
  toggle,
  eagerQuality = false,
}: {
  node: ReagentNode;
  depth: number;
  expandedMap: Record<string, boolean>;
  toggle: (key: string) => void;
  eagerQuality?: boolean;
}) {
  // clé d’expansion stable pour ce nœud (chemin basé sur l’id + profondeur)
  const key = useMemo(() => `${depth}-${node.id}`, [depth, node.id]);
  const isExpanded = expandedMap[key] ?? false;

  const [quality, setQuality] = useState<number | undefined>(undefined);

  // qualité: ne requête que niveaux visibles OU demander dès le 1er niveau (eager)
  useEffect(() => {
    let ignore = false;
    const doFetch = async () => {
      if (node?.id) {
        const q = await fetchItemQuality(node.id);
        if (!ignore) setQuality(q);
      }
    };
    if (eagerQuality || isExpanded || depth === 1) void doFetch();
    return () => {
      ignore = true;
    };
  }, [node?.id, isExpanded, depth, eagerQuality]);

  const qualityClass =
    typeof quality === "number" ? QUALITY_CLASS[quality] ?? "" : "";

  const hasChildren = (node.children?.length ?? 0) > 0;

  return (
    <div className="w-full">
      <button
        className={`group w-full flex items-center justify-between rounded-lg border bg-gray-800/60 hover:bg-gray-700/60 transition px-2 py-1.5 mb-1 ${qualityClass}`}
        onClick={() => (hasChildren ? toggle(key) : window.open(node.url, "_blank"))}
        type="button"
      >
        <div className="min-w-0 flex items-center gap-2 text-left">
          {hasChildren ? (
            isExpanded ? (
              <ChevronDown className="h-3.5 w-3.5 text-gray-300 flex-shrink-0" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 text-gray-300 flex-shrink-0" />
            )
          ) : node.icon ? (
            <Image
              src={node.icon}
              alt="Icône du composant"
              width={20}
              height={20}
              className="rounded bg-gray-900/40 ring-1 ring-gray-700 flex-shrink-0"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <Package className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
          )}

          {/* Lien Wowhead (ouvre nouvel onglet si clic directement) */}
          <a
            href={node.url}
            target="_blank"
            rel="noopener noreferrer"
            className="truncate text-[13px] md:text-sm text-gray-100 hover:underline"
            onClick={(e) => e.stopPropagation()}
            title={node.name}
          >
            {node.name}
          </a>

          <Qty n={node.quantity} />
        </div>

        {hasChildren && (
          <span className="text-[10px] text-gray-400">
            {node.children?.length} sous-composant
            {node.children!.length > 1 ? "s" : ""}
          </span>
        )}
      </button>

      {/* enfants */}
      {hasChildren && isExpanded && (
        <div className="pl-3 md:pl-5">
          {node.children!.map((child) => (
            <ReagentRow
              key={`${key}-${child.id}`}
              node={child}
              depth={depth + 1}
              expandedMap={expandedMap}
              toggle={toggle}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/** Bloc principal (récupère l’arbre et rend la liste) */
const ReagentsBlock: React.FC<Props> = ({
  recipeUrl,
  spellUrl,
  recipeName,
  maxDepth = 3, // 3 niveaux par défaut; passer 1 pour “premier niveau uniquement”
}) => {
  const urlToUse = spellUrl || recipeUrl;

  const [tree, setTree] = useState<ReagentNode[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // état d’expansion: clé -> bool
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const fetchTree = async () => {
    setLoading(true);
    setError(null);
    try {
      const p = new URLSearchParams();
      p.set("url", urlToUse);
      p.set("maxDepth", String(maxDepth));
      p.set("t", String(Date.now()));
      const r = await fetch(`/api/reagents?${p.toString()}`, {
        cache: "no-store",
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = (await r.json()) as ReagentNode[];

      // 🔁 Batch meta: complete names + icons for all first-level nodes
      const ids = Array.from(new Set(data.map(n => n.id)));
      if (ids.length) {
        try {
          const rr = await fetch(`/api/item-meta?ids=${ids.join(',')}`, { cache: "no-store" });
          if (rr.ok) {
            const map = (await rr.json()) as Record<string, { name?: string; iconUrl?: string }>;
            for (const node of data) {
              const m = map[String(node.id)];
              if (m?.name) node.name = m.name;
              if (m?.iconUrl) node.icon = m.iconUrl;
            }
          }
        } catch {
          // ignore
        }
      }

      setTree(data);
    } catch (e: any) {
      setError(e?.message || "Erreur inconnue");
      setTree([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchTree();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlToUse, maxDepth]);

  const hasData = (tree?.length ?? 0) > 0;

  const toggle = (key: string) =>
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));

  if (loading && !tree) {
    return (
      <div className="mt-2 rounded-lg border border-gray-700 bg-gray-800/70 p-3 text-sm text-gray-300">
        Chargement des composants…
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-2 rounded-lg border border-red-700 bg-red-900/30 p-3 text-sm text-red-200">
        Impossible de récupérer les composants{recipeName ? ` pour "${recipeName}"` : ""}. {error}
      </div>
    );
  }

  if (!hasData) {
    return (
      <div className="mt-2 rounded-lg border border-gray-700 bg-gray-800/60 p-3 text-sm text-gray-400">
        Aucun composant trouvé.
      </div>
    );
  }

  return (
    <div className="mt-2 rounded-lg border border-gray-700 bg-gray-800/50 p-2">
      <div className="mb-1 flex items-center gap-2">
        <div className="text-[13px] font-semibold text-yellow-300">Composants</div>
      </div>

      <div>
        {tree!.map((node) => (
          <ReagentRow
            key={`1-${node.id}`}
            node={node}
            depth={1}
            expandedMap={expanded}
            toggle={toggle}
            eagerQuality
          />
        ))}
      </div>
    </div>
  );
};

export default ReagentsBlock;