import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function GET(request: NextRequest) {
  try {
    console.log("📤 API /api/export/csv-data - Export CSV avec ordre précis des colonnes")

    const client = await clientPromise
    const db = client.db(DBNAME)
    const collection = db.collection("luminaires")

    // Récupérer toutes les données actuelles depuis MongoDB
    const luminaires = await collection.find({}).toArray()
    console.log(`📊 ${luminaires.length} luminaires récupérés pour export CSV ordonné`)

    // Mapping des champs selon l'ordre précis demandé
    const csvData = luminaires.map((luminaire, index) => {
      console.log(`📝 Traitement luminaire ${index + 1}/${luminaires.length}: ${luminaire.nom || "Sans nom"}`)

      return {
        // Ordre précis selon les spécifications
        "Nom luminaire": luminaire.nom || "",
        "Artiste / Dates": luminaire.designer || "",
        Editeur: luminaire.editeur || "",
        Année: luminaire.annee || "",
        Spécialité: luminaire.periode || "",
        "Collaboration / Œuvre": luminaire.collaboration || "",
        Description: luminaire.description || "",
        Signé: luminaire.signe || "",
        Dimensions: luminaire.dimensions || "",
        Matériaux: Array.isArray(luminaire.materiaux) ? luminaire.materiaux.join(", ") : luminaire.materiaux || "",
        Estimation: luminaire.estimation || "",
        "Image luminaire": luminaire.filename || "",
        "Image designer": luminaire.designerImageFilename || "",

        // Champs supplémentaires
        ID: luminaire._id.toString(),
        Images: Array.isArray(luminaire.images) ? luminaire.images.join(", ") : luminaire.images || "",
        Couleurs: Array.isArray(luminaire.couleurs) ? luminaire.couleurs.join(", ") : luminaire.couleurs || "",
        Prix: luminaire.prix || "",
        Provenance: luminaire.provenance || "",
        État: luminaire.etat || "",
        Référence: luminaire.reference || "",
        Notes: luminaire.notes || "",
        Catégorie: luminaire.categorie || "",
        Style: luminaire.style || "",
        Époque: luminaire.epoque || "",
        Pays: luminaire.pays || "",
        Ville: luminaire.ville || "",
        Hauteur: luminaire.hauteur || "",
        Largeur: luminaire.largeur || "",
        Profondeur: luminaire.profondeur || "",
        Diamètre: luminaire.diametre || "",
        Poids: luminaire.poids || "",
        "Type d'éclairage": luminaire.typeEclairage || "",
        "Source lumineuse": luminaire.sourceLumineuse || "",
        Voltage: luminaire.voltage || "",
        Puissance: luminaire.puissance || "",
        Musée: luminaire.musee || "",
        Collection: luminaire.collection || "",
        Exposition: luminaire.exposition || "",
        Publication: luminaire.publication || "",
        Bibliographie: luminaire.bibliographie || "",
        Favori: luminaire.isFavorite ? "Oui" : "Non",
        Statut: luminaire.status || "Actif",
        Tags: Array.isArray(luminaire.tags) ? luminaire.tags.join(", ") : luminaire.tags || "",
        "Date création": luminaire.createdAt ? new Date(luminaire.createdAt).toLocaleDateString("fr-FR") : "",
        "Date modification": luminaire.updatedAt ? new Date(luminaire.updatedAt).toLocaleDateString("fr-FR") : "",
        "ID MongoDB": luminaire._id.toString(),
      }
    })

    if (csvData.length === 0) {
      return NextResponse.json({ success: false, error: "Aucune donnée à exporter" }, { status: 404 })
    }

    // Créer les en-têtes CSV dans l'ordre précis
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

    console.log(`✅ Export CSV généré avec ${csvData.length} luminaires et ${headers.length} colonnes ordonnées`)

    // Vérification des champs critiques
    const criticalFields = [
      "Nom luminaire",
      "Artiste / Dates",
      "Editeur",
      "Année",
      "Spécialité",
      "Collaboration / Œuvre",
      "Description",
      "Dimensions",
      "Matériaux",
      "Estimation",
      "Image luminaire",
      "Image designer",
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
        "Content-Disposition": `attachment; filename="luminaires-export-ordonne-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    })
  } catch (error: any) {
    console.error("❌ Erreur export CSV ordonné:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erreur lors de l'export CSV ordonné",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
