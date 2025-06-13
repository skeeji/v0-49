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
