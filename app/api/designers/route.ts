import { type NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"

export async function GET(request: NextRequest) {
  try {
    const { db } = await connectToDatabase()

    // Récupérer tous les luminaires pour grouper par designer
    const luminaires = await db.collection("luminaires").find({}).toArray()

    // Fonction pour extraire le nom du designer
    const getDesignerNameOnly = (str = ""): string => {
      if (!str) return ""
      return str.split("(")[0].trim()
    }

    // Grouper par designer
    const designerMap = new Map()

    luminaires.forEach((luminaire) => {
      const designerName = getDesignerNameOnly(luminaire.designer)
      if (designerName) {
        if (!designerMap.has(designerName)) {
          designerMap.set(designerName, {
            nom: designerName,
            slug: designerName.toLowerCase().replace(/\s+/g, "-"),
            count: 0,
            luminaires: [],
            image: null, // À implémenter si vous avez des images de designers
          })
        }
        const designer = designerMap.get(designerName)
        designer.count++
        designer.luminaires.push({
          ...luminaire,
          id: luminaire._id,
          image: luminaire.images?.[0],
        })
      }
    })

    const designers = Array.from(designerMap.values())

    return NextResponse.json({
      success: true,
      designers,
      total: designers.length,
    })
  } catch (error) {
    console.error("Erreur API designers:", error)
    return NextResponse.json({ success: false, error: "Erreur serveur" }, { status: 500 })
  }
}
