import { type NextRequest, NextResponse } from "next/server"

// Simulation d'une base de données
const luminaires: any[] = []

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log("🔍 Chargement luminaire ID:", params.id)

    const luminaire = luminaires.find((l) => l._id === params.id)

    if (!luminaire) {
      return NextResponse.json({ error: "Luminaire non trouvé" }, { status: 404 })
    }

    // Transformer les données pour le frontend
    const transformedLuminaire = {
      ...luminaire,
      // CORRECTION: Convertir l'objet dimensions en string pour éviter l'erreur React #31
      dimensions:
        typeof luminaire.dimensions === "object" && luminaire.dimensions !== null
          ? `${luminaire.dimensions.hauteur || ""}x${luminaire.dimensions.largeur || ""}x${luminaire.dimensions.profondeur || ""}`.replace(
              /^x+|x+$/g,
              "",
            ) || ""
          : luminaire.dimensions || "",
      // Garder "Nom du fichier" tel quel
      "Nom du fichier": luminaire["Nom du fichier"] || luminaire.filename || "",
    }

    console.log("📊 Réponse API luminaire:", { success: true, data: transformedLuminaire })

    return NextResponse.json({
      success: true,
      data: transformedLuminaire,
    })
  } catch (error: any) {
    console.error("❌ Erreur dans GET /api/luminaires/[id]:", error)
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

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log("✏️ Mise à jour luminaire ID:", params.id)

    const body = await request.json()
    console.log("📥 Données de mise à jour:", JSON.stringify(body, null, 2))

    const index = luminaires.findIndex((l) => l._id === params.id)

    if (index === -1) {
      return NextResponse.json({ error: "Luminaire non trouvé" }, { status: 404 })
    }

    // Préparer les données de mise à jour
    const updateData = {
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
      updatedAt: new Date(),
    }

    luminaires[index] = { ...luminaires[index], ...updateData }

    console.log(`✅ Luminaire mis à jour: ${params.id}`)

    return NextResponse.json({
      success: true,
      message: "Luminaire mis à jour avec succès",
      id: params.id,
    })
  } catch (error: any) {
    console.error("❌ Erreur dans PUT /api/luminaires/[id]:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erreur lors de la mise à jour du luminaire",
        details: error.message,
      },
      { status: 500 },
    )
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log("🗑️ Suppression luminaire ID:", params.id)

    const index = luminaires.findIndex((l) => l._id === params.id)

    if (index === -1) {
      return NextResponse.json({ error: "Luminaire non trouvé" }, { status: 404 })
    }

    luminaires.splice(index, 1)

    console.log(`✅ Luminaire supprimé: ${params.id}`)

    return NextResponse.json({
      success: true,
      message: "Luminaire supprimé avec succès",
    })
  } catch (error: any) {
    console.error("❌ Erreur dans DELETE /api/luminaires/[id]:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erreur lors de la suppression du luminaire",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
