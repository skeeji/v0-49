import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { getBucket } from "@/lib/gridfs"
import { Readable } from "stream"
import { finished } from "stream/promises"

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires"

export async function POST(request: NextRequest) {
  try {
    console.log("🎥 API POST /api/upload/video appelée")

    const formData = await request.formData()
    const file = formData.get("file") as Blob | null
    const title = formData.get("title") as string | null
    const description = formData.get("description") as string | null

    if (!file) {
      console.log("❌ Aucun fichier trouvé dans la requête")
      return NextResponse.json({ success: false, error: "Aucun fichier trouvé" }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const filename = file.name
    const bucket = await getBucket()

    console.log(`📁 Fichier reçu: ${filename}, Taille: ${file.size} bytes, Type: ${file.type}`)

    // Upload vers GridFS
    const uploadStream = bucket.openUploadStream(filename, {
      metadata: {
        title: title || "Vidéo",
        description: description || "",
      },
    })
    const readableStream = new Readable()

    readableStream.push(buffer)
    readableStream.push(null)

    console.log(`🚀 Upload vers GridFS: ${filename}`)
    await finished(readableStream.pipe(uploadStream))

    console.log(`✅ Upload réussi vers GridFS: ${filename}, ID: ${uploadStream.id}`)

    // Sauvegarder les informations de la vidéo dans MongoDB
    const client = await clientPromise
    const db = client.db(DBNAME)

    const videoData = {
      _id: uploadStream.id,
      filename: filename,
      title: title || "Vidéo",
      description: description || "",
      uploadDate: new Date(),
    }

    await db.collection("welcomeVideos").insertOne(videoData)
    console.log("✅ Informations de la vidéo sauvegardées dans MongoDB")

    return NextResponse.json({
      success: true,
      message: "Vidéo uploadée avec succès",
      filename: filename,
    })
  } catch (error: any) {
    console.error("❌ Erreur dans POST /api/upload/video:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erreur lors de l'upload de la vidéo",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
