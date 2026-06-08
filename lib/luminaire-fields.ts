/**
 * Normalise un document luminaire brut (issu de MongoDB/CSV) vers des champs stables.
 * Les données historiques ont des noms de champs issus du CSV d'import :
 *   "Nom luminaire", "Artiste / Dates", "Année", "Image luminaire (Nom du fichier)"...
 * Ce helper centralise toute la logique de fallback.
 */

export interface NormalizedLuminaire {
  id: string
  nom: string
  artiste: string
  annee: string
  description: string
  categorie: string
  style: string
  materiaux: string
  dimensions: string
  puissance: string
  estimation: string
  filename: string
  imageUrl: string
}

export function normalizeLuminaire(doc: any): NormalizedLuminaire {
  const id = doc._id?.toString() ?? ""

  const nom = doc.nom || doc["Nom luminaire"] || doc.name || ""
  const artiste = doc["Artiste / Dates"] || doc.artiste || doc.designer || doc.artist || ""
  const annee = String(doc.annee || doc["Année"] || doc.year || "")
  const description = doc.description || doc["Description"] || doc.desc || ""
  const categorie = doc.categorie || doc["Catégorie"] || doc.category || ""
  const style = doc.style || doc["Style"] || ""
  const materiaux = Array.isArray(doc.materiaux)
    ? doc.materiaux.join(", ")
    : doc.materiaux || doc["Matériaux"] || doc.materials || ""
  const dimensions = doc.dimensions || doc["Dimensions"] || doc.dim || ""
  const puissance = doc.puissance || doc["Puissance"] || ""
  const estimation = doc.estimation || doc["Estimation"] || doc.prixHT || doc.price || ""
  const filename =
    doc.filename ||
    doc["Nom du fichier"] ||
    doc["Image luminaire (Nom du fichier)"] ||
    doc.image_principale ||
    ""
  const imageUrl = filename ? `/api/images/filename/${filename}` : "/placeholder.svg"

  return { id, nom, artiste, annee, description, categorie, style, materiaux, dimensions, puissance, estimation, filename, imageUrl }
}

/** Extrait uniquement les champs d'identification/affichage (pour les listes et cartes). */
export function normalizeLuminaireSummary(doc: any) {
  const { id, nom, artiste, annee, estimation, filename, imageUrl } = normalizeLuminaire(doc)
  return { id, nom, artiste, annee, estimation, filename, imageUrl }
}
