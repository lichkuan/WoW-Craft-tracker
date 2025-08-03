import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

export async function POST(request: NextRequest) {
  try {
    const { shareId, character } = await request.json();
    
    if (!shareId || !character) {
      return NextResponse.json(
        { error: 'Données manquantes' },
        { status: 400 }
      );
    }

    // Sauvegarder le personnage avec expiration de 30 jours (optionnel)
    await kv.setex(`character:${shareId}`, 60 * 60 * 24 * 30, character);
    
    return NextResponse.json({ success: true, shareId });
  } catch (error) {
    console.error('Erreur lors de la sauvegarde:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
