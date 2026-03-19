/**
 * migrate-annee-int.js
 *
 * Ajoute le champ annee_int (Number) sur chaque document de la collection
 * luminaires en parsant le champ annee existant.
 *
 * Règles de parsing — identiques à la fonction extractYear() des routes API
 * et au pipeline $regexFind de /api/luminaires :
 *   - Si la valeur est déjà un Number → utilisée directement
 *   - Sinon → regex /\b(1[0-9]{3}|20[0-9]{2})\b/ sur la chaîne → premier match
 *   - Fallback : annee → Année → year (même ordre que le pipeline $ifNull)
 *   - Si aucun match → annee_int: null (champ présent, valeur nulle)
 *
 * Garanties :
 *   - Ne supprime jamais le champ annee (ni aucun autre champ)
 *   - Idempotent : documents déjà à jour sont ignorés
 *   - Traitement par lots de 500 pour limiter la pression mémoire
 *
 * Usage : node scripts/migrate-annee-int.js
 */

const { MongoClient } = require("mongodb")
const fs   = require("fs")
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

// ─── Parsing d'année (logique identique aux routes) ───────────────────────────
// Regex : premier entier 4 chiffres entre 1000-1999 ou 2000-2099
const YEAR_REGEX = /\b(1[0-9]{3}|20[0-9]{2})\b/g

function extractYear(value) {
  if (value === null || value === undefined) return null
  if (typeof value === "number") {
    // Garder uniquement les entiers dans la plage attendue
    return Number.isInteger(value) && value >= 1000 && value <= 2099 ? value : null
  }
  const str = String(value).trim()
  if (!str) return null
  const matches = str.match(YEAR_REGEX)
  return matches && matches.length > 0 ? parseInt(matches[0], 10) : null
}

// Reproduit le $ifNull du pipeline : annee → Année → year
function getRawYearField(doc) {
  if (doc.annee  !== undefined && doc.annee  !== null) return doc.annee
  if (doc["Année"] !== undefined && doc["Année"] !== null) return doc["Année"]
  if (doc.year   !== undefined && doc.year   !== null) return doc.year
  return null
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const BATCH_SIZE = 500

async function main() {
  const safeUri = MONGODB_URI.replace(/:([^/@]+)@/, ":*****@")
  console.log("🔌  Connexion MongoDB…")
  console.log(`    ${safeUri}`)

  const client = new MongoClient(MONGODB_URI)

  try {
    await client.connect()
    console.log("✅  Connecté\n")

    const db  = client.db("gersaint")
    const col = db.collection("luminaires")

    const totalDocs = await col.countDocuments()
    console.log(`📦  Documents dans la collection : ${totalDocs}`)
    console.log(`⚙️   Taille des lots             : ${BATCH_SIZE}\n`)
    console.log("━".repeat(60))

    // Compteurs
    let processed  = 0   // documents parcourus
    let written    = 0   // documents mis à jour en base
    let alreadyOk  = 0   // annee_int déjà correct → ignorés
    let withYear   = 0   // annee_int parsé avec succès
    let withNull   = 0   // annee_int = null (pas de 4 chiffres trouvés)

    // Exemples collectés pour le rapport final
    const examplesOk   = []   // { raw, parsed }
    const examplesNull = []   // { raw }

    // Curseur avec projection minimale (on ne charge que les champs utiles)
    const cursor = col.find(
      {},
      { projection: { _id: 1, annee: 1, "Année": 1, year: 1, annee_int: 1 } }
    )

    let batch = []

    const flushBatch = async () => {
      if (batch.length === 0) return
      const result = await col.bulkWrite(batch, { ordered: false })
      written += result.modifiedCount
      batch = []
    }

    while (await cursor.hasNext()) {
      const doc = await cursor.next()
      processed++

      const raw    = getRawYearField(doc)
      const parsed = extractYear(raw)

      // Idempotence : skip si le champ existe déjà avec la bonne valeur
      if (doc.annee_int === parsed) {
        alreadyOk++
        continue
      }

      // Préparer l'opération bulk
      batch.push({
        updateOne: {
          filter: { _id: doc._id },
          update: { $set: { annee_int: parsed } },
          // Pas de $unset : on définit toujours le champ (null si non parsable)
        },
      })

      // Collecter des exemples pour le rapport (max 5 par catégorie)
      if (parsed !== null) {
        withYear++
        if (examplesOk.length < 5) examplesOk.push({ raw, parsed })
      } else {
        withNull++
        if (examplesNull.length < 5) examplesNull.push({ raw })
      }

      // Flush par lots
      if (batch.length >= BATCH_SIZE) {
        await flushBatch()
        const pct = Math.round((processed / totalDocs) * 100)
        process.stdout.write(`  ⏳  ${processed}/${totalDocs}  (${pct}%)  —  écrits : ${written}\r`)
      }
    }

    // Dernier lot partiel
    await flushBatch()
    process.stdout.write(" ".repeat(70) + "\r") // effacer la ligne de progression

    // ─── Rapport ───────────────────────────────────────────────────────────────

    console.log("\n════════════════════════════════════════════════════════════")
    console.log("  Résultats")
    console.log("════════════════════════════════════════════════════════════")
    console.log(`  Documents parcourus       ${processed}`)
    console.log(`  Mis à jour en base        ${written}`)
    console.log(`  Déjà à jour (ignorés)     ${alreadyOk}`)
    console.log(`  annee_int parsé           ${withYear}`)
    console.log(`  annee_int = null          ${withNull}  (aucun 4 chiffres trouvé)`)
    console.log("════════════════════════════════════════════════════════════")

    if (examplesOk.length > 0) {
      console.log("\n  Exemples parsés avec succès :")
      for (const { raw, parsed } of examplesOk) {
        const display = raw === null ? "(champ absent)" : `"${raw}"`
        console.log(`    ${display.padEnd(30)} →  ${parsed}`)
      }
    }

    if (examplesNull.length > 0) {
      console.log("\n  Exemples non parsables (annee_int = null) :")
      for (const { raw } of examplesNull) {
        const display = raw === null ? "(champ absent)" : `"${raw}"`
        console.log(`    ${display}`)
      }
    }

    console.log("\n  ℹ️   Le champ annee original n'a pas été modifié.")
    console.log("  ℹ️   Relancer le script est sans risque (idempotent).")
    console.log("════════════════════════════════════════════════════════════\n")

  } catch (err) {
    console.error("\n❌  Erreur fatale :", err.message)
    process.exit(1)
  } finally {
    await client.close()
    console.log("🔌  Connexion fermée")
  }
}

main()
