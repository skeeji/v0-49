import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

// La fonction getDesignerNameOnly n'est plus nécessaire ici si on récupère le nom depuis la BDD
// mais on la garde au cas où.
const getDesignerNameOnly = (str = ""): string => {
  if (!str) return ""
  return str.split("(")[0].trim()
}

export async function GET(request: NextRequest, { params }: { params: { name: string } }) {
  try {
    const designerSlugOrName = decodeURIComponent(params.name)
    console.log(`🔍 API /api/designers/[name] GET - Reçu: ${designerSlugOrName}`)

    const client = await clientPromise
    const db = client.db()

    // 1. On cherche d'abord les informations du designer dans la collection "designers"
    // Le slug est créé lors de l'import, on peut donc l'utiliser pour une recherche fiable.
    // On cherche aussi par le nom au cas où le paramètre n'est pas un slug.
    const designerDoc = await db.collection("designers").findOne({
      $or: [{ slug: designerSlugOrName }, { Nom: designerSlugOrName }],
    })

    if (!designerDoc) {
      return NextResponse.json({ success: false, error: "Designer non trouvé dans la collection 'designers'" }, { status: 404 })
    }

    // On utilise le nom complet et exact de la base de données pour la suite
    const fullDesignerName = designerDoc.Nom;
    console.log(`🧑‍🎨 Designer trouvé dans la collection 'designers': ${fullDesignerName}`);

    // 2. On récupère tous les luminaires pour ce designer en utilisant son nom complet et exact
    const designerLuminaires = await db.collection("luminaires").find({ designer: fullDesignerName }).toArray()
    console.log("📊 Luminaires trouvés pour ce designer:", designerLuminaires.length)

    // 3. On construit l'objet de réponse final avec les données des deux collections
    const designer = {
      nom: fullDesignerName,
      slug: designerDoc.slug,
      imagedesigner: designerDoc.imagedesigner || "", // On ajoute le nom du fichier image
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
    console.error("❌ Erreur API /api/designers/[name] GET:", error)
    return NextResponse.json({ success: false, error: "Erreur serveur" }, { status: 500 })
  }
}
