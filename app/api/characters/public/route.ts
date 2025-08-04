// app/api/characters/public/route.ts
import { NextResponse } from 'next/server';
import { createClient } from 'redis';

const redis = createClient({ url: process.env.REDIS_URL });

export async function GET() {
  try {
    console.log('=== DEBUT API CHARACTERS PUBLIC ===');
    
    if (!redis.isReady) await redis.connect();

    const keys = await redis.keys('character:*');
    console.log(`📊 ${keys.length} clés trouvées dans Redis:`, keys);
    
    const publicCharacters = [];
    let expiredCount = 0;
    let invalidCount = 0;

    for (const key of keys) {
      try {
        const data = await redis.get(key);
        const ttl = await redis.ttl(key);
        
        console.log(`🔍 Traitement ${key}:`);
        console.log(`  - TTL: ${ttl} (${ttl === -1 ? 'permanent' : ttl > 0 ? 'expire dans ' + Math.round(ttl/3600) + 'h' : 'EXPIRÉ'})`);
        console.log(`  - HasData: ${!!data}`);
        
        // Supprimer automatiquement les personnages expirés
        if (ttl === 0) {
          console.log(`🗑️ Suppression personnage expiré: ${key}`);
          await redis.del(key);
          expiredCount++;
          continue;
        }

        if (!data) {
          console.log(`⚠️ Pas de données pour ${key}`);
          await redis.del(key);
          expiredCount++;
          continue;
        }
        
        const character = JSON.parse(data);
        console.log(`📝 Personnage parsé:`, {
          name: character.name,
          server: character.server,
          level: character.level,
          race: character.race,
          class: character.class,
          faction: character.faction,
          profession1: character.profession1 || character.primaryProfession1,
          profession2: character.profession2 || character.primaryProfession2,
          hasCrafts: !!character.crafts,
          craftsKeys: character.crafts ? Object.keys(character.crafts) : []
        });
        
        // Vérifier que le personnage a les données essentielles
        if (!character.name || !character.server) {
          console.log(`❌ Personnage invalide (nom="${character.name}" serveur="${character.server}"): ${key}`);
          invalidCount++;
          continue; // NE PAS SUPPRIMER automatiquement, juste ignorer
        }

        // Calculer les statistiques des crafts
        const craftCounts: { [key: string]: number } = {};
        if (character.crafts && typeof character.crafts === 'object') {
          Object.entries(character.crafts).forEach(([profession, crafts]) => {
            const count = Array.isArray(crafts) ? crafts.length : 0;
            craftCounts[profession] = count;
            console.log(`  - ${profession}: ${count} recettes`);
          });
        }

        // Migration des données pour compatibilité
        const publicCharacter = {
          shareId: key.replace('character:', ''),
          id: character.id || 'legacy-' + Math.random().toString(36).substr(2, 9),
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

        const totalRecipes = Object.values(craftCounts).reduce((a, b) => a + b, 0);
        console.log(`✅ Personnage ajouté: ${publicCharacter.name} avec ${totalRecipes} recettes au total`);
        publicCharacters.push(publicCharacter);
        
      } catch (error) {
        console.error(`❌ Erreur traitement ${key}:`, error);
        console.error(`❌ Stack trace:`, error instanceof Error ? error.stack : 'No stack');
      }
    }

    // Trier par nom
    publicCharacters.sort((a, b) => a.name.localeCompare(b.name));

    console.log(`📊 Résultat final:`);
    console.log(`  - ${publicCharacters.length} personnages publics valides`);
    console.log(`  - ${expiredCount} personnages expirés supprimés`);
    console.log(`  - ${invalidCount} personnages invalides ignorés`);
    console.log(`  - Liste finale:`, publicCharacters.map(p => `${p.name} (${p.shareId})`));
    console.log('=== FIN API CHARACTERS PUBLIC ===');

    return NextResponse.json(publicCharacters);
  } catch (error) {
    console.error('❌ Erreur globale personnages publics:', error);
    return NextResponse.json({ 
      error: 'Erreur serveur',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
