// app/api/characters/public/route.ts - Version corrigée pour Redis
import { NextResponse } from 'next/server';
import { createClient } from 'redis';

export async function GET() {
  let redis;
  
  try {
    // Créer et connecter le client Redis
    redis = createClient({ url: process.env.REDIS_URL });
    await redis.connect();
    
    // Récupérer toutes les clés qui commencent par "character:"
    const keys = await redis.keys('character:*');
    console.log(`Trouvé ${keys.length} clés character dans Redis`);
    
    const publicCharacters = [];
    
    // Pour chaque clé, récupérer les données du personnage
    for (const key of keys) {
      try {
        const characterData = await redis.get(key);
        const ttl = await redis.ttl(key);
        
        // Ignorer les personnages expirés (TTL = 0)
        if (ttl === 0) {
          console.log(`Personnage expiré ignoré: ${key}`);
          continue;
        }
        
        if (characterData) {
          const character = JSON.parse(characterData);
          const shareId = key.replace('character:', '');
          
          // Vérifier que les données sont valides
          if (!character.name || !character.server) {
            console.log(`Personnage invalide ignoré: ${key}`);
            continue;
          }
          
          // Calculer le nombre de recettes par métier
          const craftCounts: Record<string, number> = {};
          if (character.crafts && typeof character.crafts === 'object') {
            Object.keys(character.crafts).forEach(profession => {
              if (Array.isArray(character.crafts[profession])) {
                craftCounts[profession] = character.crafts[profession].length;
              } else {
                craftCounts[profession] = 0;
              }
            });
          }
          
          // Créer un résumé public du personnage
          const publicCharacter = {
            shareId,
            name: character.name,
            level: character.level || 1,
            race: character.race || 'Inconnu',
            class: character.class || 'Inconnu',
            faction: character.faction || 'alliance',
            server: character.server,
            guild: character.guild || '',
            primaryProfession1: character.primaryProfession1 || '',
            primaryProfession2: character.primaryProfession2 || '',
            professionLevels: character.professionLevels || {},
            craftCounts,
            // Informations supplémentaires pour debug
            ttl: ttl,
            status: ttl === -1 ? 'permanent' : `expire dans ${Math.round(ttl/3600)}h`
          };
          
          publicCharacters.push(publicCharacter);
          console.log(`Personnage ajouté: ${character.name} (${shareId})`);
        }
      } catch (error) {
        console.error(`Erreur lors du traitement de ${key}:`, error);
      }
    }
    
    // Filtrer les doublons par nom + serveur (garder le plus récent/permanent)
    const uniqueCharacters: any[] = [];
    const seen = new Map<string, any>();

    for (const char of publicCharacters) {
      const key = `${char.name}-${char.server}`.toLowerCase();
      const existing = seen.get(key);
      
      if (!existing) {
        seen.set(key, char);
        uniqueCharacters.push(char);
      } else {
        // Garder le permanent ou celui qui expire le plus tard
        if (char.ttl === -1 && existing.ttl > 0) {
          // Le nouveau est permanent, remplacer
          seen.set(key, char);
          const index = uniqueCharacters.findIndex(c => c.shareId === existing.shareId);
          if (index !== -1) {
            uniqueCharacters[index] = char;
          }
        } else if (existing.ttl === -1 && char.ttl > 0) {
          // L'existant est permanent, garder l'existant
          continue;
        } else if (char.ttl > existing.ttl) {
          // Le nouveau expire plus tard, remplacer
          seen.set(key, char);
          const index = uniqueCharacters.findIndex(c => c.shareId === existing.shareId);
          if (index !== -1) {
            uniqueCharacters[index] = char;
          }
        }
      }
    }
    
    // Trier par nom
    uniqueCharacters.sort((a, b) => a.name.localeCompare(b.name));
    
    console.log(`Retournant ${uniqueCharacters.length} personnages publics uniques`);
    
    return NextResponse.json(uniqueCharacters);
  } catch (error) {
    console.error('Erreur lors de la récupération des personnages publics:', error);
    return NextResponse.json(
      { 
        error: 'Erreur serveur', 
        details: error instanceof Error ? error.message : 'Unknown error',
        message: 'Impossible de récupérer les personnages publics'
      },
      { status: 500 }
    );
  } finally {
    // Fermer la connexion Redis
    if (redis) {
      try {
        await redis.quit();
      } catch (error) {
        console.error('Erreur lors de la fermeture de Redis:', error);
      }
    }
  }
}
