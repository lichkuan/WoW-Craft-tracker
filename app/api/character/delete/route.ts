import { NextRequest, NextResponse } from 'next/server';
import { createClient } from 'redis';

export async function POST(request: NextRequest) {
  let redis;
  
  try {
    const { characterName, characterServer } = await request.json();
    
    if (!characterName || !characterServer) {
      return NextResponse.json(
        { error: 'Nom et serveur requis' },
        { status: 400 }
      );
    }

    redis = createClient({ url: process.env.REDIS_URL });
    await redis.connect();

    // Trouver et supprimer le personnage correspondant
    const existingKeys = await redis.keys('character:*');
    let deleted = false;
    
    for (const key of existingKeys) {
      try {
        const characterData = await redis.get(key);
        if (characterData) {
          const character = JSON.parse(characterData);
          if (character.name === characterName && character.server === characterServer) {
            await redis.del(key);
            deleted = true;
            console.log(`Personnage supprimé: ${key}`);
            break;
          }
        }
      } catch (error) {
        console.error(`Erreur lors de la vérification de ${key}:`, error);
      }
    }

    if (deleted) {
      return NextResponse.json({ success: true, message: 'Personnage supprimé avec succès' });
    } else {
      return NextResponse.json({ error: 'Personnage non trouvé' }, { status: 404 });
    }
  } catch (error) {
    console.error('Erreur lors de la suppression:', error);
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
