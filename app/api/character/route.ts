// app/api/character/route.ts - Version corrigée pour sauvegarder correctement
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from 'redis';

export async function POST(request: NextRequest) {
  let redis;
  
  try {
    const { shareId, character } = await request.json();
    
    console.log('=== DEBUT SAUVEGARDE ===');
    console.log('ShareId reçu:', shareId);
    console.log('Character reçu:', character?.name, character?.server);
    
    if (!shareId || !character) {
      console.error('Données manquantes:', { shareId: !!shareId, character: !!character });
      return NextResponse.json(
        { error: 'ShareId et données personnage requis' },
        { status: 400 }
      );
    }

    // Vérification des données essentielles
    if (!character.name || !character.server) {
      console.error('Données personnage invalides:', { name: character.name, server: character.server });
      return NextResponse.json(
        { error: 'Nom et serveur du personnage requis' },
        { status: 400 }
      );
    }

    redis = createClient({ url: process.env.REDIS_URL });
    await redis.connect();
    console.log('Connexion Redis établie');

    const key = `character:${shareId}`;
    console.log('Clé Redis:', key);

    // Vérifier les anciens partages pour ce personnage
    const existingKeys = await redis.keys('character:*');
    console.log(`${existingKeys.length} clés existantes trouvées`);
    
    for (const existingKey of existingKeys) {
      try {
        const existingData = await redis.get(existingKey);
        if (existingData) {
          const existingCharacter = JSON.parse(existingData);
          
          // Si c'est le même personnage (nom + serveur), marquer l'ancien pour suppression
          if (existingCharacter.name === character.name && 
              existingCharacter.server === character.server &&
              existingKey !== key) {
            
            console.log(`Marquage ancien partage pour suppression: ${existingKey}`);
            // Marquer pour suppression dans 3 jours (259200 secondes)
            await redis.expire(existingKey, 259200);
          }
        }
      } catch (error) {
        console.error(`Erreur lors de la vérification de ${existingKey}:`, error);
      }
    }

    // Sauvegarder le nouveau partage SANS expiration (permanent)
    const characterDataString = JSON.stringify(character);
    console.log('Données à sauvegarder (taille):', characterDataString.length, 'caractères');
    
    await redis.set(key, characterDataString);
    console.log('Sauvegarde effectuée avec succès');
    
    // Vérification immédiate
    const savedData = await redis.get(key);
    const ttl = await redis.ttl(key);
    console.log('Vérification sauvegarde:', {
      saved: !!savedData,
      ttl: ttl,
      size: savedData?.length
    });
    
    return NextResponse.json({ 
      success: true, 
      shareId,
      debug: {
        keyUsed: key,
        dataSaved: !!savedData,
        ttl: ttl,
        dataSize: savedData?.length
      }
    });
    
  } catch (error) {
    console.error('=== ERREUR SAUVEGARDE ===');
    console.error('Erreur lors de la sauvegarde:', error);
    return NextResponse.json(
      { 
        error: 'Erreur serveur lors de la sauvegarde',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  } finally {
    if (redis) {
      try {
        await redis.quit();
        console.log('Connexion Redis fermée');
      } catch (error) {
        console.error('Erreur lors de la fermeture de Redis:', error);
      }
    }
    console.log('=== FIN SAUVEGARDE ===');
  }
}
