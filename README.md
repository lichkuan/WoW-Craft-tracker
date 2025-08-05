# 🎮 WoW Crafting Tracker

Un tracker moderne et élégant pour partager vos métiers et recettes **World of Warcraft MoP Classic** avec votre guilde et la communauté.

![WoW Crafting Tracker](https://img.shields.io/badge/WoW-Crafting%20Tracker-yellow?style=for-the-badge&logo=worldofwarcraft)
![Next.js](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-blue?style=for-the-badge&logo=typescript)
![Redis](https://img.shields.io/badge/Redis-Database-red?style=for-the-badge&logo=redis)

## 🚀 Démo en direct

**🔗 [Accéder au tracker](https://your-app-url.vercel.app)**

*Spécialement conçu pour **Raid Tisane et Dodo** - Serveur Gehennas (Horde) ⚔️*

---

## ✨ Fonctionnalités principales

### 🧙‍♂️ **Gestion complète des personnages**
- ✅ **Création et édition** de profils détaillés
- ✅ **Modification facile** après création (bouton Éditer)
- ✅ Support Alliance/Horde avec thèmes visuels
- ✅ **Valeurs par défaut** : Gehennas, Horde, Raid Tisane et Dodo

### 📋 **Import automatique des recettes**
- ✅ Compatible avec l'addon **[Simple Trade Skill Exporter](https://www.curseforge.com/wow/addons/simple-trade-skill-exporter)**
- ✅ Import en un clic via `/tsexport markdown`
- ✅ **Détection automatique** du niveau de métier
- ✅ Conversion liens Wowhead (Cataclysm → MoP Classic)
- ✅ Catégorisation intelligente des recettes

### 🔍 **Interface moderne et intuitive**
- ✅ **Recherche en temps réel** dans toutes les recettes
- ✅ Affichage par catégories expand/collapse
- ✅ Design responsive WoW authentique
- ✅ Navigation fluide et rapide

### 🌐 **Partage communautaire instantané**
- ✅ **URLs courtes** : `yoursite.com?share=ABC123`
- ✅ **Galerie publique** des personnages de la communauté
- ✅ **Apparition instantanée** après partage
- ✅ **Partage Discord** avec formatage automatique
- ✅ Persistance permanente des données

### 🛠 **Outils de gestion avancés**
- ✅ **Édition complète** des personnages existants
- ✅ Suppression sélective par métier ou personnage
- ✅ Nettoyage automatique des doublons
- ✅ Interface d'administration complète

---

## 🎯 Métiers supportés

| Métier | Catégories | Niveaux supportés |
|--------|------------|------------------|
| 🧪 **Alchimie** | Potions, Élixirs, Transmutations | Apprenti → Zen (1-600) |
| 🔨 **Forge** | Armes, Armures, Outils | Apprenti → Zen (1-600) |
| ✨ **Enchantement** | Enchants par slot | Apprenti → Zen (1-600) |
| ⚙️ **Ingénierie** | Gadgets, Montures, Objets | Apprenti → Zen (1-600) |
| 🌿 **Herboristerie** | Herbes par zone/niveau | Apprenti → Zen (1-600) |
| 💎 **Joaillerie** | Gemmes, Bijoux | Apprenti → Zen (1-600) |
| ✂️ **Travail du cuir** | Armures cuir/mailles | Apprenti → Zen (1-600) |
| ⛏️ **Minage** | Minerais, Barres | Apprenti → Zen (1-600) |
| 📜 **Calligraphie** | Glyphes, Techniques | Apprenti → Zen (1-600) |
| 🎨 **Couture** | Armures tissu, Sacs | Apprenti → Zen (1-600) |

---

## 🚀 Installation et déploiement

### Prérequis
- Node.js 18+
- Compte Vercel (gratuit)
- Base Redis (Vercel KV/Upstash)

### 1. Cloner et installer
```bash
git clone https://github.com/votre-username/wow-crafting-tracker.git
cd wow-crafting-tracker
npm install
```

### 2. Configuration Redis
```bash
# Créer une base Redis sur Vercel
vercel kv create

# Ou utiliser Upstash
# Récupérer l'URL de connexion
```

### 3. Variables d'environnement
```bash
# .env.local
REDIS_URL="redis://your-redis-connection-string"
```

### 4. Déploiement
```bash
# Déployer sur Vercel
npx vercel --prod

# Ou utiliser l'interface Vercel
# 1. Connecter le repo GitHub
# 2. Ajouter la variable REDIS_URL
# 3. Déployer automatiquement
```

---

## 📖 Guide d'utilisation

### Pour les joueurs WoW

#### 1. **Installer l'addon requis**
- Téléchargez **[Simple Trade Skill Exporter](https://www.curseforge.com/wow/addons/simple-trade-skill-exporter)**
- Installez via CurseForge/WowUp

#### 2. **Exporter vos recettes dans le jeu**
```
1. Ouvrez votre fenêtre de métier (ex: Forge)
2. Tapez: /tsexport markdown
3. Copiez le texte avec Ctrl+C
4. Fermez la fenêtre et répétez pour l'autre métier
```

#### 3. **Créer votre profil sur le site**
```
1. Cliquez "Créer mon personnage"
2. Remplissez vos informations (Gehennas/Horde pré-remplis)
3. Sélectionnez vos 2 métiers principaux
4. Cliquez "Créer le personnage"
```

#### 4. **Importer vos recettes**
```
1. Cliquez "Importer" sur votre premier métier
2. Collez votre export avec Ctrl+V
3. Cliquez "Importer" (le niveau sera détecté automatiquement)
4. Répétez pour le second métier
```

#### 5. **Partager avec la guilde**
```
- Cliquez "Partager" → Le lien est copié automatiquement
- Ou cliquez "Discord" → Message formaté copié pour Discord
- Votre personnage apparaît instantanément dans la galerie publique
```

#### 6. **Modifier si nécessaire**
```
- Cliquez le bouton violet "Éditer"
- Modifiez vos informations
- Cliquez "Sauvegarder les modifications"
- Vos recettes sont conservées automatiquement
```

---

## 🆕 Nouveautés v2.1

### 🎯 **Nouvelles fonctionnalités**
- ✅ **Édition des personnages** : Bouton violet pour modifier facilement
- ✅ **Valeurs par défaut** : Gehennas/Horde/Raid Tisane et Dodo pré-remplis
- ✅ **Partage instantané** : Apparition immédiate dans la galerie publique
- ✅ **Interface simplifiée** : Suppression des boutons debug

### 🔧 **Améliorations techniques**
- ✅ **Gestion optimisée** des doublons Redis
- ✅ **API corrigée** pour l'affichage public
- ✅ **Performance améliorée** du filtrage et recherche
- ✅ **Conservation des données** lors de l'édition

### 🐛 **Corrections**
- ✅ **Problème d'affichage** dans la galerie publique résolu
- ✅ **Synchronisation** entre partage et affichage corrigée
- ✅ **Filtrage TTL** supprimé pour plus de stabilité

---

## 🛡 Extensions WoW supportées

| Extension | Support | Conversion |
|-----------|---------|------------|
| **Cataclysm Classic** | ✅ | Conservation des liens `/cata/` |
| **MoP Classic** | ✅ | Conversion automatique `/mop-classic/fr/` |
| **Retail** | 🔄 | À venir |
| **Autres classiques** | 🔄 | Plannifié |

---

## 🔧 API & Développement

### Endpoints principaux
```typescript
// Sauvegarder un personnage
POST /api/character
Body: { shareId: string, character: Character }

// Récupérer un personnage partagé
GET /api/character/[shareId]

// Liste publique des personnages
GET /api/characters/public

// Supprimer un personnage
POST /api/character/delete
Body: { characterName: string, characterServer: string }

// Administration (protégée)
GET /api/admin
DELETE /api/admin
```

### Structure des données
```typescript
interface Character {
  id: string;
  name: string;
  server: string;
  level: number;
  race: string;
  class: string;
  guild: string;
  faction: 'alliance' | 'horde';
  profession1: string;
  profession2: string;
  professionLevels: { [profession: string]: number };
  crafts: { [profession: string]: CraftItem[] };
}
```

---

## 🤝 Contribuer

### Développement local
```bash
# Installer les dépendances
npm install

# Lancer en développement
npm run dev

# Builder pour production
npm run build

# Linter le code
npm run lint
```

### Pull Requests
1. Fork le projet
2. Créer une branche feature (`git checkout -b feature/nouvelle-fonctionnalite`)
3. Commiter les changements (`git commit -m 'Ajout nouvelle fonctionnalité'`)
4. Push sur la branche (`git push origin feature/nouvelle-fonctionnalite`)
5. Ouvrir une Pull Request

### Issues et suggestions
- 🐛 **Bugs** : Utilisez le template "Bug Report"
- 💡 **Suggestions** : Utilisez le template "Feature Request"
- ❓ **Questions** : Utilisez les Discussions GitHub

---

## 📜 Roadmap

### 🎯 **Prochaines versions**
- [ ] **v2.2** : Support multi-langues (EN/FR/DE/ES)
- [ ] **v2.3** : Export PDF des recettes
- [ ] **v2.4** : Statistiques de guilde avancées
- [ ] **v2.5** : Intégration API Battle.net

### 🔮 **Vision long terme**
- [ ] Mode sombre/clair
- [ ] Notifications Discord webhook
- [ ] Cache intelligent Wowhead
- [ ] Import/Export de profils complets
- [ ] Application mobile
- [ ] Support d'autres MMO

---

## 🏆 Spécialement conçu pour

### **Raid Tisane et Dodo** ☕
**Serveur Gehennas (Horde) ⚔️**

*"Parce que même les plus grands raiders ont besoin de bonnes tisanes pour craft !"*

**Membres de la guilde ?** Le site est pré-configuré avec vos informations :
- ⚔️ **Faction** : Horde (par défaut)
- 🏰 **Serveur** : Gehennas (pré-rempli)
- 🛡️ **Guilde** : Raid Tisane et Dodo (pré-rempli)

---

## 🐛 Problèmes connus

### Limitations actuelles
- **Import** limité aux formats markdown de l'addon recommandé
- **Synchronisation** pas de temps réel entre utilisateurs
- **Requêtes Redis** limitations selon le plan choisi

### Solutions de contournement
- Utiliser uniquement l'addon **Simple Trade Skill Exporter**
- Cliquer "Actualiser la liste" pour voir les nouveaux personnages
- Prévoir une base Redis adaptée au trafic

---

## 📄 Licence

Ce projet est sous licence **MIT**. Voir le fichier [LICENSE](LICENSE) pour plus de détails.

### Utilisation libre
- ✅ Utilisation commerciale
- ✅ Modification du code
- ✅ Distribution
- ✅ Usage privé

### Obligations
- 📄 Inclure la licence et le copyright
- 📄 Documenter les modifications majeures

---

## 🙏 Remerciements

### Outils et services
- **[Blizzard Entertainment](https://www.blizzard.com/)** - World of Warcraft
- **[Wowhead](https://www.wowhead.com/)** - Base de données exceptionnelle
- **[Simple Trade Skill Exporter](https://www.curseforge.com/wow/addons/simple-trade-skill-exporter)** - L'addon parfait
- **[Vercel](https://vercel.com/)** - Hébergement et base Redis
- **[Next.js](https://nextjs.org/)** - Framework React
- **[Tailwind CSS](https://tailwindcss.com/)** - Styling moderne

### Communauté
- **Raid Tisane et Dodo** - L'inspiration et les tests ☕
- **Serveur Gehennas** - La communauté Horde active ⚔️
- **Contributeurs GitHub** - Améliorations et corrections
- **Joueurs testeurs** - Retours et suggestions

---

## 📞 Support et contact

### Support technique
- 📧 **Email** : support@your-domain.com
- 💬 **Discord** : [Serveur de la guilde](https://discord.gg/your-invite)
- 🐛 **Issues GitHub** : [Signaler un problème](https://github.com/your-username/wow-crafting-tracker/issues)

### Communauté
- 🏰 **Guilde WoW** : Raid Tisane et Dodo (Gehennas-Horde)
- 💬 **Chat en jeu** : `/guild` ou `/whisper VotreNom`

---

<div align="center">

**⚔️ Fait avec ❤️ pour la communauté WoW MoP Classic ⚔️**

**🍵 Powered by Raid Tisane et Dodo 🍵**

[![Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com/)
[![GitHub](https://img.shields.io/badge/Source-GitHub-black?style=for-the-badge&logo=github)](https://github.com/your-username/wow-crafting-tracker)

</div>
