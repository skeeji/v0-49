import { type NextRequest, NextResponse } from "next/server"

// Simulation d'une base de données MongoDB
const luminaires: any[] = []

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "100")
    const search = searchParams.get("search") || ""
    const sortField = searchParams.get("sortField") || "nom"
    const sortDirection = searchParams.get("sortDirection") || "asc"
    const designer = searchParams.get("designer") || ""
    const periode = searchParams.get("periode") || ""
    const materiaux = searchParams.get("materiaux") || ""
    const couleurs = searchParams.get("couleurs") || ""

    console.log(`🔍 Chargement page ${page} avec filtres:`, {
      sortField,
      sortDirection,
      page: page.toString(),
      limit: limit.toString(),
    })

    // Filtrage
    let filteredLuminaires = [...luminaires]

    if (search) {
      filteredLuminaires = filteredLuminaires.filter(
        (l) =>
          l.nom?.toLowerCase().includes(search.toLowerCase()) ||
          l.designer?.toLowerCase().includes(search.toLowerCase()) ||
          l.description?.toLowerCase().includes(search.toLowerCase()),
      )
    }

    if (designer) {
      filteredLuminaires = filteredLuminaires.filter((l) => l.designer?.toLowerCase().includes(designer.toLowerCase()))
    }

    if (periode) {
      filteredLuminaires = filteredLuminaires.filter((l) => l.periode?.toLowerCase().includes(periode.toLowerCase()))
    }

    if (materiaux) {
      filteredLuminaires = filteredLuminaires.filter((l) =>
        l.materiaux?.some((m: string) => m.toLowerCase().includes(materiaux.toLowerCase())),
      )
    }

    // Tri
    filteredLuminaires.sort((a, b) => {
      const aVal = a[sortField] || ""
      const bVal = b[sortField] || ""

      if (sortDirection === "desc") {
        return bVal.toString().localeCompare(aVal.toString())
      }
      return aVal.toString().localeCompare(bVal.toString())
    })

    // Pagination
    const total = filteredLuminaires.length
    const skip = (page - 1) * limit
    const paginatedLuminaires = filteredLuminaires.slice(skip, skip + limit)

    console.log(`📊 ${paginatedLuminaires.length} luminaires chargés (page ${page})`)
    console.log(`📊 Total dans la base: ${total}`)

    return NextResponse.json({
      success: true,
      luminaires: paginatedLuminaires,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    })
  } catch (error: any) {
    console.error("❌ Erreur dans GET /api/luminaires:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erreur lors du chargement des luminaires",
        details: error.message,
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log("📝 Création d'un nouveau luminaire")
    const body = await request.json()
    console.log("📥 Données reçues:", JSON.stringify(body, null, 2))

    // Préparer les données du luminaire
    const luminaireData = {
      _id: Date.now().toString(),
      nom: body.nom || "",
      designer: body.designer || "",
      annee: Number.parseInt(body.annee) || new Date().getFullYear(),
      periode: body.periode || "",
      description: body.description || "",
      materiaux: Array.isArray(body.materiaux) ? body.materiaux : [],
      couleurs: Array.isArray(body.couleurs) ? body.couleurs : [],
      dimensions: body.dimensions || {},
      images: Array.isArray(body.images) ? body.images : [],
      "Nom du fichier": body["Nom du fichier"] || body.filename || "",
      specialite: body.specialite || "",
      collaboration: body.collaboration || "",
      signe: body.signe || "",
      estimation: body.estimation || "",
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    luminaires.push(luminaireData)

    console.log(`✅ Nouveau luminaire créé avec l'ID: ${luminaireData._id}`)

    return NextResponse.json({
      success: true,
      message: "Luminaire créé avec succès",
      id: luminaireData._id,
    })
  } catch (error: any) {
    console.error("❌ Erreur dans POST /api/luminaires:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erreur lors de la création du luminaire",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
