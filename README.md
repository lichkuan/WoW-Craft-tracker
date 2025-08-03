# 🎮 WoW Crafting Tracker

Un tracker moderne et élégant pour partager vos métiers et recettes World of Warcraft avec votre guilde et la communauté.

![WoW Crafting Tracker](https://img.shields.io/badge/WoW-Crafting%20Tracker-yellow?style=for-the-badge&logo=worldofwarcraft)
![Next.js](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-blue?style=for-the-badge&logo=typescript)
![Redis](https://img.shields.io/badge/Redis-Database-red?style=for-the-badge&logo=redis)

## ✨ Fonctionnalités

### 🧙‍♂️ **Gestion des personnages**
- Création de profils détaillés (nom, niveau, race, classe, serveur, guilde)
- Support complet Alliance/Horde avec thèmes visuels
- Gestion des métiers principaux avec icônes dédiées

### 📋 **Import automatique des recettes**
- **Compatible avec l'addon [Simple Trade Skill Exporter](https://www.curseforge.com/wow/addons/simple-trade-skill-exporter)**
- Import en un clic via la commande `/tsexport markdown`
- Conversion automatique des liens Wowhead (Cataclysm → MoP Classic)
- Catégorisation intelligente des recettes

### 🔍 **Interface moderne**
- Recherche en temps réel dans toutes les recettes
- Affichage par catégories avec expand/collapse
- Design responsive et thème WoW authentique
- Navigation intuitive et fluide

### 🌐 **Partage communautaire**
- **URLs courtes** : `yoursite.com?share=ABC123`
- Galerie publique des personnages de la communauté
- Partage illimité sans restriction de taille
- Persistance permanente des données

### 🛠 **Gestion avancée**
- Suppression sélective par métier ou personnage complet
- Nettoyage automatique des doublons (3 jours de grâce)
- Optimisation automatique de la base de données
- Interface d'administration simple

## 🚀 Déploiement rapide

### Prérequis
- Node.js 18+
- Compte Vercel
- Base de données Redis (Vercel/Upstash)

### Installation

1. **Cloner le projet**
```bash
git clone https://github.com/username/wow-crafting-tracker.git
cd wow-crafting-tracker

Installer les dépendances

bashnpm install

Configuration de la base Redis

bash# Dans Vercel Dashboard > Storage > Create Database > Redis
# Copier l'URL de connexion

Variables d'environnement

bash# .env.local
REDIS_URL="redis://your-redis-connection-string"

Déployer sur Vercel

bashnpx vercel --prod
📖 Guide d'utilisation
Pour les joueurs

Installer l'addon requis

Télécharger Simple Trade Skill Exporter
Installer via votre gestionnaire d'addons


Exporter vos recettes
/tsexport markdown

Ouvrir votre fenêtre de métier
Taper la commande
Copier avec Ctrl+C


Créer votre profil

Remplir les informations de personnage
Importer vos recettes par métier
Partager avec votre guilde !



Pour les développeurs
typescript// Structure des données
interface Character {
  id: string;
  name: string;
  faction: 'alliance' | 'horde';
  race: string;
  class: string;
  level: number;
  server: string;
  guild: string;
  primaryProfession1: string;
  primaryProfession2: string;
  crafts: { [profession: string]: CraftItem[] };
}
🛡 Extensions WoW supportées

✅ Cataclysm Classic (liens /cata/ conservés)
✅ Mists of Pandaria Classic (conversion automatique vers /mop-classic/fr/)
🔄 Support d'autres extensions à venir

🎯 Métiers supportés
MétierIcôneCatégorisationAlchimie🧪Potions, Élixirs, TransmutationsForge🔨Armes, Armures, OutilsEnchantement✨Enchants par slot d'équipementIngénierie⚙️Gadgets, Montures, ObjetsHerboristerie🌿Herbes par zone/niveauJoaillerie💎Gemmes, Bijoux, AccessoiresTravail du cuir✂️Armures cuir/maillesMinage⛏️Minerais, BarresCalligraphie📜Glyphes, TechniquesDépeçage⚡Cuirs, ÉcaillesCouture🎨Armures tissu, Sacs
🔧 API Reference
Partager un personnage
typescriptPOST /api/character
{
  "shareId": "ABC123",
  "character": Character
}
Récupérer un personnage partagé
typescriptGET /api/character/[shareId]
Liste publique
typescriptGET /api/characters/public
Supprimer un personnage
typescriptPOST /api/character/delete
{
  "characterName": "string",
  "characterServer": "string"
}
🤝 Contribuer

Fork le projet
Créer une branche feature (git checkout -b feature/amazing-feature)
Commit vos changements (git commit -m 'Add amazing feature')
Push sur la branche (git push origin feature/amazing-feature)
Ouvrir une Pull Request

📜 Roadmap

 Support multi-langues (EN/FR/DE/ES)
 Export PDF des recettes
 Statistiques de guilde
 Intégration API Battle.net
 Mode sombre/clair
 Notifications Discord webhook
 Cache intelligent des données Wowhead

🐛 Problèmes connus

Import limité aux formats markdown de l'addon recommandé
Base Redis limitée (optimisation en cours)
Pas de synchronisation temps réel entre utilisateurs

📄 Licence
Ce projet est sous licence MIT. Voir le fichier LICENSE pour plus de détails.
🙏 Remerciements

Blizzard Entertainment pour World of Warcraft
Wowhead pour leur base de données exceptionnelle
Simple Trade Skill Exporter pour l'addon parfait
Vercel pour l'hébergement et la base Redis
La communauté WoW pour les tests et retours
