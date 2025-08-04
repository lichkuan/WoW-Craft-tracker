// app/api/character/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from 'redis';

const redis = createClient({ url: process.env.REDIS_URL });

export async function POST(request: NextRequest) {
  try {
    const { shareId, character } = await request.json();
    
    if (!shareId || !character) {
      return NextResponse.json({ error: 'Données manquantes' }, { status: 400 });
    }

    if (!redis.isReady) await redis.connect();

    // Supprimer les anciens partages du même personnage (garde pendant 3 jours)
    const existingKeys = await redis.keys('character:*');
    for (const key of existingKeys) {
      try {
        const data = await redis.get(key);
        if (data) {
          const existing = JSON.parse(data);
          if (existing.name === character.name && existing.server === character.server && key !== `character:${shareId}`) {
            await redis.expire(key, 259200); // 3 jours
          }
        }
      } catch (error) {
        console.error(`Erreur traitement ${key}:`, error);
      }
    }

    // Sauvegarder le nouveau personnage
    await redis.set(`character:${shareId}`, JSON.stringify(character));
    
    return NextResponse.json({ success: true, shareId });
  } catch (error) {
    console.error('Erreur sauvegarde:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
