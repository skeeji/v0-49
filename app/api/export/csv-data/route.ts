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

      // Debug COMPLET de TOUTES les propriétés disponibles
      console.log(`🔍 TOUTES les propriétés du luminaire:`, JSON.stringify(luminaire, null, 2))

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

      // PARSING EXHAUSTIF DES MATÉRIAUX
      let materiaux = ""

      // Vérifier toutes les propriétés possibles pour les matériaux
      const allKeys = Object.keys(luminaire)
      const materiauxPossibleKeys = allKeys.filter(
        (key) =>
          key.toLowerCase().includes("materiau") ||
          key.toLowerCase().includes("material") ||
          key.toLowerCase().includes("matériau"),
      )

      console.log(`🔍 Clés possibles pour matériaux:`, materiauxPossibleKeys)

      for (const key of materiauxPossibleKeys) {
        const value = luminaire[key]
        if (value) {
          if (Array.isArray(value) && value.length > 0) {
            materiaux = value.join(", ")
            console.log(`✅ Matériaux trouvés via clé "${key}":`, materiaux)
            break
          } else if (typeof value === "string" && value.trim() !== "") {
            materiaux = value.trim()
            console.log(`✅ Matériaux trouvés via clé "${key}":`, materiaux)
            break
          }
        }
      }

      // Si pas trouvé, essayer les clés exactes
      if (!materiaux) {
        const exactKeys = ["materiaux", "Matériaux", "materials", "Materials", "MATERIAUX", "MATERIALS"]
        for (const key of exactKeys) {
          const value = luminaire[key]
          if (value) {
            if (Array.isArray(value) && value.length > 0) {
              materiaux = value.join(", ")
              console.log(`✅ Matériaux trouvés via clé exacte "${key}":`, materiaux)
              break
            } else if (typeof value === "string" && value.trim() !== "") {
              materiaux = value.trim()
              console.log(`✅ Matériaux trouvés via clé exacte "${key}":`, materiaux)
              break
            }
          }
        }
      }

      // PARSING EXHAUSTIF DE COLLABORATION / ŒUVRE
      let collaborationOeuvre = ""

      // Vérifier toutes les propriétés possibles pour collaboration
      const collaborationPossibleKeys = allKeys.filter(
        (key) =>
          key.toLowerCase().includes("collaboration") ||
          key.toLowerCase().includes("oeuvre") ||
          key.toLowerCase().includes("œuvre"),
      )

      console.log(`🔍 Clés possibles pour collaboration:`, collaborationPossibleKeys)

      for (const key of collaborationPossibleKeys) {
        const value = luminaire[key]
        if (value && typeof value === "string" && value.trim() !== "") {
          collaborationOeuvre = value.trim()
          console.log(`✅ Collaboration trouvée via clé "${key}":`, collaborationOeuvre)
          break
        }
      }

      // Si pas trouvé, essayer les clés exactes
      if (!collaborationOeuvre) {
        const exactKeys = ["collaboration", "Collaboration / Œuvre", "oeuvre", "Œuvre", "COLLABORATION", "OEUVRE"]
        for (const key of exactKeys) {
          const value = luminaire[key]
          if (value && typeof value === "string" && value.trim() !== "") {
            collaborationOeuvre = value.trim()
            console.log(`✅ Collaboration trouvée via clé exacte "${key}":`, collaborationOeuvre)
            break
          }
        }
      }

      // PARSING EXHAUSTIF DE SPÉCIALITÉ
      let specialite = ""

      // Vérifier toutes les propriétés possibles pour spécialité
      const specialitePossibleKeys = allKeys.filter(
        (key) =>
          key.toLowerCase().includes("specialite") ||
          key.toLowerCase().includes("spécialité") ||
          key.toLowerCase().includes("periode") ||
          key.toLowerCase().includes("période") ||
          key.toLowerCase().includes("specialty"),
      )

      console.log(`🔍 Clés possibles pour spécialité:`, specialitePossibleKeys)

      for (const key of specialitePossibleKeys) {
        const value = luminaire[key]
        if (value && typeof value === "string" && value.trim() !== "") {
          specialite = value.trim()
          console.log(`✅ Spécialité trouvée via clé "${key}":`, specialite)
          break
        }
      }

      // Si pas trouvé, essayer les clés exactes
      if (!specialite) {
        const exactKeys = ["periode", "specialite", "Spécialité", "specialty", "Specialty", "SPECIALITE", "PERIODE"]
        for (const key of exactKeys) {
          const value = luminaire[key]
          if (value && typeof value === "string" && value.trim() !== "") {
            specialite = value.trim()
            console.log(`✅ Spécialité trouvée via clé exacte "${key}":`, specialite)
            break
          }
        }
      }

      console.log(`🎯 RÉSULTATS FINAUX pour ${luminaire.nom}:`, {
        materiaux: materiaux || "VIDE",
        collaborationOeuvre: collaborationOeuvre || "VIDE",
        specialite: specialite || "VIDE",
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
        Signé: luminaire.signe || luminaire.signed || luminaire["Signé"] || "",
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

    // Vérification DÉTAILLÉE des champs critiques
    const criticalFields = ["Spécialité", "Collaboration / Œuvre", "Matériaux"]

    criticalFields.forEach((field) => {
      const filledEntries = csvData.filter(
        (row) => row[field as keyof typeof row] && String(row[field as keyof typeof row]).trim() !== "",
      )
      const filledCount = filledEntries.length

      console.log(`🔍 ANALYSE DÉTAILLÉE "${field}":`)
      console.log(`   - ${filledCount}/${csvData.length} entrées remplies`)

      if (filledCount > 0) {
        const examples = filledEntries.slice(0, 5).map((row) => ({
          nom: row["Nom luminaire"],
          valeur: row[field as keyof typeof row],
        }))
        console.log(`   - Exemples:`, examples)
      } else {
        console.log(`   - ⚠️ AUCUNE DONNÉE TROUVÉE pour ce champ`)
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
