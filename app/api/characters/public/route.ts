import { NextResponse } from 'next/server';
import { createClient } from 'redis';

export async function GET() {
  let redis;
  
  try {
    // Créer et connecter le client Redis
    redis = createClient({ url: process.env.REDIS_URL });
    await redis.connect();
    
    // Récupérer toutes les clés qui commencent par "character:"
    const keys = await redis.keys('character:*');
    
    const publicCharacters = [];
    
    // Pour chaque clé, récupérer les données du personnage
    for (const key of keys) {
      try {
        const characterData = await redis.get(key);
        if (characterData) {
          const character = JSON.parse(characterData);
          const shareId = key.replace('character:', '');
          
          // Créer un résumé public du personnage
          const publicCharacter = {
            shareId,
            name: character.name,
            level: character.level,
            race: character.race,
            class: character.class,
            faction: character.faction,
            server: character.server,
            guild: character.guild,
            primaryProfession1: character.primaryProfession1,
            primaryProfession2: character.primaryProfession2,
            professionLevels: character.professionLevels || {},
            craftCounts: Object.keys(character.crafts || {}).reduce((acc: any, prof) => {
              acc[prof] = character.crafts[prof]?.length || 0;
              return acc;
            }, {})
          };
          
          publicCharacters.push(publicCharacter);
        }
      } catch (error) {
        console.error(`Erreur lors du traitement de ${key}:`, error);
      }
    }
    
    // Trier par nom
    publicCharacters.sort((a, b) => a.name.localeCompare(b.name));
    
    return NextResponse.json(publicCharacters);
  } catch (error) {
    console.error('Erreur lors de la récupération des personnages publics:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  } finally {
    // Fermer la connexion Redis
    if (redis) {
      try {
        await redis.quit();
      } catch (error) {
        console.error('Erreur lors de la fermeture de Redis:', error);
      }
    }
  }
}
