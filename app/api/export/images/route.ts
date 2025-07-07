import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { GridFSBucket } from "mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function GET() {
  try {
    console.log("📦 Début de l'export de TOUTES les images .jpg depuis le bucket 'uploads'...")

    const client = await clientPromise
    const db = client.db(DBNAME)

    // PHASE 1: Collecte des informations depuis la base de données avec recherche exhaustive
    console.log("📊 Phase 1: Collecte des informations depuis la collection luminaires...")
    const luminairesCollection = db.collection("luminaires")
    const allLuminaires = await luminairesCollection.find({}).toArray()
    console.log(`📋 ${allLuminaires.length} luminaires trouvés dans la base de données`)

    // Créer les listes de référence (Set pour éviter les doublons)
    const designerImages = new Set<string>()
    const luminaireImages = new Set<string>()

    // Liste EXHAUSTIVE des champs potentiels pour les images de designers
    const designerImageFields = [
      "designerImageFilename", // Formulaire standard
      "Image designer (imagedesigner)", // Import CSV format complet
      "imagedesigner", // Import CSV format court
      "Image designer", // Import CSV avec espace
      "designer_image", // Variante avec underscore
      "designerImage", // Variante camelCase
      "imageDesigner", // Variante camelCase inversée
      "designer-image", // Variante avec tiret
      "DesignerImage", // Variante PascalCase
      "IMAGEDESIGNER", // Variante majuscules
    ]

    // Parcourir tous les documents pour remplir les listes avec recherche exhaustive
    allLuminaires.forEach((luminaire, index) => {
      console.log(`🔍 Traitement document ${index + 1}/${allLuminaires.length}: ${luminaire.nom || "Sans nom"}`)

      // RECHERCHE EXHAUSTIVE POUR LES IMAGES DE DESIGNERS
      let designerImageFound = false
      for (const fieldName of designerImageFields) {
        const fieldValue = luminaire[fieldName]
        if (fieldValue && typeof fieldValue === "string") {
          const cleanFilename = fieldValue.trim()
          if (cleanFilename !== "" && cleanFilename.toLowerCase().endsWith(".jpg")) {
            designerImages.add(cleanFilename)
            console.log(`  👤 Designer image trouvée via "${fieldName}": ${cleanFilename}`)
            designerImageFound = true
            break // Arrêter la recherche dès qu'on trouve une valeur valide
          }
        }
      }

      // Recherche supplémentaire dans TOUS les champs du document pour les images de designers
      if (!designerImageFound) {
        Object.keys(luminaire).forEach((key) => {
          const value = luminaire[key]
          if (typeof value === "string" && value.trim() !== "") {
            const cleanValue = value.trim()
            // Si le nom du champ contient "designer" ou "artiste" et que la valeur ressemble à un nom de fichier
            if (
              (key.toLowerCase().includes("designer") ||
                key.toLowerCase().includes("artiste") ||
                key.toLowerCase().includes("image")) &&
              cleanValue.toLowerCase().endsWith(".jpg")
            ) {
              designerImages.add(cleanValue)
              console.log(`  👤 Designer image trouvée via recherche étendue "${key}": ${cleanValue}`)
              designerImageFound = true
            }
          }
        })
      }

      if (!designerImageFound) {
        console.log(`  ⚠️ Aucune image de designer trouvée pour "${luminaire.nom || "luminaire sans nom"}"`)
      }

      // Image principale du luminaire
      if (luminaire.filename && typeof luminaire.filename === "string") {
        const cleanFilename = luminaire.filename.trim()
        if (cleanFilename !== "" && cleanFilename.toLowerCase().endsWith(".jpg")) {
          luminaireImages.add(cleanFilename)
          console.log(`  💡 Image principale: ${cleanFilename}`)
        }
      }

      // Champ "Nom du fichier" pour les imports CSV
      if (luminaire["Nom du fichier"] && typeof luminaire["Nom du fichier"] === "string") {
        const cleanFilename = luminaire["Nom du fichier"].trim()
        if (cleanFilename !== "" && cleanFilename.toLowerCase().endsWith(".jpg")) {
          luminaireImages.add(cleanFilename)
          console.log(`  💡 Image CSV "Nom du fichier": ${cleanFilename}`)
        }
      }

      // Images secondaires du luminaire
      if (Array.isArray(luminaire.images)) {
        luminaire.images.forEach((img: string) => {
          if (img && typeof img === "string") {
            const cleanFilename = img.trim()
            if (cleanFilename !== "" && cleanFilename.toLowerCase().endsWith(".jpg")) {
              luminaireImages.add(cleanFilename)
              console.log(`  🖼️ Image secondaire: ${cleanFilename}`)
            }
          }
        })
      }
    })

    console.log(`📊 Listes de référence créées:`)
    console.log(`  👤 ${designerImages.size} images de designers identifiées`)
    console.log(`  💡 ${luminaireImages.size} images de luminaires identifiées`)

    // Debug: Afficher TOUTES les images de designers identifiées
    if (designerImages.size > 0) {
      console.log("📋 TOUTES les images de designers identifiées:")
      Array.from(designerImages).forEach((img, i) => {
        console.log(`  ${i + 1}. ${img}`)
      })
    } else {
      console.log("⚠️ AUCUNE image de designer identifiée - tous les fichiers iront dans luminaires/")
    }

    // PHASE 2: Traitement et tri des fichiers depuis GridFS avec métadonnées
    console.log("📁 Phase 2: Traitement des fichiers depuis GridFS...")
    const bucket = new GridFSBucket(db, { bucketName: "uploads" })

    // Récupérer TOUS les fichiers .jpg du bucket
    const allFiles = await bucket.find({}).toArray()
    const jpgFiles = allFiles.filter((file) => {
      const filename = file.filename || ""
      return filename.toLowerCase().endsWith(".jpg")
    })

    console.log(`📂 ${jpgFiles.length} fichiers .jpg trouvés dans le bucket "uploads"`)

    if (jpgFiles.length === 0) {
      console.log("❌ Aucun fichier .jpg trouvé dans le bucket uploads")
      return NextResponse.json({ error: "Aucune image .jpg trouvée dans le bucket uploads" }, { status: 404 })
    }

    // Traiter chaque fichier avec la logique de tri améliorée
    const fileData: Array<{ name: string; data: Buffer; crc32: number }> = []
    let designersCount = 0
    let luminairesCount = 0

    for (const file of jpgFiles) {
      try {
        console.log(`📁 Traitement du fichier: ${file.filename} (${file.length} bytes)`)

        const downloadStream = bucket.openDownloadStream(file._id)
        const chunks: Buffer[] = []

        for await (const chunk of downloadStream) {
          chunks.push(chunk)
        }

        const buffer = Buffer.concat(chunks)

        if (buffer.length === 0) {
          console.log(`⚠️ Fichier vide ignoré: ${file.filename}`)
          continue
        }

        const originalFilename = file.filename || `image_${file._id}.jpg`
        const cleanOriginalFilename = originalFilename.trim()

        // RÈGLE DE TRI AMÉLIORÉE avec métadonnées
        let zipFilename: string

        // 1. Vérifier d'abord les métadonnées du fichier
        const metadata = file.metadata || {}
        if (metadata.isDesignerImage === true) {
          zipFilename = `designers/${cleanOriginalFilename}`
          designersCount++
          console.log(`👤 ${cleanOriginalFilename} → designers/ (métadonnées: isDesignerImage=true)`)
        }
        // 2. Ensuite vérifier la liste de référence
        else if (designerImages.has(cleanOriginalFilename)) {
          zipFilename = `designers/${cleanOriginalFilename}`
          designersCount++
          console.log(`👤 ${cleanOriginalFilename} → designers/ (trouvé dans la liste de référence)`)
        }
        // 3. Sinon, dossier luminaires
        else {
          zipFilename = `luminaires/${cleanOriginalFilename}`
          luminairesCount++
          console.log(`💡 ${cleanOriginalFilename} → luminaires/ (défaut)`)
        }

        const crc32 = calculateCRC32(buffer)

        fileData.push({
          name: zipFilename,
          data: buffer,
          crc32: crc32,
        })

        console.log(`✅ Fichier ajouté: ${zipFilename} (${buffer.length} bytes)`)
      } catch (fileError) {
        console.error(`❌ Erreur avec le fichier ${file.filename}:`, fileError)
      }
    }

    if (fileData.length === 0) {
      return NextResponse.json({ error: "Aucun fichier .jpg valide trouvé" }, { status: 404 })
    }

    console.log(`📊 Résumé du tri final:`)
    console.log(`  👤 ${designersCount} fichiers dans designers/`)
    console.log(`  💡 ${luminairesCount} fichiers dans luminaires/`)
    console.log(`  📁 ${fileData.length} fichiers au total dans le ZIP`)

    // Vérifications de cohérence détaillées
    if (designersCount === 0 && designerImages.size > 0) {
      console.log(
        `⚠️ ATTENTION: ${designerImages.size} images de designers identifiées mais 0 fichier dans le dossier designers/`,
      )
      console.log("🔍 Images de designers attendues mais non trouvées dans GridFS:")
      Array.from(designerImages).forEach((img) => {
        console.log(`  - ${img}`)
      })
    }

    if (designersCount > 0) {
      console.log(`✅ SUCCÈS: ${designersCount} images correctement classées dans designers/`)
    }

    // Créer le ZIP
    const zipBuffer = createZipBuffer(fileData)

    // Générer le nom du fichier avec la date actuelle
    const today = new Date().toISOString().split("T")[0]
    const filename = `toutes_images_jpg_${today}.zip`

    console.log(
      `✅ ZIP créé: ${zipBuffer.length} bytes avec ${fileData.length} images (dossiers: designers/ + luminaires/)`,
    )

    return new NextResponse(zipBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": zipBuffer.length.toString(),
        "Cache-Control": "no-cache",
      },
    })
  } catch (error) {
    console.error("❌ Erreur lors de l'export des images:", error)
    return NextResponse.json(
      {
        error: "Erreur lors de l'export des images",
        details: error instanceof Error ? error.message : "Erreur inconnue",
      },
      { status: 500 },
    )
  }
}

