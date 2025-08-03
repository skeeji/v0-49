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

    // CORRECTION DÉFINITIVE : MAPPING EXACT DES CHAMPS DE MODIFICATION
    const csvData = luminaires.map((luminaire, index) => {
      // Debug détaillé pour identifier le problème
      if (index < 5) {
        console.log(`🔍 Luminaire ${index + 1} - DEBUG COMPLET:`, {
          _id: luminaire._id,
          nom: luminaire.nom,
          "Nom luminaire": luminaire["Nom luminaire"],
          // TOUS LES CHAMPS POSSIBLES POUR SPÉCIALITÉ
          periode: luminaire.periode,
          specialty: luminaire.specialty,
          specialite: luminaire.specialite,
          Spécialité: luminaire["Spécialité"],
          // TOUS LES CHAMPS POSSIBLES POUR COLLABORATION
          collaboration: luminaire.collaboration,
          "Collaboration / Œuvre": luminaire["Collaboration / Œuvre"],
          // DIMENSIONS POUR COMPARAISON
          dimensions: luminaire.dimensions,
          Dimensions: luminaire["Dimensions"],
        })
      }

      // Champs simples avec fallback
      const nom = luminaire.nom || luminaire["Nom luminaire"] || ""
      const designer = luminaire.designer || luminaire["Artiste / Dates"] || ""
      const annee = luminaire.annee || luminaire["Année"] || ""
      const editeur = luminaire.editeur || ""
      const description = luminaire.description || ""
      const signe = luminaire.signe || luminaire["Signé"] || ""
      const dimensions = luminaire.dimensions || luminaire["Dimensions"] || ""
      const estimation = luminaire.estimation || luminaire.Prix || ""

      // SPÉCIALITÉ - RECHERCHE EXHAUSTIVE DANS TOUS LES CHAMPS POSSIBLES
      let specialite = ""

      // Test de tous les champs possibles pour spécialité
      const specialiteFields = [
        luminaire.periode, // Champ utilisé par handleUpdate("specialty", v) -> "periode"
        luminaire.specialty, // Champ direct
        luminaire.specialite, // Variante
        luminaire["Spécialité"], // Champ original CSV
      ]

      for (const field of specialiteFields) {
        if (field && String(field).trim() !== "") {
          specialite = String(field).trim()
          if (index < 5) console.log(`✅ SPÉCIALITÉ TROUVÉE: "${specialite}" dans champ:`, field)
          break
        }
      }

      // COLLABORATION - RECHERCHE EXHAUSTIVE DANS TOUS LES CHAMPS POSSIBLES
      let collaboration = ""

      // Test de tous les champs possibles pour collaboration
      const collaborationFields = [
        luminaire.collaboration, // Champ utilisé par handleUpdate("collaboration", v) -> "collaboration"
        luminaire["Collaboration / Œuvre"], // Champ original CSV
      ]

      for (const field of collaborationFields) {
        if (field && String(field).trim() !== "") {
          collaboration = String(field).trim()
          if (index < 5) console.log(`✅ COLLABORATION TROUVÉE: "${collaboration}" dans champ:`, field)
          break
        }
      }

      // MATÉRIAUX - CORRECTION: Priorité aux champs modifiés
      let materiaux = ""

      // Test de tous les champs possibles pour matériaux avec priorité aux modifications
      const materiauxFields = [
        luminaire.materiaux, // Champ modifié (priorité)
        luminaire["Matériaux"], // Champ original CSV
      ]

      for (const field of materiauxFields) {
        if (field) {
          if (Array.isArray(field) && field.length > 0) {
            materiaux = field.join(", ")
            if (index < 5) console.log(`✅ MATÉRIAUX TROUVÉS (array): "${materiaux}"`)
            break
          } else if (typeof field === "string" && field.trim() !== "") {
            materiaux = field.trim()
            if (index < 5) console.log(`✅ MATÉRIAUX TROUVÉS (string): "${materiaux}"`)
            break
          }
        }
      }

      // Images
      let images = ""
      if (Array.isArray(luminaire.images)) {
        images = luminaire.images.join(", ")
      } else if (luminaire.filename) {
        images = luminaire.filename
      }

      const result = {
        ID: luminaire._id.toString(),
        "Nom luminaire": nom,
        "Artiste / Dates": designer,
        Année: annee,
        Editeur: editeur,
        Spécialité: specialite,
        "Collaboration / Œuvre": collaboration,
        Description: description,
        Signé: signe,
        Dimensions: dimensions,
        Matériaux: materiaux,
        Estimation: estimation,
        Prix: estimation,
        "Image luminaire": images,
        "Image designer": luminaire.designerImageFilename || "",
      }

      // Debug final pour vérifier les valeurs assignées
      if (index < 5) {
        console.log(`📋 RÉSULTAT FINAL CSV Ligne ${index + 1}:`, {
          nom: result["Nom luminaire"],
          dimensions: result["Dimensions"],
          specialite: result["Spécialité"],
          collaboration: result["Collaboration / Œuvre"],
        })
      }

      return result
    })

    if (csvData.length === 0) {
      return NextResponse.json({ success: false, error: "Aucune donnée à exporter" }, { status: 404 })
    }

    // Vérification finale avec exemples
    console.log("🔍 VÉRIFICATION FINALE AVEC EXEMPLES:")
    const specialiteCount = csvData.filter((row) => row["Spécialité"] && row["Spécialité"].trim() !== "").length
    const collaborationCount = csvData.filter(
      (row) => row["Collaboration / Œuvre"] && row["Collaboration / Œuvre"].trim() !== "",
    ).length

    console.log(`📊 Spécialité remplie: ${specialiteCount}/${csvData.length} luminaires`)
    console.log(`📊 Collaboration / Œuvre remplie: ${collaborationCount}/${csvData.length} luminaires`)

    // Afficher quelques exemples de valeurs
    console.log("📋 EXEMPLES DE VALEURS DANS LE CSV:")
    csvData.slice(0, 5).forEach((row, idx) => {
      console.log(`Exemple ${idx + 1}:`, {
        nom: row["Nom luminaire"],
        dimensions: row["Dimensions"],
        specialite: row["Spécialité"],
        collaboration: row["Collaboration / Œuvre"],
      })
    })

    // Créer les en-têtes CSV
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

    console.log(`✅ Export terminé: ${csvData.length} luminaires exportés`)

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
