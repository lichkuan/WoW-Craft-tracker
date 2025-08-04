// app/api/characters/public/route.ts
import { NextResponse } from 'next/server';
import { createClient } from 'redis';

const redis = createClient({ url: process.env.REDIS_URL });

export async function GET() {
  try {
    console.log('=== DEBUT API CHARACTERS PUBLIC ===');
    
    if (!redis.isReady) await redis.connect();

    const keys = await redis.keys('character:*');
    console.log(`📊 ${keys.length} clés trouvées dans Redis`);
    
    const publicCharacters = [];
    let expiredCount = 0;

    for (const key of keys) {
      try {
        const data = await redis.get(key);
        const ttl = await redis.ttl(key);
        
        console.log(`🔍 Traitement ${key}: TTL=${ttl}, HasData=${!!data}`);
        
        // Supprimer automatiquement les personnages expirés
        if (ttl === 0 || !data) {
          console.log(`🗑️ Suppression personnage expiré: ${key}`);
          await redis.del(key);
          expiredCount++;
          continue;
        }
        
        const character = JSON.parse(data);
        console.log(`📝 Personnage parsé: ${character.name} - ${character.server}`);
        
        // Vérifier que le personnage a les données essentielles
        if (!character.name || !character.server) {
          console.log(`⚠️ Personnage invalide (nom/serveur manquant): ${key}`);
          await redis.del(key);
          expiredCount++;
          continue;
        }

        // Calculer les statistiques des crafts
        const craftCounts: { [key: string]: number } = {};
        if (character.crafts) {
          Object.entries(character.crafts).forEach(([profession, crafts]) => {
            craftCounts[profession] = Array.isArray(crafts) ? crafts.length : 0;
          });
        }

        // Migration des données pour compatibilité
        const publicCharacter = {
          shareId: key.replace('character:', ''),
          id: character.id || 'legacy',
          name: character.name,
          level: character.level || 90,
          race: character.race || 'Inconnu',
          class: character.class || 'Inconnu',
          guild: character.guild || '',
          server: character.server,
          faction: character.faction || 'alliance',
          profession1: character.profession1 || character.primaryProfession1 || '',
          profession2: character.profession2 || character.primaryProfession2 || '',
          professionLevels: character.professionLevels || {},
          crafts: character.crafts || {},
          craftCounts
        };

        console.log(`✅ Personnage ajouté: ${publicCharacter.name} avec ${Object.values(craftCounts).reduce((a, b) => a + b, 0)} recettes`);
        publicCharacters.push(publicCharacter);
        
      } catch (error) {
        console.error(`❌ Erreur traitement ${key}:`, error);
        // Supprimer les clés corrompues
        await redis.del(key);
        expiredCount++;
      }
    }

    // Trier par nom
    publicCharacters.sort((a, b) => a.name.localeCompare(b.name));

    console.log(`📊 Résultat final: ${publicCharacters.length} personnages publics, ${expiredCount} supprimés`);
    console.log('=== FIN API CHARACTERS PUBLIC ===');

    return NextResponse.json(publicCharacters);
  } catch (error) {
    console.error('❌ Erreur personnages publics:', error);
    return NextResponse.json({ 
      error: 'Erreur serveur',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
