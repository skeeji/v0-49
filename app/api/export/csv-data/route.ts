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

    // Fonction utilitaire pour récupérer une valeur avec fallback
    const getValueWithFallback = (luminaire: any, fields: string[]): string => {
      for (const field of fields) {
        const value = luminaire[field]
        if (value !== undefined && value !== null && String(value).trim() !== "") {
          return Array.isArray(value) ? value.join(", ") : String(value).trim()
        }
      }
      return ""
    }

    // Mapping des champs selon les colonnes demandées
    const csvData = luminaires.map((luminaire, index) => {
      console.log(`📝 Traitement luminaire ${index + 1}/${luminaires.length}: ${luminaire.nom || "Sans nom"}`)

      // Debug EXHAUSTIF de TOUTES les propriétés disponibles
      console.log(`🔍 DOCUMENT COMPLET:`, JSON.stringify(luminaire, null, 2))

      // Gestion des images du luminaire avec fallback
      const imagesLuminaire = getValueWithFallback(luminaire, [
        "filename",
        "images",
        "image",
        "Image luminaire",
        "image_luminaire",
        "photos",
        "pictures",
      ])

      // Gestion de l'image designer avec fallback
      const imageDesigner = getValueWithFallback(luminaire, [
        "designerImageFilename",
        "designerImage",
        "Image Designer",
        "designer.jpg",
        "image_designer",
        "designer_image",
        "photo_designer",
      ])

      // AFFECTATION DIRECTE ET PRIORISÉE - SPÉCIALITÉ
      const specialite = getValueWithFallback(luminaire, [
        "Spécialité",
        "specialite",
        "periode",
        "Période",
        "specialty",
        "speciality",
        "domain",
        "domaine",
      ])

      // AFFECTATION DIRECTE ET PRIORISÉE - COLLABORATION / ŒUVRE
      const collaborationOeuvre = getValueWithFallback(luminaire, [
        "Collaboration / Œuvre",
        "collaboration",
        "oeuvre",
        "œuvre",
        "work",
        "collaboration_oeuvre",
        "projet",
        "project",
      ])

      // AFFECTATION DIRECTE ET PRIORISÉE - MATÉRIAUX
      const materiaux = getValueWithFallback(luminaire, [
        "Matériaux",
        "materiaux",
        "materials",
        "material",
        "matiere",
        "matière",
        "composition",
      ])

      // AFFECTATION DIRECTE ET PRIORISÉE - SIGNÉ
      const signe = getValueWithFallback(luminaire, [
        "Signé",
        "signe",
        "signed",
        "signature",
        "marque",
        "mark",
        "estampille",
      ])

      // AFFECTATION DIRECTE ET PRIORISÉE - NOM LUMINAIRE
      const nomLuminaire = getValueWithFallback(luminaire, [
        "nom",
        "Nom luminaire",
        "name",
        "title",
        "titre",
        "designation",
        "libelle",
      ])

      // AFFECTATION DIRECTE ET PRIORISÉE - ARTISTE / DATES
      const artisteDates = getValueWithFallback(luminaire, [
        "designer",
        "artist",
        "Artiste / Dates",
        "artiste",
        "createur",
        "créateur",
        "author",
        "auteur",
        "maker",
      ])

      // AFFECTATION DIRECTE ET PRIORISÉE - ANNÉE
      const annee = getValueWithFallback(luminaire, [
        "annee",
        "year",
        "Année",
        "date",
        "periode",
        "period",
        "epoque",
        "époque",
      ])

      // AFFECTATION DIRECTE ET PRIORISÉE - EDITEUR
      const editeur = getValueWithFallback(luminaire, [
        "editeur",
        "editor",
        "Editeur",
        "publisher",
        "fabricant",
        "manufacturer",
        "marque",
        "brand",
      ])

      // AFFECTATION DIRECTE ET PRIORISÉE - DESCRIPTION
      const description = getValueWithFallback(luminaire, [
        "description",
        "desc",
        "Description",
        "details",
        "commentaire",
        "comment",
        "notes",
        "remarques",
      ])

      // AFFECTATION DIRECTE ET PRIORISÉE - DIMENSIONS
      const dimensions = getValueWithFallback(luminaire, [
        "dimensions",
        "dimension",
        "Dimensions",
        "taille",
        "size",
        "mesures",
        "measurements",
      ])

      // AFFECTATION DIRECTE ET PRIORISÉE - ESTIMATION/PRIX
      const estimation = getValueWithFallback(luminaire, [
        "estimation",
        "prix",
        "price",
        "Estimation",
        "Prix",
        "valeur",
        "value",
        "cout",
        "coût",
        "cost",
      ])

      console.log(`🎯 RÉSULTATS FINAUX ULTRA-DÉTAILLÉS pour ${nomLuminaire}:`, {
        materiaux: materiaux || "❌ VIDE",
        collaborationOeuvre: collaborationOeuvre || "❌ VIDE",
        specialite: specialite || "❌ VIDE",
        signe: signe || "❌ VIDE",
        nomLuminaire: nomLuminaire || "❌ VIDE",
        artisteDates: artisteDates || "❌ VIDE",
      })

      return {
        // Colonnes dans l'ordre demandé avec logique de fallback robuste
        ID: luminaire._id.toString(),
        "Nom luminaire": nomLuminaire,
        "Artiste / Dates": artisteDates,
        Année: annee,
        Editeur: editeur,
        Spécialité: specialite,
        "Collaboration / Œuvre": collaborationOeuvre,
        Description: description,
        Signé: signe,
        Dimensions: dimensions,
        Matériaux: materiaux,
        Estimation: estimation,
        Prix: estimation, // Même valeur que estimation
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
