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

pnpm-lock.yaml : lockfileVersion: '9.0'
settings:
  autoInstallPeers: true
  excludeLinksFromLockfile: false
importers:
  .:
    dependencies:
      '@aws-sdk/credential-providers':
        specifier: latest
        version: 3.839.0
      '@mongodb-js/zstd':
        specifier: latest
        version: 2.0.1
      '@radix-ui/react-select':
        specifier: latest
        version: 2.2.5(@types/react-dom@18.0.0)(@types/react@18.0.0)(react-dom@18.0.0(react@18.0.0))(react@18.0.0)
      '@radix-ui/react-slider':
        specifier: latest
        version: 1.3.5(@types/react-dom@18.0.0)(@types/react@18.0.0)(react-dom@18.0.0(react@18.0.0))(react@18.0.0)
      '@radix-ui/react-slot':
        specifier: latest
        version: 1.2.3(@types/react@18.0.0)(react@18.0.0)
      '@types/node':
        specifier: ^20
        version: 20.0.0
      '@types/react':
        specifier: ^18
        version: 18.0.0
      '@types/react-dom':
        specifier: ^18
        version: 18.0.0
      autoprefixer:
        specifier: ^10.0.1
        version: 10.0.1(postcss@8.0.0)
      class-variance-authority:
        specifier: ^0.7.1
        version: 0.7.1
      clsx:
        specifier: ^2.1.1
        version: 2.1.1
      csv-parse:
        specifier: latest
        version: 5.6.0
      eslint:
        specifier: ^8
        version: 8.0.0
      eslint-config-next:
        specifier: 14.2.16
        version: 14.2.16(eslint@8.0.0)(typescript@5.0.2)
      firebase:
        specifier: latest
        version: 11.9.1
      fs:
        specifier: latest
        version: 0.0.1-security
      gcp-metadata:
        specifier: latest
        version: 7.0.1
      jspdf:
        specifier: latest
        version: 3.0.1
      kerberos:
        specifier: latest
        version: 2.2.2
      lucide-react:
        specifier: ^0.454.0
        version: 0.454.0(react@18.0.0)
      mongodb:
        specifier: latest
        version: 6.17.0(@aws-sdk/credential-providers@3.839.0)(@mongodb-js/zstd@2.0.1)(gcp-metadata@7.0.1)(kerberos@2.2.2)(mongodb-client-encryption@6.4.0)(snappy@7.2.2)(socks@2.8.5)
      mongodb-client-encryption:
        specifier: latest
        version: 6.4.0
      multer:
        specifier: ^1.4.5-lts.1
        version: 1.4.5-lts.1
      next:
        specifier: 14.2.16
        version: 14.2.16(react-dom@18.0.0(react@18.0.0))(react@18.0.0)
      next-themes:
        specifier: latest
        version: 0.4.6(react-dom@18.0.0(react@18.0.0))(react@18.0.0)
      papaparse:
        specifier: latest
        version: 5.5.3
      path:
        specifier: latest
        version: 0.12.7
      postcss:
        specifier: ^8
        version: 8.0.0
      react:
        specifier: ^18
        version: 18.0.0
      react-dom:
        specifier: ^18
        version: 18.0.0(react@18.0.0)
      snappy:
        specifier: latest
        version: 7.2.2
      socks:
        specifier: latest
        version: 2.8.5
      sonner:
        specifier: latest
        version: 2.0.5(react-dom@18.0.0(react@18.0.0))(react@18.0.0)
      stream:
        specifier: latest
        version: 0.0.3
      tailwind-merge:
        specifier: ^2.5.5
        version: 2.5.5
      tailwindcss:
        specifier: ^3.3.0
        version: 3.3.0(postcss@8.0.0)
      tailwindcss-animate:
        specifier: ^1.0.7
        version: 1.0.7(tailwindcss@3.3.0(postcss@8.0.0))
      typescript:
        specifier: ^5
        version: 5.0.2
    devDependencies:
      '@types/multer':
        specifier: ^1.4.12
        version: 1.4.12
