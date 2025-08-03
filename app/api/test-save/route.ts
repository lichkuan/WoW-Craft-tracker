// app/api/test-save/route.ts - Test de sauvegarde
import { NextResponse } from 'next/server';
import { createClient } from 'redis';

export async function POST() {
  let redis;
  
  try {
    console.log('=== TEST SAUVEGARDE REDIS ===');
    
    redis = createClient({ url: process.env.REDIS_URL });
    await redis.connect();
    console.log('✅ Connexion Redis OK');

    // Données de test
    const testShareId = 'TEST123';
    const testCharacter = {
      id: 'test-id',
      name: 'TestCharacter',
      server: 'TestServer',
      level: 90,
      race: 'Humain',
      class: 'Paladin',
      faction: 'alliance',
      guild: 'Test Guild',
      primaryProfession1: 'Forge',
      primaryProfession2: 'Minage',
      professionLevels: {
        'Forge': 600,
        'Minage': 600
      },
      crafts: {
        'Forge': [],
        'Minage': []
      }
    };

    const key = `character:${testShareId}`;
    console.log('Clé de test:', key);

    // Sauvegarder
    await redis.set(key, JSON.stringify(testCharacter));
    console.log('✅ Sauvegarde test OK');

    // Vérifier immédiatement
    const retrieved = await redis.get(key);
    const ttl = await redis.ttl(key);
    
    console.log('Données récupérées:', !!retrieved);
    console.log('TTL:', ttl);

    // Lister toutes les clés
    const allKeys = await redis.keys('character:*');
    console.log('Toutes les clés:', allKeys);

    // Nettoyer le test
    await redis.del(key);
    console.log('✅ Nettoyage test OK');

    return NextResponse.json({
      success: true,
      redisConnection: 'OK',
      testSave: !!retrieved,
      testTtl: ttl,
      allKeysFound: allKeys,
      message: 'Test de sauvegarde Redis réussi'
    });

  } catch (error) {
    console.error('❌ Erreur test Redis:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      redisUrl: process.env.REDIS_URL ? 'Configurée' : 'NON CONFIGURÉE'
    }, { status: 500 });
  } finally {
    if (redis) {
      try {
        await redis.quit();
      } catch (error) {
        console.error('Erreur fermeture Redis:', error);
      }
    }
  }
}
