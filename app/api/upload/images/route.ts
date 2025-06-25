// app/api/upload/images/route.ts

import { NextResponse } from "next/server";
import { getBucket } from "@/lib/gridfs";
import { Readable } from "stream";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const files = formData.getAll("files") as File[];
    const bucket = await getBucket();
    const uploadedFilesInfo = [];

    if (!files || files.length === 0) {
      return NextResponse.json({ success: false, error: "Aucun fichier fourni." }, { status: 400 });
    }

    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const readableStream = Readable.from(buffer);

      const uploadStream = bucket.openUploadStream(file.name, {
        contentType: file.type || "application/octet-stream",
      });
      const uploadPromise = new Promise((resolve, reject) => {
        readableStream.pipe(uploadStream)
          .on("error", (error) => reject(error))
          .on("finish", () => resolve(true));
      });

      await uploadPromise;

      // Très important : le chemin est maintenant une URL vers notre propre API
      const fileUrl = `/api/images/${uploadStream.id}`;
      uploadedFilesInfo.push({
        name: file.name,
        path: fileUrl,
      });
    }

    return NextResponse.json({ success: true, uploadedFiles: uploadedFilesInfo });
  } catch (error) {
    console.error("Erreur lors de l'upload vers GridFS:", error);
    return NextResponse.json({ success: false, error: "Erreur serveur lors de l'upload." }, { status: 500 });
  }
}
