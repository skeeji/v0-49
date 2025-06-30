import { type NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"

export async function GET(request: NextRequest, { params }: { params: { name: string } }) {
  try {
    const { db } = await connectToDatabase()
    const designerName = decodeURIComponent(params.name)

    console.log(`🔍 Recherche du designer: "${designerName}"`)

    // Échapper les caractères spéciaux pour la regex
    const escapedName = designerName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

    // Rechercher le designer avec plusieurs patterns
    const designer = await db.collection("designers").findOne({
      $or: [
        { nom: designerName }, // Correspondance exacte
        { nom: { $regex: new RegExp(`^${escapedName}$`, "i") } }, // Insensible à la casse
        { nom: { $regex: new RegExp(escapedName, "i") } }, // Contient le nom
      ],
    })

    if (!designer) {
      console.log(`❌ Designer non trouvé: "${designerName}"`)
      return NextResponse.json({ success: false, error: "Designer non trouvé" }, { status: 404 })
    }

    console.log(`✅ Designer trouvé:`, designer.nom)

    // Rechercher les luminaires de ce designer
    const luminaires = await db
      .collection("luminaires")
      .find({
        $or: [
          { "Artiste / Dates": { $regex: new RegExp(escapedName, "i") } },
          { designer: { $regex: new RegExp(escapedName, "i") } },
        ],
      })
      .toArray()

    console.log(`💡 ${luminaires.length} luminaires trouvés pour ${designer.nom}`)

    // Adapter les luminaires pour l'affichage
    const adaptedLuminaires = luminaires.map((lum) => ({
      ...lum,
      id: lum._id,
      image: lum["Nom du fichier"] ? `/api/images/filename/${lum["Nom du fichier"]}` : null,
      name: lum["Nom luminaire"] || lum.nom || "Sans nom",
      artist: lum["Artiste / Dates"] || lum.designer || "",
      year: lum["Année"] || lum.annee || "",
      period: lum["Période"] || lum.periode || "",
      type: lum["Type"] || lum.type || "",
      specialty: lum["Spécialité"] || lum.specialite || "",
      collaboration: lum["Collaboration / Œuvre"] || lum.collaboration || "",
    }))

    return NextResponse.json({
      success: true,
      designer: {
        ...designer,
        imagedesigner: designer.imagedesigner, // S'assurer que l'image est incluse
      },
      luminaires: adaptedLuminaires,
    })
  } catch (error) {
    console.error("❌ Erreur API designer:", error)
    return NextResponse.json({ success: false, error: "Erreur serveur" }, { status: 500 })
  }
}
