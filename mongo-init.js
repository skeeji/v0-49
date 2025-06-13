// Script d'initialisation MongoDB
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
