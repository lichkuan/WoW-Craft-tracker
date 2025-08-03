// app/api/character/route.ts - Version debug complète
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from 'redis';

export async function POST(request: NextRequest) {
  let redis;
  
  try {
    console.log('=== DEBUT SAUVEGARDE API CHARACTER ===');
    
    // Lire les données de la requête
    let requestData;
    try {
      requestData = await request.json();
      console.log('📦 Données reçues:', requestData);
    } catch (error) {
      console.error('❌ Erreur parsing JSON:', error);
      return NextResponse.json(
        { error: 'Format JSON invalide' },
        { status: 400 }
      );
    }
    
    const { shareId, character } = requestData;
    
    console.log('🔍 Validation des données:');
    console.log('  - shareId:', shareId, typeof shareId);
    console.log('  - character:', !!character, typeof character);
    
    if (!shareId) {
      console.error('❌ ShareId manquant');
      return NextResponse.json(
        { error: 'ShareId requis' },
        { status: 400 }
      );
    }
    
    if (!character) {
      console.error('❌ Character manquant');
      return NextResponse.json(
        { error: 'Données personnage requises' },
        { status: 400 }
      );
    }
    
    console.log('📋 Détails du personnage:');
    console.log('  - name:', character.name);
    console.log('  - server:', character.server);
    console.log('  - level:', character.level);
    console.log('  - race:', character.race);
    console.log('  - class:', character.class);
    console.log('  - faction:', character.faction);
    
    // Vérification des données essentielles
    if (!character.name) {
      console.error('❌ Nom du personnage manquant');
      return NextResponse.json(
        { error: 'Nom du personnage requis' },
        { status: 400 }
      );
    }

    // Connexion Redis
    console.log('🔌 Connexion à Redis...');
    redis = createClient({ url: process.env.REDIS_URL });
    await redis.connect();
    console.log('✅ Connexion Redis établie');

    const key = `character:${shareId}`;
    console.log('🔑 Clé Redis:', key);

    // Gestion des anciens partages (optionnel)
    try {
      const existingKeys = await redis.keys('character:*');
      console.log(`📊 ${existingKeys.length} clés existantes trouvées`);
      
      for (const existingKey of existingKeys) {
        try {
          const existingData = await redis.get(existingKey);
          if (existingData) {
            const existingCharacter = JSON.parse(existingData);
            
            // Si c'est le même personnage (nom + serveur), marquer l'ancien pour suppression
            if (existingCharacter.name === character.name && 
                existingCharacter.server === character.server &&
                existingKey !== key) {
              
              console.log(`⏳ Marquage ancien partage pour suppression: ${existingKey}`);
              await redis.expire(existingKey, 259200); // 3 jours
            }
          }
        } catch (error) {
          console.error(`Erreur traitement ${existingKey}:`, error);
        }
      }
    } catch (error) {
      console.error('Erreur gestion anciens partages:', error);
      // Continuer même si cette partie échoue
    }

    // Sauvegarder le nouveau partage
    console.log('💾 Sauvegarde en cours...');
    const characterDataString = JSON.stringify(character);
    console.log('📏 Taille des données:', characterDataString.length, 'caractères');
    
    await redis.set(key, characterDataString);
    console.log('✅ Sauvegarde effectuée avec succès');
    
    // Vérification immédiate
    const savedData = await redis.get(key);
    const ttl = await redis.ttl(key);
    console.log('🔍 Vérification sauvegarde:');
    console.log('  - Données sauvées:', !!savedData);
    console.log('  - TTL:', ttl);
    console.log('  - Taille sauvée:', savedData?.length);
    
    console.log('=== FIN SAUVEGARDE REUSSIE ===');
    
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
    console.error('Type d\'erreur:', error instanceof Error ? error.constructor.name : typeof error);
    console.error('Message:', error instanceof Error ? error.message : error);
    console.error('Stack:', error instanceof Error ? error.stack : 'N/A');
    
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
        console.log('🔌 Connexion Redis fermée');
      } catch (error) {
        console.error('Erreur fermeture Redis:', error);
      }
    }
  }
}
