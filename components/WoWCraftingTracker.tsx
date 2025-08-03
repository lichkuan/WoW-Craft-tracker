import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, Upload, User, Scroll, Wand2, Hammer, Gem, Plus, X, Share, Search, Trash2, Eye, EyeOff } from 'lucide-react';

const WoWCraftingTracker = () => {
  const [currentView, setCurrentView] = useState('home');
  const [characters, setCharacters] = useState([]);
  const [currentCharacter, setCurrentCharacter] = useState(null);
  const [importText, setImportText] = useState('');
  const [wowExtension, setWowExtension] = useState('mop-classic');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCategories, setExpandedCategories] = useState({});
  const [allExpanded, setAllExpanded] = useState(true);

  // Load data from localStorage on mount
  useEffect(() => {
    const savedCharacters = localStorage.getItem('wowCharacters');
    if (savedCharacters) {
      const parsedCharacters = JSON.parse(savedCharacters);
      setCharacters(parsedCharacters);
      if (parsedCharacters.length > 0) {
        setCurrentCharacter(parsedCharacters[0]);
      }
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
    primary: ['Alchimie', 'Forge', 'Enchantement', 'Ingénierie', 'Herboristerie', 'Joaillerie', 'Travail du cuir', 'Minage', 'Calligraphie', 'Dépeçage', 'Couture'],
    secondary: ['Archéologie', 'Cuisine', 'Pêche', 'Secourisme']
  };

  const parseMarkdownList = (text, extension = 'mop-classic') => {
    const lines = text.split('\n');
    const items = [];
    
    console.log('Extension sélectionnée:', extension); // Debug
    
    lines.forEach(line => {
      const trimmed = line.trim();
      if (trimmed.startsWith('- [') && trimmed.includes('](')) {
        const nameMatch = trimmed.match(/\[([^\]]+)\]/);
        const urlMatch = trimmed.match(/\(([^)]+)\)/);
        
        if (nameMatch && urlMatch) {
          let url = urlMatch[1];
          console.log('URL avant conversion:', url); // Debug
          
          // Conversion SYSTÉMATIQUE pour MoP Classic
          if (extension === 'mop-classic' && url.includes('/cata/')) {
            url = url.replace('/cata/', '/mop-classic/fr/');
            console.log('URL après conversion:', url); // Debug
          }
          
          items.push({
            name: nameMatch[1],
            url: url,
            id: Math.random().toString(36).substr(2, 9),
            category: categorizeItem(nameMatch[1])
          });
        }
      }
    });
    
    console.log('Items parsés:', items.length); // Debug
    return items;
  };

  const categorizeItem = (itemName) => {
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

  const filterItemsBySearch = (items, searchTerm) => {
    if (!searchTerm || !searchTerm.trim()) return items;
    
    const search = searchTerm.toLowerCase().trim();
    return items.filter(item => {
      if (!item || !item.name) return false;
      return item.name.toLowerCase().includes(search) ||
             (item.category && item.category.toLowerCase().includes(search));
    });
  };

  const toggleCategory = (profession, category) => {
    setExpandedCategories(prev => ({
      ...prev,
      [`${profession}-${category}`]: !prev[`${profession}-${category}`]
    }));
  };

  const toggleAllCategories = (profession, categories) => {
    const newState = !allExpanded;
    setAllExpanded(newState);
    
    const updates = {};
    categories.forEach(category => {
      updates[`${profession}-${category}`] = newState;
    });
    
    setExpandedCategories(prev => ({
      ...prev,
      ...updates
    }));
  };

  const deleteProfessionCrafts = (profession) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer toutes les recettes de ${profession} ?`)) {
      return;
    }

    const updatedCharacter = {
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

  const handleCreateCharacter = (characterData) => {
    const newCharacter = {
      ...characterData,
      id: Math.random().toString(36).substr(2, 9),
      crafts: {}
    };
    
    const updatedCharacters = [...characters, newCharacter];
    setCharacters(updatedCharacters);
    setCurrentCharacter(newCharacter);
    setCurrentView('character');
  };

  const handleImportCrafts = (profession) => {
    if (!importText.trim()) return;
    
    const items = parseMarkdownList(importText, wowExtension);
    const updatedCharacter = {
      ...currentCharacter,
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

  const CharacterCreation = () => {
    const [formData, setFormData] = useState({
      name: '',
      faction: 'alliance',
      race: '',
      class: '',
      level: 90,
      server: '',
      guild: '',
      primaryProfession1: '',
      primaryProfession2: '',
      secondaryProfessions: []
    });

    const toggleSecondaryProfession = (prof) => {
      setFormData(prev => ({
        ...prev,
        secondaryProfessions: prev.secondaryProfessions.includes(prof)
          ? prev.secondaryProfessions.filter(p => p !== prof)
          : [...prev.secondaryProfessions, prof]
      }));
    };

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
                {races[formData.faction].map(race => (
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

          <div>
            <label className="block text-yellow-300 font-semibold mb-2">Métiers secondaires</label>
            <div className="grid grid-cols-2 gap-2">
              {professions.secondary.map(prof => (
                <label key={prof} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.secondaryProfessions.includes(prof)}
                    onChange={() => toggleSecondaryProfession(prof)}
                    className="mr-2"
                  />
                  <span className="text-gray-300">{prof}</span>
                </label>
              ))}
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

  const ImportView = ({ profession }) => (
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

  const CharacterView = () => {
    if (!currentCharacter) return null;

    const allProfessions = [
      currentCharacter.primaryProfession1,
      currentCharacter.primaryProfession2,
      ...currentCharacter.secondaryProfessions
    ].filter(Boolean);

    const getShareUrl = () => {
      const baseUrl = window.location.origin + window.location.pathname;
      return `${baseUrl}?character=${encodeURIComponent(currentCharacter.id)}`;
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
            <button
              onClick={() => navigator.clipboard.writeText(getShareUrl())}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center transition-colors"
              title="Copier le lien de partage"
            >
              <Share className="w-4 h-4 mr-2" />
              Partager
            </button>
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
            const professionIcon = profession === 'Enchantement' ? Wand2 : 
                                 profession === 'Forge' ? Hammer : 
                                 profession === 'Joaillerie' ? Gem : Scroll;
            
            return (
              <div key={profession} className="bg-gray-800 rounded-lg border border-yellow-600">
                <div className="p-6 border-b border-gray-700">
                  <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-yellow-400 flex items-center">
                      {React.createElement(professionIcon, { className: "mr-3" })}
                      {profession}
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

                      const categorizedCrafts = filteredCrafts.reduce((acc, craft) => {
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
                                  {isExpanded ? (
                                    <ChevronDown className="w-5 h-5 text-yellow-400" />
                                  ) : (
                                    <ChevronRight className="w-5 h-5 text-yellow-400" />
                                  )}
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

  const HomeView = () => (
    <div className="max-w-4xl mx-auto text-center">
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
                  className="bg-gray-700 rounded-lg p-4 cursor-pointer hover:bg-gray-600 transition-colors"
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
    </div>
  );

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
