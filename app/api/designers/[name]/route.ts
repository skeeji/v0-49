import { type NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"

export async function GET(request: NextRequest, { params }: { params: { name: string } }) {
  try {
    const { db } = await connectToDatabase()

    const designerName = decodeURIComponent(params.name)
    console.log("🔍 Recherche designer:", designerName)

    // Recherche ultra-flexible pour gérer tous les cas
    const searchPatterns = [
      designerName, // Nom exact
      designerName
        .replace(/\s+/g, " ")
        .trim(), // Normaliser les espaces
      designerName.replace(/[()]/g, ""), // Sans parenthèses
      designerName.replace(/[+]/g, " "), // Remplacer + par espace
      designerName
        .split("(")[0]
        .trim(), // Partie avant parenthèses
      designerName
        .split(/[()]/)[0]
        .trim(), // Première partie
    ]

    console.log("🔍 Patterns de recherche:", searchPatterns)

    // Construire une requête MongoDB flexible
    const searchQuery = {
      $or: searchPatterns.flatMap((pattern) => [
        { "Artiste / Dates": { $regex: pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" } },
        { "Artiste / Dates": { $regex: pattern, $options: "i" } },
        { designer: { $regex: pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" } },
        { designer: { $regex: pattern, $options: "i" } },
      ]),
    }

    console.log("🔍 Requête MongoDB:", JSON.stringify(searchQuery, null, 2))

    // Chercher les luminaires correspondants
    const luminaires = await db.collection("luminaires").find(searchQuery).toArray()

    console.log(`📊 ${luminaires.length} luminaires trouvés`)

    if (luminaires.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Designer non trouvé",
          searchedName: designerName,
          patterns: searchPatterns,
        },
        { status: 404 },
      )
    }

    // Prendre le premier luminaire pour extraire les infos du designer
    const firstLuminaire = luminaires[0]
    const designerField = firstLuminaire["Artiste / Dates"] || firstLuminaire.designer || designerName

    // Créer l'objet designer
    const designer = {
      nom: designerField,
      count: luminaires.length,
      imagedesigner: firstLuminaire.imagedesigner || null,
    }

    console.log("✅ Designer trouvé:", designer)

    return NextResponse.json({
      success: true,
      data: {
        designer,
        luminaires,
      },
    })
  } catch (error) {
    console.error("❌ Erreur API designer:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erreur serveur",
      },
      { status: 500 },
    )
  }
}
