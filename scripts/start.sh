#!/bin/bash
echo "🚀 Démarrage de l'application Luminaires..."

# Créer le dossier uploads s'il n'existe pas
mkdir -p uploads

# Vérifier si .env.local existe, sinon utiliser les variables d'environnement
if [ ! -f .env.local ]; then
    echo "📝 Aucun fichier .env.local trouvé"
    echo "🔧 L'application utilisera les variables d'environnement système"
    echo "💡 Vous pouvez créer un fichier .env.local pour personnaliser la configuration"
else
    echo "📝 Fichier .env.local trouvé - utilisation de la configuration locale"
fi

# Vérifier les variables critiques
if [ -z "$MONGODB_URI" ] && [ ! -f .env.local ]; then
    echo "⚠️  Variable MONGODB_URI non définie"
    echo "🔧 Utilisation de la configuration par défaut: mongodb://admin:admin123@localhost:27017/luminaires?authSource=admin"
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
echo ""
echo "🔧 Configuration:"
echo "   Variables d'env: $([ -f .env.local ] && echo '.env.local' || echo 'système')"
