import { type NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"

export async function GET(request: NextRequest, { params }: { params: { name: string } }) {
  try {
    const { db } = await connectToDatabase()
    const designerSlug = decodeURIComponent(params.name)

    // Récupérer tous les luminaires
    const luminaires = await db.collection("luminaires").find({}).toArray()

    // Fonction pour extraire le nom du designer
    const getDesignerNameOnly = (str = ""): string => {
      if (!str) return ""
      return str.split("(")[0].trim()
    }

    // Filtrer les luminaires pour ce designer
    const designerLuminaires = luminaires.filter((luminaire) => {
      const designerName = getDesignerNameOnly(luminaire.designer)
      const slug = designerName.toLowerCase().replace(/\s+/g, "-")
      return slug === designerSlug
    })

    if (designerLuminaires.length === 0) {
      return NextResponse.json({ success: false, message: "Designer non trouvé" }, { status: 404 })
    }

    // Créer l'objet designer
    const firstLuminaire = designerLuminaires[0]
    const designerName = getDesignerNameOnly(firstLuminaire.designer)

    const designer = {
      nom: designerName,
      slug: designerSlug,
      image: null, // À implémenter si vous avez des images de designers
      count: designerLuminaires.length,
    }

    return NextResponse.json({
      success: true,
      data: {
        designer,
        luminaires: designerLuminaires,
      },
    })
  } catch (error) {
    console.error("Erreur API designers/[name]:", error)
    return NextResponse.json({ success: false, error: "Erreur serveur" }, { status: 500 })
  }
}
