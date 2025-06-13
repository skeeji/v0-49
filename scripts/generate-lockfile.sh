#!/bin/bash

echo "🔧 Génération du package-lock.json..."

# Supprimer node_modules et package-lock.json existants
rm -rf node_modules package-lock.json

# Installer les dépendances et générer le lockfile
npm install

echo "✅ package-lock.json généré avec succès!"
echo "📦 Vous pouvez maintenant utiliser npm ci dans Docker"

# Optionnel: rebuild pour vérifier que tout fonctionne
echo "🔨 Test du build..."
npm run build

echo "🎉 Tout est prêt pour Docker!"
