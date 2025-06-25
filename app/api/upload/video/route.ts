// Fichier : app/api/upload/video/route.ts
import { NextResponse } from "next/server";
import { getBucket } from "@/lib/gridfs";
import clientPromise from "@/lib/mongodb";
import { Readable } from "stream";

const DBNAME = "gersaint";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const videoFile = formData.get("video") as File | null;
    
    if (!videoFile) {
      return NextResponse.json({ success: false, error: "Aucun fichier vidéo fourni." }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db(DBNAME);
    const bucket = await getBucket();
    
    const buffer = Buffer.from(await videoFile.arrayBuffer());
    const readableStream = Readable.from(buffer);

    // Supprimer l'ancienne vidéo si elle existe pour ne pas accumuler les fichiers
    const oldVideoSetting = await db.collection("settings").findOne({ key: "welcomeVideoId" });
    if (oldVideoSetting && oldVideoSetting.value) {
        try {
            await bucket.delete(oldVideoSetting.value);
        } catch (delError) {
            console.warn("Ancienne vidéo non trouvée dans GridFS, suppression ignorée.", delError);
        }
    }

    const uploadStream = bucket.openUploadStream(videoFile.name, {
      contentType: videoFile.type || "video/mp4",
      metadata: { type: "welcome_video" },
    });

    await new Promise<void>((resolve, reject) => {
      readableStream.pipe(uploadStream).on("error", reject).on("finish", () => resolve());
    });
    
    const videoUrl = `/api/video/${uploadStream.id}`;

    // On sauvegarde l'ID du nouveau fichier dans les settings
    await db.collection("settings").updateOne(
        { key: "welcomeVideoId" },
        { $set: { value: uploadStream.id } }, // On stocke l'ID, pas l'URL
        { upsert: true }
    );
    
    return NextResponse.json({ success: true, url: videoUrl });

  } catch (error) {
    console.error("❌ Erreur upload vidéo:", error);
    return NextResponse.json({ success: false, error: "Erreur serveur lors de l'upload." }, { status: 500 });
  }
}
