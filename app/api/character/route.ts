import { NextRequest, NextResponse } from 'next/server';
import { createClient } from 'redis';

// Créer le client Redis
const redis = createClient({ url: process.env.REDIS_URL });

export async function POST(request: NextRequest) {
  try {
    const { shareId, character } = await request.json();
    
    if (!shareId || !character) {
      return NextResponse.json(
        { error: 'Données manquantes' },
        { status: 400 }
      );
    }

    // Connecter à Redis si pas encore connecté
    if (!redis.isReady) {
      await redis.connect();
    }

    // Sauvegarder le personnage avec expiration de 30 jours (2592000 secondes)
    await redis.setEx(`character:${shareId}`, 2592000, JSON.stringify(character));
    
    return NextResponse.json({ success: true, shareId });
  } catch (error) {
    console.error('Erreur lors de la sauvegarde:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
