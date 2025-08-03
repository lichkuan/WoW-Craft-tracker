import { NextRequest, NextResponse } from 'next/server';
import { createClient } from 'redis';

// Créer le client Redis
const redis = createClient({ url: process.env.REDIS_URL });

export async function GET(
  request: NextRequest,
  { params }: { params: { shareId: string } }
) {
  try {
    const { shareId } = params;
    
    if (!shareId) {
      return NextResponse.json(
        { error: 'ID de partage manquant' },
        { status: 400 }
      );
    }

    // Connecter à Redis si pas encore connecté
    if (!redis.isReady) {
      await redis.connect();
    }

    const characterData = await redis.get(`character:${shareId}`);
    
    if (!characterData) {
      return NextResponse.json(
        { error: 'Personnage non trouvé' },
        { status: 404 }
      );
    }

    const character = JSON.parse(characterData);
    return NextResponse.json(character);
  } catch (error) {
    console.error('Erreur lors de la récupération:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
