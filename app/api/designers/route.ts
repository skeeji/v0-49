import { type NextRequest, NextResponse } from "next/server"

// Fonction pour extraire le nom du designer
const getDesignerNameOnly = (str = ""): string => {
  if (!str) return ""
  return str.split("(")[0].trim()
}

// Fonction pour créer un slug à partir d'un nom
const createSlug = (name: string): string => {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Supprimer les accents
    .replace(/[^a-z0-9\s-]/g, "") // Garder seulement lettres, chiffres, espaces et tirets
    .replace(/\s+/g, "-") // Remplacer espaces par tirets
    .replace(/-+/g, "-") // Éviter les tirets multiples
    .trim()
}

// Simulation d'une base de données
const luminaires: any[] = []

export async function GET(request: NextRequest) {
  try {
    console.log("🔍 API GET /api/designers appelée")

    // Extraire et compter les designers
    const designerCounts: { [key: string]: { name: string; count: number; slug: string } } = {}

    luminaires.forEach((luminaire) => {
      if (luminaire.designer) {
        const designerName = getDesignerNameOnly(luminaire.designer)
        const slug = createSlug(designerName)

        if (designerCounts[designerName]) {
          designerCounts[designerName].count++
        } else {
          designerCounts[designerName] = {
            name: designerName,
            count: 1,
            slug: slug,
          }
        }
      }
    })

    // Convertir en tableau et trier
    const designers = Object.values(designerCounts).sort((a, b) => a.name.localeCompare(b.name))

    console.log(`✅ ${designers.length} designers uniques trouvés`)

    return NextResponse.json({
      success: true,
      designers: designers,
      total: designers.length,
    })
  } catch (error: any) {
    console.error("❌ Erreur dans GET /api/designers:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erreur serveur",
        details: error.message,
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log("➕ API POST /api/designers appelée")
    const body = await request.json()
    console.log("📥 Données reçues:", JSON.stringify(body, null, 2))

    // Préparer les données du designer
    const designer = {
      _id: Date.now().toString(),
      nom: body.nom || "",
      slug: body.slug || createSlug(body.nom || ""),
      biographie: body.biographie || "",
      dateNaissance: body.dateNaissance || "",
      dateDeces: body.dateDeces || "",
      nationalite: body.nationalite || "",
      image: body.image || "",
      luminairesCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    console.log("💾 Designer à insérer:", JSON.stringify(designer, null, 2))

    // Ajouter à la simulation de base de données
    const designers: any[] = []
    designers.push(designer)

    console.log(`✅ Designer inséré avec l'ID: ${designer._id}`)

    return NextResponse.json({
      success: true,
      message: "Designer créé avec succès",
      id: designer._id,
      designer: designer,
    })
  } catch (error: any) {
    console.error("❌ Erreur dans POST /api/designers:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erreur lors de la création du designer",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
