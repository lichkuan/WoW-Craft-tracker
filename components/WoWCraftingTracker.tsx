'use client'

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { ChevronDown, ChevronRight, Upload, User, Share, Search, Trash2, Plus, X, Edit, Filter } from 'lucide-react';

interface Character {
  id: string;
  name: string;
  server: string;
  level: number;
  race: string;
  class: string;
  guild: string;
  faction: 'alliance' | 'horde';
  profession1: string;
  profession2: string;
  professionLevels: { [profession: string]: number };
  crafts: { [profession: string]: CraftItem[] };
}

interface CraftItem {
  id: string;
  name: string;
  url: string;
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
  crafters: string[];
}

// Mapping des types CSV vers les métiers du jeu
const RECIPE_TYPE_TO_PROFESSION = {
  "Formule d'enchantement": "Enchantement",
  "Dessin de joaillerie": "Joaillerie", 
  "Patron de couture": "Couture",
  "Plans de forge": "Forge",
  "Schéma d'ingénierie": "Ingénierie",
  "Recette d'alchimie": "Alchimie",
  "Patron de travail du cuir": "Travail du cuir",
  "Technique de calligraphie": "Calligraphie"
};
const ThemeSwitcher = () => {
  const [isDark, setIsDark] = useState(false);

  // Applique le thème au chargement
  useEffect(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
      setIsDark(true);
    } else {
      document.documentElement.classList.remove('dark');
      setIsDark(false);
    }
  }, []);

  // Change le thème au clic
  const toggleTheme = () => {
    if (document.documentElement.classList.contains('dark')) {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      setIsDark(false);
    } else {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      setIsDark(true);
    }
  };

  return (
    <button
      onClick={toggleTheme}
      className="ml-4 px-3 py-1 rounded bg-gray-700 text-yellow-300 hover:bg-yellow-600 hover:text-black transition"
      title="Changer le thème"
    >
      {isDark ? '🌙 Thème sombre' : '🌞 Thème clair'}
    </button>
  );
};
// Composant SearchBar
const SearchBar = ({ onSearchChange }: { onSearchChange: (value: string) => void }) => {
  const [localSearchTerm, setLocalSearchTerm] = useState('');
  const timeoutRef = useRef<NodeJS.Timeout>();

  const handleChange = (value: string) => {
    setLocalSearchTerm(value);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      onSearchChange(value);
    }, 300);
  };

  const handleClear = () => {
    setLocalSearchTerm('');
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    onSearchChange('');
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);


  return (
    <div className="mb-6">
      <div className="bg-gray-800 rounded-lg p-4 border border-yellow-600 flex items-center space-x-4">
        <Search className="w-5 h-5 text-yellow-400" />
        <input
          type="text"
          value={localSearchTerm}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="Rechercher une recette..."
          className="flex-1 bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:border-yellow-500 focus:outline-none"
          autoComplete="off"
        />
        {localSearchTerm && (
          <button 
            onClick={handleClear} 
            className="text-gray-400 hover:text-white"
            type="button"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};

const WoWCraftingTracker: React.FC = () => {
  const [view, setView] = useState<'home' | 'create' | 'character' | 'edit' | string>('home');
  const [characters, setCharacters] = useState<Character[]>([]);
  const [currentCharacter, setCurrentCharacter] = useState<Character | null>(null);
  const [editingCharacter, setEditingCharacter] = useState<Character | null>(null);
  const [publicCharacters, setPublicCharacters] = useState<PublicCharacter[]>([]);
  const [importText, setImportText] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<{ [key: string]: boolean }>({});
  const [allExpanded, setAllExpanded] = useState<{ [key: string]: boolean }>({});
  const [loading, setLoading] = useState(false);
  const [rareRecipes, setRareRecipes] = useState<RareRecipe[]>([]);
  const [rareRecipesLoading, setRareRecipesLoading] = useState(false);
  const [selectedProfessions, setSelectedProfessions] = useState<string[]>([]);
  const [rareRecipeSearchTerm, setRareRecipeSearchTerm] = useState('');
  const [allRareRecipesExpanded, setAllRareRecipesExpanded] = useState(false);
  const [expandedRareProfessions, setExpandedRareProfessions] = useState<{ [profession: string]: boolean }>({});

  const professions = ['Alchimie', 'Forge', 'Enchantement', 'Ingénierie', 'Herboristerie', 'Joaillerie', 'Travail du cuir', 'Minage', 'Calligraphie', 'Couture'];
  const races = {
    alliance: ['Humain', 'Nain', 'Elfe de la nuit', 'Gnome', 'Draeneï', 'Worgen', 'Pandaren'],
    horde: ['Orc', 'Mort-vivant', 'Tauren', 'Troll', 'Elfe de sang', 'Gobelin', 'Pandaren']
  };
  const classes = ['Guerrier', 'Paladin', 'Chasseur', 'Voleur', 'Prêtre', 'Chaman', 'Mage', 'Démoniste', 'Moine', 'Druide'];

  const generateShareId = () => Math.random().toString(36).substring(2, 8).toUpperCase();
  
  const getProfessionLevelName = (level: number): string => {
    if (level >= 1 && level <= 60) return 'Apprenti';
    if (level >= 60 && level <= 140) return 'Compagnon';
    if (level >= 140 && level <= 205) return 'Expert';
    if (level >= 205 && level <= 300) return 'Artisan';
    if (level >= 300 && level <= 350) return 'Maître';
    if (level >= 350 && level <= 425) return 'Grand Maître';
    if (level >= 425 && level <= 500) return 'Illustre';
    if (level >= 500 && level <= 600) return 'Zen';
    return 'Inconnu';
  };

  const getProfessionLevelIcon = (level: number): string => {
    if (level >= 1 && level <= 60) return '⭐';
    if (level >= 60 && level <= 140) return '⭐⭐';
    if (level >= 140 && level <= 205) return '⭐⭐⭐';
    if (level >= 205 && level <= 300) return '🔥';
    if (level >= 300 && level <= 350) return '💎';
    if (level >= 350 && level <= 425) return '⚡';
    if (level >= 425 && level <= 500) return '🌟';
    if (level >= 500 && level <= 600) return '👑';
    return '';
  };

  const getProfessionLevelColor = (level: number): string => {
    if (level >= 1 && level <= 60) return 'text-gray-400';
    if (level >= 60 && level <= 140) return 'text-green-400';
    if (level >= 140 && level <= 205) return 'text-yellow-400';
    if (level >= 205 && level <= 300) return 'text-orange-400';
    if (level >= 300 && level <= 350) return 'text-red-400';
    if (level >= 350 && level <= 425) return 'text-purple-400';
    if (level >= 425 && level <= 500) return 'text-blue-400';
    if (level >= 500 && level <= 600) return 'text-pink-400';
    return 'text-gray-400';
  };

  const toggleAllCategories = useCallback((profession: string, categories: string[]) => {
    const isCurrentlyAllExpanded = allExpanded[profession] || false;
    const newState = !isCurrentlyAllExpanded;
    
    setAllExpanded(prev => ({
      ...prev,
      [profession]: newState
    }));
    
    const updates: { [key: string]: boolean } = {};
    categories.forEach(category => {
      updates[`${profession}-${category}`] = newState;
    });
    
    setExpandedCategories(prev => ({
      ...prev,
      ...updates
    }));
  }, [allExpanded]);

  const handleSearchChange = useCallback((value: string) => {
    setSearchTerm(value);
  }, []);

  const extractProfessionLevel = (text: string, profession: string): number => {
    const lines = text.split('\n');
    
    for (const line of lines) {
      const lowerLine = line.toLowerCase();
      const professionLower = profession.toLowerCase();
      
      if (lowerLine.includes('skill') && lowerLine.includes(professionLower)) {
        const skillMatch = line.match(/skill\s+(\d+)/i);
        if (skillMatch) return parseInt(skillMatch[1]);
      }
      
      const pattern = new RegExp(`${professionLower}.*\\((\\d+)\\/(\\d+)\\)`, 'i');
      const match = line.match(pattern);
      if (match) return parseInt(match[1]);
      
      if (lowerLine.includes(professionLower) && (lowerLine.includes('level') || lowerLine.includes('niveau'))) {
        const levelMatch = line.match(/(\d+)/);
        if (levelMatch) return parseInt(levelMatch[1]);
      }
    }
    
    return 0;
  };
  
  const parseMarkdown = (text: string, profession: string = ''): { items: CraftItem[], level: number } => {
    const items = text.split('\n')
      .filter(line => line.trim().startsWith('- [') && line.includes(']('))
      .map(line => {
        const match = line.match(/^- \[([^\]]+)\]\(([^)]+)\)$/);
        if (match) {
          let url = match[2];
          if (url.includes('/cata/')) {
            url = url.replace('/cata/', '/mop-classic/fr/');
          }
          return {
            id: Math.random().toString(36).substr(2, 9),
            name: match[1],
            url,
            category: categorizeItem(match[1])
          };
        }
        return null;
      })
      .filter(Boolean) as CraftItem[];

    const level = profession ? extractProfessionLevel(text, profession) : 0;
    return { items, level };
  };

  const generateDiscordMessage = (character: Character): string => {
    const totalRecipes = Object.values(character.crafts || {}).reduce((total, recipes) => total + recipes.length, 0);
    const characterProfessions = [character.profession1, character.profession2].filter(Boolean);
    
    let message = `🎮 **${character.name}** - Niveau ${character.level} ${character.race} ${character.class}\n`;
    message += `${character.faction === 'alliance' ? '🛡️ Alliance' : '⚔️ Horde'} | ${character.server}${character.guild ? ` | ${character.guild}` : ''}\n\n`;
    
    characterProfessions.forEach(prof => {
      const level = character.professionLevels?.[prof] || 0;
      const count = character.crafts[prof]?.length || 0;
      const icon = getProfessionLevelIcon(level);
      message += `${icon} **${prof}** ${level > 0 ? `niveau ${level}` : ''} - ${count} recettes\n`;
    });
    
    message += `\n📊 **Total : ${totalRecipes} recettes**\n`;
    message += `🔗 Voir le profil complet : ${window.location.origin}${window.location.pathname}?share=`;
    
    return message;
  };

  const categorizeItem = (name: string): string => {
    const lower = name.toLowerCase();
    if (lower.includes('arme') || lower.includes('épée') || lower.includes('hache')) return 'Armes';
    if (lower.includes('bottes') || lower.includes('chaussures')) return 'Bottes';
    if (lower.includes('gants') || lower.includes('gantelets')) return 'Gants';
    if (lower.includes('casque') || lower.includes('heaume')) return 'Casques';
    if (lower.includes('plastron') || lower.includes('armure')) return 'Plastrons';
    if (lower.includes('cape') || lower.includes('manteau')) return 'Capes';
    if (lower.includes('anneau') || lower.includes('bague')) return 'Anneaux';
    if (lower.includes('collier') || lower.includes('pendentif')) return 'Colliers';
    if (lower.includes('gemme') || lower.includes('pierre')) return 'Gemmes';
    if (lower.includes('potion') || lower.includes('élixir')) return 'Potions';
    return 'Autres';
  };

  const loadRareRecipes = async () => {
    try {
      setRareRecipesLoading(true);
      
      const response = await fetch('/Recettes_MoP_90__Liens_Wowhead.csv');
      if (!response.ok) {
        console.error('Fichier CSV non trouvé dans /public/');
        return;
      }
      
      const csvText = await response.text();
      const lines = csvText.split('\n');
      const data = lines.slice(1).filter(line => line.trim()).map(line => {
        const values = line.split(',');
        return {
          ID: parseInt(values[0]) || 0,
          Name: values[1]?.replace(/"/g, '') || '',
          Source: values[2]?.replace(/"/g, '') || '',
          Type: values[3]?.replace(/"/g, '') || '',
          URL: values[4]?.replace(/"/g, '') || ''
        };
      });
      
      const processedRecipes: RareRecipe[] = [];
      
      data.forEach((row: any) => {
        const profession = RECIPE_TYPE_TO_PROFESSION[row.Type as keyof typeof RECIPE_TYPE_TO_PROFESSION];
        if (!profession) return;
        
        const cleanRecipeName = row.Name
          .replace(/^(Formule|Dessin|Patron|Plans|Schéma|Recette|Technique) : /, '')
          .toLowerCase()
          .trim();
        
        const crafters: string[] = [];
        
        publicCharacters.forEach(character => {
          const characterCrafts = character.crafts[profession] || [];
          const hasRecipe = characterCrafts.some(craft => {
            const craftName = craft.name.toLowerCase();
            return craftName.includes(cleanRecipeName) || cleanRecipeName.includes(craftName);
          });
          
          if (hasRecipe) {
            crafters.push(character.name);
          }
        });
        
        if (crafters.length > 0) {
          processedRecipes.push({
            id: row.ID,
            name: row.Name,
            type: row.Type,
            profession,
            url: row.URL,
            crafters
          });
        }
      });
      
      // Tri alphabétique des recettes
      processedRecipes.sort((a, b) => a.name.localeCompare(b.name));
      setRareRecipes(processedRecipes);
    } catch (error) {
      console.error('Erreur chargement recettes rares:', error);
    } finally {
      setRareRecipesLoading(false);
    }
  };

  const saveCharacter = async (character: Character): Promise<string | null> => {
    try {
      const shareId = generateShareId();
      const response = await fetch('/api/character', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shareId, character })
      });
      return response.ok ? shareId : null;
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
      return null;
    }
  };

  const loadSharedCharacter = async (shareId: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/character/${shareId}`);
      if (response.ok) {
        const character = await response.json();
        setCurrentCharacter(character);
        setView('character');
      }
    } catch (error) {
      console.error('Erreur chargement:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPublicCharacters = async () => {
    try {
      const timestamp = Date.now();
      const response = await fetch(`/api/characters/public?t=${timestamp}`, {
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
      
      if (response.ok) {
        const chars = await response.json();
        setPublicCharacters([]);
        setTimeout(() => {
          setPublicCharacters(chars);
        }, 100);
      }
    } catch (error) {
      console.error('Erreur chargement public:', error);
    }
  };

  const deleteCharacter = async (character: Character) => {
    if (!confirm(`Supprimer ${character.name} ?`)) return;
    
    try {
      await fetch('/api/character/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ characterName: character.name, characterServer: character.server })
      });
      
      setCharacters(chars => chars.filter(c => c.id !== character.id));
      if (currentCharacter?.id === character.id) {
        setCurrentCharacter(null);
        setView('home');
      }
      loadPublicCharacters();
    } catch (error) {
      console.error('Erreur suppression:', error);
    }
  };

  const createCharacter = (data: any) => {
    const character: Character = {
      ...data,
      id: Math.random().toString(36).substr(2, 9),
      professionLevels: {},
      crafts: {}
    };
    setCharacters(prev => [...prev, character]);
    setCurrentCharacter(character);
    setView('character');
  };

  const updateCharacter = (updatedData: any) => {
    if (!editingCharacter) return;
    
    const updatedCharacter: Character = {
      ...editingCharacter,
      ...updatedData,
      professionLevels: editingCharacter.professionLevels,
      crafts: editingCharacter.crafts
    };
    
    setCharacters(chars => chars.map(c => c.id === editingCharacter.id ? updatedCharacter : c));
    setCurrentCharacter(updatedCharacter);
    setEditingCharacter(null);
    setView('character');
  };

  const importCrafts = (profession: string) => {
    if (!importText.trim() || !currentCharacter) return;
    
    const { items, level } = parseMarkdown(importText, profession);
    const updated = {
      ...currentCharacter,
      professionLevels: {
        ...currentCharacter.professionLevels,
        [profession]: level
      },
      crafts: { ...currentCharacter.crafts, [profession]: items }
    };
    
    setCharacters(chars => chars.map(c => c.id === currentCharacter.id ? updated : c));
    setCurrentCharacter(updated);
    setImportText('');
    setView('character');
  };

  const shareCharacter = async () => {
    if (!currentCharacter) return;
    
    setLoading(true);
    try {
      const shareId = await saveCharacter(currentCharacter);
      if (shareId) {
        const url = `${window.location.origin}?share=${shareId}`;
        await navigator.clipboard.writeText(url);
        alert('Lien copié !');
        loadPublicCharacters();
      }
    } catch (error) {
      alert('Erreur lors du partage');
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
        alert('Message Discord copié ! Collez-le dans votre serveur Discord 🎮');
      }
    } catch (error) {
      console.error('Erreur Discord:', error);
    }
  };

  const filteredRareRecipes = useMemo(() => {
    let filtered = rareRecipes;

    // Filtre par profession sélectionnée
    if (selectedProfessions.length > 0) {
      filtered = filtered.filter(recipe => selectedProfessions.includes(recipe.profession));
    }

    // Filtre par terme de recherche
    if (rareRecipeSearchTerm) {
      filtered = filtered.filter(recipe => 
        recipe.name.toLowerCase().includes(rareRecipeSearchTerm.toLowerCase()) ||
        recipe.crafters.some(crafter => crafter.toLowerCase().includes(rareRecipeSearchTerm.toLowerCase()))
      );
    }

    return filtered;
  }, [rareRecipes, selectedProfessions, rareRecipeSearchTerm]);

  const availableProfessions = useMemo(() => {
    const profs = new Set<string>();
    rareRecipes.forEach(recipe => profs.add(recipe.profession));
    return Array.from(profs).sort();
  }, [rareRecipes]);

  useEffect(() => {
    const saved = localStorage.getItem('wowCharacters');
    if (saved) {
      const parsedCharacters = JSON.parse(saved);
      const migratedCharacters = parsedCharacters.map((char: any) => ({
        ...char,
        professionLevels: char.professionLevels || {}
      }));
      setCharacters(migratedCharacters);
    }
    
    loadPublicCharacters();
    
    const shareId = new URLSearchParams(window.location.search).get('share');
    if (shareId) loadSharedCharacter(shareId);
  }, []);

  useEffect(() => {
    localStorage.setItem('wowCharacters', JSON.stringify(characters));
  }, [characters]);

  useEffect(() => {
    if (publicCharacters.length > 0) {
      loadRareRecipes();
    }
  }, [publicCharacters]);

  const toggleAllRareRecipes = () => {
    const newState = !allRareRecipesExpanded;
    setAllRareRecipesExpanded(newState);
    
    const updates: { [profession: string]: boolean } = {};
    availableProfessions.forEach(profession => {
      updates[profession] = newState;
    });
    setExpandedRareProfessions(updates);
  };

  const RareRecipesSection = () => {
    if (rareRecipesLoading) {
      return (
        <div className="bg-gray-800 rounded-lg p-6 border border-purple-600 mb-4">
          <h2 className="text-3xl font-bold text-purple-400 mb-6">✨ Recettes Rares</h2>
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400 mr-4"></div>
            <p className="text-gray-300">Analyse des recettes rares...</p>
          </div>
        </div>
      );
    }

    if (rareRecipes.length === 0) {
      return (
        <div className="bg-gray-800 rounded-lg p-6 border border-purple-600 mb-4">
          <h2 className="text-3xl font-bold text-purple-400 mb-6">✨ Recettes Rares</h2>
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📜</div>
            <h3 className="text-2xl font-bold text-purple-300 mb-4">Aucune recette rare détectée</h3>
            <p className="text-gray-400">
              Les recettes rares apparaîtront ici quand des personnages<br/>
              avec des formules, patrons ou plans spéciaux seront partagés.
            </p>
          </div>
        </div>
      );
    }

    const recipesByProfession = filteredRareRecipes.reduce((acc, recipe) => {
      if (!acc[recipe.profession]) acc[recipe.profession] = [];
      acc[recipe.profession].push(recipe);
      return acc;
    }, {} as { [profession: string]: RareRecipe[] });

    const professionIcons = {
      'Enchantement': '✨',
      'Joaillerie': '💎',
      'Couture': '🧵',
      'Forge': '🔨',
      'Ingénierie': '⚙️',
      'Alchimie': '🧪',
      'Travail du cuir': '🦬',
      'Calligraphie': '📜'
    };

    return (
      <div className="bg-gray-800 rounded-lg p-8 border border-purple-600 mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-3xl font-bold text-purple-400 mb-2">✨ Recettes Rares</h2>
            <p className="text-gray-300">
              Découvrez qui peut crafter les recettes les plus recherchées de MoP Classic
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-purple-300">{filteredRareRecipes.length}</div>
            <div className="text-sm text-gray-400">recettes disponibles</div>
          </div>
        </div>

        {/* Contrôles de filtrage et d'expansion */}
        <div className="mb-6 space-y-4">
          {/* Barre de recherche pour les recettes rares */}
          <div className="bg-gray-700 rounded-lg p-4">
            <div className="flex items-center space-x-4 mb-4">
              <Search className="w-5 h-5 text-purple-400" />
              <input
                type="text"
                value={rareRecipeSearchTerm}
                onChange={(e) => setRareRecipeSearchTerm(e.target.value)}
                placeholder="Rechercher une recette ou un crafteur..."
                className="flex-1 bg-gray-600 border border-gray-500 rounded px-3 py-2 text-white focus:border-purple-500 focus:outline-none"
                autoComplete="off"
              />
              {rareRecipeSearchTerm && (
                <button 
                  onClick={() => setRareRecipeSearchTerm('')} 
                  className="text-gray-400 hover:text-white"
                  type="button"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Filtres par profession */}
          <div className="bg-gray-700 rounded-lg p-4">
            <div className="flex items-center mb-3">
              <Filter className="w-5 h-5 text-purple-400 mr-2" />
              <h3 className="text-lg font-semibold text-purple-300">Filtrer par métier :</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {availableProfessions.map(profession => (
                <label key={profession} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedProfessions.includes(profession)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedProfessions(prev => [...prev, profession]);
                      } else {
                        setSelectedProfessions(prev => prev.filter(p => p !== profession));
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
                className="mt-3 text-sm text-purple-400 hover:text-purple-300"
              >
                Effacer tous les filtres
              </button>
            )}
          </div>

          {/* Bouton Tout déplier/replier */}
          <div className="flex justify-end">
            <button
              onClick={toggleAllRareRecipes}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded flex items-center transition-colors text-sm"
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
            {Object.entries(recipesByProfession).map(([profession, recipes]) => (
              <div key={profession} className="border border-gray-600 rounded-lg overflow-hidden">
                <div 
                  className="bg-gray-700 px-6 py-4 border-b border-gray-600 cursor-pointer hover:bg-gray-600"
                  onClick={() => setExpandedRareProfessions(prev => ({
                    ...prev,
                    [profession]: !prev[profession]
                  }))}
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-yellow-400 flex items-center">
                      <span className="text-2xl mr-3">{professionIcons[profession as keyof typeof professionIcons] || '🔮'}</span>
                      {profession}
                      <span className="ml-3 px-2 py-1 bg-gray-600 rounded text-sm text-gray-300">
                        {recipes.length} recette{recipes.length > 1 ? 's' : ''}
                      </span>
                    </h3>
                    {expandedRareProfessions[profession] ? 
                      <ChevronDown className="w-5 h-5 text-gray-400" /> : 
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    }
                  </div>
                </div>
                
                {expandedRareProfessions[profession] && (
                  <div className="p-6">
                    <div className="space-y-2">
                      {recipes.map(recipe => (
                        <div 
                          key={recipe.id} 
                          className="flex items-center justify-between p-3 rounded-lg bg-gray-700 hover:bg-gray-600 border border-gray-600"
                        >
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-white text-sm truncate">
                              {recipe.name}
                            </h4>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {recipe.crafters.map(crafter => (
                                <button
                                  key={crafter}
                                  onClick={() => {
                                    const publicChar = publicCharacters.find(c => c.name === crafter);
                                    if (publicChar) {
                                      window.open(`?share=${publicChar.shareId}`, '_blank');
                                    }
                                  }}
                                  className="px-2 py-1 bg-yellow-600 hover:bg-yellow-700 text-black text-xs rounded font-medium cursor-pointer transition-colors"
                                >
                                  {crafter}
                                </button>
                              ))}
                            </div>
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
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-400">Aucune recette trouvée avec les filtres actuels.</p>
          </div>
        )}

        <div className="mt-6 text-center">
          <button
            onClick={loadRareRecipes}
            disabled={rareRecipesLoading}
            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded text-sm disabled:opacity-50"
          >
            {rareRecipesLoading ? 'Analyse...' : '🔄 Actualiser les recettes rares'}
          </button>
        </div>
      </div>
    );
  };

  const CharacterForm = ({ editMode = false, characterToEdit = null }: { 
    editMode?: boolean; 
    characterToEdit?: Character | null; 
  }) => {
    const [form, setForm] = useState<{
      name: string;
      server: string;
      level: number;
      faction: 'alliance' | 'horde';
      race: string;
      class: string;
      guild: string;
      profession1: string;
      profession2: string;
    }>({
      name: characterToEdit?.name || '',
      server: characterToEdit?.server || 'Gehennas',
      level: characterToEdit?.level || 90,
      faction: characterToEdit?.faction || 'horde',
      race: characterToEdit?.race || '',
      class: characterToEdit?.class || '',
      guild: characterToEdit?.guild || 'Raid Tisane et Dodo',
      profession1: characterToEdit?.profession1 || '',
      profession2: characterToEdit?.profession2 || ''
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
      <div className="max-w-2xl mx-auto bg-gray-800 rounded-lg p-8 border border-yellow-600">
        <h2 className="text-3xl font-bold text-yellow-400 mb-6 flex items-center">
          <User className="mr-3" />
          {editMode ? 'Modifier le personnage' : 'Créer un personnage'}
        </h2>
        
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Nom"
              value={form.name}
              onChange={e => setForm(prev => ({...prev, name: e.target.value}))}
              className="bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:border-yellow-500 focus:outline-none"
            />
            <input
              type="text"
              placeholder="Serveur"
              value={form.server}
              onChange={e => setForm(prev => ({...prev, server: e.target.value}))}
              className="bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:border-yellow-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <input
              type="number"
              placeholder="Niveau"
              value={form.level}
              onChange={e => setForm(prev => ({...prev, level: parseInt(e.target.value) || 90}))}
              className="bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:border-yellow-500 focus:outline-none"
            />
            <select
              value={form.faction}
              onChange={e => setForm(prev => ({...prev, faction: e.target.value as 'alliance' | 'horde', race: ''}))}
              className="bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:border-yellow-500 focus:outline-none"
            >
              <option value="alliance">🛡️ Alliance</option>
              <option value="horde">⚔️ Horde</option>
            </select>
            <input
              type="text"
              placeholder="Guilde"
              value={form.guild}
              onChange={e => setForm(prev => ({...prev, guild: e.target.value}))}
              className="bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:border-yellow-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <select
              value={form.race}
              onChange={e => setForm(prev => ({...prev, race: e.target.value}))}
              className="bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:border-yellow-500 focus:outline-none"
            >
              <option value="">Choisir une race</option>
              {races[form.faction].map(race => (
                <option key={race} value={race}>{race}</option>
              ))}
            </select>
            <select
              value={form.class}
              onChange={e => setForm(prev => ({...prev, class: e.target.value}))}
              className="bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:border-yellow-500 focus:outline-none"
            >
              <option value="">Choisir une classe</option>
              {classes.map(cls => (
                <option key={cls} value={cls}>{cls}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <select
              value={form.profession1}
              onChange={e => setForm(prev => ({...prev, profession1: e.target.value}))}
              className="bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:border-yellow-500 focus:outline-none"
            >
              <option value="">Métier principal 1</option>
              {professions.map(prof => (
                <option key={prof} value={prof}>{prof}</option>
              ))}
            </select>
            <select
              value={form.profession2}
              onChange={e => setForm(prev => ({...prev, profession2: e.target.value}))}
              className="bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:border-yellow-500 focus:outline-none"
            >
              <option value="">Métier principal 2</option>
              {professions.filter(p => p !== form.profession1).map(prof => (
                <option key={prof} value={prof}>{prof}</option>
              ))}
            </select>
          </div>

          <div className="flex space-x-4">
            <button
              onClick={handleSubmit}
              disabled={!form.name || !form.race || !form.class}
              className="bg-yellow-600 hover:bg-yellow-700 text-black font-bold py-3 px-6 rounded disabled:opacity-50"
            >
              {editMode ? 'Sauvegarder les modifications' : 'Créer le personnage'}
            </button>
            <button
              onClick={() => {
                if (editMode) {
                  setEditingCharacter(null);
                  setView('character');
                } else {
                  setView('home');
                }
              }}
              className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-6 rounded"
            >
              Annuler
            </button>
          </div>
        </div>
      </div>
    );
  };

  const ImportView = ({ profession }: { profession: string }) => (
    <div className="max-w-4xl mx-auto bg-gray-800 rounded-lg p-8 border border-yellow-600">
      <h2 className="text-3xl font-bold text-yellow-400 mb-6">
        <Upload className="inline mr-3" />
        Importer - {profession}
      </h2>
      
      <div className="mb-6">
        <label className="block text-yellow-300 font-semibold mb-2">
          Liste markdown :
        </label>
        <textarea
          value={importText}
          onChange={e => setImportText(e.target.value)}
          className="w-full h-64 bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:border-yellow-500 focus:outline-none font-mono text-sm"
          placeholder="- [Item Name](https://wowhead.com/cata/item=12345)
- [Autre Item](https://wowhead.com/cata/spell=67890)"
        />
        <p className="text-gray-400 text-sm mt-2">
          ℹ️ Le niveau de métier sera automatiquement détecté depuis votre export
        </p>
      </div>
      
      <div className="flex space-x-4">
        <button
          onClick={() => importCrafts(profession)}
          disabled={!importText.trim()}
          className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded disabled:opacity-50"
        >
          Importer
        </button>
        <button
          onClick={() => setView('character')}
          className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-6 rounded"
        >
          Annuler
        </button>
      </div>
    </div>
  );

  const CharacterView = () => {
    if (!currentCharacter) return null;

    const professionsArray = [currentCharacter.profession1, currentCharacter.profession2].filter(Boolean);
    
    const filteredProfessionData = useMemo(() => {
      return professionsArray.map(profession => {
        const crafts = currentCharacter.crafts[profession] || [];
        const filteredCrafts = crafts.filter(craft => 
          !searchTerm || craft.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
        
        // Tri alphabétique des crafts
        filteredCrafts.sort((a, b) => a.name.localeCompare(b.name));
        
        const categories = filteredCrafts.reduce((acc, craft) => {
          if (!acc[craft.category]) acc[craft.category] = [];
          acc[craft.category].push(craft);
          return acc;
        }, {} as { [key: string]: CraftItem[] });

        return {
          profession,
          crafts,
          filteredCrafts,
          categories
        };
      });
    }, [professionsArray, currentCharacter.crafts, searchTerm]);
    
    return (
      <div className="max-w-6xl mx-auto">
        <div className="bg-gray-800 rounded-lg p-6 mb-6 border border-yellow-600">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-4xl font-bold text-yellow-400 mb-2">{currentCharacter.name}</h1>
              <div className="text-gray-300 space-y-1">
                <p>Niveau {currentCharacter.level} {currentCharacter.race} {currentCharacter.class}</p>
                {currentCharacter.server && <p>Serveur: {currentCharacter.server}</p>}
                {currentCharacter.guild && <p>Guilde: {currentCharacter.guild}</p>}
                <p className={currentCharacter.faction === 'alliance' ? 'text-blue-400' : 'text-red-400'}>
                  {currentCharacter.faction === 'alliance' ? '🛡️ Alliance' : '⚔️ Horde'}
                </p>
              </div>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => {
                  setEditingCharacter(currentCharacter);
                  setView('edit');
                }}
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded flex items-center"
              >
                <Edit className="w-4 h-4 mr-2" />
                Éditer
              </button>
              <button
                onClick={shareCharacter}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center disabled:opacity-50"
              >
                <Share className="w-4 h-4 mr-2" />
                {loading ? 'Partage...' : 'Partager'}
              </button>
              <button
                onClick={shareToDiscord}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded flex items-center"
                title="Partager sur Discord"
              >
                💬 Discord
              </button>
            </div>
          </div>
        </div>

        <SearchBar onSearchChange={handleSearchChange} />

        {filteredProfessionData.map(({ profession, crafts, categories }) => (
          <div key={profession} className="bg-gray-800 rounded-lg border border-yellow-600 mb-6">
            <div className="p-6 border-b border-gray-700">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-yellow-400">{profession}</h2>
                  {(currentCharacter.professionLevels?.[profession] || 0) > 0 && (
                    <p className={`text-sm ${getProfessionLevelColor(currentCharacter.professionLevels[profession])}`}>
                      {getProfessionLevelIcon(currentCharacter.professionLevels[profession])} Niveau {currentCharacter.professionLevels[profession]} ({getProfessionLevelName(currentCharacter.professionLevels[profession])})
                    </p>
                  )}
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setView(`import-${profession}`)}
                    className="bg-yellow-600 hover:bg-yellow-700 text-black px-4 py-2 rounded flex items-center"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Importer
                  </button>
                  {crafts.length > 0 && (
                    <button
                      onClick={() => {
                        if (confirm(`Supprimer toutes les recettes de ${profession} ?`)) {
                          const updated = {
                            ...currentCharacter,
                            professionLevels: {
                              ...currentCharacter.professionLevels,
                              [profession]: 0
                            },
                            crafts: { ...currentCharacter.crafts, [profession]: [] }
                          };
                          setCharacters(chars => chars.map(c => c.id === currentCharacter.id ? updated : c));
                          setCurrentCharacter(updated);
                        }
                      }}
                      className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded flex items-center"
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
                      onClick={() => toggleAllCategories(profession, Object.keys(categories))}
                      className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded flex items-center transition-colors text-sm"
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
                  const isExpanded = expandedCategories[`${profession}-${category}`] || false;
                  
                  return (
                    <div key={category} className="mb-4">
                      <button
                        onClick={() => setExpandedCategories(prev => ({
                          ...prev,
                          [`${profession}-${category}`]: !isExpanded
                        }))}
                        className="w-full flex items-center justify-between bg-gray-600 hover:bg-gray-500 rounded-lg p-3"
                      >
                        <span className="text-yellow-300 font-semibold">
                          {category} ({items.length})
                        </span>
                        {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                      </button>
                      
                      {isExpanded && (
                        <div className="mt-2 space-y-1 ml-4">
                          {items.map(item => (
                            <div key={item.id} className="bg-gray-700 rounded-lg p-2 flex items-center justify-between">
                              <span className="text-yellow-300 text-sm">{item.name}</span>
                              <a
                                href={item.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded"
                              >
                                Wowhead
                              </a>
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

  const HomeView = () => (
    <div className="max-w-6xl mx-auto text-center">
      <div className="bg-gray-800 rounded-lg px-6 py-8 border border-yellow-600 mb-4">
        <h1 className="text-5xl font-bold text-yellow-400 mb-4">WoW Crafting Tracker by Ostie</h1>
        <p className="text-xl text-gray-300 mb-8">Partagez vos métiers World of Warcraft</p>
        
        <div className="bg-blue-900 border border-blue-600 rounded-lg p-6 mb-6 text-left grid md:grid-cols-2 gap-6">
          <h2 className="text-2xl font-bold text-blue-300 mb-4">📋 Instructions</h2>
          <div className="space-y-4 text-gray-200">
            <div>
              <h3 className="text-lg font-semibold text-blue-200 mb-2">1. Installez l'addon :</h3>
              <a 
                href="https://www.curseforge.com/wow/addons/simple-trade-skill-exporter" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded"
              >
                Simple Trade Skill Exporter
              </a>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-blue-200 mb-2">2. Dans le jeu :</h3>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Ouvrez votre métier</li>
                <li>Tapez : <code className="bg-gray-700 px-2 py-1 rounded text-yellow-300">/tsexport markdown</code></li>
                <li>Copiez avec Ctrl+C</li>
                <li>Collez dans ce site</li>
              </ul>
            </div>
          </div>
        </div>

        {characters.length === 0 ? (
          <button
            onClick={() => setView('create')}
            className="bg-yellow-600 hover:bg-yellow-700 text-black font-bold py-4 px-8 rounded-lg text-xl"
          >
            Créer mon personnage
          </button>
        ) : (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-yellow-400">Mes personnages</h2>
            <div className="grid gap-4">
              {characters.map(character => (
                <div key={character.id} className="bg-gray-700 rounded-lg p-4 border border-gray-600 hover:border-yellow-500">
                  <div className="flex items-center justify-between">
                    <div 
                      className="flex-1 cursor-pointer"
                      onClick={() => {
                        setCurrentCharacter(character);
                        setView('character');
                      }}
                    >
                      <h3 className="text-xl font-bold text-yellow-300">{character.name}</h3>
                      <p className="text-gray-300">Niveau {character.level} {character.race} {character.class}</p>
                      <p className="text-gray-400 text-sm">
                        {character.server} {character.guild && `• ${character.guild}`}
                      </p>
                    </div>
                    <button
                      onClick={() => deleteCharacter(character)}
                      className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm ml-4"
                    >
                      Supprimer
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={() => setView('create')}
              className="bg-yellow-600 hover:bg-yellow-700 text-black font-bold py-2 px-6 rounded"
            >
              Ajouter un personnage
            </button>
          </div>
        )}
      </div>

      <RareRecipesSection />

      <div className="bg-gray-800 rounded-lg p-8 border border-yellow-600">
        <h2 className="text-3xl font-bold text-yellow-400 mb-6">🌟 Communauté</h2>
        
        {publicCharacters.length > 0 ? (
          <>
            <p className="text-gray-300 mb-6">Découvrez les personnages partagés par la communauté</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {publicCharacters.map(character => (
                <div 
                  key={character.shareId}
                  className={`bg-gray-700 rounded-lg p-6 border-2 ${
                    character.faction === 'alliance' ? 'border-blue-500' : 'border-red-500'
                  }`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <button
                        onClick={() => window.open(`?share=${character.shareId}`, '_blank')}
                        className="text-xl font-bold text-yellow-300 hover:text-yellow-400 cursor-pointer"
                      >
                        {character.name}
                      </button>
                      <p className="text-gray-300 text-sm">
                        Niveau {character.level} {character.race} {character.class}
                      </p>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      character.faction === 'alliance' ? 'bg-blue-600 text-blue-100' : 'bg-red-600 text-red-100'
                    }`}>
                      {character.faction === 'alliance' ? '🛡️ Alliance' : '⚔️ Horde'}
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
                    <h4 className="text-yellow-400 font-semibold text-sm">Métiers principaux :</h4>
                    
                    {[character.profession1, character.profession2].filter(Boolean).map((prof) => (
                      <div key={prof} className="flex items-center justify-between bg-gray-600 rounded p-2">
                        <div className="flex flex-col">
                          <span className="text-white text-sm font-medium">{prof}</span>
                          {(character.professionLevels?.[prof] || 0) > 0 && (
                            <span className={`text-xs ${getProfessionLevelColor(character.professionLevels[prof])}`}>
                              {getProfessionLevelIcon(character.professionLevels[prof])} Niveau {character.professionLevels[prof]} ({getProfessionLevelName(character.professionLevels[prof])})
                            </span>
                          )}
                        </div>
                        <span className="bg-yellow-600 text-black px-2 py-1 rounded text-xs font-bold">
                          {character.craftCounts?.[prof] || 0}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-600">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 text-sm">Total des recettes :</span>
                      <span className="text-yellow-400 font-bold">
                        {Object.values(character.craftCounts as Record<string, number>).reduce((a: number, b: number) => a + b, 0)}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 text-center">
                    <button
                      onClick={() => window.open(`?share=${character.shareId}`, '_blank')}
                      className="text-blue-400 text-xs hover:text-blue-300"
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
            <h3 className="text-2xl font-bold text-yellow-300 mb-4">Aucun personnage partagé</h3>
            <p className="text-gray-400 mb-6">
              Soyez le premier à partager vos métiers avec la communauté !<br/>
              Créez un personnage, ajoutez vos recettes et cliquez sur "Partager".
            </p>
            <div className="bg-blue-900 border border-blue-600 rounded-lg p-4 max-w-md mx-auto">
              <p className="text-blue-200 text-sm">
                💡 <strong>Astuce :</strong> Les personnages partagés apparaissent ici automatiquement
                et permettent à la communauté de voir vos métiers !
              </p>
            </div>
          </div>
        )}
        
        <div className="mt-6 text-center">
          <button
            onClick={loadPublicCharacters}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm"
          >
            🔄 Actualiser la liste
          </button>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-yellow-400 mx-auto mb-4"></div>
          <p className="text-xl text-gray-300">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white">
        <nav className="bg-gray-800 border-b border-yellow-600 p-4">
          <div className="max-w-6xl mx-auto flex justify-between items-center">
            <button
              onClick={() => setView('home')}
              className="text-2xl font-bold text-yellow-400 hover:text-yellow-300"
            >
              WoW Crafting Tracker
            </button>
            <div className="flex items-center">
              {currentCharacter && view === 'character' && (
                <div className="text-yellow-300 mr-4">
                  {currentCharacter.name} - {currentCharacter.server}
                </div>
              )}
              <ThemeSwitcher />
            </div>
          </div>
        </nav>

      <main className="container mx-auto px-4 py-8">
        {view === 'home' && <HomeView />}
        {view === 'create' && <CharacterForm />}
        {view === 'edit' && <CharacterForm editMode={true} characterToEdit={editingCharacter} />}
        {view === 'character' && <CharacterView />}
        {view.startsWith('import-') && (
          <ImportView profession={view.replace('import-', '')} />
        )}
      </main>
    </div>
  );
};

export default WoWCraftingTracker;