packages:
  '@aws-crypto/sha256-browser@5.2.0':
    resolution: {integrity: sha512-AXfN/lGotSQwu6HNcEsIASo7kWXZ5HYWvfOmSNKDsEqC4OashTp8alTmaz+F7TC2L083SFv5RdB+qU3Vs1kZqw==}
  '@aws-crypto/sha256-js@5.2.0':
    resolution: {integrity: sha512-FFQQyu7edu4ufvIZ+OadFpHHOt+eSTBaYaki44c+akjg7qZg9oOQeLlk77F6tSYqjDAFClrHJk9tMf0HdVyOvA==}
    engines: {node: '>=16.0.0'}
  '@aws-crypto/supports-web-crypto@5.2.0':
    resolution: {integrity: sha512-iAvUotm021kM33eCdNfwIN//F77/IADDSs58i+MDaOqFrVjZo9bAal0NK7HurRuWLLpF1iLX7gbWrjHjeo+YFg==}
  '@aws-crypto/util@5.2.0':
    resolution: {integrity: sha512-4RkU9EsI6ZpBve5fseQlGNUWKMa1RLPQ1dnjnQoe07ldfIzcsGb5hC5W0Dm7u423KWzawlrpbjXBrXCEv9zazQ==}
  '@aws-sdk/client-cognito-identity@3.839.0':
    resolution: {integrity: sha512-Pq/A5W46Z0JrRTIl4eVvguQjXWwVHiiBC3WyrLxlIH0hMS6bILgC7H+z+JiCm4mXR/oF2ZobQ8Wei/Sga1Uxkw==}
    engines: {node: '>=18.0.0'}
  '@aws-sdk/client-sso@3.839.0':
    resolution: {integrity: sha512-AZABysUhbfcwXVlMo97/vwHgsfJNF81wypCAowpqAJkSjP2KrqsqHpb71/RoR2w8JGmEnBBXRD4wIxDhnmifWg==}
    engines: {node: '>=18.0.0'}
  '@aws-sdk/core@3.839.0':
    resolution: {integrity: sha512-KdwL5RaK7eUIlOpdOoZ5u+2t4X1rdX/MTZgz3IV/aBzjVUoGsp+uUnbyqXomLQSUitPHp72EE/NHDsvWW/IHvQ==}
    engines: {node: '>=18.0.0'}
  '@aws-sdk/credential-provider-cognito-identity@3.839.0':
    resolution: {integrity: sha512-dXJsdSEVzG+8nIihqVnWzyW8Dc41kNKZEXYguHDb+VM/cIjRSVkaw9jXc+KAvbwcGkEB7BfAuW9VMjxpTR5eAA==}
    engines: {node: '>=18.0.0'}
  '@aws-sdk/credential-provider-env@3.839.0':
    resolution: {integrity: sha512-cWTadewPPz1OvObZJB+olrgh8VwcgIVcT293ZUT9V0CMF0UU7QaPwJP7uNXcNxltTh+sk1yhjH4UlcnJigZZbA==}
    engines: {node: '>=18.0.0'}
  '@aws-sdk/credential-provider-http@3.839.0':
    resolution: {integrity: sha512-fv0BZwrDhWDju4D1MCLT4I2aPjr0dVQ6P+MpqvcGNOA41Oa9UdRhYTV5iuy5NLXzIzoCmnS+XfSq5Kbsf6//xw==}
    engines: {node: '>=18.0.0'}
  '@aws-sdk/credential-provider-ini@3.839.0':
    resolution: {integrity: sha512-GHm0hF4CiDxIDR7TauMaA6iI55uuSqRxMBcqTAHaTPm6+h1A+MS+ysQMxZ+Jvwtoy8WmfTIGrJVxSCw0sK2hvA==}
    engines: {node: '>=18.0.0'}
  '@aws-sdk/credential-provider-node@3.839.0':
    resolution: {integrity: sha512-7bR+U2h+ft0V8chyeu9Bh/pvau4ZkQMeRt5f0dAULoepZQ77QQVRP4H04yJPTg9DCtqbVULQ3uf5YOp1/08vQw==}
    engines: {node: '>=18.0.0'}
  '@aws-sdk/credential-provider-process@3.839.0':
    resolution: {integrity: sha512-qShpekjociUZ+isyQNa0P7jo+0q3N2+0eJDg8SGyP6K6hHTcGfiqxTDps+IKl6NreCPhZCBzyI9mWkP0xSDR6g==}
    engines: {node: '>=18.0.0'}
  '@aws-sdk/credential-provider-sso@3.839.0':
    resolution: {integrity: sha512-w10zBLHhU8SBQcdrSPMI02haLoRGZg+gP7mH/Er8VhIXfHefbr7o4NirmB0hwdw/YAH8MLlC9jj7c2SJlsNhYA==}
    engines: {node: '>=18.0.0'}
  '@aws-sdk/credential-provider-web-identity@3.839.0':
    resolution: {integrity: sha512-EvqTc7J1kgmiuxknpCp1S60hyMQvmKxsI5uXzQtcogl/N55rxiXEqnCLI5q6p33q91PJegrcMCM5Q17Afhm5qA==}
    engines: {node: '>=18.0.0'}
  '@aws-sdk/credential-providers@3.839.0':
    resolution: {integrity: sha512-hiM7vY2qYAdNT87+Qd3vvfNA+bqhtecsPIduIxkhwispEs9NGcQYtOaG3KQRcHkJBb4kaMYpudVNMXeYUYi2Aw==}
    engines: {node: '>=18.0.0'}
  '@aws-sdk/middleware-host-header@3.821.0':
    resolution: {integrity: sha512-xSMR+sopSeWGx5/4pAGhhfMvGBHioVBbqGvDs6pG64xfNwM5vq5s5v6D04e2i+uSTj4qGa71dLUs5I0UzAK3sw==}
    engines: {node: '>=18.0.0'}
  '@aws-sdk/middleware-logger@3.821.0':
    resolution: {integrity: sha512-0cvI0ipf2tGx7fXYEEN5fBeZDz2RnHyb9xftSgUsEq7NBxjV0yTZfLJw6Za5rjE6snC80dRN8+bTNR1tuG89zA==}
    engines: {node: '>=18.0.0'}
  '@aws-sdk/middleware-recursion-detection@3.821.0':
    resolution: {integrity: sha512-efmaifbhBoqKG3bAoEfDdcM8hn1psF+4qa7ykWuYmfmah59JBeqHLfz5W9m9JoTwoKPkFcVLWZxnyZzAnVBOIg==}
    engines: {node: '>=18.0.0'}
  '@aws-sdk/middleware-user-agent@3.839.0':
    resolution: {integrity: sha512-2u74uRM1JWq6Sf7+3YpjejPM9YkomGt4kWhrmooIBEq1k5r2GTbkH7pNCxBQwBueXM21jAGVDxxeClpTx+5hig==}
    engines: {node: '>=18.0.0'}
  '@aws-sdk/nested-clients@3.839.0':
    resolution: {integrity: sha512-Glic0pg2THYP3aRhJORwJJBe1JLtJoEdWV/MFZNyzCklfMwEzpWtZAyxy+tQyFmMeW50uBAnh2R0jhMMcf257w==}
    engines: {node: '>=18.0.0'}
  '@aws-sdk/region-config-resolver@3.821.0':
    resolution: {integrity: sha512-t8og+lRCIIy5nlId0bScNpCkif8sc0LhmtaKsbm0ZPm3sCa/WhCbSZibjbZ28FNjVCV+p0D9RYZx0VDDbtWyjw==}
    engines: {node: '>=18.0.0'}
  '@aws-sdk/token-providers@3.839.0':
    resolution: {integrity: sha512-2nlafqdSbet/2WtYIoZ7KEGFowFonPBDYlTjrUvwU2yooE10VhvzhLSCTB2aKIVzo2Z2wL5WGFQsqAY5QwK6Bw==}
    engines: {node: '>=18.0.0'}
  '@aws-sdk/types@3.821.0':
    resolution: {integrity: sha512-Znroqdai1a90TlxGaJ+FK1lwC0fHpo97Xjsp5UKGR5JODYm7f9+/fF17ebO1KdoBr/Rm0UIFiF5VmI8ts9F1eA==}
    engines: {node: '>=18.0.0'}
  '@aws-sdk/util-endpoints@3.828.0':
    resolution: {integrity: sha512-RvKch111SblqdkPzg3oCIdlGxlQs+k+P7Etory9FmxPHyPDvsP1j1c74PmgYqtzzMWmoXTjd+c9naUHh9xG8xg==}
    engines: {node: '>=18.0.0'}
  '@aws-sdk/util-locate-window@3.804.0':
    resolution: {integrity: sha512-zVoRfpmBVPodYlnMjgVjfGoEZagyRF5IPn3Uo6ZvOZp24chnW/FRstH7ESDHDDRga4z3V+ElUQHKpFDXWyBW5A==}
    engines: {node: '>=18.0.0'}
  '@aws-sdk/util-user-agent-browser@3.821.0':
    resolution: {integrity: sha512-irWZHyM0Jr1xhC+38OuZ7JB6OXMLPZlj48thElpsO1ZSLRkLZx5+I7VV6k3sp2yZ7BYbKz/G2ojSv4wdm7XTLw==}
  '@aws-sdk/util-user-agent-node@3.839.0':
    resolution: {integrity: sha512-MuunkIG1bJVMtTH7MbjXOrhHleU5wjHz5eCAUc6vj7M9rwol71nqjj9b8RLnkO5gsJcKc29Qk8iV6xQuzKWNMw==}
    engines: {node: '>=18.0.0'}
    peerDependencies:
      aws-crt: '>=1.0.0'
    peerDependenciesMeta:
      aws-crt:
        optional: true
  '@aws-sdk/xml-builder@3.821.0':
    resolution: {integrity: sha512-DIIotRnefVL6DiaHtO6/21DhJ4JZnnIwdNbpwiAhdt/AVbttcE4yw925gsjur0OGv5BTYXQXU3YnANBYnZjuQA==}
    engines: {node: '>=18.0.0'}
  '@babel/runtime@7.27.6':
    resolution: {integrity: sha512-vbavdySgbTTrmFE+EsiqUTzlOr5bzlnJtUv9PynGCAKvfQqjIXbvFdumPM/GxMDfyuGMJaJAU6TO4zc1Jf1i8Q==}
    engines: {node: '>=6.9.0'}
  '@emnapi/core@1.4.3':
    resolution: {integrity: sha512-4m62DuCE07lw01soJwPiBGC0nAww0Q+RY70VZ+n49yDIO13yyinhbWCeNnaob0lakDtWQzSdtNWzJeOJt2ma+g==}
  '@emnapi/runtime@1.4.3':
    resolution: {integrity: sha512-pBPWdu6MLKROBX05wSNKcNb++m5Er+KQ9QkB+WVM+pW2Kx9hoSrVTnu3BdkI5eBLZoKu/J6mW/B6i6bJB2ytXQ==}
  '@emnapi/wasi-threads@1.0.2':
    resolution: {integrity: sha512-5n3nTJblwRi8LlXkJ9eBzu+kZR8Yxcc7ubakyQTFzPMtIhFpUBRbsnc2Dv88IZDIbCDlBiWrknhB4Lsz7mg6BA==}
  '@eslint-community/eslint-utils@4.7.0':
    resolution: {integrity: sha512-dyybb3AcajC7uha6CvhdVRJqaKyn7w2YKqKyAN37NKYgZT36w+iRb0Dymmc5qEJ549c/S31cMMSFd75bteCpCw==}
    engines: {node: ^12.22.0 || ^14.17.0 || >=16.0.0}
    peerDependencies:
      eslint: ^6.0.0 || ^7.0.0 || >=8.0.0
  '@eslint-community/regexpp@4.12.1':
    resolution: {integrity: sha512-CCZCDJuduB9OUkFkY2IgppNZMi2lBQgD2qzwXkEia16cge2pijY/aXi96CJMquDMn3nJdlPV1A5KrJEXwfLNzQ==}
    engines: {node: ^12.0.0 || ^14.0.0 || >=16.0.0}
  '@eslint/eslintrc@1.4.1':
    resolution: {integrity: sha512-XXrH9Uarn0stsyldqDYq8r++mROmWRI1xKMXa640Bb//SY1+ECYX6VzT6Lcx5frD0V30XieqJ0oX9I2Xj5aoMA==}
    engines: {node: ^12.22.0 || ^14.17.0 || >=16.0.0}
  '@firebase/ai@1.4.0':
    resolution: {integrity: sha512-wvF33gtU6TXb6Co8TEC1pcl4dnVstYmRE/vs9XjUGE7he7Sgf5TqSu+EoXk/fuzhw5tKr1LC5eG9KdYFM+eosw==}
    engines: {node: '>=18.0.0'}
    peerDependencies:
      '@firebase/app': 0.x
      '@firebase/app-types': 0.x
  '@firebase/analytics-compat@0.2.22':
    resolution: {integrity: sha512-VogWHgwkdYhjWKh8O1XU04uPrRaiDihkWvE/EMMmtWtaUtVALnpLnUurc3QtSKdPnvTz5uaIGKlW84DGtSPFbw==}
    peerDependencies:
      '@firebase/app-compat': 0.x
  '@firebase/analytics-types@0.8.3':
    resolution: {integrity: sha512-VrIp/d8iq2g501qO46uGz3hjbDb8xzYMrbu8Tp0ovzIzrvJZ2fvmj649gTjge/b7cCCcjT0H37g1gVtlNhnkbg==}
  '@firebase/analytics@0.10.16':
    resolution: {integrity: sha512-cMtp19He7Fd6uaj/nDEul+8JwvJsN8aRSJyuA1QN3QrKvfDDp+efjVurJO61sJpkVftw9O9nNMdhFbRcTmTfRQ==}
    peerDependencies:
      '@firebase/app': 0.x
  '@firebase/app-check-compat@0.3.25':
    resolution: {integrity: sha512-3zrsPZWAKfV7DVC20T2dgfjzjtQnSJS65OfMOiddMUtJL1S5i0nAZKsdX0bOEvvrd0SBIL8jYnfpfDeQRnhV3w==}
    engines: {node: '>=18.0.0'}
    peerDependencies:
      '@firebase/app-compat': 0.x
  '@firebase/app-check-interop-types@0.3.3':
    resolution: {integrity: sha512-gAlxfPLT2j8bTI/qfe3ahl2I2YcBQ8cFIBdhAQA4I2f3TndcO+22YizyGYuttLHPQEpWkhmpFW60VCFEPg4g5A==}
  '@firebase/app-check-types@0.5.3':
    resolution: {integrity: sha512-hyl5rKSj0QmwPdsAxrI5x1otDlByQ7bvNvVt8G/XPO2CSwE++rmSVf3VEhaeOR4J8ZFaF0Z0NDSmLejPweZ3ng==}
  '@firebase/app-check@0.10.0':
    resolution: {integrity: sha512-AZlRlVWKcu8BH4Yf8B5EI8sOi2UNGTS8oMuthV45tbt6OVUTSQwFPIEboZzhNJNKY+fPsg7hH8vixUWFZ3lrhw==}
    engines: {node: '>=18.0.0'}
    peerDependencies:
      '@firebase/app': 0.x
  '@firebase/app-compat@0.4.1':
    resolution: {integrity: sha512-9VGjnY23Gc1XryoF/ABWtZVJYnaPOnjHM7dsqq9YALgKRtxI1FryvELUVkDaEIUf4In2bfkb9ZENF1S9M273Dw==}
    engines: {node: '>=18.0.0'}
  '@firebase/app-types@0.9.3':
    resolution: {integrity: sha512-kRVpIl4vVGJ4baogMDINbyrIOtOxqhkZQg4jTq3l8Lw6WSk0xfpEYzezFu+Kl4ve4fbPl79dvwRtaFqAC/ucCw==}
  '@firebase/app@0.13.1':
    resolution: {integrity: sha512-0O33PKrXLoIWkoOO5ByFaLjZehBctSYWnb+xJkIdx2SKP/K9l1UPFXPwASyrOIqyY3ws+7orF/1j7wI5EKzPYQ==}
    engines: {node: '>=18.0.0'}
  '@firebase/auth-compat@0.5.27':
    resolution: {integrity: sha512-axZx/MgjNO7uPA8/nMQiuVotGCngUFMppt5w0pxFIoIPD0kac0bsFdSEh5S2ttuEE0Aq1iUB6Flzwn+wvMgXnQ==}
    engines: {node: '>=18.0.0'}
    peerDependencies:
      '@firebase/app-compat': 0.x
  '@firebase/auth-interop-types@0.2.4':
    resolution: {integrity: sha512-JPgcXKCuO+CWqGDnigBtvo09HeBs5u/Ktc2GaFj2m01hLarbxthLNm7Fk8iOP1aqAtXV+fnnGj7U28xmk7IwVA==}
  '@firebase/auth-types@0.13.0':
    resolution: {integrity: sha512-S/PuIjni0AQRLF+l9ck0YpsMOdE8GO2KU6ubmBB7P+7TJUCQDa3R1dlgYm9UzGbbePMZsp0xzB93f2b/CgxMOg==}
    peerDependencies:
      '@firebase/app-types': 0.x
      '@firebase/util': 1.x
  '@firebase/auth@1.10.7':
    resolution: {integrity: sha512-77o0aBKCfchdL1gkahARdawHyYefh+wRYn7o60tbwW6bfJNq2idbrRb3WSYCT4yBKWL0+9kKdwxBHPZ6DEiB+g==}
    engines: {node: '>=18.0.0'}
    peerDependencies:
      '@firebase/app': 0.x
      '@react-native-async-storage/async-storage': ^1.18.1
    peerDependenciesMeta:
      '@react-native-async-storage/async-storage':
        optional: true
  '@firebase/component@0.6.17':
    resolution: {integrity: sha512-M6DOg7OySrKEFS8kxA3MU5/xc37fiOpKPMz6cTsMUcsuKB6CiZxxNAvgFta8HGRgEpZbi8WjGIj6Uf+TpOhyzg==}
    engines: {node: '>=18.0.0'}
  '@firebase/data-connect@0.3.9':
    resolution: {integrity: sha512-B5tGEh5uQrQeH0i7RvlU8kbZrKOJUmoyxVIX4zLA8qQJIN6A7D+kfBlGXtSwbPdrvyaejcRPcbOtqsDQ9HPJKw==}
    peerDependencies:
      '@firebase/app': 0.x
  '@firebase/database-compat@2.0.10':
    resolution: {integrity: sha512-3sjl6oGaDDYJw/Ny0E5bO6v+KM3KoD4Qo/sAfHGdRFmcJ4QnfxOX9RbG9+ce/evI3m64mkPr24LlmTDduqMpog==}
    engines: {node: '>=18.0.0'}
  '@firebase/database-types@1.0.14':
    resolution: {integrity: sha512-8a0Q1GrxM0akgF0RiQHliinhmZd+UQPrxEmUv7MnQBYfVFiLtKOgs3g6ghRt/WEGJHyQNslZ+0PocIwNfoDwKw==}
  '@firebase/database@1.0.19':
    resolution: {integrity: sha512-khE+MIYK+XlIndVn/7mAQ9F1fwG5JHrGKaG72hblCC6JAlUBDd3SirICH6SMCf2PQ0iYkruTECth+cRhauacyQ==}
    engines: {node: '>=18.0.0'}
  '@firebase/firestore-compat@0.3.52':
    resolution: {integrity: sha512-nzt3Sag+EBdm1Jkw/FnnKBPk0LpUUxOlMHMADPBXYhhXrLszxn1+vb64nJsbgRIHfsCn+rg8gyGrb+8frzXrjg==}
    engines: {node: '>=18.0.0'}
    peerDependencies:
      '@firebase/app-compat': 0.x
  '@firebase/firestore-types@3.0.3':
    resolution: {integrity: sha512-hD2jGdiWRxB/eZWF89xcK9gF8wvENDJkzpVFb4aGkzfEaKxVRD1kjz1t1Wj8VZEp2LCB53Yx1zD8mrhQu87R6Q==}
    peerDependencies:
      '@firebase/app-types': 0.x
      '@firebase/util': 1.x
  '@firebase/firestore@4.7.17':
    resolution: {integrity: sha512-YhXWA7HlSnekExhZ5u4i0e+kpPxsh/qMrzeNDgsAva71JXK8OOuOx+yLyYBFhmu3Hr5JJDO2fsZA/wrWoQYHDg==}
    engines: {node: '>=18.0.0'}
    peerDependencies:
      '@firebase/app': 0.x
  '@firebase/functions-compat@0.3.25':
    resolution: {integrity: sha512-V0JKUw5W/7aznXf9BQ8LIYHCX6zVCM8Hdw7XUQ/LU1Y9TVP8WKRCnPB/qdPJ0xGjWWn7fhtwIYbgEw/syH4yTQ==}
    engines: {node: '>=18.0.0'}
    peerDependencies:
      '@firebase/app-compat': 0.x
  '@firebase/functions-types@0.6.3':
    resolution: {integrity: sha512-EZoDKQLUHFKNx6VLipQwrSMh01A1SaL3Wg6Hpi//x6/fJ6Ee4hrAeswK99I5Ht8roiniKHw4iO0B1Oxj5I4plg==}
  '@firebase/functions@0.12.8':
    resolution: {integrity: sha512-p+ft6dQW0CJ3BLLxeDb5Hwk9ARw01kHTZjLqiUdPRzycR6w7Z75ThkegNmL6gCss3S0JEpldgvehgZ3kHybVhA==}
    engines: {node: '>=18.0.0'}
    peerDependencies:
      '@firebase/app': 0.x
  '@firebase/installations-compat@0.2.17':
    resolution: {integrity: sha512-J7afeCXB7yq25FrrJAgbx8mn1nG1lZEubOLvYgG7ZHvyoOCK00sis5rj7TgDrLYJgdj/SJiGaO1BD3BAp55TeA==}
    peerDependencies:
      '@firebase/app-compat': 0.x
  '@firebase/installations-types@0.5.3':
    resolution: {integrity: sha512-2FJI7gkLqIE0iYsNQ1P751lO3hER+Umykel+TkLwHj6plzWVxqvfclPUZhcKFVQObqloEBTmpi2Ozn7EkCABAA==}
    peerDependencies:
      '@firebase/app-types': 0.x
  '@firebase/installations@0.6.17':
    resolution: {integrity: sha512-zfhqCNJZRe12KyADtRrtOj+SeSbD1H/K8J24oQAJVv/u02eQajEGlhZtcx9Qk7vhGWF5z9dvIygVDYqLL4o1XQ==}
    peerDependencies:
      '@firebase/app': 0.x
  '@firebase/logger@0.4.4':
    resolution: {integrity: sha512-mH0PEh1zoXGnaR8gD1DeGeNZtWFKbnz9hDO91dIml3iou1gpOnLqXQ2dJfB71dj6dpmUjcQ6phY3ZZJbjErr9g==}
    engines: {node: '>=18.0.0'}
  '@firebase/messaging-compat@0.2.21':
    resolution: {integrity: sha512-1yMne+4BGLbHbtyu/VyXWcLiefUE1+K3ZGfVTyKM4BH4ZwDFRGoWUGhhx+tKRX4Tu9z7+8JN67SjnwacyNWK5g==}
    peerDependencies:
      '@firebase/app-compat': 0.x
  '@firebase/messaging-interop-types@0.2.3':
    resolution: {integrity: sha512-xfzFaJpzcmtDjycpDeCUj0Ge10ATFi/VHVIvEEjDNc3hodVBQADZ7BWQU7CuFpjSHE+eLuBI13z5F/9xOoGX8Q==}
  '@firebase/messaging@0.12.21':
    resolution: {integrity: sha512-bYJ2Evj167Z+lJ1ach6UglXz5dUKY1zrJZd15GagBUJSR7d9KfiM1W8dsyL0lDxcmhmA/sLaBYAAhF1uilwN0g==}
    peerDependencies:
      '@firebase/app': 0.x
  '@firebase/performance-compat@0.2.19':
    resolution: {integrity: sha512-4cU0T0BJ+LZK/E/UwFcvpBCVdkStgBMQwBztM9fJPT6udrEUk3ugF5/HT+E2Z22FCXtIaXDukJbYkE/c3c6IHw==}
    peerDependencies:
      '@firebase/app-compat': 0.x
  '@firebase/performance-types@0.2.3':
    resolution: {integrity: sha512-IgkyTz6QZVPAq8GSkLYJvwSLr3LS9+V6vNPQr0x4YozZJiLF5jYixj0amDtATf1X0EtYHqoPO48a9ija8GocxQ==}
  '@firebase/performance@0.7.6':
    resolution: {integrity: sha512-AsOz74dSTlyQGlnnbLWXiHFAsrxhpssPOsFFi4HgOJ5DjzkK7ZdZ/E9uMPrwFoXJyMVoybGRuqsL/wkIbFITsA==}
    peerDependencies:
      '@firebase/app': 0.x
  '@firebase/remote-config-compat@0.2.17':
    resolution: {integrity: sha512-KelsBD0sXSC0u3esr/r6sJYGRN6pzn3bYuI/6pTvvmZbjBlxQkRabHAVH6d+YhLcjUXKIAYIjZszczd1QJtOyA==}
    peerDependencies:
      '@firebase/app-compat': 0.x
  '@firebase/remote-config-types@0.4.0':
    resolution: {integrity: sha512-7p3mRE/ldCNYt8fmWMQ/MSGRmXYlJ15Rvs9Rk17t8p0WwZDbeK7eRmoI1tvCPaDzn9Oqh+yD6Lw+sGLsLg4kKg==}
  '@firebase/remote-config@0.6.4':
    resolution: {integrity: sha512-ZyLJRT46wtycyz2+opEkGaoFUOqRQjt/0NX1WfUISOMCI/PuVoyDjqGpq24uK+e8D5NknyTpiXCVq5dowhScmg==}
    peerDependencies:
      '@firebase/app': 0.x
  '@firebase/storage-compat@0.3.23':
    resolution: {integrity: sha512-B/ufkT/R/tSvc2av+vP6ZYybGn26FwB9YVDYg/6Bro+5TN3VEkCeNmfnX3XLa2DSdXUTZAdWCbMxW0povGa4MA==}
    engines: {node: '>=18.0.0'}
    peerDependencies:
      '@firebase/app-compat': 0.x
  '@firebase/storage-types@0.8.3':
    resolution: {integrity: sha512-+Muk7g9uwngTpd8xn9OdF/D48uiQ7I1Fae7ULsWPuKoCH3HU7bfFPhxtJYzyhjdniowhuDpQcfPmuNRAqZEfvg==}
    peerDependencies:
      '@firebase/app-types': 0.x
      '@firebase/util': 1.x
  '@firebase/storage@0.13.13':
    resolution: {integrity: sha512-E+MTNcBgpoAynicgVb2ZsHCuEOO4aAiUX5ahNwe/1dEyZpo2H4DwFqKQRNK/sdAIgBbjBwcfV2p0MdPFGIR0Ew==}
    engines: {node: '>=18.0.0'}
    peerDependencies:
      '@firebase/app': 0.x
  '@firebase/util@1.12.0':
    resolution: {integrity: sha512-Z4rK23xBCwgKDqmzGVMef+Vb4xso2j5Q8OG0vVL4m4fA5ZjPMYQazu8OJJC3vtQRC3SQ/Pgx/6TPNVsCd70QRw==}
    engines: {node: '>=18.0.0'}
  '@firebase/webchannel-wrapper@1.0.3':
    resolution: {integrity: sha512-2xCRM9q9FlzGZCdgDMJwc0gyUkWFtkosy7Xxr6sFgQwn+wMNIWd7xIvYNauU1r64B5L5rsGKy/n9TKJ0aAFeqQ==}
  '@floating-ui/core@1.7.1':
    resolution: {integrity: sha512-azI0DrjMMfIug/ExbBaeDVJXcY0a7EPvPjb2xAJPa4HeimBX+Z18HK8QQR3jb6356SnDDdxx+hinMLcJEDdOjw==}
  '@floating-ui/dom@1.7.1':
    resolution: {integrity: sha512-cwsmW/zyw5ltYTUeeYJ60CnQuPqmGwuGVhG9w0PRaRKkAyi38BT5CKrpIbb+jtahSwUl04cWzSx9ZOIxeS6RsQ==}
  '@floating-ui/react-dom@2.1.3':
    resolution: {integrity: sha512-huMBfiU9UnQ2oBwIhgzyIiSpVgvlDstU8CX0AF+wS+KzmYMs0J2a3GwuFHV1Lz+jlrQGeC1fF+Nv0QoumyV0bA==}
    peerDependencies:
      react: '>=16.8.0'
      react-dom: '>=16.8.0'
  '@floating-ui/utils@0.2.9':
    resolution: {integrity: sha512-MDWhGtE+eHw5JW7lq4qhc5yRLS11ERl1c7Z6Xd0a58DozHES6EnNNwUWbMiG4J9Cgj053Bhk8zvlhFYKVhULwg==}
  '@grpc/grpc-js@1.9.15':
    resolution: {integrity: sha512-nqE7Hc0AzI+euzUwDAy0aY5hCp10r734gMGRdU+qOPX0XSceI2ULrcXB5U2xSc5VkWwalCj4M7GzCAygZl2KoQ==}
    engines: {node: ^8.13.0 || >=10.10.0}
  '@grpc/proto-loader@0.7.15':
    resolution: {integrity: sha512-tMXdRCfYVixjuFK+Hk0Q1s38gV9zDiDJfWL3h1rv4Qc39oILCu1TRTDt7+fGUI8K4G1Fj125Hx/ru3azECWTyQ==}
    engines: {node: '>=6'}
    hasBin: true
  '@humanwhocodes/config-array@0.6.0':
    resolution: {integrity: sha512-JQlEKbcgEUjBFhLIF4iqM7u/9lwgHRBcpHrmUNCALK0Q3amXN6lxdoXLnF0sm11E9VqTmBALR87IlUg1bZ8A9A==}
    engines: {node: '>=10.10.0'}
    deprecated: Use @eslint/config-array instead
  '@humanwhocodes/object-schema@1.2.1':
    resolution: {integrity: sha512-ZnQMnLV4e7hDlUvw8H+U8ASL02SS2Gn6+9Ac3wGGLIe7+je2AeAOxPY+izIPJDfFDb7eDjev0Us8MO1iFRN8hA==}
    deprecated: Use @eslint/object-schema instead
  '@isaacs/cliui@8.0.2':
    resolution: {integrity: sha512-O8jcjabXaleOG9DQ0+ARXWZBTfnP4WNAqzuiJK7ll44AmxGKv/J2M4TPjxjY3znBCfvBXFzucm1twdyFybFqEA==}
    engines: {node: '>=12'}
  '@jridgewell/gen-mapping@0.3.8':
    resolution: {integrity: sha512-imAbBGkb+ebQyxKgzv5Hu2nmROxoDOXHh80evxdoXNOrvAnVx7zimzc1Oo5h9RlfV4vPXaE2iM5pOFbvOCClWA==}
    engines: {node: '>=6.0.0'}
  '@jridgewell/resolve-uri@3.1.2':
    resolution: {integrity: sha512-bRISgCIjP20/tbWSPWMEi54QVPRZExkuD9lJL+UIxUKtwVJA8wW1Trb1jMs1RFXo1CBTNZ/5hpC9QvmKWdopKw==}
    engines: {node: '>=6.0.0'}
  '@jridgewell/set-array@1.2.1':
    resolution: {integrity: sha512-R8gLRTZeyp03ymzP/6Lil/28tGeGEzhx1q2k703KGWRAI1VdvPIXdG70VJc2pAMw3NA6JKL5hhFu1sJX0Mnn/A==}
    engines: {node: '>=6.0.0'}
  '@jridgewell/sourcemap-codec@1.5.0':
    resolution: {integrity: sha512-gv3ZRaISU3fjPAgNsriBRqGWQL6quFx04YMPW/zD8XMLsU32mhCCbfbO6KZFLjvYpCZ8zyDEgqsgf+PwPaM7GQ==}
  '@jridgewell/trace-mapping@0.3.25':
    resolution: {integrity: sha512-vNk6aEwybGtawWmy/PzwnGDOjCkLWSD2wqvjGGAgOAwCGWySYXfYoxt00IJkTF+8Lb57DwOb3Aa0o9CApepiYQ==}
  '@mongodb-js/saslprep@1.3.0':
    resolution: {integrity: sha512-zlayKCsIjYb7/IdfqxorK5+xUMyi4vOKcFy10wKJYc63NSdKI8mNME+uJqfatkPmOSMMUiojrL58IePKBm3gvQ==}
  '@mongodb-js/zstd@2.0.1':
    resolution: {integrity: sha512-hbQKltFj0hMrhe+Udh9gjkzswIJJVOo55vEHgfHbb6wjPpo4Oc3kng2bao/XnzLPCdd5Q1PXbWTC91LYPQrCtA==}
    engines: {node: '>= 16.20.1'}
  '@napi-rs/snappy-android-arm-eabi@7.2.2':
    resolution: {integrity: sha512-H7DuVkPCK5BlAr1NfSU8bDEN7gYs+R78pSHhDng83QxRnCLmVIZk33ymmIwurmoA1HrdTxbkbuNl+lMvNqnytw==}
    engines: {node: '>= 10'}
    cpu: [arm]
    os: [android]
  '@napi-rs/snappy-android-arm64@7.2.2':
    resolution: {integrity: sha512-2R/A3qok+nGtpVK8oUMcrIi5OMDckGYNoBLFyli3zp8w6IArPRfg1yOfVUcHvpUDTo9T7LOS1fXgMOoC796eQw==}
    engines: {node: '>= 10'}
    cpu: [arm64]
    os: [android]
  '@napi-rs/snappy-darwin-arm64@7.2.2':
    resolution: {integrity: sha512-USgArHbfrmdbuq33bD5ssbkPIoT7YCXCRLmZpDS6dMDrx+iM7eD2BecNbOOo7/v1eu6TRmQ0xOzeQ6I/9FIi5g==}
    engines: {node: '>= 10'}
    cpu: [arm64]
    os: [darwin]
  '@napi-rs/snappy-darwin-x64@7.2.2':
    resolution: {integrity: sha512-0APDu8iO5iT0IJKblk2lH0VpWSl9zOZndZKnBYIc+ei1npw2L5QvuErFOTeTdHBtzvUHASB+9bvgaWnQo4PvTQ==}
    engines: {node: '>= 10'}
    cpu: [x64]
    os: [darwin]
  '@napi-rs/snappy-freebsd-x64@7.2.2':
    resolution: {integrity: sha512-mRTCJsuzy0o/B0Hnp9CwNB5V6cOJ4wedDTWEthsdKHSsQlO7WU9W1yP7H3Qv3Ccp/ZfMyrmG98Ad7u7lG58WXA==}
    engines: {node: '>= 10'}
    cpu: [x64]
    os: [freebsd]
  '@napi-rs/snappy-linux-arm-gnueabihf@7.2.2':
    resolution: {integrity: sha512-v1uzm8+6uYjasBPcFkv90VLZ+WhLzr/tnfkZ/iD9mHYiULqkqpRuC8zvc3FZaJy5wLQE9zTDkTJN1IvUcZ+Vcg==}
    engines: {node: '>= 10'}
    cpu: [arm]
    os: [linux]
  '@napi-rs/snappy-linux-arm64-gnu@7.2.2':
    resolution: {integrity: sha512-LrEMa5pBScs4GXWOn6ZYXfQ72IzoolZw5txqUHVGs8eK4g1HR9HTHhb2oY5ySNaKakG5sOg
