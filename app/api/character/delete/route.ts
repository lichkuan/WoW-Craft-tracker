// app/api/character/delete/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from 'redis';

const redis = createClient({ url: process.env.REDIS_URL });

export async function POST(request: NextRequest) {
  try {
    const { characterName, characterServer } = await request.json();
    
    if (!characterName || !characterServer) {
      return NextResponse.json({ error: 'Nom et serveur requis' }, { status: 400 });
    }

    if (!redis.isReady) await redis.connect();

    // Trouver et supprimer le personnage
    const keys = await redis.keys('character:*');
    let deleted = false;
    
    for (const key of keys) {
      try {
        const data = await redis.get(key);
        if (data) {
          const character = JSON.parse(data);
          if (character.name === characterName && character.server === characterServer) {
            await redis.del(key);
            deleted = true;
            break;
          }
        }
      } catch (error) {
        console.error(`Erreur vérification ${key}:`, error);
      }
    }

    if (deleted) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: 'Personnage non trouvé' }, { status: 404 });
    }
  } catch (error) {
    console.error('Erreur suppression:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
