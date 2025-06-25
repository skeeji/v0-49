// Fichier : app/api/upload/images/route.ts
import { NextResponse } from "next/server";
import { getBucket } from "@/lib/gridfs";
import clientPromise from "@/lib/mongodb";
import { Readable } from "stream";

const DBNAME = "gersaint";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const files = formData.getAll("files") as File[];
    
    const client = await clientPromise;
    const db = client.db(DBNAME);
    const bucket = await getBucket();

    let successCount = 0;
    
    for (const file of files) {
      const uploadStream = bucket.openUploadStream(file.name, { contentType: file.type });
      const buffer = Buffer.from(await file.arrayBuffer());
      const readableStream = Readable.from(buffer);
      await new Promise<void>((resolve, reject) => {
        readableStream.pipe(uploadStream).on("error", reject).on("finish", () => resolve());
      });

      const fileUrl = `/api/images/${uploadStream.id}`;
      const fileNameWithoutExt = file.name.replace(/\.[^/.]+$/, "");

      const luminaireUpdate = await db.collection("luminaires").updateOne(
        { filename: { $in: [file.name, fileNameWithoutExt] } },
        { $push: { images: fileUrl } }
      );
      const designerUpdate = await db.collection("designers").updateOne(
        { imageFile: { $in: [file.name, fileNameWithoutExt] } },
        { $set: { images: [fileUrl] } }
      );
      
      if (luminaireUpdate.modifiedCount > 0 || designerUpdate.modifiedCount > 0) successCount++;
    }

    return NextResponse.json({ success: true, message: `${successCount} sur ${files.length} images associées.` });
  } catch (error) {
    console.error("❌ Erreur upload images:", error);
    return NextResponse.json({ success: false, error: "Erreur serveur upload." }, { status: 500 });
  }
}