function createZipBuffer(fileData: Array<{ name: string; data: Buffer; crc32: number }>): Buffer {
  const zipEntries: Buffer[] = []
  const centralDirectory: Buffer[] = []
  let offset = 0

  fileData.forEach(({ name, data, crc32 }) => {
    // Local file header
    const nameBuffer = Buffer.from(name, "utf8")
    const localHeader = Buffer.alloc(30 + nameBuffer.length)

    localHeader.writeUInt32LE(0x04034b50, 0) // Local file header signature
    localHeader.writeUInt16LE(20, 4) // Version needed to extract
    localHeader.writeUInt16LE(0, 6) // General purpose bit flag
    localHeader.writeUInt16LE(0, 8) // Compression method (stored)

    // Date et heure actuelles en format DOS
    const now = new Date()
    const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1)
    const dosDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate()

    localHeader.writeUInt16LE(dosTime, 10) // Last mod file time
    localHeader.writeUInt16LE(dosDate, 12) // Last mod file date
    localHeader.writeUInt32LE(crc32, 14) // CRC-32
    localHeader.writeUInt32LE(data.length, 18) // Compressed size
    localHeader.writeUInt32LE(data.length, 22) // Uncompressed size
    localHeader.writeUInt16LE(nameBuffer.length, 26) // File name length
    localHeader.writeUInt16LE(0, 28) // Extra field length
    nameBuffer.copy(localHeader, 30)

    zipEntries.push(localHeader)
    zipEntries.push(data)

    // Central directory entry
    const centralEntry = Buffer.alloc(46 + nameBuffer.length)
    centralEntry.writeUInt32LE(0x02014b50, 0) // Central file header signature
    centralEntry.writeUInt16LE(20, 4) // Version made by
    centralEntry.writeUInt16LE(20, 6) // Version needed to extract
    centralEntry.writeUInt16LE(0, 8) // General purpose bit flag
    centralEntry.writeUInt16LE(0, 10) // Compression method
    centralEntry.writeUInt16LE(dosTime, 12) // Last mod file time
    centralEntry.writeUInt16LE(dosDate, 14) // Last mod file date
    centralEntry.writeUInt32LE(crc32, 16) // CRC-32
    centralEntry.writeUInt32LE(data.length, 20) // Compressed size
    centralEntry.writeUInt32LE(data.length, 24) // Uncompressed size
    centralEntry.writeUInt16LE(nameBuffer.length, 28) // File name length
    centralEntry.writeUInt16LE(0, 30) // Extra field length
    centralEntry.writeUInt16LE(0, 32) // File comment length
    centralEntry.writeUInt16LE(0, 34) // Disk number start
    centralEntry.writeUInt16LE(0, 36) // Internal file attributes
    centralEntry.writeUInt32LE(0, 38) // External file attributes
    centralEntry.writeUInt32LE(offset, 42) // Relative offset of local header
    nameBuffer.copy(centralEntry, 46)

    centralDirectory.push(centralEntry)
    offset += localHeader.length + data.length
  })

  // End of central directory record
  const centralDirSize = centralDirectory.reduce((sum, entry) => sum + entry.length, 0)
  const endOfCentralDir = Buffer.alloc(22)
  endOfCentralDir.writeUInt32LE(0x06054b50, 0) // End of central dir signature
  endOfCentralDir.writeUInt16LE(0, 4) // Number of this disk
  endOfCentralDir.writeUInt16LE(0, 6) // Number of the disk with the start of the central directory
  endOfCentralDir.writeUInt16LE(fileData.length, 8) // Total number of entries in the central directory on this disk
  endOfCentralDir.writeUInt16LE(fileData.length, 10) // Total number of entries in the central directory
  endOfCentralDir.writeUInt32LE(centralDirSize, 12) // Size of the central directory
  endOfCentralDir.writeUInt32LE(offset, 16) // Offset of start of central directory
  endOfCentralDir.writeUInt16LE(0, 20) // ZIP file comment length

  return Buffer.concat([...zipEntries, ...centralDirectory, endOfCentralDir])
}

// Fonction pour calculer le CRC32
function calculateCRC32(buffer: Buffer): number {
  const crcTable: number[] = []
  for (let i = 0; i < 256; i++) {
    let crc = i
    for (let j = 0; j < 8; j++) {
      crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1
    }
    crcTable[i] = crc
  }

  let crc = 0xffffffff
  for (let i = 0; i < buffer.length; i++) {
    crc = crcTable[(crc ^ buffer[i]) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}
