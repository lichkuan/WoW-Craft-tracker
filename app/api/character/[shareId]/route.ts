// app/api/character/[shareId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from 'redis';

const redis = createClient({ url: process.env.REDIS_URL });

export async function GET(
  request: NextRequest,
  { params }: { params: { shareId: string } }
) {
  try {
    const { shareId } = params;
    
    if (!shareId) {
      return NextResponse.json({ error: 'ID manquant' }, { status: 400 });
    }

    if (!redis.isReady) await redis.connect();

    const data = await redis.get(`character:${shareId}`);
    
    if (!data) {
      return NextResponse.json({ error: 'Personnage non trouvé' }, { status: 404 });
    }

    return NextResponse.json(JSON.parse(data));
  } catch (error) {
    console.error('Erreur récupération:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
