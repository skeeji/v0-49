import { type NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"

export async function GET(request: NextRequest) {
  try {
    const { db } = await connectToDatabase()

    // Récupérer tous les luminaires
    const luminaires = await db.collection("luminaires").find({}).toArray()

    if (!luminaires || luminaires.length === 0) {
      return NextResponse.json({ error: "Aucun luminaire trouvé" }, { status: 404 })
    }

    // Définir les en-têtes du CSV
    const headers = [
      "ID",
      "Nom",
      "Designer",
      "Spécialité",
      "Collaboration / Œuvre",
      "Matériaux",
      "Année",
      "Description",
      "Prix",
      "Dimensions",
      "Poids",
      "Source lumineuse",
      "Puissance",
      "Tension",
      "Classe",
      "Indice de protection",
      "Température de couleur",
      "Flux lumineux",
      "Angle",
      "CRI",
      "Durée de vie",
      "Garantie",
      "Certification",
      "Disponibilité",
      "Stock",
      "Couleur",
      "Finition",
      "Style",
      "Usage",
      "Installation",
      "Entretien",
      "Accessoires",
      "Options",
      "Variateur",
      "Télécommande",
      "Capteur",
      "Programmable",
      "Connecté",
      "Application",
      "Protocole",
      "Compatibilité",
      "Mise à jour",
      "Support technique",
      "Formation",
      "Documentation",
      "Vidéo",
      "Image principale",
      "Images supplémentaires",
      "Fichiers 3D",
      "Fichiers CAD",
      "Fichiers IES",
      "Fichiers PDF",
      "Liens externes",
      "Tags",
      "Catégorie",
      "Sous-catégorie",
      "Collection",
      "Série",
      "Référence",
      "Code-barres",
      "SKU",
      "UPC",
      "EAN",
      "Fournisseur",
      "Distributeur",
      "Revendeur",
      "Contact commercial",
      "Contact technique",
      "Site web",
      "Réseaux sociaux",
      "Presse",
      "Awards",
      "Certifications environnementales",
      "Recyclabilité",
      "Empreinte carbone",
      "Origine",
      "Fabrication",
      "Assemblage",
      "Conditionnement",
      "Transport",
      "Livraison",
      "Retour",
      "SAV",
      "Pièces détachées",
      "Réparation",
      "Recyclage",
      "Fin de vie",
    ]

    // Convertir les luminaires en format CSV
    const csvData = luminaires.map((luminaire) => {
      // Affectation directe et priorisée pour les colonnes problématiques
      const specialite = luminaire.Spécialité || luminaire.specialite || luminaire.periode || ""
      const collaborationOeuvre =
        luminaire["Collaboration / Œuvre"] || luminaire.collaboration || luminaire.oeuvre || ""
      const rawMateriaux = luminaire.Matériaux || luminaire.materiaux || luminaire.materials || []
      const materiaux = Array.isArray(rawMateriaux) ? rawMateriaux.join(", ") : String(rawMateriaux)

      return {
        ID: luminaire._id?.toString() || "",
        Nom: luminaire.nom || luminaire.name || "",
        Designer: luminaire.designer || "",
        Spécialité: specialite,
        "Collaboration / Œuvre": collaborationOeuvre,
        Matériaux: materiaux,
        Année: luminaire.annee || luminaire.year || "",
        Description: luminaire.description || "",
        Prix: luminaire.prix || luminaire.price || "",
        Dimensions: luminaire.dimensions || "",
        Poids: luminaire.poids || luminaire.weight || "",
        "Source lumineuse": luminaire["Source lumineuse"] || luminaire.source_lumineuse || "",
        Puissance: luminaire.puissance || luminaire.power || "",
        Tension: luminaire.tension || luminaire.voltage || "",
        Classe: luminaire.classe || luminaire.class || "",
        "Indice de protection": luminaire["Indice de protection"] || luminaire.indice_protection || "",
        "Température de couleur": luminaire["Température de couleur"] || luminaire.temperature_couleur || "",
        "Flux lumineux": luminaire["Flux lumineux"] || luminaire.flux_lumineux || "",
        Angle: luminaire.angle || "",
        CRI: luminaire.CRI || luminaire.cri || "",
        "Durée de vie": luminaire["Durée de vie"] || luminaire.duree_vie || "",
        Garantie: luminaire.garantie || luminaire.warranty || "",
        Certification: luminaire.certification || "",
        Disponibilité: luminaire.disponibilite || luminaire.availability || "",
        Stock: luminaire.stock || "",
        Couleur: luminaire.couleur || luminaire.color || "",
        Finition: luminaire.finition || luminaire.finish || "",
        Style: luminaire.style || "",
        Usage: luminaire.usage || "",
        Installation: luminaire.installation || "",
        Entretien: luminaire.entretien || luminaire.maintenance || "",
        Accessoires: luminaire.accessoires || luminaire.accessories || "",
        Options: luminaire.options || "",
        Variateur: luminaire.variateur || luminaire.dimmer || "",
        Télécommande: luminaire.telecommande || luminaire.remote || "",
        Capteur: luminaire.capteur || luminaire.sensor || "",
        Programmable: luminaire.programmable || "",
        Connecté: luminaire.connecte || luminaire.connected || "",
        Application: luminaire.application || luminaire.app || "",
        Protocole: luminaire.protocole || luminaire.protocol || "",
        Compatibilité: luminaire.compatibilite || luminaire.compatibility || "",
        "Mise à jour": luminaire["Mise à jour"] || luminaire.mise_a_jour || "",
        "Support technique": luminaire["Support technique"] || luminaire.support_technique || "",
        Formation: luminaire.formation || luminaire.training || "",
        Documentation: luminaire.documentation || "",
        Vidéo: luminaire.video || "",
        "Image principale": luminaire["Image principale"] || luminaire.image_principale || "",
        "Images supplémentaires": luminaire["Images supplémentaires"] || luminaire.images_supplementaires || "",
        "Fichiers 3D": luminaire["Fichiers 3D"] || luminaire.fichiers_3d || "",
        "Fichiers CAD": luminaire["Fichiers CAD"] || luminaire.fichiers_cad || "",
        "Fichiers IES": luminaire["Fichiers IES"] || luminaire.fichiers_ies || "",
        "Fichiers PDF": luminaire["Fichiers PDF"] || luminaire.fichiers_pdf || "",
        "Liens externes": luminaire["Liens externes"] || luminaire.liens_externes || "",
        Tags: luminaire.tags || "",
        Catégorie: luminaire.categorie || luminaire.category || "",
        "Sous-catégorie": luminaire["Sous-catégorie"] || luminaire.sous_categorie || "",
        Collection: luminaire.collection || "",
        Série: luminaire.serie || luminaire.series || "",
        Référence: luminaire.reference || "",
        "Code-barres": luminaire["Code-barres"] || luminaire.code_barres || "",
        SKU: luminaire.SKU || luminaire.sku || "",
        UPC: luminaire.UPC || luminaire.upc || "",
        EAN: luminaire.EAN || luminaire.ean || "",
        Fournisseur: luminaire.fournisseur || luminaire.supplier || "",
        Distributeur: luminaire.distributeur || luminaire.distributor || "",
        Revendeur: luminaire.revendeur || luminaire.reseller || "",
        "Contact commercial": luminaire["Contact commercial"] || luminaire.contact_commercial || "",
        "Contact technique": luminaire["Contact technique"] || luminaire.contact_technique || "",
        "Site web": luminaire["Site web"] || luminaire.site_web || "",
        "Réseaux sociaux": luminaire["Réseaux sociaux"] || luminaire.reseaux_sociaux || "",
        Presse: luminaire.presse || luminaire.press || "",
        Awards: luminaire.awards || "",
        "Certifications environnementales":
          luminaire["Certifications environnementales"] || luminaire.certifications_environnementales || "",
        Recyclabilité: luminaire.recyclabilite || luminaire.recyclability || "",
        "Empreinte carbone": luminaire["Empreinte carbone"] || luminaire.empreinte_carbone || "",
        Origine: luminaire.origine || luminaire.origin || "",
        Fabrication: luminaire.fabrication || luminaire.manufacturing || "",
        Assemblage: luminaire.assemblage || luminaire.assembly || "",
        Conditionnement: luminaire.conditionnement || luminaire.packaging || "",
        Transport: luminaire.transport || "",
        Livraison: luminaire.livraison || luminaire.delivery || "",
        Retour: luminaire.retour || luminaire.return || "",
        SAV: luminaire.SAV || luminaire.sav || "",
        "Pièces détachées": luminaire["Pièces détachées"] || luminaire.pieces_detachees || "",
        Réparation: luminaire.reparation || luminaire.repair || "",
        Recyclage: luminaire.recyclage || luminaire.recycling || "",
        "Fin de vie": luminaire["Fin de vie"] || luminaire.fin_de_vie || "",
      }
    })

    // Convertir en format CSV
    const csvContent = [
      headers.join(","),
      ...csvData.map((row) =>
        headers
          .map((header) => {
            const value = row[header as keyof typeof row] || ""
            // Échapper les guillemets et entourer de guillemets si nécessaire
            const escapedValue = String(value).replace(/"/g, '""')
            return `"${escapedValue}"`
          })
          .join(","),
      ),
    ].join("\n")

    // Retourner le CSV avec les bons headers
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="luminaires-export-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    })
  } catch (error) {
    console.error("Erreur lors de l'export CSV:", error)
    return NextResponse.json({ error: "Erreur lors de l'export CSV" }, { status: 500 })
  }
}
