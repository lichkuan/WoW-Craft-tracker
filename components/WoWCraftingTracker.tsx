'use client'

import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, Upload, User, Share, Search, Trash2, Plus, X } from 'lucide-react';

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

const WoWCraftingTracker: React.FC = () => {
  const [view, setView] = useState<'home' | 'create' | 'character' | string>('home');
  const [characters, setCharacters] = useState<Character[]>([]);
  const [currentCharacter, setCurrentCharacter] = useState<Character | null>(null);
  const [publicCharacters, setPublicCharacters] = useState<PublicCharacter[]>([]);
  const [importText, setImportText] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<{ [key: string]: boolean }>({});
  const [loading, setLoading] = useState(false);

  const professions = ['Alchimie', 'Forge', 'Enchantement', 'Ingénierie', 'Herboristerie', 'Joaillerie', 'Travail du cuir', 'Minage', 'Calligraphie', 'Couture'];
  const races = {
    alliance: ['Humain', 'Nain', 'Elfe de la nuit', 'Gnome', 'Draeneï', 'Worgen', 'Pandaren'],
    horde: ['Orc', 'Mort-vivant', 'Tauren', 'Troll', 'Elfe de sang', 'Gobelin', 'Pandaren']
  };
  const classes = ['Guerrier', 'Paladin', 'Chasseur', 'Voleur', 'Prêtre', 'Chaman', 'Mage', 'Démoniste', 'Moine', 'Druide'];

  // Utilitaires
  const generateShareId = () => Math.random().toString(36).substring(2, 8).toUpperCase();
  
  // Fonctions pour les niveaux de métiers
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

  // Extraction du niveau de métier depuis le texte markdown
  const extractProfessionLevel = (text: string, profession: string): number => {
    const lines = text.split('\n');
    
    for (const line of lines) {
      const lowerLine = line.toLowerCase();
      const professionLower = profession.toLowerCase();
      
      // Pattern "skill 600" ou "niveau 600"
      if (lowerLine.includes('skill') && lowerLine.includes(professionLower)) {
        const skillMatch = line.match(/skill\s+(\d+)/i);
        if (skillMatch) return parseInt(skillMatch[1]);
      }
      
      // Pattern "Alchemy (450/600)"
      const pattern = new RegExp(`${professionLower}.*\\((\\d+)\\/(\\d+)\\)`, 'i');
      const match = line.match(pattern);
      if (match) return parseInt(match[1]);
      
      // Pattern "niveau: 450"
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

  // Génération du message Discord
  const generateDiscordMessage = (character: Character): string => {
    const totalRecipes = Object.values(character.crafts || {}).reduce((total, recipes) => total + recipes.length, 0);
    const professions = [character.profession1, character.profession2].filter(Boolean);
    
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

  // API calls simplifiées
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
      const response = await fetch('/api/characters/public');
      if (response.ok) {
        const chars = await response.json();
        setPublicCharacters(chars);
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

  // Handlers
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

  // Effects
  useEffect(() => {
    const saved = localStorage.getItem('wowCharacters');
    if (saved) {
      const parsedCharacters = JSON.parse(saved);
      // Migration pour ajouter professionLevels aux anciens personnages
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

  // Composants
  const CharacterForm = () => {
    const [form, setForm] = useState({
      name: '', server: '', level: 90, faction: 'alliance' as const,
      race: '', class: '', guild: '', profession1: '', profession2: ''
    });

    return (
      <div className="max-w-2xl mx-auto bg-gray-800 rounded-lg p-8 border border-yellow-600">
        <h2 className="text-3xl font-bold text-yellow-400 mb-6 flex items-center">
          <User className="mr-3" />
          Créer un personnage
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
              placeholder="Guilde (optionnel)"
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

          <button
            onClick={() => form.name && form.race && form.class && createCharacter(form)}
            disabled={!form.name || !form.race || !form.class}
            className="w-full bg-yellow-600 hover:bg-yellow-700 text-black font-bold py-3 px-6 rounded disabled:opacity-50"
          >
            Créer le personnage
          </button>
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
          placeholder="- [Item Name](https://wowhead.com/cata/item=12345)"
        />
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

    const professions = [currentCharacter.profession1, currentCharacter.profession2].filter(Boolean);
    
    return (
      <div className="max-w-6xl mx-auto">
        {/* Header */}
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
            </div> py-2 rounded flex items-center disabled:opacity-50"
            >
              <Share className="w-4 h-4 mr-2" />
              {loading ? 'Partage...' : 'Partager'}
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="bg-gray-800 rounded-lg p-4 border border-yellow-600 flex items-center space-x-4">
            <Search className="w-5 h-5 text-yellow-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Rechercher..."
              className="flex-1 bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:border-yellow-500 focus:outline-none"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="text-gray-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Professions */}
        {professions.map(profession => {
          const crafts = currentCharacter.crafts[profession] || [];
          const filteredCrafts = crafts.filter(craft => 
            !searchTerm || craft.name.toLowerCase().includes(searchTerm.toLowerCase())
          );
          
          const categories = filteredCrafts.reduce((acc, craft) => {
            if (!acc[craft.category]) acc[craft.category] = [];
            acc[craft.category].push(craft);
            return acc;
          }, {} as { [key: string]: CraftItem[] });

          return (
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
                  {Object.entries(categories).map(([category, items]) => {
                    const isExpanded = expandedCategories[`${profession}-${category}`] !== false;
                    
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
                          <div className="mt-2 space-y-2 ml-4">
                            {items.map(item => (
                              <div key={item.id} className="bg-gray-700 rounded-lg p-3 flex items-center justify-between">
                                <span className="text-yellow-300">{item.name}</span>
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
          );
        })}
      </div>
    );
  };

  const HomeView = () => (
    <div className="max-w-6xl mx-auto text-center">
      <div className="bg-gray-800 rounded-lg p-12 border border-yellow-600 mb-8">
        <h1 className="text-5xl font-bold text-yellow-400 mb-4">WoW Crafting Tracker</h1>
        <p className="text-xl text-gray-300 mb-8">Partagez vos métiers World of Warcraft</p>
        
        <div className="bg-blue-900 border border-blue-600 rounded-lg p-6 mb-8 text-left">
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

      {/* Personnages publics */}
      {publicCharacters.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-8 border border-yellow-600">
          <h2 className="text-3xl font-bold text-yellow-400 mb-6">🌟 Communauté</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {publicCharacters.map(character => (
              <div 
                key={character.shareId}
                className={`bg-gray-700 rounded-lg p-6 cursor-pointer hover:bg-gray-600 border-2 ${
                  character.faction === 'alliance' ? 'border-blue-500' : 'border-red-500'
                }`}
                onClick={() => window.open(`?share=${character.shareId}`, '_blank')}
              >
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
                  
                  {character.profession1 && (
                    <div className="flex items-center justify-between bg-gray-600 rounded p-2">
                      <div className="flex flex-col">
                        <span className="text-white text-sm font-medium">{character.profession1}</span>
                        {(character.professionLevels?.[character.profession1] || 0) > 0 && (
                          <span className={`text-xs ${getProfessionLevelColor(character.professionLevels[character.profession1])}`}>
                            {getProfessionLevelIcon(character.professionLevels[character.profession1])} Niveau {character.professionLevels[character.profession1]} ({getProfessionLevelName(character.professionLevels[character.profession1])})
                          </span>
                        )}
                      </div>
                      <span className="bg-yellow-600 text-black px-2 py-1 rounded text-xs font-bold">
                        {character.craftCounts[character.profession1] || 0}
                      </span>
                    </div>
                  )}
                  
                  {character.profession2 && (
                    <div className="flex items-center justify-between bg-gray-600 rounded p-2">
                      <div className="flex flex-col">
                        <span className="text-white text-sm font-medium">{character.profession2}</span>
                        {(character.professionLevels?.[character.profession2] || 0) > 0 && (
                          <span className={`text-xs ${getProfessionLevelColor(character.professionLevels[character.profession2])}`}>
                            {getProfessionLevelIcon(character.professionLevels[character.profession2])} Niveau {character.professionLevels[character.profession2]} ({getProfessionLevelName(character.professionLevels[character.profession2])})
                          </span>
                        )}
                      </div>
                      <span className="bg-yellow-600 text-black px-2 py-1 rounded text-xs font-bold">
                        {character.craftCounts[character.profession2] || 0}
                      </span>
                    </div>
                  )}
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
                  <span className="text-blue-400 text-xs">🔗 Cliquez pour voir le profil complet</span>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-6 text-center">
            <button
              onClick={() => {
                loadPublicCharacters();
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm"
            >
              🔄 Actualiser la liste
            </button>
          </div>
        </div>
      )}
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
          
          {currentCharacter && view === 'character' && (
            <div className="text-yellow-300">
              {currentCharacter.name} - {currentCharacter.server}
            </div>
          )}
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8">
        {view === 'home' && <HomeView />}
        {view === 'create' && <CharacterForm />}
        {view === 'character' && <CharacterView />}
        {view.startsWith('import-') && (
          <ImportView profession={view.replace('import-', '')} />
        )}
      </main>
    </div>
  );
};

export default WoWCraftingTracker;
