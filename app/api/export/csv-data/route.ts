import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function GET(request: NextRequest) {
  try {
    console.log("📤 API /api/export/csv-data - Export CSV avec TOUTES les données")

    const client = await clientPromise
    const db = client.db(DBNAME)
    const collection = db.collection("luminaires")

    // CORRECTION 3: Récupérer TOUS les luminaires avec TOUS les champs disponibles
    const luminaires = await collection.find({}).toArray()
    console.log(`📊 ${luminaires.length} luminaires trouvés pour l'export CSV complet`)

    // CORRECTION 3: Formater les données avec ABSOLUMENT TOUS les champs pour l'export CSV
    const csvData = luminaires.map((luminaire) => ({
      // Champs principaux
      ID: luminaire._id.toString(),
      "Nom luminaire": luminaire.nom || luminaire["Nom luminaire"] || "",
      "Artiste / Dates": luminaire.designer || luminaire["Artiste / Dates"] || "",
      Année: luminaire.annee || luminaire["Année"] || "",
      Spécialité: luminaire.periode || luminaire["Spécialité"] || "",

      // CORRECTION 3: Champs COMPLÈTEMENT séparés dans l'export
      "Collaboration / Œuvre": luminaire.collaboration || luminaire["Collaboration / Œuvre"] || "",
      Description: luminaire.description || "", // Description SÉPARÉE de collaboration

      Signé: luminaire.signe || luminaire["Signé"] || "",

      // CORRECTION 3: TOUS les champs étendus dans l'export CSV
      Editeur: luminaire.editeur || "",
      Dimensions: luminaire.dimensions || luminaire["Dimensions"] || "",
      Matériaux: Array.isArray(luminaire.materiaux)
        ? luminaire.materiaux.join(", ")
        : luminaire.materiaux || luminaire["Matériaux"] || "",
      Estimation: luminaire.estimation || luminaire["Estimation"] || "",

      // Images principales
      "Nom du fichier": luminaire.filename || luminaire["Nom du fichier"] || "",
      Images: Array.isArray(luminaire.images) ? luminaire.images.join(", ") : luminaire.images || "",

      // CORRECTION 3: Image du designer dans l'export CSV
      "Image Designer": luminaire.designerImageFilename || luminaire.designerImage || "",

      // Couleurs
      Couleurs: Array.isArray(luminaire.couleurs) ? luminaire.couleurs.join(", ") : luminaire.couleurs || "",

      // CORRECTION 3: Tous les champs supplémentaires possibles
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
      Musée: luminaire.musee || "",
      Collection: luminaire.collection || "",
      Exposition: luminaire.exposition || "",
      Publication: luminaire.publication || "",
      Bibliographie: luminaire.bibliographie || "",

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

      // Métadonnées
      Favori: luminaire.isFavorite ? "Oui" : "Non",
      "Date création": luminaire.createdAt ? new Date(luminaire.createdAt).toLocaleDateString("fr-FR") : "",
      "Date modification": luminaire.updatedAt ? new Date(luminaire.updatedAt).toLocaleDateString("fr-FR") : "",

      // Champs techniques supplémentaires
      "ID MongoDB": luminaire._id.toString(),
      Statut: luminaire.status || "Actif",
      Tags: Array.isArray(luminaire.tags) ? luminaire.tags.join(", ") : luminaire.tags || "",

      // CORRECTION 3: Tous les autres champs possibles qui pourraient exister
      ...Object.keys(luminaire).reduce(
        (acc, key) => {
          // Éviter les doublons avec les champs déjà traités
          const excludedKeys = [
            "_id",
            "nom",
            "designer",
            "annee",
            "periode",
            "collaboration",
            "description",
            "signe",
            "editeur",
            "dimensions",
            "materiaux",
            "estimation",
            "filename",
            "images",
            "designerImageFilename",
            "couleurs",
            "isFavorite",
            "createdAt",
            "updatedAt",
            "status",
            "tags",
            "prix",
            "provenance",
            "etat",
            "reference",
            "notes",
            "categorie",
            "style",
            "epoque",
            "pays",
            "ville",
            "musee",
            "collection",
            "exposition",
            "publication",
            "bibliographie",
            "hauteur",
            "largeur",
            "profondeur",
            "diametre",
            "poids",
            "typeEclairage",
            "sourceLumineuse",
            "voltage",
            "puissance",
          ]

          if (!excludedKeys.includes(key) && luminaire[key] !== undefined && luminaire[key] !== null) {
            acc[key] = Array.isArray(luminaire[key]) ? luminaire[key].join(", ") : String(luminaire[key])
          }
          return acc
        },
        {} as Record<string, string>,
      ),
    }))

    // Créer le contenu CSV
    if (csvData.length === 0) {
      return NextResponse.json({ success: false, error: "Aucune donnée à exporter" }, { status: 404 })
    }

    // Créer les en-têtes CSV
    const headers = Object.keys(csvData[0])

    // Créer les lignes CSV avec échappement correct
    const csvContent = [
      headers.join(","),
      ...csvData.map((row) =>
        headers
          .map((header) => {
            const value = row[header as keyof typeof row] || ""
            // Échapper les guillemets et virgules pour CSV
            const cleanValue = String(value).replace(/"/g, '""')
            return `"${cleanValue}"`
          })
          .join(","),
      ),
    ].join("\n")

    console.log(`✅ Export CSV généré avec ${csvData.length} luminaires et ${headers.length} colonnes`)
    console.log(`📋 Colonnes exportées:`, headers)

    // Retourner le CSV avec BOM UTF-8 pour Excel
    const csvWithBOM = "\uFEFF" + csvContent

    return new NextResponse(csvWithBOM, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="luminaires-export-complet-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    })
  } catch (error: any) {
    console.error("❌ Erreur export CSV complet:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erreur lors de l'export CSV complet",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
