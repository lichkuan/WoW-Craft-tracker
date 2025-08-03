import { NextResponse } from 'next/server';
import { createClient } from 'redis';

export async function POST() {
  let redis;
  
  try {
    redis = createClient({ url: process.env.REDIS_URL });
    await redis.connect();

    const existingKeys = await redis.keys('character:*');
    const charactersMap = new Map<string, { key: string, data: any, ttl: number }>();
    
    // Analyser tous les personnages
    for (const key of existingKeys) {
      try {
        const characterData = await redis.get(key);
        const ttl = await redis.ttl(key); // -1 = permanent, >0 = expire dans X secondes
        
        if (characterData) {
          const character = JSON.parse(characterData);
          const identifier = `${character.name}-${character.server}`;
          
          const existing = charactersMap.get(identifier);
          
          if (!existing) {
            // Premier personnage avec ce nom/serveur
            charactersMap.set(identifier, { key, data: character, ttl });
          } else {
            // Doublon détecté - garder le permanent ou le plus récent
            if (existing.ttl === -1 && ttl > 0) {
              // Garder l'existant (permanent), supprimer celui-ci (temporaire)
              await redis.del(key);
              console.log(`Supprimé doublon temporaire: ${key}`);
            } else if (existing.ttl > 0 && ttl === -1) {
              // Garder celui-ci (permanent), supprimer l'existant (temporaire)
              await redis.del(existing.key);
              charactersMap.set(identifier, { key, data: character, ttl });
              console.log(`Supprimé doublon temporaire: ${existing.key}`);
            } else if (existing.ttl > 0 && ttl > 0) {
              // Les deux sont temporaires, garder celui qui expire le plus tard
              if (ttl > existing.ttl) {
                await redis.del(existing.key);
                charactersMap.set(identifier, { key, data: character, ttl });
                console.log(`Supprimé ancien doublon: ${existing.key}`);
              } else {
                await redis.del(key);
                console.log(`Supprimé ancien doublon: ${key}`);
              }
            }
            // Si les deux sont permanents, on garde le premier (ne devrait pas arriver)
          }
        }
      } catch (error) {
        console.error(`Erreur lors du traitement de ${key}:`, error);
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Nettoyage effectué',
      remaining: charactersMap.size 
    });
  } catch (error) {
    console.error('Erreur lors du nettoyage:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  } finally {
    if (redis) {
      try {
        await redis.quit();
      } catch (error) {
        console.error('Erreur lors de la fermeture de Redis:', error);
      }
    }
  }
}
