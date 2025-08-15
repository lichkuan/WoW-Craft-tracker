/* eslint-disable react/no-unescaped-entities */
"use client";

"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,     // ⬅️ ajoute/maintiens ceci
  useMemo,
} from "react";

import Script from "next/script";
import {
  ChevronDown,
  ChevronRight,
  Upload,
  User,
  Share,
  Search,
  Trash2,
  Plus,
  X,
  Edit,
  Filter,
  HelpCircle,
} from "lucide-react";
import ReagentsBlock from "./ReagentsBlock";

interface Character {
  id: string;
  name: string;
  server: string;
  level: number;
  race: string;
  class: string;
  guild: string;
  faction: "alliance" | "horde";
  profession1: string;
  profession2: string;
  professionLevels: { [profession: string]: number };
  crafts: { [profession: string]: CraftItem[] };
}

interface CraftItem {
  id: string;
  name: string;
  url: string;
  spellUrl?: string;
  category: string;
}

interface PublicCharacter extends Character {
  shareId: string;
  craftCounts: { [profession: string]: number };
}

interface RareRecipe {
  id: number;
  name: string;
  type: string;
  profession: string;
  url: string;
  spellUrl?: string;
  source: string;
  crafters: string[];
}

// Mapping des types CSV vers les métiers du jeu
const RECIPE_TYPE_TO_PROFESSION: Record<string, string> = {
  "Formule d'enchantement": "Enchantement",
  "Dessin de joaillerie": "Joaillerie",
  "Patron de couture": "Couture",
  "Plans de forge": "Forge",
  "Armures en plaques": "Forge",
  "Schéma d'ingénierie": "Ingénierie",
  "Recette d'alchimie": "Alchimie",
  "Patron de travail du cuir": "Travail du cuir",
  "Technique de calligraphie": "Calligraphie",
};

