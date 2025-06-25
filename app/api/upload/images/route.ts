// Fichier : app/api/upload/images/route.ts
import { type NextRequest, NextResponse } from "next/server";
import { getBucket } from "@/lib/gridfs";
import { Readable } from "stream";

function fileToStream(file: File) {
  const reader = file.stream().getReader();
  return new Readable({
    async read() {
      const { done, value } = await reader.read();
      this.push(done ? null : Buffer.from(value));
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const bucket = await getBucket();
    const formData = await request.formData();
    const files = formData.getAll("files") as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "Aucun fichier fourni" }, { status: 400 });
    }

    const uploadedFiles = [];
    const errors = [];

    for (const file of files) {
      try {
        const stream = fileToStream(file);
        const uploadStream = bucket.openUploadStream(file.name, {
          contentType: file.type,
        });
        
        await new Promise<void>((resolve, reject) => {
          stream.pipe(uploadStream).on('error', reject).on('finish', () => resolve());
        });

        const fileUrl = `/api/images/${uploadStream.id}`;
        uploadedFiles.push({ name: file.name, path: fileUrl, size: file.size });

      } catch (error: any) {
        errors.push(`${file.name}: ${error.message}`);
      }
    }
    return NextResponse.json({ uploadedFiles, errors, message: "Upload terminé." });
  } catch (error: any) {
    return NextResponse.json({ error: "Erreur serveur upload", details: error.message }, { status: 500 });
  }
}
