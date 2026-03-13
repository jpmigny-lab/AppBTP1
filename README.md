# PLANCHAIS App

Application professionnelle pour la gestion de chantiers et devis avec design glassmorphism et fond MeshGradient animé.

## 🚀 Déploiement sur Vercel

### Prérequis
- Compte GitHub
- Compte Vercel
- Node.js 20.x ou supérieur

### Étapes de déploiement

1. **Connecter le dépôt GitHub à Vercel**
   - Allez sur [vercel.com](https://vercel.com)
   - Cliquez sur "New Project"
   - Importez le dépôt GitHub (ex. `jpmigny-lab/AppBTP1`)

2. **Configuration automatique**
   - Vercel utilise la configuration dans `vercel.json` et `.nvmrc` (Node 20)
   - Build Command: `npm run build`
   - Output Directory: `dist/public`
   - Install Command: `npm install`
   - Le déploiement sert uniquement le front (SPA) ; pas de serveur Express sur Vercel.

3. **Variables d'environnement (si nécessaire)**
   - Ajoutez vos variables d'environnement dans les paramètres du projet Vercel
   - Exemple: `PORT`, `NODE_ENV`, etc.

4. **Déploiement**
   - Cliquez sur "Deploy"
   - Vercel construira et déploiera automatiquement votre application

### Commandes locales

```bash
# Installation des dépendances
npm install

# Développement
npm run dev

# Build pour production
npm run build

# Démarrer en production
npm start
```

## 📦 Technologies utilisées

- React 18
- Vite
- TypeScript
- Express
- Tailwind CSS
- Framer Motion
- @paper-design/shaders-react (MeshGradient)
- Wouter (routing)

## 🎨 Fonctionnalités

- Design glassmorphism avec transparence
- Fond MeshGradient animé
- Dashboard complet avec gestion de devis
- CRM Pipeline avec drag & drop
- Visualisation IA
- Planning de chantiers
- Gestion des paiements
- Portfolio avant/après
- Analytics

## 📝 Notes

- Le projet utilise un serveur Express pour servir l'application
- Le build génère les fichiers statiques dans `dist/public`
- Le serveur Express est configuré pour servir les fichiers statiques en production

