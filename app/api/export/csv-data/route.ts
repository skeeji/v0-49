import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function GET(request: NextRequest) {
  try {
    console.log("📤 API /api/export/csv-data - Export CSV avec colonnes spécifiques")

    const client = await clientPromise
    const db = client.db(DBNAME)
    const collection = db.collection("luminaires")

    // Récupérer toutes les données depuis MongoDB
    const luminaires = await collection.find({}).toArray()
    console.log(`📊 ${luminaires.length} luminaires récupérés pour export CSV`)

    // Mapping des champs selon les colonnes demandées
    const csvData = luminaires.map((luminaire, index) => {
      console.log(`📝 Traitement luminaire ${index + 1}/${luminaires.length}: ${luminaire.nom || "Sans nom"}`)

      // Debug EXHAUSTIF de TOUTES les propriétés disponibles
      console.log(`🔍 DOCUMENT COMPLET:`, JSON.stringify(luminaire, null, 2))

      // Gestion des images du luminaire (tableau)
      let imagesLuminaire = ""
      if (luminaire.filename) {
        imagesLuminaire = luminaire.filename
      }
      if (luminaire.images && Array.isArray(luminaire.images) && luminaire.images.length > 0) {
        if (imagesLuminaire) {
          imagesLuminaire += ", " + luminaire.images.join(", ")
        } else {
          imagesLuminaire = luminaire.images.join(", ")
        }
      }

      // Gestion de l'image designer (une seule image)
      const imageDesigner =
        luminaire.designerImageFilename ||
        luminaire.designerImage ||
        luminaire["Image Designer"] ||
        luminaire["designer.jpg"] ||
        luminaire.image_designer ||
        ""

      // PARSING ULTRA-EXHAUSTIF DES MATÉRIAUX
      let materiaux = ""

      // Rechercher dans TOUTES les clés qui contiennent "materiau" ou "material"
      const allKeys = Object.keys(luminaire)
      console.log(`🔍 TOUTES LES CLÉS:`, allKeys)

      for (const key of allKeys) {
        const lowerKey = key.toLowerCase()
        if (lowerKey.includes("materiau") || lowerKey.includes("material") || lowerKey.includes("matériau")) {
          const value = luminaire[key]
          console.log(`🔍 Clé matériaux trouvée "${key}":`, value)

          if (value) {
            if (Array.isArray(value) && value.length > 0) {
              materiaux = value.join(", ")
              console.log(`✅ Matériaux ARRAY depuis "${key}":`, materiaux)
              break
            } else if (typeof value === "string" && value.trim() !== "") {
              materiaux = value.trim()
              console.log(`✅ Matériaux STRING depuis "${key}":`, materiaux)
              break
            }
          }
        }
      }

      // PARSING ULTRA-EXHAUSTIF DE COLLABORATION / ŒUVRE
      let collaborationOeuvre = ""

      for (const key of allKeys) {
        const lowerKey = key.toLowerCase()
        if (lowerKey.includes("collaboration") || lowerKey.includes("oeuvre") || lowerKey.includes("œuvre")) {
          const value = luminaire[key]
          console.log(`🔍 Clé collaboration trouvée "${key}":`, value)

          if (value && typeof value === "string" && value.trim() !== "") {
            collaborationOeuvre = value.trim()
            console.log(`✅ Collaboration depuis "${key}":`, collaborationOeuvre)
            break
          }
        }
      }

      // PARSING ULTRA-EXHAUSTIF DE SPÉCIALITÉ
      let specialite = ""

      for (const key of allKeys) {
        const lowerKey = key.toLowerCase()
        if (
          lowerKey.includes("specialite") ||
          lowerKey.includes("spécialité") ||
          lowerKey.includes("periode") ||
          lowerKey.includes("période") ||
          lowerKey.includes("specialty")
        ) {
          const value = luminaire[key]
          console.log(`🔍 Clé spécialité trouvée "${key}":`, value)

          if (value && typeof value === "string" && value.trim() !== "") {
            specialite = value.trim()
            console.log(`✅ Spécialité depuis "${key}":`, specialite)
            break
          }
        }
      }

      // PARSING ULTRA-EXHAUSTIF DE SIGNÉ
      let signe = ""

      for (const key of allKeys) {
        const lowerKey = key.toLowerCase()
        if (lowerKey.includes("signe") || lowerKey.includes("signé") || lowerKey.includes("signed")) {
          const value = luminaire[key]
          console.log(`🔍 Clé signé trouvée "${key}":`, value)

          if (value && typeof value === "string" && value.trim() !== "") {
            signe = value.trim()
            console.log(`✅ Signé depuis "${key}":`, signe)
            break
          }
        }
      }

      console.log(`🎯 RÉSULTATS FINAUX ULTRA-DÉTAILLÉS pour ${luminaire.nom}:`, {
        materiaux: materiaux || "❌ VIDE",
        collaborationOeuvre: collaborationOeuvre || "❌ VIDE",
        specialite: specialite || "❌ VIDE",
        signe: signe || "❌ VIDE",
      })

      return {
        // Colonnes dans l'ordre demandé
        ID: luminaire._id.toString(),
        "Nom luminaire": luminaire.nom || luminaire["Nom luminaire"] || "",
        "Artiste / Dates": luminaire.designer || luminaire.artist || luminaire["Artiste / Dates"] || "",
        Année: luminaire.annee || luminaire.year || luminaire["Année"] || "",
        Editeur: luminaire.editeur || luminaire.editor || luminaire["Editeur"] || "",
        Spécialité: specialite,
        "Collaboration / Œuvre": collaborationOeuvre,
        Description: luminaire.description || luminaire.desc || luminaire["Description"] || "",
        Signé: signe,
        Dimensions: luminaire.dimensions || luminaire.dimension || luminaire["Dimensions"] || "",
        Matériaux: materiaux,
        Estimation: luminaire.estimation || luminaire.prix || luminaire.price || luminaire["Estimation"] || "",
        Prix: luminaire.estimation || luminaire.prix || luminaire.price || luminaire["Prix"] || "",
        "Image luminaire": imagesLuminaire,
        "Image designer": imageDesigner,
      }
    })

    if (csvData.length === 0) {
      return NextResponse.json({ success: false, error: "Aucune donnée à exporter" }, { status: 404 })
    }

    // Créer les en-têtes CSV dans l'ordre exact demandé
    const headers = [
      "ID",
      "Nom luminaire",
      "Artiste / Dates",
      "Année",
      "Editeur",
      "Spécialité",
      "Collaboration / Œuvre",
      "Description",
      "Signé",
      "Dimensions",
      "Matériaux",
      "Estimation",
      "Prix",
      "Image luminaire",
      "Image designer",
    ]

    // Créer le contenu CSV
    const csvContent = [
      headers.join(","),
      ...csvData.map((row) =>
        headers
          .map((header) => {
            const value = row[header as keyof typeof row] || ""
            const cleanValue = String(value).replace(/"/g, '""')
            return `"${cleanValue}"`
          })
          .join(","),
      ),
    ].join("\n")

    console.log(`✅ Export CSV généré avec ${csvData.length} luminaires et ${headers.length} colonnes`)

    // Vérification détaillée des champs critiques
    const criticalFields = [
      "Nom luminaire",
      "Artiste / Dates",
      "Matériaux",
      "Collaboration / Œuvre",
      "Spécialité",
      "Signé",
    ]

    criticalFields.forEach((field) => {
      const filledCount = csvData.filter(
        (row) => row[field as keyof typeof row] && String(row[field as keyof typeof row]).trim() !== "",
      ).length
      console.log(`🔍 Champ "${field}": ${filledCount}/${csvData.length} entrées remplies`)

      // Afficher quelques exemples de valeurs
      const examples = csvData
        .filter((row) => row[field as keyof typeof row] && String(row[field as keyof typeof row]).trim() !== "")
        .slice(0, 3)
        .map((row) => row[field as keyof typeof row])

      if (examples.length > 0) {
        console.log(`📋 Exemples pour "${field}":`, examples)
      }
    })

    // Retourner le CSV avec BOM UTF-8
    const csvWithBOM = "\uFEFF" + csvContent

    return new NextResponse(csvWithBOM, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="luminaires-export-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    })
  } catch (error: any) {
    console.error("❌ Erreur export CSV:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erreur lors de l'export CSV",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
