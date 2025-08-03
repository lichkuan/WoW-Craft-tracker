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
