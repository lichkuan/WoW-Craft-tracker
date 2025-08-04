// app/api/cleanup/route.ts
import { NextResponse } from 'next/server';
import { createClient } from 'redis';

const redis = createClient({ url: process.env.REDIS_URL });

export async function POST() {
  try {
    if (!redis.isReady) await redis.connect();

    const keys = await redis.keys('character:*');
    let removedCount = 0;
    
    // Supprimer seulement les personnages expirés ou invalides
    for (const key of keys) {
      try {
        const data = await redis.get(key);
        const ttl = await redis.ttl(key);
        
        // Supprimer les expirés
        if (ttl === 0 || !data) {
          await redis.del(key);
          removedCount++;
          continue;
        }

        const character = JSON.parse(data);
        
        // Supprimer les invalides (sans nom ou serveur)
        if (!character.name || !character.server) {
          await redis.del(key);
          removedCount++;
          continue;
        }

      } catch (error) {
        console.error(`Erreur traitement ${key}:`, error);
        // Supprimer les clés corrompues
        await redis.del(key);
        removedCount++;
      }
    }

    return NextResponse.json({ 
      success: true, 
      totalRemoved: removedCount,
      message: `${removedCount} personnages expirés/invalides supprimés`
    });
  } catch (error) {
    console.error('Erreur nettoyage:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
