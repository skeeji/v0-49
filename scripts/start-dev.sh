#!/bin/bash

echo "🚀 Démarrage de l'application en mode développement..."

# Vérifier si Docker est installé
if ! command -v docker &> /dev/null; then
    echo "❌ Docker n'est pas installé. Veuillez l'installer d'abord."
    exit 1
fi

# Vérifier si Docker Compose est installé
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose n'est pas installé. Veuillez l'installer d'abord."
    exit 1
fi

# Créer le dossier uploads s'il n'existe pas
mkdir -p uploads

# Copier le fichier .env.example vers .env s'il n'existe pas
if [ ! -f .env ]; then
    if [ -f .env.example ]; then
        cp .env.example .env
        echo "📝 Fichier .env créé à partir de .env.example"
        echo "⚠️  N'oubliez pas de configurer vos variables d'environnement dans .env"
    else
        echo "⚠️  Fichier .env.example non trouvé. Créez un fichier .env avec vos variables."
    fi
fi

# Construire et démarrer les services en mode développement
echo "🔨 Construction des images Docker..."
docker-compose -f docker-compose.dev.yml build
echo "🚀 Démarrage des services en mode développement..."
docker-compose -f docker-compose.dev.yml up -d

echo "✅ Application démarrée en mode développement !"
echo ""
echo "📱 Application: http://localhost:3000 (avec hot reload)"
echo "🗄️  MongoDB: mongodb://localhost:27017"
echo "🔧 Mongo Express: http://localhost:8081 (admin/admin123)"
echo ""
echo "📊 Pour voir les logs: docker-compose -f docker-compose.dev.yml logs -f"
echo "🛑 Pour arrêter: docker-compose -f docker-compose.dev.yml down"
