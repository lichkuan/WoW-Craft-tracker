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

    // Supprimer les anciens partages de ce personnage (basé sur nom + serveur)
    const existingKeys = await redis.keys('character:*');
    for (const key of existingKeys) {
      try {
        const existingData = await redis.get(key);
        if (existingData) {
          const existingCharacter = JSON.parse(existingData);
          if (existingCharacter.name === character.name && 
              existingCharacter.server === character.server) {
            await redis.del(key);
            console.log(`Supprimé l'ancien partage: ${key}`);
          }
        }
      } catch (error) {
        console.error(`Erreur lors de la vérification de ${key}:`, error);
      }
    }

    // Sauvegarder le nouveau partage avec expiration de 30 jours
    await redis.setEx(`character:${shareId}`, 2592000, JSON.stringify(character));
    
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
