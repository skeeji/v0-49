/**
 * create-indexes.js
 *
 * Crée tous les index MongoDB identifiés lors de l'audit de performance.
 * Idempotent : peut être relancé sans risque, les index existants sont ignorés.
 *
 * Usage : node scripts/create-indexes.js
 */

const { MongoClient } = require("mongodb")
const fs = require("fs")
const path = require("path")

// ─── Chargement de .env.local ─────────────────────────────────────────────────

function loadEnvLocal() {
  const envPath = path.join(__dirname, "..", ".env.local")
  if (!fs.existsSync(envPath)) return {}
  const vars = {}
  for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const eq = trimmed.indexOf("=")
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "")
    vars[key] = val
  }
  return vars
}

const env = loadEnvLocal()
const MONGODB_URI =
  process.env.MONGODB_URI ||
  env.MONGODB_URI ||
  "mongodb://admin:admin123@localhost:27017/luminaires?authSource=admin"

// ─── Compteurs ────────────────────────────────────────────────────────────────

const stats = { created: 0, skipped: 0, errors: 0 }

async function idx(col, spec, options = {}) {
  const name = options.name || JSON.stringify(spec)
  const unique = options.unique ? " [unique]" : ""
  const text = Object.values(spec).includes("text") ? " [text]" : ""
  try {
    await col.createIndex(spec, options)
    console.log(`  ✅  ${col.collectionName.padEnd(32)} ${name}${unique}${text}`)
    stats.created++
  } catch (err) {
    // 85 IndexOptionsConflict  86 IndexKeySpecsConflict  11000 duplicate key (unique déjà là)
    if ([85, 86, 11000].includes(err.code) || err.codeName === "IndexAlreadyExists") {
      console.log(`  ⏭   ${col.collectionName.padEnd(32)} ${name}  (déjà existant)`)
      stats.skipped++
    } else {
      console.error(`  ❌  ${col.collectionName.padEnd(32)} ${name}  →  ${err.message}`)
      stats.errors++
    }
  }
}

// ─── Index par collection ─────────────────────────────────────────────────────

async function luminaires(db) {
  console.log("\n── luminaires ──────────────────────────────────────────────")
  const c = db.collection("luminaires")

  // Filtres texte (OR dans /api/luminaires et lookups par filename)
  await idx(c, { nom: 1 })
  await idx(c, { "Artiste / Dates": 1 })
  await idx(c, { designer: 1 })
  await idx(c, { filename: 1 })
  await idx(c, { "Nom du fichier": 1 })
  await idx(c, { "Image luminaire (Nom du fichier)": 1 })
  await idx(c, { image_principale: 1 })

  // Tri (sort fields passés dynamiquement dans /api/luminaires)
  await idx(c, { annee: 1 })

  // Index composé pour tri paginé fréquent : nom + _id (stable sort)
  await idx(c, { nom: 1, _id: 1 }, { name: "luminaires_nom_id" })

  // Index texte — une seule par collection, couvre les champs de recherche
  await idx(
    c,
    { nom: "text", designer: "text", "Artiste / Dates": "text" },
    { name: "luminaires_fulltext" }
  )
}

async function designers(db) {
  console.log("\n── designers ───────────────────────────────────────────────")
  const c = db.collection("designers")

  // Tri alphabétique (/api/designers → .sort({ nom: 1 })) et lookups
  await idx(c, { nom: 1 })
  await idx(c, { Nom: 1 }) // variante de champ observée dans certains documents

  // Index texte pour la recherche multi-champs
  await idx(
    c,
    { nom: "text", description: "text", biographie: "text" },
    { name: "designers_fulltext" }
  )
}

async function users(db) {
  console.log("\n── users ───────────────────────────────────────────────────")
  const c = db.collection("users")

  // findOne({ email }) dans /api/users/favorites — doit être unique
  await idx(c, { email: 1 }, { unique: true })
}

async function crm(db) {
  console.log("\n── crm ─────────────────────────────────────────────────────")
  const c = db.collection("crm")

  // Filtre par statut (/api/crm/daily-alert et /api/crm/projects)
  await idx(c, { status: 1 })

  // Tri par date de modification (/api/crm/projects → sort updatedAt -1)
  await idx(c, { updatedAt: -1 })

  // Index composé pour le tri combiné _statusOrder + updatedAt de la liste projets
  await idx(c, { status: 1, updatedAt: -1 }, { name: "crm_status_updated" })
}

async function timelineDescriptions(db) {
  console.log("\n── timelineDescriptions ────────────────────────────────────")
  const c = db.collection("timelineDescriptions")

  // Tri + upsert par période (/api/timeline/descriptions → sort { periode: 1 })
  await idx(c, { periode: 1 }, { unique: true })
}

async function uploadsFiles(db) {
  console.log("\n── uploads.files  (GridFS metadata) ───────────────────────")
  const c = db.collection("uploads.files")

  // /api/homepage-images → find({ "metadata.homepageKey": { $exists: true } })
  await idx(c, { "metadata.homepageKey": 1 })

  // /api/period-images → find({ "metadata.periodName": { $exists: true } })
  await idx(c, { "metadata.periodName": 1 })

  // /api/images/filename/[filename] → find({ $or: [{ filename: variant }, …] })
  // GridFS crée déjà { filename: 1, uploadDate: 1 } — on ajoute le tri desc pour
  // la déduplication côté serveur (garder le plus récent par clé homepage)
  await idx(c, { filename: 1, uploadDate: -1 }, { name: "uploads_filename_date" })
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const safeUri = MONGODB_URI.replace(/:([^/@]+)@/, ":*****@")
  console.log("🔌  Connexion MongoDB…")
  console.log(`    ${safeUri}`)

  const client = new MongoClient(MONGODB_URI)

  try {
    await client.connect()
    console.log("✅  Connecté")

    const db = client.db("luminaires")

    await luminaires(db)
    await designers(db)
    await users(db)
    await crm(db)
    await timelineDescriptions(db)
    await uploadsFiles(db)

    console.log("\n════════════════════════════════════════════════════════════")
    console.log(`  ✅  Créés    ${stats.created}`)
    console.log(`  ⏭   Ignorés  ${stats.skipped}  (déjà existants)`)
    console.log(`  ❌  Erreurs  ${stats.errors}`)
    console.log("════════════════════════════════════════════════════════════")

    if (stats.errors > 0) process.exit(1)
  } catch (err) {
    console.error("\n❌  Erreur fatale :", err.message)
    process.exit(1)
  } finally {
    await client.close()
    console.log("🔌  Connexion fermée")
  }
}

main()
