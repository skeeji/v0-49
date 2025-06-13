#!/bin/bash

echo "🚀 Démarrage de l'application Luminaires..."

# Vérifier si .env existe
if [ ! -f .env ]; then
    echo "⚠️  Fichier .env manquant. Copie de .env.example..."
    cp .env.example .env
    echo "📝 Veuillez configurer vos variables Firebase dans .env"
fi

# Démarrer avec Docker Compose
echo "🐳 Démarrage des conteneurs..."
docker-compose up --build -d

echo "✅ Application démarrée!"
echo ""
echo "🌐 URLs d'accès:"
echo "   Application: http://localhost:3000"
echo "   MongoDB:     mongodb://localhost:27017"
echo "   Admin DB:    http://localhost:8081 (admin/admin123)"
echo ""
echo "📋 Commandes utiles:"
echo "   Voir les logs:    docker-compose logs -f"
echo "   Arrêter:         ./scripts/stop.sh"
echo "   Redémarrer:      docker-compose restart"
