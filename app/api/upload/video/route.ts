// Fichier : app/api/upload/video/route.ts
import { NextResponse } from "next/server";
import { getBucket } from "@/lib/gridfs";
import clientPromise from "@/lib/mongodb";
import { Readable } from "stream";
import { ObjectId } from "mongodb";

const DBNAME = "gersaint";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const videoFile = formData.get("video") as File;
    if (!videoFile) throw new Error("Aucun fichier vidéo fourni.");

    const client = await clientPromise;
    const db = client.db(DBNAME);
    const bucket = await getBucket();
    
    const oldVideoSetting = await db.collection("settings").findOne({ key: "welcomeVideoId" });
    if (oldVideoSetting?.value) {
      try { await bucket.delete(new ObjectId(oldVideoSetting.value)); } catch (e) {}
    }

    const uploadStream = bucket.openUploadStream(videoFile.name, { contentType: videoFile.type });
    const buffer = Buffer.from(await videoFile.arrayBuffer());
    Readable.from(buffer).pipe(uploadStream);
    
    await db.collection("settings").updateOne(
      { key: "welcomeVideoId" },
      { $set: { value: uploadStream.id.toString() } },
      { upsert: true }
    );
    
    return NextResponse.json({ success: true, url: `/api/video/${uploadStream.id}` });
  } catch (error) {
    console.error("❌ Erreur upload vidéo:", error);
    return NextResponse.json({ success: false, error: "Erreur serveur lors de l'upload." }, { status: 500 });
  }
}
