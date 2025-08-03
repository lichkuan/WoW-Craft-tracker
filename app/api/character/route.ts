import { NextRequest, NextResponse } from 'next/server';
import { createClient } from 'redis';

export async function POST(request: NextRequest) {
  let redis;
  
  try {
    const { shareId, character } = await request.json();
    
    if (!shareId || !character) {
      return NextResponse.json(
        { error: 'Données manquantes' },
        { status: 400 }
      );
    }

    redis = createClient({ url: process.env.REDIS_URL });
    await redis.connect();

    // Marquer les anciens partages pour suppression dans 3 jours
    const existingKeys = await redis.keys('character:*');
    for (const key of existingKeys) {
      try {
        const existingData = await redis.get(key);
        if (existingData) {
          const existingCharacter = JSON.parse(existingData);
          if (existingCharacter.name === character.name && 
              existingCharacter.server === character.server) {
            
            // Marquer pour suppression dans 3 jours (259200 secondes)
            await redis.expire(key, 259200);
            console.log(`Ancien partage marqué pour suppression dans 3 jours: ${key}`);
          }
        }
      } catch (error) {
        console.error(`Erreur lors de la vérification de ${key}:`, error);
      }
    }

    // Sauvegarder le nouveau partage SANS expiration (permanent)
    await redis.set(`character:${shareId}`, JSON.stringify(character));
    
    return NextResponse.json({ success: true, shareId });
  } catch (error) {
    console.error('Erreur lors de la sauvegarde:', error);
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
