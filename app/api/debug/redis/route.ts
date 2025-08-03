// app/api/debug/redis/route.ts
import { NextResponse } from 'next/server';
import { createClient } from 'redis';

export async function GET() {
  let redis;
  
  try {
    redis = createClient({ url: process.env.REDIS_URL });
    await redis.connect();
    
    // Lister toutes les clés character
    const keys = await redis.keys('character:*');
    console.log(`Trouvé ${keys.length} clés dans Redis`);
    
    const debugInfo = [];
    
    for (const key of keys) {
      try {
        const data = await redis.get(key);
        const ttl = await redis.ttl(key);
        
        if (data) {
          const character = JSON.parse(data);
          debugInfo.push({
            key,
            shareId: key.replace('character:', ''),
            name: character.name,
            server: character.server,
            ttl: ttl,
            status: ttl === -1 ? 'permanent' : ttl > 0 ? `expire dans ${Math.round(ttl/3600)}h` : 'expiré',
            hasData: !!data,
            dataLength: data.length,
            hasName: !!character.name,
            hasServer: !!character.server,
            hasCrafts: !!character.crafts,
            craftKeys: character.crafts ? Object.keys(character.crafts) : []
          });
        }
      } catch (error) {
        debugInfo.push({
          key,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    return NextResponse.json({
      totalKeys: keys.length,
      redisUrl: process.env.REDIS_URL ? 'Configurée' : 'NON CONFIGURÉE',
      debugInfo,
      rawKeys: keys
    });
    
  } catch (error) {
    console.error('Erreur debug Redis:', error);
    return NextResponse.json({
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
