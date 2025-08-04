// app/api/characters/public/route.ts
import { NextResponse } from 'next/server';
import { createClient } from 'redis';

const redis = createClient({ url: process.env.REDIS_URL });

export async function GET() {
  try {
    if (!redis.isReady) await redis.connect();

    const keys = await redis.keys('character:*');
    const publicCharacters = [];

    for (const key of keys) {
      try {
        const data = await redis.get(key);
        const ttl = await redis.ttl(key);
        
        // Ignorer les personnages expirés
        if (ttl === 0 || !data) continue;
        
        const character = JSON.parse(data);
        
        // Vérifier que le personnage a les données essentielles
        if (!character.name || !character.server) continue;

        // Calculer les statistiques des crafts
        const craftCounts: { [key: string]: number } = {};
        if (character.crafts) {
          Object.entries(character.crafts).forEach(([profession, crafts]) => {
            craftCounts[profession] = Array.isArray(crafts) ? crafts.length : 0;
          });
        }

        publicCharacters.push({
          shareId: key.replace('character:', ''),
          id: character.id,
          name: character.name,
          level: character.level || 90,
          race: character.race || 'Inconnu',
          class: character.class || 'Inconnu',
          guild: character.guild || '',
          server: character.server,
          faction: character.faction || 'alliance',
          profession1: character.profession1 || character.primaryProfession1,
          profession2: character.profession2 || character.primaryProfession2,
          professionLevels: character.professionLevels || {},
          crafts: character.crafts || {},
          craftCounts
        });
      } catch (error) {
        console.error(`Erreur traitement ${key}:`, error);
      }
    }

    // Trier par nom
    publicCharacters.sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json(publicCharacters);
  } catch (error) {
    console.error('Erreur personnages publics:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
