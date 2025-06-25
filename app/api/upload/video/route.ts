// app/api/upload/video/route.ts

import { NextResponse } from "next/server";
import { getBucket } from "@/lib/gridfs";
import { Readable } from "stream";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const videoFile = formData.get("video") as File | null;
    const bucket = await getBucket();

    if (!videoFile) {
      return NextResponse.json({ success: false, error: "Aucun fichier vidéo fourni." }, { status: 400 });
    }

    const buffer = Buffer.from(await videoFile.arrayBuffer());
    const readableStream = Readable.from(buffer);

    // On stocke la vidéo dans le même bucket que les images
    const uploadStream = bucket.openUploadStream(videoFile.name, {
      contentType: videoFile.type || "video/mp4",
      // On peut ajouter des métadonnées, par exemple pour identifier la vidéo d'accueil
      metadata: { type: "home_video" },
    });

    const uploadPromise = new Promise((resolve, reject) => {
      readableStream.pipe(uploadStream)
        .on("error", (error) => reject(error))
        .on("finish", () => resolve(true));
    });

    await uploadPromise;
    
    const videoUrl = `/api/video/${uploadStream.id}`;
    
    // Au lieu de sauvegarder dans 'settings', on pourrait directement utiliser
    // l'ID du fichier pour la retrouver. Pour l'instant, on retourne l'URL.
    return NextResponse.json({ success: true, url: videoUrl, fileId: uploadStream.id });

  } catch (error) {
    console.error("Erreur lors de l'upload de la vidéo vers GridFS:", error);
    return NextResponse.json({ success: false, error: "Erreur serveur lors de l'upload." }, { status: 500 });
  }
}
