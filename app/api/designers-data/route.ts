import { type NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"

export async function GET(request: NextRequest) {
  try {
    const { db } = await connectToDatabase()

    console.log("🔍 Récupération des données designers...")

    // Agrégation pour obtenir les designers avec leur nombre de luminaires et image
    const designersData = await db
      .collection("luminaires")
      .aggregate([
        {
          $match: {
            $or: [
              { "Artiste / Dates": { $exists: true, $ne: "", $ne: null } },
              { designer: { $exists: true, $ne: "", $ne: null } },
            ],
          },
        },
        {
          $group: {
            _id: {
              $ifNull: ["$Artiste / Dates", "$designer"],
            },
            count: { $sum: 1 },
            // Récupérer la première image de designer trouvée
            imagedesigner: { $first: "$imagedesigner" },
          },
        },
        {
          $project: {
            _id: 0,
            nom: "$_id",
            count: 1,
            imagedesigner: 1,
            slug: {
              $replaceAll: {
                input: { $toLower: "$_id" },
                find: " ",
                replacement: "-",
              },
            },
          },
        },
        {
          $sort: { nom: 1 },
        },
      ])
      .toArray()

    console.log(`✅ ${designersData.length} designers trouvés`)

    return NextResponse.json({
      success: true,
      designers: designersData,
    })
  } catch (error) {
    console.error("❌ Erreur récupération designers:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erreur lors de la récupération des designers",
      },
      { status: 500 },
    )
  }
}
