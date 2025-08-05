
'use client'

import React from 'react';
import RareRecipesSection from './RareRecipesSection'; // ajuste si le chemin est différent

// Exemple : données fictives à remplacer par tes hooks ou props
const publicCharacters = []; // à remplacer par ton usePublicCharacters()
const characters = []; // à remplacer par ton useCharacters()
const setView = () => {}; // à remplacer par ta logique réelle
const loadPublicCharacters = () => {}; // idem

const getProfessionLevelColor = (level: number) => 'text-green-400'; // stub
const getProfessionLevelIcon = (level: number) => '🔧'; // stub
const getProfessionLevelName = (level: number) => 'Apprenti'; // stub

const HomeView = () => (
  <div className="max-w-6xl mx-auto text-center">
    <div className="bg-gray-800 rounded-lg px-6 py-8 border border-yellow-600 mb-4">
      <h1 className="text-5xl font-bold text-yellow-400 mb-4">WoW Crafting Tracker</h1>
      <p className="text-xl text-gray-300 mb-6">Partagez vos métiers World of Warcraft</p>

      <div className="bg-blue-900 border border-blue-600 rounded-lg p-6 mb-6 text-left grid md:grid-cols-2 gap-6">
        <div>
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
        <div className="flex items-center justify-center">
          <button
            onClick={() => setView(characters.length === 0 ? 'create' : 'create')}
            className="bg-yellow-600 hover:bg-yellow-700 text-black font-bold py-4 px-8 rounded-lg text-xl"
          >
            {characters.length === 0 ? 'Créer mon personnage' : 'Ajouter un personnage'}
          </button>
        </div>
      </div>

      {/* Section Communauté */}
      <div className="bg-gray-800 rounded-lg p-6 border border-yellow-600">
        <h2 className="text-3xl font-bold text-yellow-400 mb-6">🌟 Communauté</h2>

        {publicCharacters.length > 0 ? (
          <>
            <p className="text-gray-300 mb-6">Découvrez les personnages partagés par la communauté</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {publicCharacters.map(character => (
                <div 
                  key={character.shareId}
                  className={`bg-gray-700 rounded-lg p-4 border-2 ${
                    character.faction === 'alliance' ? 'border-blue-500' : 'border-red-500'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
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

                  <div className="mb-2 space-y-1">
                    {character.server && (
                      <p className="text-gray-400 text-xs">📍 {character.server}</p>
                    )}
                    {character.guild && (
                      <p className="text-gray-400 text-xs">⚔️ {character.guild}</p>
                    )}
                  </div>

                  <div className="space-y-2">
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

                  <div className="mt-3 text-center">
                    <button
                      onClick={() => window.open(`?share=${character.shareId}`, '_blank')}
                      className="text-blue-400 text-xs hover:text-blue-300"
                    >
                      🔗 Voir le profil
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-6">
            <div className="text-3xl mb-2">👥</div>
            <h3 className="text-lg font-bold text-yellow-300 mb-2">Aucun personnage partagé</h3>
            <p className="text-gray-400 text-sm mb-3">
              Soyez le premier à partager vos métiers avec la communauté !<br />
              Créez un personnage, ajoutez vos recettes et cliquez sur "Partager".
            </p>
            <div className="bg-blue-900 border border-blue-600 rounded-lg p-2 max-w-md mx-auto">
              <p className="text-blue-200 text-xs">
                💡 <strong>Astuce :</strong> Les personnages partagés apparaissent ici automatiquement
                et permettent à la communauté de voir vos métiers !
              </p>
            </div>
          </div>
        )}

        <div className="mt-3 text-center">
          <button
            onClick={loadPublicCharacters}
            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-xs"
          >
            🔄 Actualiser la liste
          </button>
        </div>
      </div>

      {/* Section Recettes Rares */}
      <RareRecipesSection />
    </div>
);

export default function WoWCraftingTracker() {
  return <HomeView />;
}
