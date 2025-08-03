'use client'

import { useState, useEffect } from 'react';

interface Character {
  shareId: string;
  key: string;
  name: string;
  server: string;
  level: number;
  ttl: number;
  status: string;
  createdDate: string;
}

interface AdminData {
  total: number;
  characters: Character[];
  summary: {
    permanent: number;
    temporary: number;
    expired: number;
  };
}

export default function AdminPage() {
  const [data, setData] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirmCode, setConfirmCode] = useState('');
  const [selectedAction, setSelectedAction] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin');
      if (response.ok) {
        const adminData = await response.json();
        setData(adminData);
      } else {
        alert('Erreur lors du chargement des données');
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  const executeAction = async (action: string, shareId?: string) => {
    if (confirmCode !== 'DELETE_ALL_SHARES_2025') {
      alert('Code de confirmation incorrect !');
      return;
    }

    if (!confirm(`Êtes-vous sûr de vouloir exécuter: ${action}${shareId ? ` pour ${shareId}` : ''} ?`)) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/admin', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, shareId, confirmCode })
      });

      const result = await response.json();
      
      if (result.success) {
        alert(result.message);
        await loadData(); // Recharger les données
      } else {
        alert(`Erreur: ${result.error}`);
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de l\'exécution');
    } finally {
      setLoading(false);
    }
  };

  const cleanupDeadLinks = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/cleanup-dead-links', { method: 'POST' });
      const result = await response.json();
      
      if (result.success) {
        alert(`Nettoyage terminé: ${result.totalRemoved} éléments supprimés`);
        await loadData();
      } else {
        alert(`Erreur: ${result.error}`);
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors du nettoyage');
    } finally {
      setLoading(false);
    }
  };

  // Fonctions de debug
  const debugRedis = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/debug/redis');
      const data = await response.json();
      console.log('=== DEBUG REDIS ===');
      console.log('Total clés:', data.totalKeys);
      console.log('Détails:', data);
      alert(`Debug Redis: ${data.totalKeys} clés trouvées. Voir console pour détails.`);
    } catch (error) {
      console.error('Erreur debug Redis:', error);
      alert('Erreur lors du debug Redis');
    } finally {
      setLoading(false);
    }
  };

  const testRedisSave = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/test-save', { method: 'POST' });
      const result = await response.json();
      console.log('=== TEST SAUVEGARDE REDIS ===');
      console.log(result);
      
      if (result.success) {
        alert('✅ Test Redis réussi ! Connexion et sauvegarde OK.');
      } else {
        alert(`❌ Test Redis échoué: ${result.error}`);
      }
      
      // Recharger les données après le test
      await loadData();
    } catch (error) {
      console.error('Erreur test sauvegarde:', error);
      alert('Erreur lors du test de sauvegarde');
    } finally {
      setLoading(false);
    }
  };

  const testCharacterSave = async () => {
    setLoading(true);
    try {
      // Créer un personnage de test
      const testCharacter = {
        id: 'debug-test',
        name: 'DebugTest',
        server: 'TestServer',
        level: 90,
        race: 'Humain',
        class: 'Paladin',
        faction: 'alliance',
        guild: 'Debug Guild',
        primaryProfession1: 'Forge',
        primaryProfession2: 'Minage',
        professionLevels: {
          'Forge': 600,
          'Minage': 600
        },
        crafts: {
          'Forge': [
            { id: '1', name: 'Test Item 1', url: 'https://test.com/1', category: 'Test' }
          ],
          'Minage': []
        }
      };

      const testShareId = 'DEBUG' + Math.random().toString(36).substring(2, 8).toUpperCase();
      
      console.log('=== TEST SAUVEGARDE PERSONNAGE ===');
      console.log('ShareId:', testShareId);
      console.log('Character:', testCharacter);

      const response = await fetch('/api/character', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shareId: testShareId,
          character: testCharacter
        })
      });

      const result = await response.json();
      console.log('Résultat sauvegarde:', result);

      if (result.success) {
        alert(`✅ Test sauvegarde personnage réussi ! ShareId: ${testShareId}`);
        
        // Vérifier immédiatement
        const debugResponse = await fetch('/api/debug/redis');
        const debugData = await debugResponse.json();
        console.log('Vérification après sauvegarde:', debugData);
        
        await loadData();
      } else {
        alert(`❌ Test sauvegarde personnage échoué: ${result.error}`);
      }
    } catch (error) {
      console.error('Erreur test personnage:', error);
      alert('Erreur lors du test de sauvegarde personnage');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-red-500 mx-auto mb-4"></div>
          <p>Chargement des données admin...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-red-900 border border-red-600 rounded-lg p-6 mb-8">
          <h1 className="text-4xl font-bold text-red-400 mb-4">🔧 Administration WoW Crafting Tracker</h1>
          <p className="text-red-200">
            ⚠️ Zone d'administration - Manipulation des données de production
          </p>
        </div>

        {/* Code de sécurité */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6 border border-yellow-600">
          <h2 className="text-2xl font-bold text-yellow-400 mb-4">Code de sécurité</h2>
          <input
            type="password"
            value={confirmCode}
            onChange={(e) => setConfirmCode(e.target.value)}
            placeholder="Entrez le code de confirmation"
            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:border-yellow-500 focus:outline-none"
          />
          <p className="text-gray-400 text-sm mt-2">
            Code requis: DELETE_ALL_SHARES_2025
          </p>
        </div>

        {/* Section Debug */}
        <div className="bg-purple-900 border border-purple-600 rounded-lg p-6 mb-8">
          <h2 className="text-2xl font-bold text-purple-300 mb-4">🔍 Debug & Tests</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <button
              onClick={debugRedis}
              disabled={loading}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded transition-colors disabled:opacity-50 flex items-center justify-center"
            >
              🔍 Debug Redis
            </button>
            <button
              onClick={testRedisSave}
              disabled={loading}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded transition-colors disabled:opacity-50 flex items-center justify-center"
            >
              🧪 Test Sauvegarde
            </button>
            <button
              onClick={testCharacterSave}
              disabled={loading}
              className="bg-pink-600 hover:bg-pink-700 text-white px-4 py-2 rounded transition-colors disabled:opacity-50 flex items-center justify-center"
            >
              👤 Test Personnage
            </button>
          </div>
          <p className="text-purple-200 text-sm mt-3">
            Ces boutons permettent de diagnostiquer les problèmes de sauvegarde. Consultez la console pour les détails.
          </p>
        </div>

        {/* Statistiques */}
        {data && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-blue-900 rounded-lg p-6 text-center">
              <div className="text-3xl font-bold text-blue-300">{data.total}</div>
              <div className="text-blue-200">Total personnages</div>
            </div>
            <div className="bg-green-900 rounded-lg p-6 text-center">
              <div className="text-3xl font-bold text-green-300">{data.summary.permanent}</div>
              <div className="text-green-200">Permanents</div>
            </div>
            <div className="bg-yellow-900 rounded-lg p-6 text-center">
              <div className="text-3xl font-bold text-yellow-300">{data.summary.temporary}</div>
              <div className="text-yellow-200">Temporaires</div>
            </div>
            <div className="bg-red-900 rounded-lg p-6 text-center">
              <div className="text-3xl font-bold text-red-300">{data.summary.expired}</div>
              <div className="text-red-200">Expirés</div>
            </div>
          </div>
        )}

        {/* Actions rapides */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8 border border-gray-600">
          <h2 className="text-2xl font-bold text-white mb-4">Actions rapides</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <button
              onClick={loadData}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition-colors disabled:opacity-50"
            >
              🔄 Actualiser
            </button>
            <button
              onClick={cleanupDeadLinks}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded transition-colors disabled:opacity-50"
            >
              🧹 Nettoyer liens morts
            </button>
            <button
              onClick={() => executeAction('delete_expired')}
              disabled={loading || confirmCode !== 'DELETE_ALL_SHARES_2025'}
              className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded transition-colors disabled:opacity-50"
            >
              🗑️ Supprimer expirés
            </button>
            <button
              onClick={() => executeAction('delete_all')}
              disabled={loading || confirmCode !== 'DELETE_ALL_SHARES_2025'}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded transition-colors disabled:opacity-50"
            >
              💀 TOUT SUPPRIMER
            </button>
          </div>
        </div>

        {/* Message si aucun personnage */}
        {data && data.total === 0 && (
          <div className="bg-yellow-900 border border-yellow-600 rounded-lg p-6 mb-8 text-center">
            <h3 className="text-2xl font-bold text-yellow-300 mb-2">Aucun personnage trouvé</h3>
            <p className="text-yellow-200 mb-4">
              Il n'y a actuellement aucun personnage dans Redis. Cela peut signifier :
            </p>
            <ul className="text-yellow-200 text-left max-w-md mx-auto space-y-2">
              <li>• Les personnages ne sont pas sauvegardés correctement</li>
              <li>• Ils ont tous expiré</li>
              <li>• Il y a un problème de connexion Redis</li>
            </ul>
            <p className="text-yellow-200 mt-4">
              Utilisez les boutons de debug ci-dessus pour diagnostiquer le problème.
            </p>
          </div>
        )}

        {/* Liste des personnages */}
        {data && data.total > 0 && (
          <div className="bg-gray-800 rounded-lg border border-gray-600">
            <div className="p-6 border-b border-gray-700">
              <h2 className="text-2xl font-bold text-white">Personnages ({data.total})</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Share ID</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Nom</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Serveur</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Niveau</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Statut</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {data.characters.map((character) => (
                    <tr key={character.shareId} className="hover:bg-gray-700">
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-yellow-300 font-mono">
                        {character.shareId}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-white">
                        {character.name}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-300">
                        {character.server}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-300">
                        {character.level}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          character.ttl === -1 
                            ? 'bg-green-900 text-green-300' 
                            : character.ttl > 0 
                            ? 'bg-yellow-900 text-yellow-300' 
                            : 'bg-red-900 text-red-300'
                        }`}>
                          {character.status}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm">
                        <div className="flex space-x-2">
                          <a
                            href={`/?share=${character.shareId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-xs transition-colors"
                          >
                            👁️ Voir
                          </a>
                          <button
                            onClick={() => executeAction('delete_one', character.shareId)}
                            disabled={loading || confirmCode !== 'DELETE_ALL_SHARES_2025'}
                            className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-xs transition-colors disabled:opacity-50"
                          >
                            🗑️ Supprimer
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {loading && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg p-6 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
              <p className="text-white">Opération en cours...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
