import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function GET(request: NextRequest) {
  try {
    console.log("📤 API /api/export/csv-data - Export CSV avec données ACTUELLES et COMPLÈTES")

    const client = await clientPromise
    const db = client.db(DBNAME)
    const collection = db.collection("luminaires")

    // CORRECTION 3: Nouvelle requête OBLIGATOIRE pour récupérer les données ACTUELLES
    console.log("🔄 Récupération des données ACTUELLES depuis MongoDB...")
    const luminaires = await collection.find({}).toArray()
    console.log(`📊 ${luminaires.length} luminaires récupérés avec données ACTUELLES`)

    // CORRECTION 3: Formater les données avec TOUS les champs ACTUELS
    const csvData = luminaires.map((luminaire, index) => {
      console.log(`📝 Traitement luminaire ${index + 1}/${luminaires.length}: ${luminaire.nom || "Sans nom"}`)

      return {
        // Champs principaux
        ID: luminaire._id.toString(),
        "Nom luminaire": luminaire.nom || luminaire["Nom luminaire"] || "",
        "Artiste / Dates": luminaire.designer || luminaire["Artiste / Dates"] || "",
        Année: luminaire.annee || luminaire["Année"] || "",

        // CORRECTION 3: Spécialité (champ manquant corrigé)
        Spécialité: luminaire.periode || luminaire.specialite || luminaire["Spécialité"] || "",

        // CORRECTION 3: Collaboration / Œuvre (champ manquant corrigé)
        "Collaboration / Œuvre": luminaire.collaboration || luminaire["Collaboration / Œuvre"] || "",
        Description: luminaire.description || "", // Description SÉPARÉE

        Signé: luminaire.signe || luminaire["Signé"] || "",

        // CORRECTION 3: Tous les champs étendus ACTUELS
        Editeur: luminaire.editeur || "",

        // CORRECTION 3: Dimensions (champ manquant corrigé)
        Dimensions: luminaire.dimensions || luminaire["Dimensions"] || "",

        Matériaux: Array.isArray(luminaire.materiaux)
          ? luminaire.materiaux.join(", ")
          : luminaire.materiaux || luminaire["Matériaux"] || "",

        // CORRECTION 3: Prix/Estimation (champ manquant corrigé)
        Estimation: luminaire.estimation || luminaire.prix || luminaire["Estimation"] || "",

        // Images principales
        "Nom du fichier": luminaire.filename || luminaire["Nom du fichier"] || "",
        Images: Array.isArray(luminaire.images) ? luminaire.images.join(", ") : luminaire.images || "",

        // CORRECTION 3: Image Designer (champ manquant corrigé)
        "Image Designer": luminaire.designerImageFilename || luminaire.designerImage || luminaire["designer.jpg"] || "",

        // Couleurs
        Couleurs: Array.isArray(luminaire.couleurs) ? luminaire.couleurs.join(", ") : luminaire.couleurs || "",

        // Champs supplémentaires ACTUELS
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

        // Dimensions détaillées ACTUELLES
        Hauteur: luminaire.hauteur || "",
        Largeur: luminaire.largeur || "",
        Profondeur: luminaire.profondeur || "",
        Diamètre: luminaire.diametre || "",
        Poids: luminaire.poids || "",

        // Informations techniques ACTUELLES
        "Type d'éclairage": luminaire.typeEclairage || "",
        "Source lumineuse": luminaire.sourceLumineuse || "",
        Voltage: luminaire.voltage || "",
        Puissance: luminaire.puissance || "",

        // Métadonnées ACTUELLES
        Favori: luminaire.isFavorite ? "Oui" : "Non",
        "Date création": luminaire.createdAt ? new Date(luminaire.createdAt).toLocaleDateString("fr-FR") : "",
        "Date modification": luminaire.updatedAt ? new Date(luminaire.updatedAt).toLocaleDateString("fr-FR") : "",

        // Champs techniques ACTUELS
        "ID MongoDB": luminaire._id.toString(),
        Statut: luminaire.status || "Actif",
        Tags: Array.isArray(luminaire.tags) ? luminaire.tags.join(", ") : luminaire.tags || "",

        // CORRECTION 3: Tous les autres champs ACTUELS qui pourraient exister
        ...Object.keys(luminaire).reduce(
          (acc, key) => {
            // Éviter les doublons avec les champs déjà traités
            const excludedKeys = [
              "_id",
              "nom",
              "designer",
              "annee",
              "periode",
              "specialite",
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
              "designerImage",
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
              console.log(`📋 Champ supplémentaire ajouté: ${key} = ${acc[key]}`)
            }
            return acc
          },
          {} as Record<string, string>,
        ),
      }
    })

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

    console.log(`✅ Export CSV généré avec ${csvData.length} luminaires et ${headers.length} colonnes ACTUELLES`)
    console.log(`📋 Colonnes exportées:`, headers)

    // CORRECTION 3: Vérification des champs critiques
    const criticalFields = ["Image Designer", "Spécialité", "Collaboration / Œuvre", "Dimensions", "Estimation"]
    criticalFields.forEach((field) => {
      const hasData = csvData.some((row) => row[field as keyof typeof row])
      console.log(`🔍 Champ critique "${field}": ${hasData ? "✅ Données présentes" : "⚠️ Aucune donnée"}`)
    })

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
