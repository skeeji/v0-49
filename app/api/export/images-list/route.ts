import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { GridFSBucket } from "mongodb"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function GET() {
  try {
    const client = await clientPromise
    const db = client.db(DBNAME)
    const bucket = new GridFSBucket(db, { bucketName: "images" })

    const files = await bucket.find({}).toArray()

    const imagesList = files.map((file) => {
      const metadata = file.metadata || {}
      const isDesignerImage = metadata.isDesignerImage === true || metadata.folder === "designers"

      return {
        id: file._id.toString(),
        filename: file.filename,
        isDesignerImage: isDesignerImage,
      }
    })

    const designersCount = imagesList.filter((img) => img.isDesignerImage).length
    const luminairesCount = imagesList.filter((img) => !img.isDesignerImage).length

    console.log(`📋 Export images list: ${designersCount} designers, ${luminairesCount} luminaires`)

    return NextResponse.json({
      success: true,
      images: imagesList,
      total: imagesList.length,
      designers: designersCount,
      luminaires: luminairesCount,
    })
  } catch (error: any) {
    console.error("❌ Erreur /api/export/images-list:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erreur lors de la récupération des images",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
