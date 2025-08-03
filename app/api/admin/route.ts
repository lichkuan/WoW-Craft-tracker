// app/api/admin/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from 'redis';

const redis = createClient({ url: process.env.REDIS_URL });

export async function GET() {
  try {
    if (!redis.isReady) {
      await redis.connect();
    }

    // Récupérer toutes les clés des personnages
    const keys = await redis.keys('character:*');
    const characters = [];

    for (const key of keys) {
      try {
        const characterData = await redis.get(key);
        const ttl = await redis.ttl(key);
        
        if (characterData) {
          const character = JSON.parse(characterData);
          const shareId = key.replace('character:', '');
          
          characters.push({
            shareId,
            key,
            name: character.name || 'Inconnu',
            server: character.server || 'Inconnu',
            level: character.level || 0,
            ttl: ttl, // -1 = permanent, >0 = expire dans X secondes
            status: ttl === -1 ? 'permanent' : ttl > 0 ? `expire dans ${Math.round(ttl/3600)}h` : 'expiré',
            createdDate: 'Non disponible' // Redis ne stocke pas cette info par défaut
          });
        }
      } catch (error) {
        console.error(`Erreur lors du traitement de ${key}:`, error);
      }
    }

    // Trier par nom
    characters.sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({
      total: characters.length,
      characters,
      summary: {
        permanent: characters.filter(c => c.ttl === -1).length,
        temporary: characters.filter(c => c.ttl > 0).length,
        expired: characters.filter(c => c.ttl === 0).length
      }
    });

  } catch (error) {
    console.error('Erreur admin:', error);
    return NextResponse.json({ 
      error: 'Erreur serveur', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { action, shareId, confirmCode } = await request.json();

    // Code de sécurité simple
    if (confirmCode !== 'DELETE_ALL_SHARES_2025') {
      return NextResponse.json({ error: 'Code de confirmation incorrect' }, { status: 403 });
    }

    if (!redis.isReady) {
      await redis.connect();
    }

    let deletedCount = 0;

    if (action === 'delete_one' && shareId) {
      // Supprimer un seul personnage
      const deleted = await redis.del(`character:${shareId}`);
      deletedCount = deleted;
      
      return NextResponse.json({ 
        success: true, 
        message: `Personnage ${shareId} supprimé`,
        deletedCount 
      });

    } else if (action === 'delete_expired') {
      // Supprimer tous les personnages expirés
      const keys = await redis.keys('character:*');
      
      for (const key of keys) {
        const ttl = await redis.ttl(key);
        if (ttl === 0) { // Expiré
          await redis.del(key);
          deletedCount++;
        }
      }

      return NextResponse.json({ 
        success: true, 
        message: `${deletedCount} personnages expirés supprimés`,
        deletedCount 
      });

    } else if (action === 'delete_all') {
      // DANGER: Supprimer TOUS les personnages
      const keys = await redis.keys('character:*');
      if (keys.length > 0) {
        deletedCount = await redis.del(keys);
      }

      return NextResponse.json({ 
        success: true, 
        message: `TOUS les ${deletedCount} personnages ont été supprimés`,
        deletedCount 
      });

    } else {
      return NextResponse.json({ error: 'Action non valide' }, { status: 400 });
    }

  } catch (error) {
    console.error('Erreur lors de la suppression:', error);
    return NextResponse.json({ 
      error: 'Erreur serveur', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
