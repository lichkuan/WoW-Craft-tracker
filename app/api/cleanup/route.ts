// app/api/cleanup/route.ts - Version améliorée
import { NextResponse } from 'next/server';
import { createClient } from 'redis';

const redis = createClient({ url: process.env.REDIS_URL });

export async function POST() {
  try {
    if (!redis.isReady) {
      await redis.connect();
    }

    const existingKeys = await redis.keys('character:*');
    const charactersMap = new Map<string, { key: string, data: any, ttl: number }>();
    let expiredCount = 0;
    let duplicateCount = 0;
    
    // Analyser tous les personnages
    for (const key of existingKeys) {
      try {
        const characterData = await redis.get(key);
        const ttl = await redis.ttl(key); // -1 = permanent, 0 = expiré, >0 = expire dans X secondes
        
        // Supprimer immédiatement les clés expirées
        if (ttl === 0) {
          await redis.del(key);
          expiredCount++;
          console.log(`Supprimé personnage expiré: ${key}`);
          continue;
        }

        if (characterData) {
          const character = JSON.parse(characterData);
          
          // Vérifier la validité des données
          if (!character.name || !character.server) {
            await redis.del(key);
            expiredCount++;
            console.log(`Supprimé personnage invalide: ${key}`);
            continue;
          }

          const identifier = `${character.name}-${character.server}`.toLowerCase();
          const existing = charactersMap.get(identifier);
          
          if (!existing) {
            // Premier personnage avec ce nom/serveur
            charactersMap.set(identifier, { key, data: character, ttl });
          } else {
            // Doublon détecté - appliquer la logique de conservation
            let keepCurrent = false;
            
            if (existing.ttl === -1 && ttl > 0) {
              // Garder l'existant (permanent), supprimer celui-ci (temporaire)
              keepCurrent = false;
            } else if (existing.ttl > 0 && ttl === -1) {
              // Garder celui-ci (permanent), supprimer l'existant (temporaire)
              await redis.del(existing.key);
              keepCurrent = true;
            } else if (existing.ttl > 0 && ttl > 0) {
              // Les deux sont temporaires, garder celui qui expire le plus tard
              if (ttl > existing.ttl) {
                await redis.del(existing.key);
                keepCurrent = true;
              } else {
                keepCurrent = false;
              }
            } else if (existing.ttl === -1 && ttl === -1) {
              // Les deux sont permanents, garder le premier (ou le plus récent)
              keepCurrent = false;
            }
            
            if (keepCurrent) {
              charactersMap.set(identifier, { key, data: character, ttl });
            } else {
              await redis.del(key);
            }
            
            duplicateCount++;
            console.log(`Supprimé doublon: ${keepCurrent ? existing.key : key}`);
          }
        }
      } catch (error) {
        console.error(`Erreur lors du traitement de ${key}:`, error);
        // Supprimer les clés corrompues
        await redis.del(key);
        expiredCount++;
      }
    }

    const totalRemoved = expiredCount + duplicateCount;

    return NextResponse.json({ 
      success: true, 
      message: `Nettoyage effectué: ${totalRemoved} éléments supprimés`,
      expiredRemoved: expiredCount,
      duplicatesRemoved: duplicateCount,
      totalRemoved,
      remaining: charactersMap.size
    });

  } catch (error) {
    console.error('Erreur lors du nettoyage:', error);
    return NextResponse.json({ 
      error: 'Erreur serveur', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
