# 🐳 Guide Docker - Luminaires Gallery

Ce guide vous explique comment démarrer l'application avec Docker.

## 📋 Prérequis

- [Docker](https://docs.docker.com/get-docker/) installé
- [Docker Compose](https://docs.docker.com/compose/install/) installé

## 🚀 Démarrage rapide

### Mode Production

\`\`\`bash
# Rendre les scripts exécutables
chmod +x scripts/*.sh

# Démarrer l'application
./scripts/start.sh
\`\`\`

### Mode Développement

\`\`\`bash
# Démarrer en mode développement (avec hot reload)
./scripts/start-dev.sh
\`\`\`

### Arrêter l'application

\`\`\`bash
./scripts/stop.sh
\`\`\`

## 🌐 URLs d'accès

- **Application** : http://localhost:3000
- **MongoDB** : mongodb://localhost:27017
- **Mongo Express** (Interface admin) : http://localhost:8081
  - Utilisateur : `admin`
  - Mot de passe : `admin123`

## ⚙️ Configuration

1. Copiez `.env.example` vers `.env`
2. Modifiez les variables d'environnement selon vos besoins
3. Configurez vos clés Firebase si nécessaire

## 📁 Structure des services

### Services Docker

- **app** : Application Next.js
- **mongodb** : Base de données MongoDB 7.0
- **mongo-express** : Interface d'administration web pour MongoDB

### Volumes

- `mongodb_data` : Données persistantes MongoDB
- `./uploads` : Dossier des fichiers uploadés

## 🔧 Commandes utiles

\`\`\`bash
# Voir les logs
docker-compose logs -f

# Voir les logs d'un service spécifique
docker-compose logs -f app

# Redémarrer un service
docker-compose restart app

# Reconstruire les images
docker-compose build --no-cache

# Nettoyer les volumes (⚠️ supprime les données)
docker-compose down -v
\`\`\`

## 🐛 Dépannage

### L'application ne démarre pas

1. Vérifiez que les ports 3000, 8081 et 27017 ne sont pas utilisés
2. Vérifiez les logs : `docker-compose logs -f`
3. Reconstruisez les images : `docker-compose build --no-cache`

### Problèmes de permissions

\`\`\`bash
# Donner les bonnes permissions au dossier uploads
sudo chown -R $USER:$USER uploads
chmod 755 uploads
\`\`\`

### Réinitialiser la base de données

\`\`\`bash
# Arrêter les services
docker-compose down

# Supprimer le volume MongoDB
docker volume rm luminaires-gallery_mongodb_data

# Redémarrer
./scripts/start.sh
\`\`\`

## 🔒 Sécurité

Pour la production, pensez à :

1. Changer les mots de passe par défaut
2. Utiliser des secrets sécurisés
3. Configurer un reverse proxy (nginx)
4. Activer HTTPS
5. Restreindre l'accès à Mongo Express

## 📊 Monitoring

Les logs sont disponibles via :

\`\`\`bash
# Tous les services
docker-compose logs -f

# Application seulement
docker-compose logs -f app

# MongoDB seulement
docker-compose logs -f mongodb
\`\`\`
README.md : 

# Next js web app

*Automatically synced with your [v0.dev](https://v0.dev) deployments*

[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com/gersaint7-3252s-projects/v0-next-js-web-app)

[![Built with v0](https://img.shields.io/badge/Built%20with-v0.dev-black?style=for-the-badge)](https://v0.dev/chat/projects/Miq12eJRZ1c)

## Overview

This repository will stay in sync with your deployed chats on [v0.dev](https://v0.dev).

Any changes you make to your deployed app will be automatically pushed to this repository from [v0.dev](https://v0.dev).

## Deployment

Your project is live at:

**[https://vercel.com/gersaint7-3252s-projects/v0-next-js-web-app](https://vercel.com/gersaint7-3252s-projects/v0-next-js-web-app)**

## Build your app

Continue building your app on:

**[https://v0.dev/chat/projects/Miq12eJRZ1c](https://v0.dev/chat/projects/Miq12eJRZ1c)**

## How It Works

1. Create and modify your project using [v0.dev](https://v0.dev)
2. Deploy your chats from the v0 interface
3. Changes are automatically pushed to this repository
4. Vercel deploys the latest version from this repository

components.json : {

  "$schema": "https://ui.shadcn.com/schema.json",

  "style": "default",

  "rsc": true,

  "tsx": true,

  "tailwind": {

    "config": "tailwind.config.ts",

    "css": "app/globals.css",

    "baseColor": "neutral",

    "cssVariables": true,

    "prefix": ""

  },

  "aliases": {

    "components": "@/components",

    "utils": "@/lib/utils",

    "ui": "@/components/ui",

    "lib": "@/lib",

    "hooks": "@/hooks"

  },

  "iconLibrary": "lucide"

}

docker-compose.dev.yml : version: '3.8'

services:

  # Application Next.js en mode développement
  app-dev:
    build:
      context: .
      dockerfile: Dockerfile.dev
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - MONGODB_URI=mongodb://mongodb:27017/luminaires-gallery
      - NEXTAUTH_URL=http://localhost:3000
      - NEXTAUTH_SECRET=dev-secret-key
    volumes:
      - .:/app
      - /app/node_modules
      - ./uploads:/app/uploads
    depends_on:
      - mongodb
    networks:
      - app-network

  # Base de données MongoDB
  mongodb:
    image: mongo:7.0
    restart: always
    ports:
      - "27017:27017"
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: admin123
      MONGO_INITDB_DATABASE: luminaires-gallery
    volumes:
      - mongodb_data_dev:/data/db
      - ./mongo-init.js:/docker-entrypoint-initdb.d/mongo-init.js:ro
    networks:
      - app-network

  # Interface d'administration MongoDB
  mongo-express:
    image: mongo-express:latest
    restart: always
    ports:
      - "8081:8081"
    environment:
      ME_CONFIG_MONGODB_ADMINUSERNAME: admin
      ME_CONFIG_MONGODB_ADMINPASSWORD: admin123
      ME_CONFIG_MONGODB_URL: mongodb://admin:admin123@mongodb:27017/
      ME_CONFIG_BASICAUTH_USERNAME: admin
      ME_CONFIG_BASICAUTH_PASSWORD: admin123
    depends_on:
      - mongodb
    networks:
      - app-network

volumes:
  mongodb_data_dev:

networks:
  app-network:
    driver: bridge

docker-compose.yml : version: '3.8'

services:
  app:
    build: 
      context: .
      dockerfile: Dockerfile.simple
    ports:
      - "3000:3000"
    environment:
      # MongoDB
      - MONGODB_URI=mongodb://admin:admin123@mongodb:27017/luminaires?authSource=admin
      # Application
      - NODE_ENV=production
      - PORT=3000
      - NEXTAUTH_URL=http://localhost:3000
      - NEXTAUTH_SECRET=dev-secret-change-in-production
      # Firebase (optionnel - peut être défini via variables d'environnement système)
      - NEXT_PUBLIC_FIREBASE_API_KEY=${NEXT_PUBLIC_FIREBASE_API_KEY:-}
      - NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=${NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN:-}
      - NEXT_PUBLIC_FIREBASE_PROJECT_ID=${NEXT_PUBLIC_FIREBASE_PROJECT_ID:-}
      - NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=${NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET:-}
      - NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=${NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID:-}
      - NEXT_PUBLIC_FIREBASE_APP_ID=${NEXT_PUBLIC_FIREBASE_APP_ID:-}
    volumes:
      - ./uploads:/app/uploads
    depends_on:
      - mongodb
    networks:
      - app-network

  mongodb:
    image: mongo:7.0
    container_name: luminaires-mongodb
    restart: unless-stopped
    ports:
      - "27017:27017"
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: admin123
      MONGO_INITDB_DATABASE: luminaires
    volumes:
      - mongodb_data:/data/db
      - ./mongo-init.js:/docker-entrypoint-initdb.d/mongo-init.js:ro
    networks:
      - app-network

  mongo-express:
    image: mongo-express:latest
    container_name: luminaires-mongo-express
    restart: unless-stopped
    ports:
      - "8081:8081"
    environment:
      ME_CONFIG_MONGODB_ADMINUSERNAME: admin
      ME_CONFIG_MONGODB_ADMINPASSWORD: admin123
      ME_CONFIG_MONGODB_URL: mongodb://admin:admin123@mongodb:27017/
      ME_CONFIG_BASICAUTH_USERNAME: admin
      ME_CONFIG_BASICAUTH_PASSWORD: admin123
    depends_on:
      - mongodb
    networks:
      - app-network

volumes:
  mongodb_data:

networks:
  app-network:
    driver: bridge

firestore.rules.txt : rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Fonction pour vérifier si l'utilisateur est connecté
    function isAuthenticated() {
      return request.auth != null;
    }
    
    // Fonction pour vérifier si l'utilisateur est admin
    function isAdmin() {
      return isAuthenticated() && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    // Fonction pour vérifier si l'utilisateur est premium
    function isPremium() {
      return isAuthenticated() && 
        (get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'premium' || 
         get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin');
    }
    
    // Fonction pour vérifier si l'utilisateur est le propriétaire du document
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }
    
    // Règles pour la collection users
    match /users/{userId} {
      // Les utilisateurs peuvent lire leur propre document
      // Les admins peuvent lire tous les documents
      allow read: if isOwner(userId) || isAdmin();
      
      // Les utilisateurs peuvent créer leur propre document lors de l'inscription
      allow create: if isOwner(userId) && 
                     request.resource.data.role == 'free' && 
                     request.resource.data.keys().hasOnly(['email', 'role', 'searchCount', 'lastSearchDate']);
      
      // Les utilisateurs peuvent mettre à jour leur propre document, mais pas changer leur rôle
      // Les admins peuvent tout modifier
      allow update: if (isOwner(userId) && 
                      request.resource.data.role == resource.data.role) || 
                     isAdmin();
      
      // Seuls les admins peuvent supprimer des utilisateurs
      allow delete: if isAdmin();
    }
    
    // Règles pour la collection luminaires (si vous décidez de stocker les luminaires dans Firestore)
    match /luminaires/{luminaireId} {
      // Tout le monde peut lire les luminaires
      allow read: if true;
      
      // Seuls les admins peuvent créer, modifier ou supprimer des luminaires
      allow create, update, delete: if isAdmin();
    }
    
    // Règles pour la collection designers (si vous décidez de stocker les designers dans Firestore)
    match /designers/{designerId} {
      // Tout le monde peut lire les designers
      allow read: if true;
      
      // Seuls les admins peuvent créer, modifier ou supprimer des designers
      allow create, update, delete: if isAdmin();
    }
    
    // Règles pour d'autres collections potentielles
    match /{document=**} {
      // Par défaut, refuser l'accès à toutes les autres collections
      allow read, write: if false;
    }
  }
}

mongo-init.js : // Script d'initialisation MongoDB
const db = db.getSiblingDB("luminaires-gallery")

// Créer les collections
db.createCollection("luminaires")
db.createCollection("designers")
db.createCollection("timelineDescriptions")
db.createCollection("welcomeVideos")

// Créer les index pour optimiser les performances
db.luminaires.createIndex({ nom: "text", designer: "text", description: "text" })
db.luminaires.createIndex({ designer: 1 })
db.luminaires.createIndex({ annee: 1 })
db.luminaires.createIndex({ periode: 1 })
db.luminaires.createIndex({ materiaux: 1 })
db.luminaires.createIndex({ couleurs: 1 })
db.luminaires.createIndex({ createdAt: -1 })
db.designers.createIndex({ nom: 1 }, { unique: true })
db.designers.createIndex({ slug: 1 }, { unique: true })
db.timelineDescriptions.createIndex({ periode: 1 }, { unique: true })

print("Base de données initialisée avec succès !")

next.config.mjs : /** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    outputFileTracingRoot: process.cwd(),
  },
  images: {
    domains: ['localhost'],
    unoptimized: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
}

export default nextConfig

package.json : {
  "name": "my-v0-project",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "build": "next build",
    "dev": "next dev",
    "lint": "next lint",
    "start": "next start"
  },
  "dependencies": {
    "@aws-sdk/credential-providers": "latest",
    "@mongodb-js/zstd": "latest",
    "@radix-ui/react-select": "latest",
    "@radix-ui/react-slider": "latest",
    "@radix-ui/react-slot": "latest",
    "@types/node": "^20",
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "autoprefixer": "^10.0.1",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "csv-parse": "latest",
    "eslint": "^8",
    "eslint-config-next": "14.2.16",
    "firebase": "latest",
    "fs": "latest",
    "gcp-metadata": "latest",
    "jspdf": "latest",
    "kerberos": "latest",
    "lucide-react": "^0.454.0",
    "mongodb": "latest",
    "mongodb-client-encryption": "latest",
    "multer": "^1.4.5-lts.1",
    "next": "14.2.16",
    "next-themes": "latest",
    "papaparse": "latest",
    "path": "latest",
    "postcss": "^8",
    "react": "^18",
    "react-dom": "^18",
    "snappy": "latest",
    "socks": "latest",
    "sonner": "latest",
    "stream": "latest",
    "tailwind-merge": "^2.5.5",
    "tailwindcss": "^3.3.0",
    "tailwindcss-animate": "^1.0.7",
    "typescript": "^5"
  },
  "devDependencies": {
    "@types/multer": "^1.4.12",
    "@types/node": "^22",
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "postcss": "^8.5",
    "typescript": "^5"
  }
}
