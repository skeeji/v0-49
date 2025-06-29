import { type NextRequest, NextResponse } from "next/server"

// Fonction pour extraire le nom du designer
const getDesignerNameOnly = (str = ""): string => {
  if (!str) return ""
  return str.split("(")[0].trim()
}

// Simulation d'une base de données
const luminaires: any[] = []

export async function GET(request: NextRequest, { params }: { params: { name: string } }) {
  try {
    console.log("🔍 API /api/designers/[name] GET - Name:", params.name)

    const designerSlug = decodeURIComponent(params.name)
    console.log("🔍 Designer slug:", designerSlug)

    console.log("📊 Total luminaires:", luminaires.length)

    // Filtrer les luminaires pour ce designer
    const designerLuminaires = luminaires.filter((luminaire) => {
      const designerName = getDesignerNameOnly(luminaire.designer)
      const slug = designerName
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "")

      return slug === designerSlug
    })

    console.log("📊 Luminaires pour ce designer:", designerLuminaires.length)

    if (designerLuminaires.length === 0) {
      return NextResponse.json({ success: false, error: "Designer non trouvé" }, { status: 404 })
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

    console.log("✅ Designer trouvé:", designer.nom)

    return NextResponse.json({
      success: true,
      data: {
        designer,
        luminaires: designerLuminaires,
      },
    })
  } catch (error) {
    console.error("❌ Erreur API /api/designers/[name] GET:", error)
    return NextResponse.json({ success: false, error: "Erreur serveur" }, { status: 500 })
  }
}