// Composant SearchBar — version stable (debounce + focus OK)
const SearchBar = ({
  searchTerm,
  onSearchChange,
  placeholder = "Rechercher une recette...",
}: {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  placeholder?: string;
}) => {
  // état local pour refléter immédiatement la saisie
  const [localValue, setLocalValue] = useState(searchTerm);
  const timeoutRef = useRef<number | null>(null);

  // garde l'UI en phase si la valeur parent change (ex: bouton "X" externe)
  useEffect(() => {
    setLocalValue(searchTerm);
  }, [searchTerm]);

  // debounce propre côté client
  useEffect(() => {
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => {
      onSearchChange(localValue);
    }, 250);
    return () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, [localValue, onSearchChange]);

  return (
    <div className="mb-6">
      <div className="bg-gray-800 rounded-lg p-4 border border-red-700 flex items-center space-x-4">
        <Search className="w-5 h-5 text-red-400" aria-hidden="true" />
        <input
          type="search"
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          placeholder={placeholder}
          className="flex-1 bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:border-red-600 focus:outline-none"
          autoComplete="off"
          inputMode="search"
          enterKeyHint="search"
          aria-label="Rechercher une recette"
        />
        {localValue && (
          <button
            onClick={() => setLocalValue("")}
            className="text-gray-400 hover:text-white"
            type="button"
            aria-label="Effacer la recherche"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};


// Panneau latéral d’instructions (slide-over)
function InstructionsDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-black/50 transition-opacity z-40 ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      {/* Drawer */}
      <aside
        className={`fixed right-0 top-0 h-full w-full max-w-md bg-gray-900 text-white z-50 transform transition-transform duration-300 ease-out border-l border-gray-700 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        aria-hidden={!open}
        aria-label="Panneau d'instructions"
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-xl font-bold text-yellow-400">📋 Instructions</h2>
          <button
            onClick={onClose}
            className="p-2 rounded hover:bg-gray-800"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 text-sm leading-6">
          <ol className="space-y-2 list-decimal list-inside">
            <li>
              Installez l&apos;addon :{" "}
              <a
                href="https://www.curseforge.com/wow/addons/simple-trade-skill-exporter"
                target="_blank"
                rel="noopener noreferrer"
                className="text-yellow-300 underline"
              >
                Simple Trade Skill Exporter
              </a>
            </li>
            <li>
              Dans le jeu :
              <ul className="ml-5 mt-1 list-disc space-y-1">
                <li>Ouvrez votre métier</li>
                <li>
                  Tapez :{" "}
                  <code className="px-2 py-1 rounded bg-gray-800 text-yellow-300">
                    /tsexport markdown
                  </code>
                </li>
                <li>Copiez avec Ctrl+C</li>
                <li>Collez dans ce site après avoir créé votre personnage</li>
                <li>Cliquez sur PARTAGER (important)</li>
              </ul>
            </li>
          </ol>
        </div>
      </aside>
    </>
  );
}

const WoWCraftingTracker: React.FC = () => {
  const [view, setView] = useState<
    "home" | "create" | "character" | "edit" | string
  >("home");
  const [characters, setCharacters] = useState<Character[]>([]);
  const [currentCharacter, setCurrentCharacter] = useState<Character | null>(
    null
  );
  const [editingCharacter, setEditingCharacter] = useState<Character | null>(
    null
  );
  const [publicCharacters, setPublicCharacters] = useState<PublicCharacter[]>(
    []
  );
  const [importText, setImportText] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<{
    [key: string]: boolean;
  }>({});
  const [allExpanded, setAllExpanded] = useState<{ [key: string]: boolean }>(
    {}
  );
  const [loading, setLoading] = useState(false);
  const [rareRecipes, setRareRecipes] = useState<RareRecipe[]>([]);
  const [rareRecipesLoading, setRareRecipesLoading] = useState(false);
  const [selectedProfessions, setSelectedProfessions] = useState<string[]>([]);
  const [rareRecipeSearchTerm, setRareRecipeSearchTerm] = useState("");
  const [allRareRecipesExpanded, setAllRareRecipesExpanded] = useState(false);
  const [expandedRareProfessions, setExpandedRareProfessions] = useState<{
    [profession: string]: boolean;
  }>({});
  const [helpOpen, setHelpOpen] = useState(false);

  const professions = [
    "Alchimie",
    "Forge",
    "Enchantement",
    "Ingénierie",
    "Herboristerie",
    "Joaillerie",
    "Travail du cuir",
    "Minage",
    "Calligraphie",
    "Couture",
  ];
  const races = {
    alliance: [
      "Humain",
      "Nain",
      "Elfe de la nuit",
      "Gnome",
      "Draeneï",
      "Worgen",
      "Pandaren",
    ],
    horde: [
      "Orc",
      "Mort-vivant",
      "Tauren",
      "Troll",
      "Elfe de sang",
      "Gobelin",
      "Pandaren",
    ],
  };
  const classes = [
    "Guerrier",
    "Paladin",
    "Chasseur",
    "Voleur",
    "Prêtre",
    "Chaman",
    "Mage",
    "Démoniste",
    "Moine",
    "Druide",
  ];

  const generateShareId = () =>
    Math.random().toString(36).substring(2, 8).toUpperCase();

  // Helpers tolérants à undefined
  const getProfessionLevelName = (level?: number): string => {
    if (!level || level <= 0) return "Inconnu";
    if (level <= 60) return "Apprenti";
    if (level <= 140) return "Compagnon";
    if (level <= 205) return "Expert";
    if (level <= 300) return "Artisan";
    if (level <= 350) return "Maître";
    if (level <= 425) return "Grand Maître";
    if (level <= 500) return "Illustre";
    if (level <= 600) return "Zen";
    return "Inconnu";
  };

  const getProfessionLevelIcon = (level?: number): string => {
    if (!level || level <= 0) return "";
    if (level <= 60) return "⭐";
    if (level <= 140) return "⭐⭐";
    if (level <= 205) return "⭐⭐⭐";
    if (level <= 300) return "🔥";
    if (level <= 350) return "💎";
    if (level <= 425) return "⚡";
    if (level <= 500) return "🌟";
    if (level <= 600) return "👑";
    return "";
  };

  const getProfessionLevelColor = (level?: number): string => {
    if (!level || level <= 0) return "text-gray-400";
    if (level <= 60) return "text-gray-400";
    if (level <= 140) return "text-green-400";
    if (level <= 205) return "text-red-400";
    if (level <= 300) return "text-orange-400";
    if (level <= 350) return "text-red-400";
    if (level <= 425) return "text-[#C09A1A]";
    if (level <= 500) return "text-blue-400";
    if (level <= 600) return "text-pink-400";
    return "text-gray-400";
  };

  const toggleAllCategories = useCallback(
    (profession: string, categories: string[]) => {
      const isCurrentlyAllExpanded = allExpanded[profession] || false;
      const newState = !isCurrentlyAllExpanded;

      setAllExpanded((prev) => ({
        ...prev,
        [profession]: newState,
      }));

      const updates: { [key: string]: boolean } = {};
      categories.forEach((category) => {
        updates[`${profession}-${category}`] = newState;
      });

      setExpandedCategories((prev) => ({
        ...prev,
        ...updates,
      }));
    },
    [allExpanded]
  );

  const handleSearchChange = useCallback((value: string) => {
    setSearchTerm(value);
  }, []);

  const extractProfessionLevel = (text: string, profession: string): number => {
    const lines = text.split("\n");

    for (const line of lines) {
      const lowerLine = line.toLowerCase();
      const professionLower = profession.toLowerCase();

      // Ex: "... skill 523 ... Enchantement ..."
      if (lowerLine.includes("skill") && lowerLine.includes(professionLower)) {
        const skillMatch = line.match(/skill\s+(\d+)/i);
        const levelStr = skillMatch?.[1];
        if (levelStr) return parseInt(levelStr, 10);
      }

      // Ex: "Enchantement (523/600)"
      const pattern = new RegExp(`${professionLower}.*\\((\\d+)\/(\\d+)\\)`, "i");
      const match = line.match(pattern);
      const levelFromParen = match?.[1];
      if (levelFromParen) return parseInt(levelFromParen, 10);

      // Ex: "... Enchantement ... level 523 ..." ou "... niveau 523 ..."
      if (
        lowerLine.includes(professionLower) &&
        (lowerLine.includes("level") || lowerLine.includes("niveau"))
      ) {
        const levelMatch = line.match(/(\d+)/);
        const lm = levelMatch?.[1];
        if (lm) return parseInt(lm, 10);
      }
    }

    return 0;
  };

  const parseMarkdown = (
    text: string,
    profession: string = ""
  ): { items: CraftItem[]; level: number } => {
    const items = text
      .split("\n")
      .filter((line) => line.trim().startsWith("- [") && line.includes("]("))
      .map((line) => {
        const match = line.match(/^- \[([^\]]+)\]\(([^)]+)\)$/);
        if (!match) return null;

        const name = match[1] ?? "";
        const rawUrl = match[2] ?? "";
        if (!rawUrl) return null;

        let url = rawUrl;
        if (url.includes("/cata/")) {
          url = url.replace("/cata/", "/mop-classic/fr/");
        }

        return {
          id: Math.random().toString(36).slice(2, 11),
          name,
          url,
          category: categorizeItem(name),
        } as CraftItem;
      })
      .filter(Boolean) as CraftItem[];

    const level = profession ? extractProfessionLevel(text, profession) : 0;
    return { items, level };
  };

  const generateDiscordMessage = (character: Character): string => {
    const totalRecipes = Object.values(character.crafts || {}).reduce(
      (total, recipes) => total + recipes.length,
      0
    );
    const characterProfessions = [
      character.profession1,
      character.profession2,
    ].filter(Boolean);

    let message = `🎮 **${character.name}** - Niveau ${character.level} ${character.race} ${character.class}\n`;
    message += `${
      character.faction === "alliance" ? "🛡️ Alliance" : "⚔️ Horde"
    } | ${character.server}${character.guild ? ` | ${character.guild}` : ""}\n\n`;

    characterProfessions.forEach((prof) => {
      const level = character.professionLevels?.[prof] || 0;
      const count = character.crafts[prof]?.length || 0;
      const icon = getProfessionLevelIcon(level);
      message += `${icon} **${prof}** ${level > 0 ? `niveau ${level}` : ""} - ${count} recettes\n`;
    });

    message += `\n📊 **Total : ${totalRecipes} recettes**\n`;
    message += `🔗 Voir le profil complet : ${window.location.origin}${window.location.pathname}?share=`;

    return message;
  };

  const categorizeItem = (name: string): string => {
    const lower = name.toLowerCase();

    // Armes
    if (
      /(arme|épée|hache|masse|dague|bâton|arbalète|fusil|carabine|arc|glaive|hast|lance|boomerang)/.test(
        lower
      )
    )
      return "Armes";

    // Armures (slots)
    if (/(tête|heaume|casque)/.test(lower)) return "Têtes";
    if (/(épaulière|épaules|spallières)/.test(lower)) return "Épaules";
    if (/(torse|plastron|armure|cuirasse|robe|tunique)/.test(lower))
      return "Plastrons";
    if (/(ceinture|baudrier|ceinturon)/.test(lower)) return "Ceintures";
    if (/(jambières|jambes|pantalon|kilt)/.test(lower)) return "Jambières";
    if (/(bottes|chaussures|sandales|sabots)/.test(lower)) return "Bottes";
    if (/(gants|gantelets|mains|mitaines)/.test(lower)) return "Gants";
    if (/(poignets|bracelets|brassards|manchettes)/.test(lower))
      return "Poignets";
    if (/(cape|manteau|drapé|châle)/.test(lower)) return "Capes";
    if (/(bouclier|pavois)/.test(lower)) return "Boucliers";

    // Bijoux & accessoires
    if (/(anneau|bague)/.test(lower)) return "Anneaux";
    if (/(collier|pendentif|médaillon)/.test(lower)) return "Colliers";
    if (/(bijou|breloque|fétiche|trinket)/.test(lower)) return "Bijoux";
    if (/(tabard)/.test(lower)) return "Tabards";
    if (/(chemise|shirt)/.test(lower)) return "Chemises";

    // Consommables / composants
    if (
      /(potion|élixir|flasque|huile|banquet|nourriture|festin|ragoût|biscuit)/.test(
        lower
      )
    )
      return "Consommables";
    if (/(parchemin|glyphe|glyph)/.test(lower)) return "Glyphes/Parchemins";
    if (/(gemme|pierre|métagemme|prisme)/.test(lower)) return "Gemmes";

    // Divers utiles
    if (/(monture|mount)/.test(lower)) return "Montures";
    if (/(familier|companion|pet)/.test(lower)) return "Familiers";
    if (/(sac|besace|sacoche|bag)/.test(lower)) return "Sacs";
    if (/(tissu|étoffe|cuir|maille|plaques)/.test(lower)) return "Matériaux";

    return "Autres";
  };

  const getItemIdFromUrl = (url: string) => {
    if (!url) return null;
    const cleanUrl = url.replace(/\s+/g, "");
    const match = cleanUrl.match(/item=(\d+)/);
    return match ? match[1] : null;
  };

  const getSpellIdFromUrl = (url?: string) => {
    if (!url) return null;
    const cleanUrl = url.replace(/\s+/g, "");
    const match = cleanUrl.match(/spell=(\d+)/);
    return match ? match[1] : null;
  };

  const loadRareRecipes = useCallback(async () => {
    try {
      setRareRecipesLoading(true);

      // CSV enrichi (SPELL ID / SPELL URL)
      const response = await fetch(
        "/Recettes_MoP_90__Liens_Wowhead_ENRICHED.csv"
      );
      if (!response.ok) {
        console.error("Fichier CSV enrichi non trouvé dans /public/");
        return;
      }

      const csvText = await response.text();

      // Colonnes: 0:ID, 1:Name, 2:Source, 3:Type, 4:URL, 5:SPELL ID, 6:SPELL URL, 7:Fetch Status
      const lines = csvText.split("\n");
      const data = lines
        .slice(1)
        .filter((line) => line.trim())
        .map((line) => {
          const values = line.split(",");
          const idRaw = (values[0] ?? "").trim();
          const ID = Number.parseInt(idRaw, 10) || 0;
          const Name = (values[1] || "").replace(/"/g, "");
          const Source = (values[2] || "").replace(/"/g, "");
          const Type = (values[3] || "").replace(/"/g, "");
          const URL = (values[4] || "").replace(/"/g, "");
          const SPELL_ID = (values[5] || "").replace(/"/g, "");
          const SPELL_URL = (values[6] || "").replace(/"/g, "");

          const preferredURL = SPELL_URL || URL;

          return {
            ID,
            Name,
            Source,
            Type,
            URL: preferredURL,
            _rawItemURL: URL,
            _spellId: SPELL_ID,
            _spellURL: SPELL_URL,
          };
        });

      const processedRecipes: RareRecipe[] = [];
      const seenIds = new Set<number>();

      data.forEach((row: any) => {
        if (!row || !row.ID) return;
        if (seenIds.has(row.ID)) return;
        seenIds.add(row.ID);

        const profession =
          RECIPE_TYPE_TO_PROFESSION[
            row.Type as keyof typeof RECIPE_TYPE_TO_PROFESSION
          ];
        if (!profession) return;

        const cleanRecipeName = row.Name.replace(
          /^(Formule|Dessin|Patron|Plans|Schéma|Recette|Technique)\s*:\s*/i,
          ""
        )
          .toLowerCase()
          .trim();

        const recipeItemId = String(row.ID || "");
        const recipeSpellId = String(row._spellId || "");

        const crafters: string[] = [];
        publicCharacters.forEach((character) => {
          const characterCrafts = character.crafts?.[profession] || [];

          const hasRecipe = characterCrafts.some((craft) => {
            const craftName = craft.name.toLowerCase();
            const craftItemId = getItemIdFromUrl(craft.url);
            const craftSpellId = getSpellIdFromUrl(craft.spellUrl || craft.url);

            if (
              craftName.includes(cleanRecipeName) ||
              cleanRecipeName.includes(craftName)
            ) {
              return true;
            }
            if (craftItemId && recipeItemId && craftItemId == recipeItemId) {
              return true;
            }
            if (craftSpellId && recipeSpellId && craftSpellId == recipeSpellId) {
              return true;
            }
            return false;
          });

          if (hasRecipe) {
            crafters.push(character.name);
          }
        });

        if (crafters.length > 0) {
          const rare: RareRecipe = {
            id: row.ID,
            name: row.Name,
            type: row.Type,
            profession,
            url: row.URL,
            source: row.Source,
            crafters,
          };
          if (row._spellURL) rare.spellUrl = row._spellURL;
          processedRecipes.push(rare);
        }
      });

      processedRecipes.sort((a, b) => a.name.localeCompare(b.name));
      setRareRecipes(processedRecipes);
    } catch (error) {
      console.error("Erreur chargement recettes rares:", error);
    } finally {
      setRareRecipesLoading(false);
    }
  }, [publicCharacters]);

  const saveCharacter = useCallback(async (
    character: Character
  ): Promise<string | null> => {
    try {
      const shareId = generateShareId();
      const response = await fetch("/api/character", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shareId, character }),
      });
      return response.ok ? shareId : null;
    } catch (error) {
      console.error("Erreur sauvegarde:", error);
      return null;
    }
  }, []);

  const loadSharedCharacter = useCallback(async (shareId: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/character/${shareId}`);
      if (response.ok) {
        const character = await response.json();
        setCurrentCharacter(character);
        setView("character");
      }
    } catch (error) {
      console.error("Erreur chargement:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadPublicCharacters = useCallback(async () => {
    try {
      const timestamp = Date.now();
      const response = await fetch(`/api/characters/public?t=${timestamp}`, {
        cache: "no-cache",
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
        },
      });

      if (response.ok) {
        const chars = await response.json();
        setPublicCharacters([]);
        setTimeout(() => {
          setPublicCharacters(chars);
        }, 100);
      }
    } catch (error) {
      console.error("Erreur chargement public:", error);
    }
  }, []);

  const deleteCharacter = async (character: Character) => {
    if (!confirm(`Supprimer ${character.name} ?`)) return;

    try {
      await fetch("/api/character/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          characterName: character.name,
          characterServer: character.server,
        }),
      });

      setCharacters((chars) => chars.filter((c) => c.id !== character.id));
      if (currentCharacter?.id === character.id) {
        setCurrentCharacter(null);
        setView("home");
      }
      loadPublicCharacters();
    } catch (error) {
      console.error("Erreur suppression:", error);
    }
  };

  const createCharacter = (data: any) => {
    const character: Character = {
      ...data,
      id: Math.random().toString(36).slice(2, 11),
      professionLevels: {},
      crafts: {},
    };
    setCharacters((prev) => [...prev, character]);
    setCurrentCharacter(character);
    setView("character");
  };

  const updateCharacter = (updatedData: any) => {
    if (!editingCharacter) return;

    const updatedCharacter: Character = {
      ...editingCharacter,
      ...updatedData,
      professionLevels: editingCharacter.professionLevels,
      crafts: editingCharacter.crafts,
    };

    setCharacters((chars) =>
      chars.map((c) => (c.id === editingCharacter.id ? updatedCharacter : c))
    );
    setCurrentCharacter(updatedCharacter);
    setEditingCharacter(null);
    setView("character");
  };

  const importCrafts = (profession: string) => {
    if (!importText.trim() || !currentCharacter) return;

    const { items, level } = parseMarkdown(importText, profession);
    const updated = {
      ...currentCharacter,
      professionLevels: {
        ...currentCharacter.professionLevels,
        [profession]: level,
      },
      crafts: { ...currentCharacter.crafts, [profession]: items },
    };

    setCharacters((chars) =>
      chars.map((c) => (c.id === currentCharacter.id ? updated : c))
    );
    setCurrentCharacter(updated);
    setImportText("");
    setView("character");
  };

  const shareCharacter = async () => {
    if (!currentCharacter) return;

    setLoading(true);
    try {
      const shareId = await saveCharacter(currentCharacter);
      if (shareId) {
        const url = `${window.location.origin}?share=${shareId}`;
        await navigator.clipboard.writeText(url);
        alert("Lien copié !");
        loadPublicCharacters();
      }
    } catch (error) {
      alert("Erreur lors du partage");
    } finally {
      setLoading(false);
    }
  };

  const shareToDiscord = async () => {
    if (!currentCharacter) return;

    try {
      const shareId = await saveCharacter(currentCharacter);
      if (shareId) {
        const message = generateDiscordMessage(currentCharacter) + shareId;
        await navigator.clipboard.writeText(message);
        alert(
          "Message Discord copié ! Collez-le dans votre serveur Discord 🎮"
        );
      }
    } catch (error) {
      console.error("Erreur Discord:", error);
    }
  };

  const filteredRareRecipes = useMemo(() => {
    let filtered = rareRecipes;

    // Filtre par profession sélectionnée
    if (selectedProfessions.length > 0) {
      filtered = filtered.filter((recipe) =>
        selectedProfessions.includes(recipe.profession)
      );
    }

    // Filtre par terme de recherche
    if (rareRecipeSearchTerm) {
      filtered = filtered.filter(
        (recipe) =>
          recipe.name
            .toLowerCase()
            .includes(rareRecipeSearchTerm.toLowerCase()) ||
          recipe.crafters.some((crafter) =>
            crafter.toLowerCase().includes(rareRecipeSearchTerm.toLowerCase())
          )
      );
    }

    return filtered;
  }, [rareRecipes, selectedProfessions, rareRecipeSearchTerm]);

  const availableProfessions = useMemo(() => {
    const profs = new Set<string>();
    rareRecipes.forEach((recipe) => profs.add(recipe.profession));
    return Array.from(profs).sort();
  }, [rareRecipes]);

  useEffect(() => {
    const saved = localStorage.getItem("wowCharacters");
    if (saved) {
      const parsedCharacters = JSON.parse(saved);
      const migratedCharacters = parsedCharacters.map((char: any) => ({
        ...char,
        professionLevels: char.professionLevels || {},
      }));
      setCharacters(migratedCharacters);
    }

    loadPublicCharacters();

    const shareId = new URLSearchParams(window.location.search).get("share");
    if (shareId) loadSharedCharacter(shareId);
  }, [loadPublicCharacters, loadSharedCharacter]);

  useEffect(() => {
    localStorage.setItem("wowCharacters", JSON.stringify(characters));
  }, [characters]);

  useEffect(() => {
    if (publicCharacters.length > 0) {
      loadRareRecipes();
    }
  }, [publicCharacters, loadRareRecipes]);

  const toggleAllRareRecipes = () => {
    const newState = !allRareRecipesExpanded;
    setAllRareRecipesExpanded(newState);

    const updates: { [profession: string]: boolean } = {};
    availableProfessions.forEach((profession) => {
      updates[profession] = newState;
    });
    setExpandedRareProfessions(updates);
  };

  const RareRecipesSection = () => {
    if (rareRecipesLoading) {
      return (
        <div className="bg-gray-800 rounded-2xl p-8 border border-red-700 shadow-md mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-3xl font-extrabold text-[#C09A1A] tracking-wide mb-2">
                ✨ Recettes Rares
              </h2>
              <p className="text-gray-300">
                Découvrez qui peut crafter les recettes les plus recherchées de
                MoP Classic, notamment ceux des diverses réputations et loot de raid.
                Pour les autres crafts, allez directement dans Communauté
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-[#d8b55c]">
                {filteredRareRecipes.length}
              </div>
              <div className="text-sm text-gray-400">recettes disponibles</div>
            </div>
          </div>
        </div>
      );
    }

    if (rareRecipes.length === 0) {
      return (
        <div className="bg-gray-800 rounded-lg p-6 border border-red-700 mb-4">
          <h2 className="text-3xl font-extrabold text-[#C09A1A] tracking-wide mb-6">
            ✨ Recettes Rares
          </h2>
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📜</div>
            <h3 className="text-2xl font-bold text-[#d8b55c] mb-4">
              Aucune recette rare détectée
            </h3>
            <p className="text-gray-400">
              Les recettes rares apparaîtront ici quand des personnages
              <br />
              avec des formules, patrons ou plans spéciaux seront partagés.
            </p>
          </div>
        </div>
      );
    }

    const recipesByProfession = filteredRareRecipes.reduce<Record<string, RareRecipe[]>>(
      (acc, recipe) => {
        const key = recipe.profession;
        const bucket = acc[key] ?? (acc[key] = []);
        bucket.push(recipe);
        return acc;
      },
      {}
    );

    const professionIcons: Record<string, string> = {
      Enchantement: "✨",
      Joaillerie: "💎",
      Couture: "🧵",
      Forge: "🔨",
      Ingénierie: "⚙️",
      Alchimie: "🧪",
      "Travail du cuir": "🦬",
      Calligraphie: "📜",
    };

    return (
      <div className="bg-gray-800 rounded-2xl p-8 border border-red-700 shadow-md mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-3xl font-extrabold text-[#C09A1A] tracking-wide mb-2">
              ✨ Recettes Rares
            </h2>
            <p className="text-gray-300">
              Découvrez qui peut crafter les recettes les plus recherchées de
              MoP Classic, notamment ceux des diverses réputations et loot de raid.
              Pour les autres crafts, allez directement dans Communauté
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-[#d8b55c]">
              {filteredRareRecipes.length}
            </div>
            <div className="text-sm text-gray-400">recettes disponibles</div>
          </div>
        </div>

        {/* Contrôles de filtrage et d'expansion */}
        <div className="mb-6 space-y-4">
          {/* Barre de recherche pour les recettes rares */}
          <div className="bg-gray-700 rounded-lg p-4">
            <div className="flex items-center space-x-4 mb-4">
              <Search className="w-5 h-5 text-[#C09A1A]" />
              <input
                type="text"
                value={rareRecipeSearchTerm}
                onChange={(e) => setRareRecipeSearchTerm(e.target.value)}
                placeholder="Rechercher une recette ou un crafteur..."
                className="flex-1 bg-gray-600 border border-gray-500 rounded px-3 py-2 text-white focus:border-purple-500 focus:outline-none"
                autoComplete="off"
                aria-label="Rechercher une recette rare"
              />
              {rareRecipeSearchTerm && (
                <button
                  onClick={() => setRareRecipeSearchTerm("")}
                  className="text-gray-400 hover:text-white"
                  type="button"
                  aria-label="Effacer la recherche de recettes rares"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Filtres par profession */}
          <div className="bg-gray-700 rounded-lg p-4">
            <div className="flex items-center mb-3">
              <Filter className="w-5 h-5 text-[#C09A1A] mr-2" />
              <h3 className="text-lg font-semibold text-[#d8b55c]">
                Filtrer par métier :
              </h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {availableProfessions.map((profession) => (
                <label
                  key={profession}
                  className="flex items-center space-x-2 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedProfessions.includes(profession)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedProfessions((prev) => [...prev, profession]);
                      } else {
                        setSelectedProfessions((prev) =>
                          prev.filter((p) => p !== profession)
                        );
                      }
                    }}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-300">{profession}</span>
                </label>
              ))}
            </div>
            {selectedProfessions.length > 0 && (
              <button
                onClick={() => setSelectedProfessions([])}
                className="mt-3 text-sm text-[#C09A1A] hover:text-[#d8b55c]"
                type="button"
              >
                Effacer tous les filtres
              </button>
            )}
          </div>

          {/* Bouton Tout déplier/replier */}
          <div className="flex justify-end">
            <button
              onClick={toggleAllRareRecipes}
              className="bg-red-700 hover:bg-red-800 border border-[#C09A1A]/30 text-white px-4 py-2 rounded flex items-center transition-colors text-sm"
              type="button"
            >
              {allRareRecipesExpanded ? (
                <>
                  <ChevronDown className="w-4 h-4 mr-2" />
                  Tout replier
                </>
              ) : (
                <>
                  <ChevronRight className="w-4 h-4 mr-2" />
                  Tout déplier
                </>
              )}
            </button>
          </div>
        </div>

        {Object.keys(recipesByProfession).length > 0 ? (
          <div className="space-y-6">
            {Object.entries(recipesByProfession).map(
              ([profession, recipes]) => (
                <div
                  key={profession}
                  className="border border-gray-600 rounded-lg overflow-hidden"
                >
                  <div
                    className="bg-gray-700 px-6 py-4 border-b border-gray-600 cursor-pointer hover:bg-gray-600"
                    onClick={() =>
                      setExpandedRareProfessions((prev) => ({
                        ...prev,
                        [profession]: !prev[profession],
                      }))
                    }
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-bold text-red-400 flex items-center">
                        <span className="text-2xl mr-3">
                          {professionIcons[
                            profession as keyof typeof professionIcons
                          ] || "🔮"}
                        </span>
                        {profession}
                        <span className="ml-3 px-2 py-1 bg-gray-600 rounded text-sm text-gray-300">
                          {recipes.length} recette
                          {recipes.length > 1 ? "s" : ""}
                        </span>
                      </h3>
                      {expandedRareProfessions[profession] ? (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                  </div>

                  {expandedRareProfessions[profession] && (
                    <div className="p-6">
                      <div className="space-y-2">
                        {recipes.map((recipe) => (
                          <div
                            key={recipe.id}
                            className="group flex items-start justify-between p-3 md:p-4 rounded-xl border bg-gray-700/70 border-gray-600 hover:border-red-500 transition mb-2 shadow-sm transform hover:-translate-y-[1px] hover:shadow-[0_0_0_2px_rgba(192,154,26,.12)]"
                          >
                            <div className="flex-1 min-w-0">
                              <a
                                href={recipe.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-medium text-white text-sm md:text-base truncate hover:underline"
                              >
                                {recipe.name}
                              </a>
                              <div className="flex flex-wrap gap-2 mt-1 text-xs items-center">
                                <span className="px-2 py-0.5 rounded bg-gray-900/70 border border-gray-700 text-xs text-[#d8b55c]">
                                  {recipe.type}
                                </span>
                                {recipe.source && recipe.source !== "-" && (
                                  <span className="px-2 py-0.5 rounded bg-gray-800/80 border border-gray-600 text-xs text-gray-200">
                                    {recipe.source}
                                  </span>
                                )}
                              </div>
                              {/* Crafteurs (chips) */}
                              {recipe.crafters &&
                                recipe.crafters.length > 0 && (
                                  <div className="mt-2 flex flex-wrap gap-2">
                                    {recipe.crafters.map((name) => (
                                      <span
                                        key={`${recipe.id}-${name}`}
                                        className="inline-flex items-center rounded-full border border-emerald-700 bg-emerald-900/40 px-2 py-0.5 text-xs text-emerald-100"
                                      >
                                        {name}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              {/* Composants requis */}
                              <ReagentsBlock
                                recipeUrl={recipe.url}
                                spellUrl={recipe.spellUrl}
                                recipeName={recipe.name}
                              />
                            </div>
                            <a
                              href={recipe.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="ml-3 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded flex-shrink-0"
                            >
                              Wowhead
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-400">
              Aucune recette trouvée avec les filtres actuels.
            </p>
          </div>
        )}

        <div className="mt-6 text-center">
          <button
            onClick={loadRareRecipes}
            disabled={rareRecipesLoading}
            className="bg-red-700 hover:bg-red-800 border border-[#C09A1A]/30 text-white px-6 py-2 rounded text-sm disabled:opacity-50"
            type="button"
          >
            {rareRecipesLoading
              ? "Analyse..."
              : "🔄 Actualiser les recettes rares"}
          </button>
        </div>
      </div>
    );
  };

  const CharacterForm = ({
    editMode = false,
    characterToEdit = null,
  }: {
    editMode?: boolean;
    characterToEdit?: Character | null;
  }) => {
    const [form, setForm] = useState<{
      name: string;
      server: string;
      level: number;
      faction: "alliance" | "horde";
      race: string;
      class: string;
      guild: string;
      profession1: string;
      profession2: string;
    }>({
      name: characterToEdit?.name || "",
      server: characterToEdit?.server || "Gehennas",
      level: characterToEdit?.level || 90,
      faction: characterToEdit?.faction || "horde",
      race: characterToEdit?.race || "",
      class: characterToEdit?.class || "",
      guild: characterToEdit?.guild || "Raid Tisane et Dodo",
      profession1: characterToEdit?.profession1 || "",
      profession2: characterToEdit?.profession2 || "",
    });

    const handleSubmit = () => {
      if (!form.name || !form.race || !form.class) return;

      if (editMode && characterToEdit) {
        updateCharacter(form);
      } else {
        createCharacter(form);
      }
    };

    return (
      <div className="max-w-2xl mx-auto bg-gray-800 rounded-2xl p-8 border border-red-700 shadow-md">
        <h2 className="text-3xl font-extrabold text-[#C09A1A] tracking-wide mb-6 flex items-center">
          <User className="mr-3" />
          {editMode ? "Modifier le personnage" : "Créer un personnage"}
        </h2>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              placeholder="Nom"
              value={form.name}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, name: e.target.value }))
              }
              className="bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:border-red-600 focus:outline-none"
              aria-label="Nom du personnage"
            />
            <input
              type="text"
              placeholder="Serveur"
              value={form.server}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, server: e.target.value }))
              }
              className="bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:border-red-600 focus:outline-none"
              aria-label="Serveur du personnage"
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <input
              type="number"
              placeholder="Niveau"
              value={form.level}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  level: parseInt(e.target.value) || 90,
                }))
              }
              className="bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:border-red-600 focus:outline-none"
              aria-label="Niveau du personnage"
            />
            <select
              value={form.faction}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  faction: e.target.value as "alliance" | "horde",
                  race: "",
                }))
              }
              className="bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:border-red-600 focus:outline-none"
              aria-label="Faction"
            >
              <option value="alliance">🛡️ Alliance</option>
              <option value="horde">⚔️ Horde</option>
            </select>
            <input
              type="text"
              placeholder="Guilde"
              value={form.guild}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, guild: e.target.value }))
              }
              className="bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:border-red-600 focus:outline-none"
              aria-label="Guilde"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <select
              value={form.race}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, race: e.target.value }))
              }
              className="bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:border-red-600 focus:outline-none"
              aria-label="Race"
            >
              <option value="">Choisir une race</option>
              {races[form.faction].map((race) => (
                <option key={race} value={race}>
                  {race}
                </option>
              ))}
            </select>
            <select
              value={form.class}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, class: e.target.value }))
              }
              className="bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:border-red-600 focus:outline-none"
              aria-label="Classe"
            >
              <option value="">Choisir une classe</option>
              {classes.map((cls) => (
                <option key={cls} value={cls}>
                  {cls}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <select
              value={form.profession1}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, profession1: e.target.value }))
              }
              className="bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:border-red-600 focus:outline-none"
              aria-label="Métier principal 1"
            >
              <option value="">Métier principal 1</option>
              {professions.map((prof) => (
                <option key={prof} value={prof}>
                  {prof}
                </option>
              ))}
            </select>
            <select
              value={form.profession2}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, profession2: e.target.value }))
              }
              className="bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:border-red-600 focus:outline-none"
              aria-label="Métier principal 2"
            >
              <option value="">Métier principal 2</option>
              {professions
                .filter((p) => p !== form.profession1)
                .map((prof) => (
                  <option key={prof} value={prof}>
                    {prof}
                  </option>
                ))}
            </select>
          </div>

          <div className="flex space-x-4">
            <button
              onClick={handleSubmit}
              disabled={!form.name || !form.race || !form.class}
              className="bg-red-700 hover:bg-red-800 text-black font-bold py-3 px-6 rounded disabled:opacity-50"
              type="button"
            >
              {editMode
                ? "Sauvegarder les modifications"
                : "Créer le personnage"}
            </button>
            <button
              onClick={() => {
                if (editMode) {
                  setEditingCharacter(null);
                  setView("character");
                } else {
                  setView("home");
                }
              }}
              className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-6 rounded"
              type="button"
            >
              Annuler
            </button>
          </div>
        </div>
      </div>
    );
  };

  const HomeView = () => (
    <div className="max-w-6xl mx-auto text-center">
      <div className="bg-gray-800 rounded-2xl px-6 py-8 border border-red-700 mb-4 shadow-md">
        <h1 className="text-5xl font-bold text-red-400 mb-4">
          WoW Crafting Tracker by Ostie
        </h1>
        <p className="text-xl text-gray-300 mb-8">
          Partagez vos métiers World of Warcraft
        </p>

        {/* On enlève le bloc 2 colonnes et on invite à ouvrir l'aide */}
        <div className="bg-gray-700/60 border border-gray-600 rounded-2xl p-4 md:p-5 mb-6 text-left">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold text-[#C09A1A] mb-2">
                📋 Besoin d&apos;aide ?
              </h2>
              <p className="text-gray-200">
                Cliquez sur le bouton <strong>Instructions</strong> 
                pour afficher le guide détaillé.
              </p>
            </div>
            <button
              onClick={() => setHelpOpen(true)}
              className="inline-flex items-center gap-2 bg-gray-900 hover:bg-black text-white rounded px-3 py-2 border border-gray-600"
              type="button"
            >
              <HelpCircle className="w-4 h-4" />
              Instructions
            </button>
          </div>
        </div>

        {characters.length === 0 ? (
          <button
            onClick={() => setView("create")}
            className="bg-red-700 hover:bg-red-800 text-black font-bold py-4 px-8 rounded-lg text-xl"
            type="button"
          >
            Créer mon personnage
          </button>
        ) : (
          <div className="space-y-4">
            <h2 className="text-2xl font-extrabold text-[#C09A1A] tracking-wide">
              Mes personnages
            </h2>
            <div className="grid gap-2">
              {characters.map((character) => (
                <div
                  key={character.id}
                  className="bg-gray-700 rounded-lg p-4 border border-gray-600 hover:border-red-600"
                >
                  <div className="flex items-center justify-between">
                    <div
                      className="flex-1 cursor-pointer"
                      onClick={() => {
                        setCurrentCharacter(character);
                        setView("character");
                      }}
                    >
                      <h3 className="text-xl font-semibold text-[#d8b55c]">
                        {character.name}
                      </h3>
                      <p className="text-gray-300">
                        Niveau {character.level} {character.race}{" "}
                        {character.class}
                      </p>
                      <p className="text-gray-400 text-sm">
                        {character.server}{" "}
                        {character.guild && `• ${character.guild}`}
                      </p>
                    </div>
                    <button
                      onClick={() => deleteCharacter(character)}
                      className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm ml-4"
                      type="button"
                    >
                      Supprimer
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={() => setView("create")}
              className="bg-red-700 hover:bg-red-800 text-black font-bold py-2 px-6 rounded"
              type="button"
            >
              Ajouter un personnage
            </button>
          </div>
        )}
      </div>

      <RareRecipesSection />

      <div className="bg-gray-800 rounded-2xl p-8 border border-red-700 shadow-md">
        <h2 className="text-3xl font-extrabold text-[#C09A1A] tracking-wide mb-6">
          🌟 Communauté
        </h2>

        {publicCharacters.length > 0 ? (
          <>
            <p className="text-gray-300 mb-6">
              Découvrez les personnages partagés par la communauté
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {publicCharacters.map((character) => (
                <div
                  key={character.shareId}
                  className={`bg-gray-700 rounded-lg p-6 border-2 ${
                    character.faction === "alliance"
                      ? "border-blue-500"
                      : "border-red-500"
                  }`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <button
                        onClick={() =>
                          window.open(`?share=${character.shareId}`, "_blank")
                        }
                        className="text-xl font-semibold text-[#d8b55c] hover:text-red-400 cursor-pointer"
                        type="button"
                      >
                        {character.name}
                      </button>
                      <p className="text-gray-300 text-sm">
                        Niveau {character.level} {character.race}{" "}
                        {character.class}
                      </p>
                    </div>
                    <span
                      className={`px-2 py-1 rounded text-xs font-semibold ${
                        character.faction === "alliance"
                          ? "bg-blue-600 text-blue-100"
                          : "bg-red-600 text-red-100"
                      }`}
                    >
                      {character.faction === "alliance"
                        ? "🛡️ Alliance"
                        : "⚔️ Horde"}
                    </span>
                  </div>

                  <div className="mb-4 space-y-1">
                    {character.server && (
                      <p className="text-gray-400 text-sm">📍 {character.server}</p>
                    )}
                    {character.guild && (
                      <p className="text-gray-400 text-sm">⚔️ {character.guild}</p>
                    )}
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-red-400 font-semibold text-sm">
                      Métiers principaux :
                    </h4>

                    {[character.profession1, character.profession2]
                      .filter(Boolean)
                      .map((prof) => {
                        const key = prof as string;
                        const lvl = character.professionLevels?.[key] ?? 0;

                        return (
                          <div key={key} className="flex items-center justify-between bg-gray-600 rounded p-2">
                            <div className="flex flex-col">
                              <span className="text-white text-sm font-medium">{key}</span>
                              {lvl > 0 && (
                                <span className={`text-xs ${getProfessionLevelColor(lvl)}`}>
                                  {getProfessionLevelIcon(lvl)} Niveau {lvl} ({getProfessionLevelName(lvl)})
                                </span>
                              )}
                            </div>
                            <span className="bg-red-700 text-black px-2 py-1 rounded text-xs font-bold">
                              {character.craftCounts?.[key] ?? 0}
                            </span>
                          </div>
                        );
                      })}
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-600">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 text-sm">
                        Total des recettes :
                      </span>
                      <span className="text-red-400 font-bold">
                        {Object.values(character.craftCounts ?? {}).reduce(
                          (a: number, b: number) => a + b,
                          0
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 text-center">
                    <button
                      onClick={() =>
                        window.open(`?share=${character.shareId}`, "_blank")
                      }
                      className="text-blue-400 text-xs hover:text-[#C09A1A]"
                      type="button"
                    >
                      🔗 Voir le profil complet
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">👥</div>
            <h3 className="text-2xl font-bold text-red-300 mb-4">
              Aucun personnage partagé
            </h3>
            <p className="text-gray-400 mb-6">
              Soyez le premier à partager vos métiers avec la communauté !<br />
              Créez un personnage, ajoutez vos recettes et cliquez sur
              &quot;Partager&quot;.
            </p>
            <div className="bg-blue-900 border border-blue-600 rounded-lg p-4 max-w-md mx-auto">
              <p className="text-[#d8b55c] text-sm">
                💡 <strong>Astuce :</strong> Les personnages partagés
                apparaissent ici automatiquement et permettent à la communauté
                de voir vos métiers !
              </p>
            </div>
          </div>
        )}

        <div className="mt-6 text-center">
          <button
            onClick={loadPublicCharacters}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm"
            type="button"
          >
            🔄 Actualiser la liste
          </button>
        </div>
      </div>
    </div>
  );

  const ImportView = ({ profession }: { profession: string }) => (
    <div className="max-w-4xl mx-auto bg-gray-800 rounded-2xl p-8 border border-red-700 shadow-md">
      <h2 className="text-3xl font-extrabold text-[#C09A1A] tracking-wide mb-6">
        <Upload className="inline mr-3" />
        Importer - {profession}
      </h2>

      <div className="mb-6">
        <label className="block text-red-300 font-semibold mb-2">
          Liste markdown :
        </label>
        <textarea
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
          className="w-full h-12 bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:border-red-600 focus:outline-none font-mono text-sm"
          placeholder="- [Item Name](https://wowhead.com/cata/item=12345)
- [Autre Item](https://wowhead.com/cata/spell=67890)"
          aria-label="Zone d'import markdown"
        />
        <p className="text-gray-400 text-sm mt-2">
          ℹ️ Le niveau de métier sera automatiquement détecté depuis votre
          export
        </p>
      </div>

      <div className="flex space-x-4">
        <button
          onClick={() => importCrafts(profession)}
          disabled={!importText.trim()}
          className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded disabled:opacity-50"
          type="button"
        >
          Importer
        </button>
        <button
          onClick={() => setView("character")}
          className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-6 rounded"
          type="button"
        >
          Annuler
        </button>
      </div>
    </div>
  );

  const professionsArray = useMemo(() => {
    if (!currentCharacter) return [] as string[];
    return (
      [currentCharacter.profession1, currentCharacter.profession2]
        .filter(Boolean) as string[]
    );
  }, [currentCharacter]);

  const filteredProfessionData = useMemo(() => {
    if (!currentCharacter) return [];
    return professionsArray.map((profession) => {
      const crafts = currentCharacter.crafts[profession] || [];
      const filteredCrafts = crafts.filter(
        (craft) =>
          !searchTerm ||
          craft.name.toLowerCase().includes(searchTerm.toLowerCase())
      );

      filteredCrafts.sort((a, b) => a.name.localeCompare(b.name));

      const categories = filteredCrafts.reduce<Record<string, CraftItem[]>>(
        (acc, craft) => {
          const bucket = acc[craft.category] ?? (acc[craft.category] = []);
          bucket.push(craft);
          return acc;
        },
        {}
      );

      return {
        profession,
        crafts,
        filteredCrafts,
        categories,
      };
    });
  }, [currentCharacter, professionsArray, searchTerm]);

  const CharacterView = () => {
    if (!currentCharacter) return null;

    return (
      <div className="max-w-6xl mx-auto">
        <div className="bg-gray-800 rounded-2xl p-6 mb-6 border border-red-700 shadow-md hover:shadow-[0_0_0_2px_rgba(192,154,26,.12)] transition">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-4xl font-extrabold text-[#C09A1A] drop-shadow-sm mb-2 transition-colors duration-200 hover:text-yellow-300">
                {currentCharacter.name}
              </h1>
              <div className="text-gray-300 space-y-1">
                <p>
                  Niveau {currentCharacter.level} {currentCharacter.race}{" "}
                  {currentCharacter.class}
                </p>
                {currentCharacter.server && (
                  <p>Serveur: {currentCharacter.server}</p>
                )}
                {currentCharacter.guild && (
                  <p>Guilde: {currentCharacter.guild}</p>
                )}
                <p
                  className={
                    currentCharacter.faction === "alliance"
                      ? "text-blue-400"
                      : "text-red-400"
                  }
                >
                  {currentCharacter.faction === "alliance"
                    ? "🛡️ Alliance"
                    : "⚔️ Horde"}
                </p>
              </div>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => {
                  setEditingCharacter(currentCharacter);
                  setView("edit");
                }}
                className="bg-red-700 hover:bg-red-800 border border-[#C09A1A]/30 text-white px-4 py-2 rounded flex items-center"
                type="button"
              >
                <Edit className="w-4 h-4 mr-2" />
                Éditer
              </button>
              <button
                onClick={shareCharacter}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center disabled:opacity-50"
                type="button"
              >
                <Share className="w-4 h-4 mr-2" />
                {loading ? "Partage..." : "Partager"}
              </button>
              <button
                onClick={shareToDiscord}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded flex items-center"
                title="Partager sur Discord"
                type="button"
              >
                💬 Discord
              </button>
            </div>
          </div>
        </div>

        <SearchBar searchTerm={searchTerm} onSearchChange={setSearchTerm} />

        {filteredProfessionData.map(({ profession, crafts, categories }) => (
          <div
            key={profession}
            className="bg-gray-800 rounded-2xl border border-red-700 mb-6 shadow-md"
          >
            <div className="p-6 border-b border-gray-700">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-extrabold text-[#C09A1A] tracking-wide">
                    {profession}
                  </h2>
                  {(currentCharacter.professionLevels?.[profession] ?? 0) > 0 && (
                    <p
                      className={`text-sm ${getProfessionLevelColor(
                        currentCharacter.professionLevels?.[profession] ?? 0
                      )}`}
                    >
                      {getProfessionLevelIcon(
                        currentCharacter.professionLevels?.[profession] ?? 0
                      )}{" "}
                      Niveau {currentCharacter.professionLevels?.[profession] ?? 0} (
                      {getProfessionLevelName(
                        currentCharacter.professionLevels?.[profession] ?? 0
                      )}
                      )
                    </p>
                  )}
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setView(`import-${profession}`)}
                    className="bg-red-700 hover:bg-red-800 text-white px-4 py-2 rounded flex items-center border border-[#C09A1A]/30"
                    type="button"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Importer
                  </button>
                  {crafts.length > 0 && (
                    <button
                      onClick={() => {
                        if (
                          confirm(
                            `Supprimer toutes les recettes de ${profession} ?`
                          )
                        ) {
                          const updated = {
                            ...currentCharacter,
                            professionLevels: {
                              ...currentCharacter.professionLevels,
                              [profession]: 0,
                            },
                            crafts: {
                              ...currentCharacter.crafts,
                              [profession]: [],
                            },
                          };
                          setCharacters((chars: Character[]) =>
                            chars.map((c) =>
                              c.id === currentCharacter.id ? updated : c
                            )
                          );
                          setCurrentCharacter(updated);
                        }
                      }}
                      className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded flex items-center border border-[#C09A1A]/20"
                      type="button"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Supprimer
                    </button>
                  )}
                </div>
              </div>
              <p className="text-gray-400 mt-2">{crafts.length} recettes</p>
            </div>

            {Object.keys(categories).length > 0 ? (
              <div className="p-6">
                {Object.keys(categories).length > 1 && (
                  <div className="mb-4 flex justify-end">
                    <button
                      onClick={() =>
                        toggleAllCategories(profession, Object.keys(categories))
                      }
                      className="bg-red-700 hover:bg-red-800 border border-[#C09A1A]/30 text-white px-4 py-2 rounded flex items-center transition-colors text-sm"
                      type="button"
                    >
                      {allExpanded[profession] ? (
                        <>
                          <ChevronDown className="w-4 h-4 mr-2" />
                          Tout replier
                        </>
                      ) : (
                        <>
                          <ChevronRight className="w-4 h-4 mr-2" />
                          Tout déplier
                        </>
                      )}
                    </button>
                  </div>
                )}

                {Object.entries(categories).map(([category, items]) => {
                  const isExpanded =
                    expandedCategories[`${profession}-${category}`] || false;

                  return (
                    <div key={category} className="mb-4">
                      <button
                        onClick={() =>
                          setExpandedCategories((prev) => ({
                            ...prev,
                            [`${profession}-${category}`]: !isExpanded,
                          }))
                        }
                        className="w-full flex items-center justify-between bg-gray-700/70 hover:bg-gray-600 rounded-xl p-3 border border-gray-600 hover:border-red-500 transition"
                        type="button"
                      >
                        <span className="text-red-300 font-semibold">
                          {category} ({items.length})
                        </span>
                        {isExpanded ? (
                          <ChevronDown className="w-5 h-5" />
                        ) : (
                          <ChevronRight className="w-5 h-5" />
                        )}
                      </button>

                        {isExpanded && (
                                                <div className="mt-2 space-y-1 ml-4">
                                                {items.map((item) => (
                                                    <div key={item.id}>
                                                    <div className="group bg-gray-700/70 rounded-xl p-3 md:p-4 flex items-center justify-between border border-gray-600 hover:border-red-500 transition transform hover:-translate-y-[1px] hover:shadow-[0_0_0_2px_rgba(192,154,26,.12)]">
                                                        <div className="flex items-center gap-2 min-w-0">
                                                        <a
                                                            href={item.url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded"
                                                        >
                                                            Wowhead
                                                        </a>
                                                        <a
                                                            href={item.url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-red-300 text-sm md:text-base hover:underline truncate"
                                                        >
                                                            {item.name}
                                                        </a>
                                                        </div>
                                                        <span className="px-2 py-0.5 rounded bg-gray-900/70 border border-gray-700 text-xs text-[#d8b55c]">
                                                        {item.category}
                                                        </span>
                                                    </div>
                                                    <ReagentsBlock
                                                        recipeUrl={item.url}
                                                        spellUrl={item.spellUrl}
                                                        recipeName={item.name}
                                                    />
                                                    </div>
                                                ))}
                                                </div>
                                            )}
                                            </div>
                                        );
                                        })}
                                    </div>
                                    ) : (
                                    <div className="p-6 text-center text-gray-500">
                                        <p>Aucune recette</p>
                                    </div>
                                    )}
                                </div>
                                ))}
                            </div>
                            );
                        };

                        if (loading) {
                            return (
                            <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white flex items-center justify-center">
                                <div className="text-center">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto mb-4"></div>
                                <p className="text-xl text-gray-300">Chargement...</p>
                                </div>
                            </div>
                            );
                        }

                        return (
                            <div className="min-h-screen bg-gradient-to-b from-black via-[#210a0a] to-[#0b0000] text-white">
                            <nav className="bg-gray-800 border-b border-red-700">
                              <div className="max-w-6xl mx-auto flex justify-end items-center p-3">
                                {currentCharacter && view === "character" && (
                                  <div className="text-red-300">
                                    {currentCharacter.name} - {currentCharacter.server}
                                  </div>
                                )}
                              </div>
                            </nav>

                            <main className="container mx-auto px-4 py-8">
                                {view === "home" && <HomeView />}
                                {view === "create" && <CharacterForm />}
                                {view === "edit" && (
                                <CharacterForm editMode={true} characterToEdit={editingCharacter} />
                                )}
                                {view === "character" && <CharacterView />}
                                {view.startsWith("import-") && (
                                <ImportView profession={view.replace("import-", "")} />
                                )}
                            </main>
                            <InstructionsDrawer
                              open={helpOpen}
                              onClose={() => setHelpOpen(false)}
                            />
                            {/* Wowhead Tooltips */}
                            <Script id="wh-config" strategy="afterInteractive">
                                {`
                                    var whTooltips = {
                                    colorLinks: true,
                                    iconizeLinks: true,
                                    renameLinks: true,
                                    locale: "fr"
                                    };
                                `}
                            </Script>
                            <Script
                                src="https://wow.zamimg.com/widgets/power.js"
                                strategy="afterInteractive"
                            />
                            </div>
                        );
                        };

                        export default WoWCraftingTracker;