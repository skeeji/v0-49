import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const filename = searchParams.get("filename")

    console.log("[v0 API] Looking for filename:", filename)

    if (!filename) {
      return NextResponse.json({ success: false, error: "Filename required" }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db(DBNAME)

    const luminaireNumber = filename.replace(/^luminaire_/, "").replace(/\.(jpg|jpeg|png|webp)$/i, "")
    console.log("[v0 API] Extracted luminaire number:", luminaireNumber)

    const luminaire = await db.collection("luminaires").findOne({
      $or: [
        // Recherche par nom de fichier exact
        { filename: filename },
        { filename: `${filename}.jpg` },
        { filename: `${filename}.jpeg` },
        { "Nom du fichier": filename },
        { "Nom du fichier": `${filename}.jpg` },
        { "Image luminaire (Nom du fichier)": filename },
        { "Image luminaire (Nom du fichier)": `${filename}.jpg` },
        { image_principale: filename },
        { image_principale: `${filename}.jpg` },
        { images: filename },
        { images: `${filename}.jpg` },

        // Recherche par regex sur les champs d'image
        { filename: { $regex: new RegExp(luminaireNumber, "i") } },
        { "Nom du fichier": { $regex: new RegExp(luminaireNumber, "i") } },
        { "Image luminaire (Nom du fichier)": { $regex: new RegExp(luminaireNumber, "i") } },
        { image_principale: { $regex: new RegExp(luminaireNumber, "i") } },

        // Recherche par numéro dans le nom du luminaire
        { nom: { $regex: new RegExp(`^Luminaire ${luminaireNumber}$`, "i") } },
        { "Nom luminaire": { $regex: new RegExp(`^Luminaire ${luminaireNumber}$`, "i") } },
      ],
    })

    console.log("[v0 API] Luminaire found:", !!luminaire)

    if (luminaire) {
      const nom =
        luminaire.nom ||
        luminaire.Nom ||
        luminaire["Nom luminaire"] ||
        luminaire["Nom du luminaire"] ||
        luminaire.title ||
        luminaire.name ||
        luminaire.modele ||
        luminaire.Modele ||
        "Sans nom"

      const artiste =
        luminaire.artiste ||
        luminaire.Artiste ||
        luminaire.designer ||
        luminaire.Designer ||
        luminaire.artist ||
        luminaire["Artiste / Dates"] ||
        luminaire.createur ||
        luminaire.Créateur ||
        "Inconnu"

      const annee =
        luminaire.annee ||
        luminaire.Annee ||
        luminaire["Année"] ||
        luminaire.year ||
        luminaire.Year ||
        luminaire.date ||
        luminaire.Date ||
        luminaire.periode ||
        luminaire.Periode ||
        ""

      console.log("[v0 API] Extracted metadata:", { nom, artiste, annee })

      return NextResponse.json({
        success: true,
        luminaireId: luminaire._id.toString(),
        found: true,
        metadata: {
          nom,
          artiste,
          annee,
        },
      })
    }

    console.log("[v0 API] No luminaire found for filename:", filename)
    return NextResponse.json({
      success: false,
      found: false,
      luminaireId: null,
    })
  } catch (error: any) {
    console.error("[v0 API] Error:", error)
    return NextResponse.json({ success: false, error: "Erreur serveur" }, { status: 500 })
  }
}
