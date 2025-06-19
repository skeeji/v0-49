import { type NextRequest, NextResponse } from "next/server";
import { getBucket } from "@/lib/gridfs";
import clientPromise from "@/lib/mongodb";
import { Readable } from "stream";
import { ObjectId } from "mongodb";

// Fonction pour convertir un fichier en stream
const fileToStream = (file: File) => new Readable({ async read() { const r = file.stream().getReader(); const { done, value } = await r.read(); this.push(done ? null : value); }});

export async function POST(request: NextRequest) {
  try {
    const bucket = await getBucket();
    const client = await clientPromise;
    const db = client.db();
    const formData = await request.formData();
    const videoFile = formData.get("video") as File | null;

    if (!videoFile) { return NextResponse.json({ error: "Aucun fichier vidéo" }, { status: 400 }); }

    const settings = await db.collection("settings").findOne({ _id: "site_config" });
    if (settings?.welcomeVideoId) {
      try { await bucket.delete(new ObjectId(settings.welcomeVideoId)); } catch (e) { console.warn("Ancienne vidéo non trouvée, ignoré.") }
    }

    const uploadStream = bucket.openUploadStream(videoFile.name, { contentType: videoFile.type });
    await new Promise<void>((resolve, reject) => fileToStream(videoFile).pipe(uploadStream).on('error', reject).on('finish', resolve));

    await db.collection("settings").updateOne(
      { _id: "site_config" },
      { $set: { welcomeVideoId: uploadStream.id.toHexString() } },
      { upsert: true }
    );

    return NextResponse.json({ success: true, fileId: uploadStream.id });
  } catch (error: any) {
    return NextResponse.json({ error: "Erreur upload vidéo", details: error.message }, { status: 500 });
  }
}
