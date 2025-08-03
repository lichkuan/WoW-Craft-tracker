import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

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

    const character = await kv.get(`character:${shareId}`);
    
    if (!character) {
      return NextResponse.json(
        { error: 'Personnage non trouvé' },
        { status: 404 }
      );
    }

    return NextResponse.json(character);
  } catch (error) {
    console.error('Erreur lors de la récupération:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
