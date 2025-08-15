// app/api/characters/public/route.ts
import { NextResponse } from 'next/server';
import { createClient } from 'redis';
import { log, warn, error as logError } from '../../../../lib/logger';

const redis = createClient({ url: process.env.REDIS_URL });

export async function GET() {
  try {
    log('=== DEBUT API CHARACTERS PUBLIC ===');
    
    if (!redis.isReady) await redis.connect();

    const keys = await redis.keys('character:*');
    log(`📊 ${keys.length} clés trouvées dans Redis:`, keys);
    
    const charactersMap = new Map<string, any>();
    let expiredCount = 0;
    let duplicateCount = 0;

    // Première passe : traiter tous les personnages et gérer les doublons
    for (const key of keys) {
      try {
        const data = await redis.get(key);
        const ttl = await redis.ttl(key);
        
        log(`🔍 Traitement ${key}:`);
        log(`  - TTL: ${ttl} (${ttl === -1 ? 'PERMANENT' : ttl > 0 ? 'expire dans ' + Math.round(ttl/3600) + 'h' : 'EXPIRÉ'})`);
        
        // Supprimer automatiquement les personnages expirés
        if (ttl === 0) {
          log(`🗑️ Suppression personnage expiré: ${key}`);
          await redis.del(key);
          expiredCount++;
          continue;
        }

        if (!data) {
          log(`⚠️ Pas de données pour ${key}`);
          await redis.del(key);
          expiredCount++;
          continue;
        }
        
        const character = JSON.parse(data);
        log(`📝 Personnage: ${character.name} - ${character.server}`);
        
        // Vérifier que le personnage a les données essentielles
        if (!character.name || !character.server) {
          log(`❌ Personnage invalide (nom="${character.name}" serveur="${character.server}")`);
          continue;
        }

        // Identifier les doublons par nom-serveur
        const identifier = `${character.name}-${character.server}`.toLowerCase();
        const existing = charactersMap.get(identifier);
        
        if (!existing) {
          // Premier personnage avec ce nom/serveur
          charactersMap.set(identifier, { key, data: character, ttl });
          log(`✅ Premier personnage enregistré: ${character.name}`);
        } else {
          // Doublon détecté - appliquer la logique de conservation
          log(`🔄 Doublon détecté pour ${character.name}:`);
          log(`  - Existant: ${existing.key} (TTL: ${existing.ttl})`);
          log(`  - Nouveau: ${key} (TTL: ${ttl})`);
          
          let keepCurrent = false;
          
          if (existing.ttl === -1 && ttl > 0) {
            // Garder l'existant (permanent), supprimer celui-ci (temporaire)
            log(`  - Garde existant (permanent), supprime nouveau (temporaire)`);
            await redis.del(key);
            keepCurrent = false;
          } else if (existing.ttl > 0 && ttl === -1) {
            // Garder celui-ci (permanent), supprimer l'existant (temporaire)
            log(`  - Garde nouveau (permanent), supprime existant (temporaire)`);
            await redis.del(existing.key);
            keepCurrent = true;
          } else if (existing.ttl > 0 && ttl > 0) {
            // Les deux sont temporaires, garder celui qui expire le plus tard
            if (ttl > existing.ttl) {
              log(`  - Garde nouveau (expire plus tard), supprime existant`);
              await redis.del(existing.key);
              keepCurrent = true;
            } else {
              log(`  - Garde existant (expire plus tard), supprime nouveau`);
              await redis.del(key);
              keepCurrent = false;
            }
          } else if (existing.ttl === -1 && ttl === -1) {
            // Les deux sont permanents, garder le premier
            log(`  - Les deux sont permanents, garde le premier`);
            await redis.del(key);
            keepCurrent = false;
          }
          
          if (keepCurrent) {
            charactersMap.set(identifier, { key, data: character, ttl });
          }
          
          duplicateCount++;
        }
        
      } catch (error) {
        logError(`❌ Erreur traitement ${key}:`, error);
      }
    }

    // Deuxième passe : construire la liste publique avec TOUS les personnages valides
    const publicCharacters: any[] = [];
    
    charactersMap.forEach(({ key, data: character, ttl }, identifier) => {
      // CORRECTION : Ne plus filtrer sur TTL = -1, accepter tous les personnages valides
      log(`✅ Personnage ajouté: ${character.name} (TTL: ${ttl})`);

      // Calculer les statistiques des crafts
      const craftCounts: { [key: string]: number } = {};
      if (character.crafts && typeof character.crafts === 'object') {
        Object.entries(character.crafts).forEach(([profession, crafts]) => {
          const count = Array.isArray(crafts) ? crafts.length : 0;
          craftCounts[profession] = count;
        });
      }

      const publicCharacter = {
        shareId: key.replace('character:', ''),
        id: character.id || 'legacy-' + Math.random().toString(36).substr(2, 9),
        name: character.name,
        level: character.level || 90,
        race: character.race || 'Inconnu',
        class: character.class || 'Inconnu',
        guild: character.guild || '',
        server: character.server,
        faction: character.faction || 'alliance',
        profession1: character.profession1 || character.primaryProfession1 || '',
        profession2: character.profession2 || character.primaryProfession2 || '',
        professionLevels: character.professionLevels || {},
        crafts: character.crafts || {},
        craftCounts
      };

      const totalRecipes = Object.values(craftCounts).reduce((a, b) => a + b, 0);
      publicCharacters.push(publicCharacter);
    });

    // Trier par nom
    publicCharacters.sort((a, b) => a.name.localeCompare(b.name));

    log(`📊 Résultat final:`);
    log(`  - ${publicCharacters.length} personnages affichés`);
    log(`  - ${expiredCount} personnages expirés supprimés`);
    log(`  - ${duplicateCount} doublons traités`);
    log(`  - Liste finale:`, publicCharacters.map(p => `${p.name} (${p.shareId})`));
    log('=== FIN API CHARACTERS PUBLIC ===');

    return NextResponse.json(publicCharacters);
  } catch (error) {
    logError('❌ Erreur globale personnages publics:', error);
    return NextResponse.json({ 
      error: 'Erreur serveur',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
