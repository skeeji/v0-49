import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function GET(request: NextRequest) {
  try {
    console.log("📤 API /api/export/csv-data - Export CSV COMPLET avec TOUTES les informations")

    const client = await clientPromise
    const db = client.db(DBNAME)
    const collection = db.collection("luminaires")

    // CORRECTION: Récupérer TOUTES les données actuelles depuis MongoDB
    const luminaires = await collection.find({}).toArray()
    console.log(`📊 ${luminaires.length} luminaires récupérés pour export CSV complet`)

    // CORRECTION: Formater TOUTES les données par luminaire
    const csvData = luminaires.map((luminaire, index) => {
      console.log(`📝 Traitement luminaire ${index + 1}/${luminaires.length}: ${luminaire.nom || "Sans nom"}`)

      return {
        // Identifiants
        ID: luminaire._id.toString(),
        "ID MongoDB": luminaire._id.toString(),

        // CORRECTION: Informations principales complètes
        "Nom luminaire": luminaire.nom || luminaire["Nom luminaire"] || "",
        "Artiste / Dates": luminaire.designer || luminaire["Artiste / Dates"] || "",
        Année: luminaire.annee || luminaire["Année"] || "",

        // CORRECTION: Spécialité
        Spécialité: luminaire.periode || luminaire.specialite || luminaire["Spécialité"] || "",

        // CORRECTION: Description (séparée de collaboration)
        Description: luminaire.description || "",
        "Collaboration / Œuvre": luminaire.collaboration || luminaire["Collaboration / Œuvre"] || "",

        Signé: luminaire.signe || luminaire["Signé"] || "",

        // CORRECTION: Matériaux
        Matériaux: Array.isArray(luminaire.materiaux)
          ? luminaire.materiaux.join(", ")
          : luminaire.materiaux || luminaire["Matériaux"] || "",

        // CORRECTION: Estimation/Prix
        Estimation:
          luminaire.estimation || luminaire.prix || luminaire["Estimation"] || luminaire["Prix (estimation)"] || "",
        Prix: luminaire.prix || luminaire.estimation || "",

        // CORRECTION: Images complètes
        "Nom du fichier": luminaire.filename || luminaire["Nom du fichier"] || "",
        Images: Array.isArray(luminaire.images) ? luminaire.images.join(", ") : luminaire.images || "",

        // CORRECTION: Image Designer (tous les champs possibles)
        "Image Designer":
          luminaire.designerImageFilename ||
          luminaire.designerImage ||
          luminaire["designer.jpg"] ||
          luminaire["Image Designer"] ||
          luminaire.designer_image ||
          luminaire.imageDesigner ||
          "",

        // Informations détaillées
        Editeur: luminaire.editeur || "",
        Dimensions: luminaire.dimensions || luminaire["Dimensions"] || "",
        Couleurs: Array.isArray(luminaire.couleurs) ? luminaire.couleurs.join(", ") : luminaire.couleurs || "",

        // Informations supplémentaires
        Provenance: luminaire.provenance || "",
        État: luminaire.etat || "",
        Référence: luminaire.reference || "",
        Notes: luminaire.notes || "",
        Catégorie: luminaire.categorie || "",
        Style: luminaire.style || "",
        Époque: luminaire.epoque || "",
        Pays: luminaire.pays || "",
        Ville: luminaire.ville || "",

        // Dimensions détaillées
        Hauteur: luminaire.hauteur || "",
        Largeur: luminaire.largeur || "",
        Profondeur: luminaire.profondeur || "",
        Diamètre: luminaire.diametre || "",
        Poids: luminaire.poids || "",

        // Informations techniques
        "Type d'éclairage": luminaire.typeEclairage || "",
        "Source lumineuse": luminaire.sourceLumineuse || "",
        Voltage: luminaire.voltage || "",
        Puissance: luminaire.puissance || "",

        // Informations culturelles
        Musée: luminaire.musee || "",
        Collection: luminaire.collection || "",
        Exposition: luminaire.exposition || "",
        Publication: luminaire.publication || "",
        Bibliographie: luminaire.bibliographie || "",

        // Métadonnées
        Favori: luminaire.isFavorite ? "Oui" : "Non",
        Statut: luminaire.status || "Actif",
        Tags: Array.isArray(luminaire.tags) ? luminaire.tags.join(", ") : luminaire.tags || "",

        // Dates
        "Date création": luminaire.createdAt ? new Date(luminaire.createdAt).toLocaleDateString("fr-FR") : "",
        "Date modification": luminaire.updatedAt ? new Date(luminaire.updatedAt).toLocaleDateString("fr-FR") : "",

        // CORRECTION: Tous les autres champs dynamiques
        ...Object.keys(luminaire).reduce(
          (acc, key) => {
            const excludedKeys = [
              "_id",
              "nom",
              "designer",
              "annee",
              "periode",
              "specialite",
              "description",
              "collaboration",
              "signe",
              "materiaux",
              "estimation",
              "prix",
              "filename",
              "images",
              "designerImageFilename",
              "designerImage",
              "couleurs",
              "editeur",
              "dimensions",
              "provenance",
              "etat",
              "reference",
              "notes",
              "categorie",
              "style",
              "epoque",
              "pays",
              "ville",
              "hauteur",
              "largeur",
              "profondeur",
              "diametre",
              "poids",
              "typeEclairage",
              "sourceLumineuse",
              "voltage",
              "puissance",
              "musee",
              "collection",
              "exposition",
              "publication",
              "bibliographie",
              "isFavorite",
              "status",
              "tags",
              "createdAt",
              "updatedAt",
              "Nom luminaire",
              "Artiste / Dates",
              "Année",
              "Spécialité",
              "Collaboration / Œuvre",
              "Signé",
              "Matériaux",
              "Estimation",
              "Nom du fichier",
              "Image Designer",
              "Dimensions",
              "designer.jpg",
              "Prix (estimation)",
            ]

            if (!excludedKeys.includes(key) && luminaire[key] !== undefined && luminaire[key] !== null) {
              const value = Array.isArray(luminaire[key]) ? luminaire[key].join(", ") : String(luminaire[key])
              if (value.trim() !== "") {
                acc[key] = value
                console.log(`📋 Champ supplémentaire: ${key} = ${value}`)
              }
            }
            return acc
          },
          {} as Record<string, string>,
        ),
      }
    })

    if (csvData.length === 0) {
      return NextResponse.json({ success: false, error: "Aucune donnée à exporter" }, { status: 404 })
    }

    // Créer les en-têtes CSV
    const headers = Object.keys(csvData[0])

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
    console.log(
      `📋 Colonnes principales: Artiste/Dates, Spécialité, Description, Matériaux, Estimation, Image Designer, Nom du fichier`,
    )

    // Vérification des champs critiques
    const criticalFields = [
      "Artiste / Dates",
      "Spécialité",
      "Description",
      "Matériaux",
      "Estimation",
      "Image Designer",
      "Nom du fichier",
    ]
    criticalFields.forEach((field) => {
      const hasData = csvData.some((row) => row[field as keyof typeof row] && row[field as keyof typeof row] !== "")
      console.log(`🔍 Champ "${field}": ${hasData ? "✅ Données présentes" : "⚠️ Aucune donnée"}`)
    })

    // Retourner le CSV avec BOM UTF-8
    const csvWithBOM = "\uFEFF" + csvContent

    return new NextResponse(csvWithBOM, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="luminaires-export-complet-${new Date().toISOString().split("T")[0]}.csv"`,
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
