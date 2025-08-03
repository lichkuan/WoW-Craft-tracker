import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, Upload, User, Scroll, Wand2, Hammer, Gem, Plus, X, Share, Search, Trash2, Eye, EyeOff, Beaker, Mountain, Flower, Wrench, Scissors, Palette, Zap, LucideIcon } from 'lucide-react';

interface PublicCharacter {
  shareId: string;
  name: string;
  level: number;
  race: string;
  class: string;
  faction: string;
  server: string;
  guild: string;
  primaryProfession1: string;
  primaryProfession2: string;
  professionLevels: Record<string, number>;
  craftCounts: Record<string, number>;
}

interface Character {
  id: string;
  name: string;
  faction: string;
  race: string;
  class: string;
  level: number;
  server: string;
  guild: string;
  primaryProfession1: string;
  primaryProfession2: string;
  professionLevels: Record<string, number>;
  crafts: { [key: string]: CraftItem[] };
}

interface CraftItem {
  id: string;
  name: string;
  url: string;
  category: string;
}

interface FormData {
  name: string;
  faction: string;
  race: string;
  class: string;
  level: number;
  server: string;
  guild: string;
  primaryProfession1: string;
  primaryProfession2: string;
}

const WoWCraftingTracker: React.FC = () => {
  const [currentView, setCurrentView] = useState<string>('home');
  const [characters, setCharacters] = useState<Character[]>([]);
  const [currentCharacter, setCurrentCharacter] = useState<Character | null>(null);
  const [importText, setImportText] = useState<string>('');
  const [wowExtension, setWowExtension] = useState<string>('mop-classic');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [expandedCategories, setExpandedCategories] = useState<{ [key: string]: boolean }>({});
  const [allExpanded, setAllExpanded] = useState<boolean>(true);
  const [shareSuccess, setShareSuccess] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [publicCharacters, setPublicCharacters] = useState<PublicCharacter[]>([]);
  const [levelFilter, setLevelFilter] = useState<number>(0);

  // Generate short ID for sharing
  const generateShareId = (): string => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  // Fonction pour obtenir le nom du niveau de métier
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

  // Fonction pour obtenir l'icône du niveau de métier
  const getProfessionLevelIcon = (level: number): string => {
    if (level >= 1 && level <= 60) return '⭐';        // Apprenti
    if (level >= 60 && level <= 140) return '⭐⭐';     // Compagnon
    if (level >= 140 && level <= 205) return '⭐⭐⭐';   // Expert
    if (level >= 205 && level <= 300) return '🔥';     // Artisan
    if (level >= 300 && level <= 350) return '💎';     // Maître
    if (level >= 350 && level <= 425) return '⚡';     // Grand Maître
    if (level >= 425 && level <= 500) return '🌟';     // Illustre
    if (level >= 500 && level <= 600) return '👑';     // Zen
    return '';
  };
  const getProfessionLevelColor = (level: number): string => {
    if (level >= 1 && level <= 60) return 'text-gray-400';      // Apprenti
    if (level >= 60 && level <= 140) return 'text-green-400';   // Compagnon
    if (level >= 140 && level <= 205) return 'text-yellow-400'; // Expert
    if (level >= 205 && level <= 300) return 'text-orange-400'; // Artisan
    if (level >= 300 && level <= 350) return 'text-red-400';    // Maître
    if (level >= 350 && level <= 425) return 'text-purple-400'; // Grand Maître
    if (level >= 425 && level <= 500) return 'text-blue-400';   // Illustre
    if (level >= 500 && level <= 600) return 'text-pink-400';   // Zen
    return 'text-gray-400';
  };

  // Fonction pour obtenir l'icône du métier
  const getProfessionIcon = (profession: string): LucideIcon => {
    const iconMap: { [key: string]: LucideIcon } = {
      'Alchimie': Beaker,
      'Forge': Hammer,
      'Enchantement': Wand2,
      'Ingénierie': Wrench,
      'Herboristerie': Flower,
      'Joaillerie': Gem,
      'Travail du cuir': Scissors,
      'Minage': Mountain,
      'Calligraphie': Scroll,
      'Dépeçage': Zap,
      'Couture': Palette
    };
    return iconMap[profession] || Scroll;
  };

  // Fonction pour extraire le niveau de métier du texte markdown
  const extractProfessionLevel = (text: string, profession: string): number => {
    const lines = text.split('\n');
    
    console.log('=== DEBUG EXTRACTION NIVEAU ===');
    console.log('Profession recherchée:', profession);
    console.log('Premières lignes du texte:', lines.slice(0, 5));
    
    // Chercher des patterns comme "Alchemy (450/600)" ou "skill level: 450"
    for (const line of lines) {
      const lowerLine = line.toLowerCase();
      const professionLower = profession.toLowerCase();
      
      console.log('Ligne analysée:', line);
      console.log('Ligne en minuscules:', lowerLine);
      
      // Pattern 1: "**Enchantement:** Skill 600, 235 total recipes"
      if (lowerLine.includes('skill') && lowerLine.includes(professionLower)) {
        console.log('Pattern 1 trouvé! Ligne:', line);
        const skillMatch = line.match(/skill\s+(\d+)/i);
        if (skillMatch) {
          console.log('Niveau extrait:', skillMatch[1]);
          return parseInt(skillMatch[1]);
        }
      }
      
      // Pattern 2: "Alchemy (450/600)"
      const pattern2 = new RegExp(`${professionLower}.*\\((\\d+)\\/(\\d+)\\)`, 'i');
      const match2 = line.match(pattern2);
      if (match2) {
        console.log('Pattern 2 trouvé! Niveau:', match2[1]);
        return parseInt(match2[1]);
      }
      
      // Pattern 3: "skill level: 450" ou "niveau: 450"
      if (lowerLine.includes(professionLower) && (lowerLine.includes('level') || lowerLine.includes('niveau'))) {
        const levelMatch = line.match(/(\d+)/);
        if (levelMatch) {
          console.log('Pattern 3 trouvé! Niveau:', levelMatch[1]);
          return parseInt(levelMatch[1]);
        }
      }
      
      // Pattern 4: "Alchemy - 450"
      const pattern4 = new RegExp(`${professionLower}.*-(\\d+)`, 'i');
      const match4 = line.match(pattern4);
      if (match4) {
        console.log('Pattern 4 trouvé! Niveau:', match4[1]);
        return parseInt(match4[1]);
      }
      
      // Pattern 5: Ligne dédiée comme "Enchantement niveau: 450"
      const pattern5 = new RegExp(`^${professionLower}\\s*niveau?:?\\s*(\\d+)`, 'i');
      const match5 = line.match(pattern5);
      if (match5) {
        console.log('Pattern 5 trouvé! Niveau:', match5[1]);
        return parseInt(match5[1]);
      }
    }
    
    console.log('Aucun niveau trouvé pour', profession);
    return 0; // Niveau inconnu
  };

  const parseMarkdownList = (text: string, extension: string = 'mop-classic', profession: string = ''): CraftItem[] => {
    const lines = text.split('\n');
    const items: CraftItem[] = [];
    
    lines.forEach((line) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('- [') && trimmed.includes('](')) {
        // Regex plus robuste pour capturer nom et URL
        const match = trimmed.match(/^- \[([^\]]+)\]\(([^)]+)\)$/);
        
        if (match) {
          const name = match[1];
          let url = match[2];
          
          // Conversion SYSTÉMATIQUE pour MoP Classic
          if (extension === 'mop-classic' && url.includes('/cata/')) {
            url = url.replace('/cata/', '/mop-classic/fr/');
          }
          
          items.push({
            name: name,
            url: url,
            id: Math.random().toString(36).substr(2, 9),
            category: categorizeItem(name)
          });
        }
      }
    });
    
    return items;
  };

  const categorizeItem = (itemName: string): string => {
    const name = itemName.toLowerCase();
    
    // Catégories pour enchantements
    if (name.includes('arme') || name.includes('weapon') || name.includes('bâton')) return 'Armes';
    if (name.includes('bottes') || name.includes('boots') || name.includes('pandaren') || name.includes('pas')) return 'Bottes';
    if (name.includes('brassards') || name.includes('bracer')) return 'Brassards';
    if (name.includes('gants') || name.includes('gloves')) return 'Gants';
    if (name.includes('plastron') || name.includes('chest')) return 'Plastron';
    if (name.includes('cape') || name.includes('cloak')) return 'Cape';
    if (name.includes('bouclier') || name.includes('shield')) return 'Bouclier';
    if (name.includes('anneau') || name.includes('ring')) return 'Anneaux';
    if (name.includes('main gauche') || name.includes('off-hand') || name.includes('objet en main gauche')) return 'Main gauche';
    
    // Matériaux et objets spéciaux
    if (name.includes('cristal') || name.includes('éclat') || name.includes('essence') || 
        name.includes('barre') || name.includes('cuir') || name.includes('bris') ||
        name.includes('sphère') || name.includes('huile') || name.includes('lanterne') ||
        name.includes('baguette') || name.includes('bâtonnet') || name.includes('diffusion') ||
        name.includes('eclatement') || name.includes('transformation')) {
      return 'Matériaux et objets';
    }
    
    // Catégories pour autres métiers (forge, joaillerie, etc.)
    if (name.includes('casque') || name.includes('helm')) return 'Casques';
    if (name.includes('épaulière') || name.includes('shoulder')) return 'Épaulières';
    if (name.includes('ceinture') || name.includes('belt')) return 'Ceintures';
    if (name.includes('jambière') || name.includes('legs')) return 'Jambières';
    if (name.includes('épée') || name.includes('sword')) return 'Épées';
    if (name.includes('hache') || name.includes('axe')) return 'Haches';
    if (name.includes('masse') || name.includes('mace')) return 'Masses';
    if (name.includes('dague') || name.includes('dagger')) return 'Dagues';
    if (name.includes('arc') || name.includes('bow')) return 'Arcs';
    if (name.includes('collier') || name.includes('necklace')) return 'Colliers';
    if (name.includes('trinket') || name.includes('trinité')) return 'Bijoux';
    if (name.includes('gemme') || name.includes('gem')) return 'Gemmes';
    
    return 'Autres';
  };

  const filterItemsBySearch = (items: CraftItem[], searchTerm: string): CraftItem[] => {
    if (!searchTerm || !searchTerm.trim()) return items;
    
    const search = searchTerm.toLowerCase().trim();
    return items.filter(item => {
      if (!item || !item.name) return false;
      return item.name.toLowerCase().includes(search) ||
             (item.category && item.category.toLowerCase().includes(search));
    });
  };

  const toggleCategory = (profession: string, category: string): void => {
    setExpandedCategories(prev => ({
      ...prev,
      [`${profession}-${category}`]: !prev[`${profession}-${category}`]
    }));
  };

  const generateDiscordMessage = (character: Character): string => {
    const totalRecipes = Object.values(character.crafts || {}).reduce((total, recipes) => total + recipes.length, 0);
    const professions = [character.primaryProfession1, character.primaryProfession2].filter(Boolean);
    
    let message = `🎮 **${character.name}** - Niveau ${character.level} ${character.race} ${character.class}\n`;
    message += `${character.faction === 'alliance' ? '🛡️ Alliance' : '⚔️ Horde'} | ${character.server}${character.guild ? ` | ${character.guild}` : ''}\n\n`;
    
    professions.forEach(prof => {
      const level = character.professionLevels?.[prof] || 0;
      const count = character.crafts[prof]?.length || 0;
      const icon = getProfessionLevelIcon(level);
      message += `${icon} **${prof}** ${level > 0 ? `niveau ${level}` : ''} - ${count} recettes\n`;
    });
    
    message += `\n📊 **Total : ${totalRecipes} recettes**\n`;
    message += `🔗 Voir le profil complet : ${window.location.origin}${window.location.pathname}?share=`;
    
    return message;
  };

  const shareToDiscord = async (): Promise<void> => {
    if (!currentCharacter) return;
    
    try {
      const shareId = await saveCharacterForSharing(currentCharacter);
      if (shareId) {
        const message = generateDiscordMessage(currentCharacter) + shareId;
        await navigator.clipboard.writeText(message);
        alert('Message Discord copié ! Collez-le dans votre serveur Discord 🎮');
      }
    } catch (error) {
      console.error('Erreur lors de la génération du message Discord:', error);
    }
  };

  // Fixed function: copyWowheadLinks
  const copyWowheadLinks = async (items: CraftItem[], categoryName: string): Promise<void> => {
    const links = items.map(item => item.url).join('\n');
    try {
      await navigator.clipboard.writeText(links);
      alert(`${items.length} liens ${categoryName} copiés dans le presse-papiers !`);
    } catch (error) {
      console.error('Erreur lors de la copie:', error);
      prompt('Copiez ces liens:', links);
    }
  };

  // Fixed function: toggleAllCategories
  const toggleAllCategories = (profession: string, categories: string[]): void => {
    const newState = !allExpanded;
    setAllExpanded(newState);
    
    const updates: { [key: string]: boolean } = {};
    categories.forEach(category => {
      updates[`${profession}-${category}`] = newState;
    });
    
    setExpandedCategories(prev => ({
      ...prev,
      ...updates
    }));
  };

  const deleteProfessionCrafts = (profession: string): void => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer toutes les recettes de ${profession} ?`)) {
      return;
    }

    if (!currentCharacter) return;

    const updatedCharacter: Character = {
      ...currentCharacter,
      crafts: {
        ...currentCharacter.crafts,
        [profession]: []
      }
    };
    
    const updatedCharacters = characters.map(char => 
      char.id === currentCharacter.id ? updatedCharacter : char
    );
    
    setCharacters(updatedCharacters);
    setCurrentCharacter(updatedCharacter);
  };

  const handleCreateCharacter = (characterData: FormData): void => {
    const newCharacter: Character = {
      ...characterData,
      id: Math.random().toString(36).substr(2, 9),
      professionLevels: {},
      crafts: {}
    };
    
    const updatedCharacters = [...characters, newCharacter];
    setCharacters(updatedCharacters);
    setCurrentCharacter(newCharacter);
    setCurrentView('character');
  };

  const handleDeleteCharacter = async (character: Character): Promise<void> => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer définitivement ${character.name} ?`)) {
      return;
    }

    setIsLoading(true);
    
    try {
      // Supprimer de la base de données
      await deleteCharacterFromDatabase(character);
      
      // Supprimer du localStorage
      const updatedCharacters = characters.filter(char => char.id !== character.id);
      setCharacters(updatedCharacters);
      
      // Si c'était le personnage actuel, revenir à l'accueil
      if (currentCharacter?.id === character.id) {
        setCurrentCharacter(null);
        setCurrentView('home');
      }
      
      // Recharger la liste publique
      loadPublicCharacters();
      
      alert('Personnage supprimé avec succès !');
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      alert('Erreur lors de la suppression du personnage');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImportCrafts = (profession: string): void => {
    if (!importText.trim() || !currentCharacter) return;
    
    // Extraire le niveau de métier
    const professionLevel = extractProfessionLevel(importText, profession);
    
    const items = parseMarkdownList(importText, wowExtension, profession);
    const updatedCharacter: Character = {
      ...currentCharacter,
      professionLevels: {
        ...currentCharacter.professionLevels,
        [profession]: professionLevel
      },
      crafts: {
        ...currentCharacter.crafts,
        [profession]: items
      }
    };
    
    const updatedCharacters = characters.map(char => 
      char.id === currentCharacter.id ? updatedCharacter : char
    );
    
    setCharacters(updatedCharacters);
    setCurrentCharacter(updatedCharacter);
    setImportText('');
    setCurrentView('character');
  };

  // Load shared character from API
  const loadSharedCharacter = async (shareId: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/character/${shareId}`);
      if (response.ok) {
        const sharedCharacter = await response.json();
        
        // Migration pour ajouter professionLevels si manquant
        const migratedCharacter = {
          ...sharedCharacter,
          professionLevels: sharedCharacter.professionLevels || {}
        };
        
        setCurrentCharacter(migratedCharacter);
        setCurrentView('character');
      } else {
        console.error('Personnage partagé non trouvé');
      }
    } catch (error) {
      console.error('Erreur lors du chargement du personnage partagé:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Save character to database for sharing
  const saveCharacterForSharing = async (character: Character): Promise<string | null> => {
    try {
      const shareId = generateShareId();
      const response = await fetch('/api/character', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          shareId,
          character
        })
      });

      if (response.ok) {
        return shareId;
      } else {
        console.error('Erreur lors de la sauvegarde');
        return null;
      }
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      return null;
    }
  };

  // Delete character from database
  const deleteCharacterFromDatabase = async (character: Character): Promise<boolean> => {
    try {
      const response = await fetch('/api/character/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          characterName: character.name,
          characterServer: character.server
        })
      });

      return response.ok;
    } catch (error) {
      console.error('Erreur lors de la suppression de la base:', error);
      return false;
    }
  };

  // FONCTION CORRIGÉE : Load public characters from API
  const loadPublicCharacters = async () => {
    try {
      console.log('🔄 Chargement des personnages publics...');
      const response = await fetch('/api/characters/public');
      console.log('📡 Réponse API public:', response.status, response.ok);
      
      if (response.ok) {
        const publicChars: PublicCharacter[] = await response.json();
        console.log('✅ Personnages publics chargés:', publicChars.length);
        console.log('📋 Détails:', publicChars);
        
        setPublicCharacters(publicChars);
        
        if (publicChars.length > 0) {
          console.log('🎯 Personnages mis à jour dans l\'état React');
        } else {
          console.log('⚠️ Aucun personnage public trouvé');
        }
      } else {
        const errorData = await response.json();
        console.error('❌ Erreur API personnages publics:', errorData);
      }
    } catch (error) {
      console.error('❌ Erreur lors du chargement des personnages publics:', error);
    }
  };

  // Cleanup duplicates automatically
  const cleanupDuplicates = async () => {
    try {
      await fetch('/api/cleanup', { method: 'POST' });
      console.log('Nettoyage automatique effectué');
    } catch (error) {
      console.error('Erreur lors du nettoyage:', error);
    }
  };

  // Load data from localStorage on mount
  useEffect(() => {
    const savedCharacters = localStorage.getItem('wowCharacters');
    if (savedCharacters) {
      const parsedCharacters = JSON.parse(savedCharacters);
      
      // Migration pour ajouter professionLevels aux anciens personnages
      const migratedCharacters = parsedCharacters.map((char: any) => ({
        ...char,
        professionLevels: char.professionLevels || {}
      }));
      
      setCharacters(migratedCharacters);
      if (migratedCharacters.length > 0) {
        setCurrentCharacter(migratedCharacters[0]);
      }
    }
  
    // Load public characters
    loadPublicCharacters();
  
    // COMMENTÉ TEMPORAIREMENT - C'EST LUI QUI SUPPRIME VOS PERSONNAGES !
    // cleanupDuplicates();
  
    // Check for shared character in URL
    const urlParams = new URLSearchParams(window.location.search);
    const shareId = urlParams.get('share');
    if (shareId) {
      loadSharedCharacter(shareId);
  }
}, []);

  // Save to localStorage whenever characters change
  useEffect(() => {
    localStorage.setItem('wowCharacters', JSON.stringify(characters));
  }, [characters]);

  const races = {
    alliance: ['Humain', 'Nain', 'Elfe de la nuit', 'Gnome', 'Draeneï', 'Worgen', 'Pandaren'],
    horde: ['Orc', 'Mort-vivant', 'Tauren', 'Troll', 'Elfe de sang', 'Gobelin', 'Pandaren']
  };

  const classes = [
    'Guerrier', 'Paladin', 'Chasseur', 'Voleur', 'Prêtre', 'Chevalier de la mort',
    'Chaman', 'Mage', 'Démoniste', 'Moine', 'Druide'
  ];

  const professions = {
    primary: ['Alchimie', 'Forge', 'Enchantement', 'Ingénierie', 'Herboristerie', 'Joaillerie', 'Travail du cuir', 'Minage', 'Calligraphie', 'Dépeçage', 'Couture']
  };

  const CharacterCreation: React.FC = () => {
    const [formData, setFormData] = useState<FormData>({
      name: '',
      faction: 'alliance',
      race: '',
      class: '',
      level: 90,
      server: '',
      guild: '',
      primaryProfession1: '',
      primaryProfession2: ''
    });

    return (
      <div className="max-w-2xl mx-auto bg-gray-800 rounded-lg p-8 border border-yellow-600">
        <h2 className="text-3xl font-bold text-yellow-400 mb-6 flex items-center">
          <User className="mr-3" />
          Créer un personnage
        </h2>
        
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-yellow-300 font-semibold mb-2">Nom du personnage</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({...prev, name: e.target.value}))}
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:border-yellow-500 focus:outline-none"
                placeholder="Nom du personnage"
              />
            </div>
            
            <div>
              <label className="block text-yellow-300 font-semibold mb-2">Niveau</label>
              <input
                type="number"
                value={formData.level}
                onChange={(e) => setFormData(prev => ({...prev, level: parseInt(e.target.value) || 90}))}
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:border-yellow-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-yellow-300 font-semibold mb-2">Serveur</label>
              <input
                type="text"
                value={formData.server}
                onChange={(e) => setFormData(prev => ({...prev, server: e.target.value}))}
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:border-yellow-500 focus:outline-none"
                placeholder="Gehennas"
              />
            </div>
            
            <div>
              <label className="block text-yellow-300 font-semibold mb-2">Guilde</label>
              <input
                type="text"
                value={formData.guild}
                onChange={(e) => setFormData(prev => ({...prev, guild: e.target.value}))}
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:border-yellow-500 focus:outline-none"
                placeholder="Raid Tisane et Dodo"
              />
            </div>
          </div>

          <div>
            <label className="block text-yellow-300 font-semibold mb-2">Faction</label>
            <div className="flex space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="alliance"
                  checked={formData.faction === 'alliance'}
                  onChange={(e) => setFormData(prev => ({...prev, faction: e.target.value, race: ''}))}
                  className="mr-2"
                />
                <span className="text-blue-400 font-semibold">Alliance</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="horde"
                  checked={formData.faction === 'horde'}
                  onChange={(e) => setFormData(prev => ({...prev, faction: e.target.value, race: ''}))}
                  className="mr-2"
                />
                <span className="text-red-400 font-semibold">Horde</span>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-yellow-300 font-semibold mb-2">Race</label>
              <select
                value={formData.race}
                onChange={(e) => setFormData(prev => ({...prev, race: e.target.value}))}
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:border-yellow-500 focus:outline-none"
              >
                <option value="">Choisir une race</option>
                {(races as any)[formData.faction].map((race: string) => (
                  <option key={race} value={race}>{race}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-yellow-300 font-semibold mb-2">Classe</label>
              <select
                value={formData.class}
                onChange={(e) => setFormData(prev => ({...prev, class: e.target.value}))}
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:border-yellow-500 focus:outline-none"
              >
                <option value="">Choisir une classe</option>
                {classes.map(cls => (
                  <option key={cls} value={cls}>{cls}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-yellow-300 font-semibold mb-2">Métier principal 1</label>
              <select
                value={formData.primaryProfession1}
                onChange={(e) => setFormData(prev => ({...prev, primaryProfession1: e.target.value}))}
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:border-yellow-500 focus:outline-none"
              >
                <option value="">Choisir un métier</option>
                {professions.primary.map(prof => (
                  <option key={prof} value={prof}>{prof}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-yellow-300 font-semibold mb-2">Métier principal 2</label>
              <select
                value={formData.primaryProfession2}
                onChange={(e) => setFormData(prev => ({...prev, primaryProfession2: e.target.value}))}
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:border-yellow-500 focus:outline-none"
              >
                <option value="">Choisir un métier</option>
                {professions.primary.filter(prof => prof !== formData.primaryProfession1).map(prof => (
                  <option key={prof} value={prof}>{prof}</option>
                ))}
              </select>
            </div>
          </div>

          <button
            onClick={() => formData.name && formData.race && formData.class && handleCreateCharacter(formData)}
            className="w-full bg-yellow-600 hover:bg-yellow-700 text-black font-bold py-3 px-6 rounded transition-colors disabled:opacity-50"
            disabled={!formData.name || !formData.race || !formData.class}
          >
            Créer le personnage
          </button>
        </div>
      </div>
    );
  };

  const ImportView: React.FC<{ profession: string }> = ({ profession }) => (
    <div className="max-w-4xl mx-auto bg-gray-800 rounded-lg p-8 border border-yellow-600">
      <h2 className="text-3xl font-bold text-yellow-400 mb-6 flex items-center">
        <Upload className="mr-3" />
        Importer les recettes - {profession}
      </h2>
      
      {/* Sélecteur d'extension WoW */}
      <div className="mb-6">
        <label className="block text-yellow-300 font-semibold mb-2">
          Extension World of Warcraft :
        </label>
        <div className="flex space-x-4">
          <label className="flex items-center">
            <input
              type="radio"
              value="cataclysm"
              checked={wowExtension === 'cataclysm'}
              onChange={(e) => setWowExtension(e.target.value)}
              className="mr-2"
            />
            <span className="text-orange-400 font-semibold">Cataclysm (garde /cata/)</span>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              value="mop-classic"
              checked={wowExtension === 'mop-classic'}
              onChange={(e) => setWowExtension(e.target.value)}
              className="mr-2"
            />
            <span className="text-green-400 font-semibold">MoP Classic (convertit en /mop-classic/fr/)</span>
          </label>
        </div>
      </div>
      
      <div className="mb-6">
        <label className="block text-yellow-300 font-semibold mb-2">
          Collez votre liste markdown ici :
        </label>
        <textarea
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
          className="w-full h-64 bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:border-yellow-500 focus:outline-none font-mono text-sm"
          placeholder="- [Nom de l'item](https://wowhead.com/cata/item=12345)
- [Autre item](https://wowhead.com/cata/spell=67890)"
        />
        
        {/* Niveau de métier manuel */}
        <div className="mt-4">
          <label className="block text-yellow-300 font-semibold mb-2">
            Niveau de {profession} (optionnel) :
          </label>
          <input
            type="number"
            min="0"
            max="600"
            placeholder="Ex: 450"
            className="w-32 bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:border-yellow-500 focus:outline-none"
            onChange={(e) => {
              const level = parseInt(e.target.value) || 0;
              if (level > 0) {
                setImportText(prev => `${profession} niveau: ${level}\n${prev}`);
              }
            }}
          />
          <p className="text-gray-400 text-sm mt-1">
            Si le niveau n'est pas détecté automatiquement, vous pouvez le saisir ici
          </p>
        </div>
      </div>
      
      <div className="flex space-x-4">
        <button
          onClick={() => handleImportCrafts(profession)}
          className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded transition-colors"
          disabled={!importText.trim()}
        >
          Importer les recettes
        </button>
        <button
          onClick={() => setCurrentView('character')}
          className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-6 rounded transition-colors"
        >
          Annuler
        </button>
      </div>
    </div>
  );

  const CharacterView: React.FC = () => {
    if (!currentCharacter) return null;

    const allProfessions = [
      currentCharacter.primaryProfession1,
      currentCharacter.primaryProfession2
    ].filter(Boolean);

    const handleShare = async (): Promise<void> => {
      setIsLoading(true);
      try {
        const shareId = await saveCharacterForSharing(currentCharacter);
        if (shareId) {
          const shareUrl = `${window.location.origin}${window.location.pathname}?share=${shareId}`;
          await navigator.clipboard.writeText(shareUrl);
          setShareSuccess(true);
          setTimeout(() => setShareSuccess(false), 3000);
        } else {
          alert('Erreur lors de la création du lien de partage');
        }
      } catch (error) {
        console.error('Erreur lors du partage:', error);
        alert('Erreur lors de la création du lien de partage');
      } finally {
        setIsLoading(false);
      }
    };

    return (
      <div className="max-w-6xl mx-auto">
        {/* Character Header */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6 border border-yellow-600">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-4xl font-bold text-yellow-400 mb-2">{currentCharacter.name}</h1>
              <div className="text-gray-300 space-y-1">
                <p>Niveau {currentCharacter.level} {currentCharacter.race} {currentCharacter.class}</p>
                {currentCharacter.server && <p>Serveur: {currentCharacter.server}</p>}
                {currentCharacter.guild && <p>Guilde: {currentCharacter.guild}</p>}
                <p className={currentCharacter.faction === 'alliance' ? 'text-blue-400' : 'text-red-400'}>
                  {currentCharacter.faction === 'alliance' ? 'Alliance' : 'Horde'}
                </p>
              </div>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={handleShare}
                disabled={isLoading}
                className={`px-4 py-2 rounded flex items-center transition-all duration-300 ${
                  shareSuccess 
                    ? 'bg-green-600 hover:bg-green-700 text-white' 
                    : isLoading
                    ? 'bg-gray-600 text-gray-300 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
                title="Créer un lien de partage"
              >
                <Share className="w-4 h-4 mr-2" />
                {isLoading ? 'Création...' : shareSuccess ? 'Lien copié !' : 'Partager'}
              </button>
              <button
                onClick={shareToDiscord}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded flex items-center transition-colors"
                title="Partager sur Discord"
              >
                💬 Discord
              </button>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="bg-gray-800 rounded-lg p-4 border border-yellow-600">
            <div className="flex items-center space-x-4">
              <Search className="w-5 h-5 text-yellow-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Rechercher dans les recettes..."
                className="flex-1 bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:border-yellow-500 focus:outline-none"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Professions */}
        <div className="grid gap-6">
          {allProfessions.map(profession => {
            const crafts = currentCharacter.crafts[profession] || [];
            const ProfessionIcon = getProfessionIcon(profession);
            
            return (
              <div key={profession} className="bg-gray-800 rounded-lg border border-yellow-600">
                <div className="p-6 border-b border-gray-700">
                  <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-yellow-400 flex items-center">
                      <ProfessionIcon className="mr-3 w-8 h-8" />
                      <div className="flex flex-col">
                        <span>{profession}</span>
                        {(currentCharacter.professionLevels?.[profession] || 0) > 0 && (
                          <span className={`text-sm font-normal ${getProfessionLevelColor(currentCharacter.professionLevels[profession])}`}>
                            {getProfessionLevelIcon(currentCharacter.professionLevels[profession])} Niveau {currentCharacter.professionLevels[profession]} ({getProfessionLevelName(currentCharacter.professionLevels[profession])})
                          </span>
                        )}
                      </div>
                    </h2>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setCurrentView(`import-${profession}`)}
                        className="bg-yellow-600 hover:bg-yellow-700 text-black px-4 py-2 rounded flex items-center transition-colors"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Importer
                      </button>
                      {crafts.length > 0 && (
                        <button
                          onClick={() => deleteProfessionCrafts(profession)}
                          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded flex items-center transition-colors"
                          title="Supprimer toutes les recettes"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Supprimer
                        </button>
                      )}
                    </div>
                  </div>
                  {crafts.length > 0 && (
                    <p className="text-gray-400 mt-2">{crafts.length} recettes disponibles</p>
                  )}
                </div>
                
                {crafts.length > 0 ? (
                  <div className="p-6">
                    {(() => {
                      // Vérification de sécurité pour éviter les erreurs
                      if (!crafts || !Array.isArray(crafts)) {
                        return (
                          <div className="text-center text-gray-500">
                            <p>Erreur dans le chargement des recettes</p>
                          </div>
                        );
                      }

                      const filteredCrafts = filterItemsBySearch(crafts, searchTerm);
                      
                      if (!filteredCrafts || filteredCrafts.length === 0) {
                        if (searchTerm && searchTerm.trim()) {
                          return (
                            <div className="text-center text-gray-500">
                              <p>Aucune recette trouvée pour "{searchTerm}"</p>
                            </div>
                          );
                        }
                        return (
                          <div className="text-center text-gray-500">
                            <p>Aucune recette disponible</p>
                          </div>
                        );
                      }

                      const categorizedCrafts = filteredCrafts.reduce((acc: { [key: string]: CraftItem[] }, craft) => {
                        if (!craft || !craft.category) return acc;
                        
                        if (!acc[craft.category]) {
                          acc[craft.category] = [];
                        }
                        acc[craft.category].push(craft);
                        return acc;
                      }, {});

                      const categories = Object.keys(categorizedCrafts).sort();

                      return (
                        <div>
                          {/* Boutons Expand/Collapse All */}
                          {categories.length > 1 && (
                            <div className="mb-4 flex justify-end">
                              <button
                                onClick={() => toggleAllCategories(profession, categories)}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center transition-colors text-sm"
                              >
                                {allExpanded ? (
                                  <>
                                    <EyeOff className="w-4 h-4 mr-2" />
                                    Tout replier
                                  </>
                                ) : (
                                  <>
                                    <Eye className="w-4 h-4 mr-2" />
                                    Tout déplier
                                  </>
                                )}
                              </button>
                            </div>
                          )}

                          {categories.map(category => {
                            const categoryKey = `${profession}-${category}`;
                            const isExpanded = expandedCategories[categoryKey] !== false; // Par défaut ouvert
                            const categoryItems = categorizedCrafts[category];

                            return (
                              <div key={category} className="mb-4">
                                <button
                                  onClick={() => toggleCategory(profession, category)}
                                  className="w-full flex items-center justify-between bg-gray-600 hover:bg-gray-500 rounded-lg p-3 transition-colors"
                                >
                                  <span className="text-yellow-300 font-semibold">
                                    {category} ({categoryItems.length})
                                  </span>
                                  <div className="flex items-center space-x-2">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        copyWowheadLinks(categoryItems, category);
                                      }}
                                      className="bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded text-xs transition-colors"
                                      title="Copier tous les liens Wowhead de cette catégorie"
                                    >
                                      📋 Copier liens
                                    </button>
                                    {isExpanded ? (
                                      <ChevronDown className="w-5 h-5 text-yellow-400" />
                                    ) : (
                                      <ChevronRight className="w-5 h-5 text-yellow-400" />
                                    )}
                                  </div>
                                </button>
                                
                                {isExpanded && (
                                  <div className="mt-2 space-y-2">
                                    {categoryItems.map(craft => (
                                      <div key={craft.id} className="bg-gray-700 rounded-lg p-3 hover:bg-gray-600 transition-colors ml-4">
                                        <div className="flex items-center justify-between">
                                          <span className="text-yellow-300 font-medium">{craft.name}</span>
                                          <a 
                                            href={craft.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded transition-colors"
                                          >
                                            Wowhead
                                          </a>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  <div className="p-6 text-center text-gray-500">
                    <p>Aucune recette importée pour ce métier</p>
                    <p className="text-sm mt-2">Cliquez sur "Importer" pour ajouter vos recettes</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const HomeView: React.FC = () => (
    <div className="max-w-6xl mx-auto text-center">
      <div className="bg-gray-800 rounded-lg p-12 border border-yellow-600 mb-8">
        <h1 className="text-5xl font-bold text-yellow-400 mb-4">WoW Crafting Tracker</h1>
        <p className="text-xl text-gray-300 mb-8">
          Partagez vos métiers et recettes World of Warcraft avec vos amis
        </p>
        
        {/* Instructions pour l'addon */}
        <div className="bg-blue-900 border border-blue-600 rounded-lg p-6 mb-8 text-left">
          <h2 className="text-2xl font-bold text-blue-300 mb-4">📋 Comment exporter vos recettes</h2>
          
          <div className="space-y-4 text-gray-200">
            <div>
              <h3 className="text-lg font-semibold text-blue-200 mb-2">1. Installez l'addon requis :</h3>
              <a 
                href="https://www.curseforge.com/wow/addons/simple-trade-skill-exporter" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded transition-colors"
              >
                Télécharger Simple Trade Skill Exporter
              </a>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-blue-200 mb-2">2. Dans le jeu :</h3>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Ouvrez votre fenêtre de métier (Enchantement, Forge, etc.)</li>
                <li>Tapez la commande : <code className="bg-gray-700 px-2 py-1 rounded text-yellow-300">/tsexport markdown</code></li>
                <li>Utilisez <strong>Ctrl+C</strong> pour copier la liste</li>
                <li>Collez la liste dans la zone d'import de ce site</li>
              </ul>
            </div>
            
            <div className="bg-gray-700 rounded p-3">
              <p className="text-sm text-gray-300">
                <strong>Note :</strong> Cet addon exporte automatiquement vos recettes avec les liens WowHead corrects.
                L'export en format markdown est parfait pour ce site !
              </p>
            </div>
          </div>
        </div>

        {/* BOUTONS DE DEBUG AJOUTÉS */}
        <div className="bg-purple-900 border border-purple-600 rounded-lg p-6 mb-8">
          <h3 className="text-xl font-bold text-purple-300 mb-4">🔍 Debug (Temporaire)</h3>
          <div className="flex flex-wrap gap-2 justify-center">
            <button
              onClick={async () => {
                console.log('=== DEBUG PERSONNAGES PUBLICS ===');
                console.log('État actuel publicCharacters:', publicCharacters);
                console.log('Longueur:', publicCharacters.length);
                
                // Test direct de l'API
                const response = await fetch('/api/characters/public');
                const data = await response.json();
                console.log('Réponse API directe:', data);
                
                // Forcer le rechargement
                await loadPublicCharacters();
                
                alert(`Debug: ${publicCharacters.length} personnages dans l'état, ${data.length} de l'API`);
              }}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded text-sm transition-colors"
            >
              🔍 Debug Personnages Publics
            </button>
            
            <button
              onClick={() => {
                console.log('Force reload personnages publics...');
                loadPublicCharacters();
              }}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm transition-colors"
            >
              🔄 Forcer Rechargement
            </button>

            <button
              onClick={async () => {
                console.log('=== TEST API PUBLIQUE DIRECTE ===');
                const response = await fetch('/api/characters/public');
                const data = await response.json();
                console.log('Data:', data);
                alert(`API: ${response.status} - ${data.length || 0} personnages`);
              }}
              className="bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded text-sm transition-colors"
            >
              🌐 Test API Direct
            </button>
          </div>
          <p className="text-purple-200 text-sm mt-3">
            Ces boutons aident à diagnostiquer pourquoi les personnages n'apparaissent pas. Consultez la console (F12).
          </p>
        </div>

        {/* Statistiques globales */}
        {publicCharacters.length > 0 && (
          <div className="bg-gradient-to-r from-purple-900 to-blue-900 border border-purple-600 rounded-lg p-6 mb-8">
            <h2 className="text-2xl font-bold text-purple-300 mb-4">📊 Statistiques de la communauté</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
              <div className="bg-purple-800 bg-opacity-50 rounded-lg p-4">
                <div className="text-3xl font-bold text-purple-300">{publicCharacters.length}</div>
                <div className="text-purple-200">Personnages partagés</div>
              </div>
              <div className="bg-blue-800 bg-opacity-50 rounded-lg p-4">
                <div className="text-3xl font-bold text-blue-300">
                  {publicCharacters.reduce((total, char) => 
                    total + Object.values(char.craftCounts as Record<string, number>).reduce((a, b) => a + b, 0), 0
                  )}
                </div>
                <div className="text-blue-200">Recettes au total</div>
              </div>
              <div className="bg-green-800 bg-opacity-50 rounded-lg p-4">
                <div className="text-3xl font-bold text-green-300">
                  {new Set(publicCharacters.flatMap(char => [char.primaryProfession1, char.primaryProfession2].filter(Boolean))).size}
                </div>
                <div className="text-green-200">Métiers différents</div>
              </div>
            </div>
          </div>
        )}
        
        {characters.length === 0 ? (
          <button
            onClick={() => setCurrentView('create')}
            className="bg-yellow-600 hover:bg-yellow-700 text-black font-bold py-4 px-8 rounded-lg text-xl transition-colors"
          >
            Créer mon premier personnage
          </button>
        ) : (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-yellow-400">Mes personnages</h2>
            <div className="grid gap-4">
              {characters.map(character => (
                <div 
                  key={character.id}
                  className="bg-gray-700 rounded-lg p-4 border border-gray-600 hover:border-yellow-500 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div 
                      className="flex-1 cursor-pointer"
                      onClick={() => {
                        setCurrentCharacter(character);
                        setCurrentView('character');
                      }}
                    >
                      <h3 className="text-xl font-bold text-yellow-300">{character.name}</h3>
                      <p className="text-gray-300">
                        Niveau {character.level} {character.race} {character.class}
                      </p>
                      {character.server && (
                        <p className="text-gray-400 text-sm">{character.server}</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleDeleteCharacter(character)}
                      className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm transition-colors ml-4"
                      title="Supprimer définitivement ce personnage"
                    >
                      🗑️ Supprimer
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={() => setCurrentView('create')}
              className="bg-yellow-600 hover:bg-yellow-700 text-black font-bold py-2 px-6 rounded transition-colors"
            >
              Ajouter un personnage
            </button>
          </div>
        )}
      </div>

      {/* Section des personnages publics */}
      {publicCharacters.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-8 border border-yellow-600">
          <h2 className="text-3xl font-bold text-yellow-400 mb-6">🌟 Personnages de la communauté</h2>
          <p className="text-gray-300 mb-6">Découvrez les personnages et métiers partagés par la communauté</p>
          
          {/* Filtre par niveau */}
          <div className="mb-6 flex items-center space-x-4">
            <label className="text-yellow-300 font-semibold">Filtrer par niveau :</label>
            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(parseInt(e.target.value))}
              className="bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:border-yellow-500 focus:outline-none"
            >
              <option value={0}>Tous les niveaux</option>
              <option value={600}>👑 Niveau 600 (Zen)</option>
              <option value={500}>🌟 Niveau 500+ (Illustre)</option>
              <option value={425}>⚡ Niveau 425+ (Grand Maître)</option>
              <option value={350}>💎 Niveau 350+ (Maître)</option>
            </select>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {publicCharacters.filter(character => {
              if (levelFilter === 0) return true;
              const levels = Object.values(character.professionLevels || {});
              return levels.some(level => level >= levelFilter);
            }).map(character => {
              const ProfessionIcon1 = getProfessionIcon(character.primaryProfession1);
              const ProfessionIcon2 = getProfessionIcon(character.primaryProfession2);
              
              return (
                <div 
                  key={character.shareId}
                  className={`bg-gray-700 rounded-lg p-6 cursor-pointer hover:bg-gray-600 transition-all duration-300 border-2 ${
                    character.faction === 'alliance' 
                      ? 'border-blue-500 hover:border-blue-400 hover:shadow-blue-500/20 hover:shadow-lg' 
                      : 'border-red-500 hover:border-red-400 hover:shadow-red-500/20 hover:shadow-lg'
                  }`}
                  onClick={() => {
                    window.open(`?share=${character.shareId}`, '_blank');
                  }}
                >
                  {/* En-tête du personnage */}
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-yellow-300">{character.name}</h3>
                      <p className="text-gray-300 text-sm">
                        Niveau {character.level} {character.race} {character.class}
                      </p>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      character.faction === 'alliance' ? 'bg-blue-600 text-blue-100' : 'bg-red-600 text-red-100'
                    }`}>
                      {character.faction === 'alliance' ? 'Alliance' : 'Horde'}
                    </span>
                  </div>

                  {/* Serveur et Guilde */}
                  <div className="mb-4 space-y-1">
                    {character.server && (
                      <p className="text-gray-400 text-sm">📍 {character.server}</p>
                    )}
                    {character.guild && (
                      <p className="text-gray-400 text-sm">⚔️ {character.guild}</p>
                    )}
                  </div>

                  {/* Métiers */}
                  <div className="space-y-3">
                    <h4 className="text-yellow-400 font-semibold text-sm">Métiers principaux :</h4>
                    
                    {character.primaryProfession1 && (
                      <div className="flex items-center justify-between bg-gray-600 rounded p-2">
                        <div className="flex items-center">
                          <ProfessionIcon1 className="w-5 h-5 text-yellow-400 mr-2" />
                          <div className="flex flex-col">
                            <span className="text-white text-sm font-medium">{character.primaryProfession1}</span>
                            {(character.professionLevels?.[character.primaryProfession1] || 0) > 0 && (
                              <span className={`text-xs ${getProfessionLevelColor(character.professionLevels[character.primaryProfession1])}`}>
                                {getProfessionLevelIcon(character.professionLevels[character.primaryProfession1])} Niveau {character.professionLevels[character.primaryProfession1]} ({getProfessionLevelName(character.professionLevels[character.primaryProfession1])})
                              </span>
                            )}
                          </div>
                        </div>
                        <span className="bg-yellow-600 text-black px-2 py-1 rounded text-xs font-bold">
                          {character.craftCounts[character.primaryProfession1] || 0} recettes
                        </span>
                      </div>
                    )}
                    
                    {character.primaryProfession2 && (
                      <div className="flex items-center justify-between bg-gray-600 rounded p-2">
                        <div className="flex items-center">
                          <ProfessionIcon2 className="w-5 h-5 text-yellow-400 mr-2" />
                          <div className="flex flex-col">
                            <span className="text-white text-sm font-medium">{character.primaryProfession2}</span>
                            {(character.professionLevels?.[character.primaryProfession2] || 0) > 0 && (
                              <span className={`text-xs ${getProfessionLevelColor(character.professionLevels[character.primaryProfession2])}`}>
                                {getProfessionLevelIcon(character.professionLevels[character.primaryProfession2])} Niveau {character.professionLevels[character.primaryProfession2]} ({getProfessionLevelName(character.professionLevels[character.primaryProfession2])})
                              </span>
                            )}
                          </div>
                        </div>
                        <span className="bg-yellow-600 text-black px-2 py-1 rounded text-xs font-bold">
                          {character.craftCounts[character.primaryProfession2] || 0} recettes
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Total des recettes */}
                  <div className="mt-4 pt-4 border-t border-gray-600">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 text-sm">Total des recettes :</span>
                      <span className="text-yellow-400 font-bold">
                        {Object.values(character.craftCounts as Record<string, number>).reduce((a: number, b: number) => a + b, 0)}
                      </span>
                    </div>
                  </div>

                  {/* Indicateur de lien */}
                  <div className="mt-3 text-center">
                    <span className="text-blue-400 text-xs">🔗 Cliquez pour voir le profil complet</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bouton pour rafraîchir */}
          <div className="mt-6 text-center space-x-4">
            <button
              onClick={() => {
                loadPublicCharacters();
                cleanupDuplicates();
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition-colors text-sm"
            >
              🔄 Actualiser la liste
            </button>
            <button
              onClick={cleanupDuplicates}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded transition-colors text-sm"
            >
              🧹 Nettoyer les doublons
            </button>
          </div>
        </div>
      )}
    </div>
  );

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-yellow-400 mx-auto mb-4"></div>
          <p className="text-xl text-gray-300">Chargement du personnage partagé...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white">
      <nav className="bg-gray-800 border-b border-yellow-600 p-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <button
            onClick={() => setCurrentView('home')}
            className="text-2xl font-bold text-yellow-400 hover:text-yellow-300 transition-colors"
          >
            WoW Crafting Tracker
          </button>
          
          {currentCharacter && currentView === 'character' && (
            <div className="text-yellow-300">
              {currentCharacter.name} - {currentCharacter.server}
            </div>
          )}
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8">
        {currentView === 'home' && <HomeView />}
        {currentView === 'create' && <CharacterCreation />}
        {currentView === 'character' && <CharacterView />}
        {currentView.startsWith('import-') && (
          <ImportView profession={currentView.replace('import-', '')} />
        )}
      </main>
    </div>
  );
};

export default WoWCraftingTracker;
