// app/admin/page.tsx
"use client";

import { useState, useEffect } from "react";
import CommunityEnrichPanel from "@/components/CommunityEnrichPanel";

interface Character {
  shareId: string;
  name: string;
  server: string;
  level: number;
  ttl: number;
  status: string;
}

export default function AdminPage() {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    permanent: 0,
    temporary: 0,
    expired: 0,
  });

  const loadData = async () => {
    setLoading(true);
    try {
      // ?all=1 forcé à chaque requête
      const response = await fetch(`/api/admin?all=1`, { cache: "no-store" });
      if (response.ok) {
        const data = await response.json();
        setCharacters(data.characters || []);
        setStats(
          data.summary || { total: 0, permanent: 0, temporary: 0, expired: 0 }
        );
      }
    } catch (error) {
      console.error("Erreur chargement:", error);
    } finally {
      setLoading(false);
    }
  };

  const cleanup = async () => {
    if (!confirm("Nettoyer les données expirées et dupliquées ?")) return;

    setLoading(true);
    try {
      const response = await fetch("/api/cleanup", { method: "POST" });
      const result = await response.json();

      if (result.success) {
        alert(`Nettoyage terminé: ${result.totalRemoved} éléments supprimés`);
        loadData();
      }
    } catch (error) {
      console.error("Erreur nettoyage:", error);
    } finally {
      setLoading(false);
    }
  };

  const deleteCharacter = async (shareId: string) => {
    if (!confirm("Supprimer ce personnage ?")) return;

    setLoading(true);
    try {
      const response = await fetch("/api/admin", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete_one",
          shareId,
          confirmCode: "DELETE_ALL_SHARES_2025",
        }),
      });

      if (response.ok) {
        alert("Personnage supprimé");
        loadData();
      }
    } catch (error) {
      console.error("Erreur suppression:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-red-900 border border-red-600 rounded-lg p-6 mb-8">
          <h1 className="text-4xl font-bold text-red-400 mb-4">
            🔧 Administration
          </h1>
          <p className="text-red-200">
            Zone d'administration WoW Crafting Tracker
          </p>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-blue-900 rounded-lg p-6 text-center">
            <div className="text-3xl font-bold text-blue-300">
              {stats.total}
            </div>
            <div className="text-blue-200">Total</div>
          </div>
          <div className="bg-green-900 rounded-lg p-6 text-center">
            <div className="text-3xl font-bold text-green-300">
              {stats.permanent}
            </div>
            <div className="text-green-200">Permanents</div>
          </div>
          <div className="bg-yellow-900 rounded-lg p-6 text-center">
            <div className="text-3xl font-bold text-yellow-300">
              {stats.temporary}
            </div>
            <div className="text-yellow-200">Temporaires</div>
          </div>
          <div className="bg-red-900 rounded-lg p-6 text-center">
            <div className="text-3xl font-bold text-red-300">
              {stats.expired}
            </div>
            <div className="text-red-200">Expirés</div>
          </div>
        </div>

        {/* Actions */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <h2 className="text-2xl font-bold text-white mb-4">Actions</h2>
          <div className="flex flex-wrap gap-4 items-center">
            <button
              onClick={loadData}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded disabled:opacity-50"
            >
              🔄 Actualiser
            </button>
            <button
              onClick={cleanup}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded disabled:opacity-50"
            >
              🧹 Nettoyer
            </button>
          </div>
        </div>

        {/* Panneau d'enrichissement */}
        <section className="mt-6">
          <h2 className="text-xl font-semibold mb-3">Actions</h2>
          <CommunityEnrichPanel defaultKey="community:crafts" />
        </section>

        {/* Liste des personnages */}
        {characters.length > 0 ? (
          <div className="bg-gray-800 rounded-lg border border-gray-600">
            <div className="p-6 border-b border-gray-700">
              <h2 className="text-2xl font-bold text-white">
                Personnages ({characters.length})
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">
                      Share ID
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">
                      Nom
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">
                      Serveur
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">
                      Niveau
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">
                      Statut
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {characters.map((character) => (
                    <tr key={character.shareId} className="hover:bg-gray-700">
                      <td className="px-4 py-4 text-sm text-yellow-300 font-mono">
                        {character.shareId}
                      </td>
                      <td className="px-4 py-4 text-sm text-white">
                        {character.name}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-300">
                        {character.server}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-300">
                        {character.level}
                      </td>
                      <td className="px-4 py-4 text-sm">
                        <span
                          className={`px-2 py-1 rounded text-xs font-semibold ${
                            character.ttl === -1
                              ? "bg-green-900 text-green-300"
                              : character.ttl > 0
                              ? "bg-yellow-900 text-yellow-300"
                              : "bg-red-900 text-red-300"
                          }`}
                        >
                          {character.status}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm">
                        <div className="flex space-x-2">
                          <a
                            href={`/?share=${character.shareId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-xs"
                          >
                            👁️ Voir
                          </a>
                          <button
                            onClick={() => deleteCharacter(character.shareId)}
                            disabled={loading}
                            className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-xs disabled:opacity-50"
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
        ) : (
          <div className="bg-yellow-900 border border-yellow-600 rounded-lg p-6 text-center">
            <h3 className="text-2xl font-bold text-yellow-300 mb-2">
              Aucun personnage
            </h3>
            <p className="text-yellow-200">La base de données semble vide.</p>
          </div>
        )}

        {loading && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg p-6 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
              <p className="text-white">Chargement...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
