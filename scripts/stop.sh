#!/bin/bash
echo "🛑 Arrêt de l'application..."

# Arrêter les services de production
if [ -f docker-compose.yml ]; then
    echo "Arrêt des services de production..."
    docker-compose down
fi

# Arrêter les services de développement
if [ -f docker-compose.dev.yml ]; then
    echo "Arrêt des services de développement..."
    docker-compose -f docker-compose.dev.yml down
fi

echo "✅ Application arrêtée avec succès !"
