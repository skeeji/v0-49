import { NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"

export async function GET() {
  try {
    console.log("🖼️ API Period Images - Récupération des images")

    const { db } = await connectToDatabase()

    // Récupérer toutes les images de périodes
    const files = await db
      .collection("uploads.files")
      .find({ "metadata.periodName": { $exists: true } })
      .toArray()

    console.log(`📊 ${files.length} images de périodes trouvées`)

    // Créer un mapping période -> URL d'image
    const images: { [key: string]: string } = {}

    files.forEach((file) => {
      const periodName = file.metadata?.periodName
      if (periodName) {
        images[periodName] = `/api/images/period/${file._id}`
        console.log(`🔗 Image pour ${periodName}: ${images[periodName]}`)
      }
    })

    return NextResponse.json({
      success: true,
      images,
      count: files.length,
    })
  } catch (error) {
    console.error("❌ Erreur API period images:", error)
    return NextResponse.json({ success: false, message: "Erreur lors de la récupération des images" }, { status: 500 })
  }
}
