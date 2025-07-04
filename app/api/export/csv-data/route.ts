import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function GET(request: NextRequest) {
  try {
    console.log("📤 API /api/export/csv-data - Export CSV avec logique de fallback")

    const client = await clientPromise
    const db = client.db(DBNAME)
    const collection = db.collection("luminaires")

    // Récupérer toutes les données actuelles depuis MongoDB
    const luminaires = await collection.find({}).toArray()
    console.log(`📊 ${luminaires.length} luminaires récupérés pour export CSV avec fallback`)

    // Mapping des champs avec logique de fallback pour chaque champ hétérogène
    const csvData = luminaires.map((luminaire, index) => {
      console.log(`📝 Traitement luminaire ${index + 1}/${luminaires.length}: ${luminaire.nom || "Sans nom"}`)

      return {
        // Champs avec logique de fallback (valeur1 || valeur2 || "")
        "Nom luminaire": luminaire.nom || luminaire["Nom luminaire"] || "",
        "Artiste / Dates": luminaire.designer || luminaire.artist || luminaire["Artiste / Dates"] || "",
        Editeur: luminaire.editeur || luminaire.editor || luminaire["Editeur"] || "",
        Année: luminaire.annee || luminaire.year || luminaire["Année"] || "",
        Spécialité: luminaire.periode || luminaire.specialite || luminaire.specialty || luminaire["Spécialité"] || "",
        "Collaboration / Œuvre":
          luminaire.collaboration || luminaire.oeuvre || luminaire["Collaboration / Œuvre"] || "",
        Description: luminaire.description || luminaire.desc || luminaire["Description"] || "",
        Signé: luminaire.signe || luminaire.signed || luminaire["Signé"] || "",
        Dimensions: luminaire.dimensions || luminaire.dimension || luminaire["Dimensions"] || "",
        Matériaux: Array.isArray(luminaire.materiaux)
          ? luminaire.materiaux.join(", ")
          : luminaire.materiaux || luminaire.materials || luminaire["Matériaux"] || "",
        Estimation:
          luminaire.estimation ||
          luminaire.prix ||
          luminaire.price ||
          luminaire["Estimation"] ||
          luminaire["Prix (estimation)"] ||
          "",
        "Image luminaire":
          luminaire.filename || luminaire.image || luminaire["Nom du fichier"] || luminaire["Image luminaire"] || "",
        "Image Designer":
          luminaire.designerImageFilename ||
          luminaire.designerImage ||
          luminaire["Image Designer"] ||
          luminaire["designer.jpg"] ||
          luminaire.image_designer ||
          "",

        // Champs supplémentaires avec fallback
        ID: luminaire._id.toString(),
        Images: Array.isArray(luminaire.images) ? luminaire.images.join(", ") : luminaire.images || "",
        Couleurs: Array.isArray(luminaire.couleurs)
          ? luminaire.couleurs.join(", ")
          : luminaire.couleurs || luminaire.colors || "",
        Prix: luminaire.prix || luminaire.price || luminaire.estimation || "",
        Provenance: luminaire.provenance || luminaire.origin || "",
        État: luminaire.etat || luminaire.state || luminaire.condition || "",
        Référence: luminaire.reference || luminaire.ref || "",
        Notes: luminaire.notes || luminaire.note || "",
        Catégorie: luminaire.categorie || luminaire.category || "",
        Style: luminaire.style || "",
        Époque: luminaire.epoque || luminaire.period || "",
        Pays: luminaire.pays || luminaire.country || "",
        Ville: luminaire.ville || luminaire.city || "",
        Hauteur: luminaire.hauteur || luminaire.height || "",
        Largeur: luminaire.largeur || luminaire.width || "",
        Profondeur: luminaire.profondeur || luminaire.depth || "",
        Diamètre: luminaire.diametre || luminaire.diameter || "",
        Poids: luminaire.poids || luminaire.weight || "",
        "Type d'éclairage": luminaire.typeEclairage || luminaire.lightingType || "",
        "Source lumineuse": luminaire.sourceLumineuse || luminaire.lightSource || "",
        Voltage: luminaire.voltage || "",
        Puissance: luminaire.puissance || luminaire.power || "",
        Musée: luminaire.musee || luminaire.museum || "",
        Collection: luminaire.collection || "",
        Exposition: luminaire.exposition || luminaire.exhibition || "",
        Publication: luminaire.publication || "",
        Bibliographie: luminaire.bibliographie || luminaire.bibliography || "",
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

    console.log(`✅ Export CSV généré avec ${csvData.length} luminaires et ${headers.length} colonnes avec fallback`)

    // Vérification des champs critiques avec fallback
    const criticalFields = [
      "Nom luminaire",
      "Artiste / Dates",
      "Spécialité",
      "Image Designer",
      "Estimation",
      "Matériaux",
      "Dimensions",
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
        "Content-Disposition": `attachment; filename="luminaires-export-fallback-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    })
  } catch (error: any) {
    console.error("❌ Erreur export CSV avec fallback:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erreur lors de l'export CSV avec fallback",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
