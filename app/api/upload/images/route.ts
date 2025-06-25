// Fichier : app/api/upload/images/route.ts
// Pas de changement majeur nécessaire, votre code est fonctionnel.
// On s'assure juste que `uploadStream.id` est bien l'ObjectId du fichier.
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
        // On passe le contentType directement à GridFS
        const uploadStream = bucket.openUploadStream(file.name, {
          contentType: file.type || 'application/octet-stream', // fallback
        });
        
        await new Promise<void>((resolve, reject) => {
          stream.pipe(uploadStream).on('error', reject).on('finish', () => resolve());
        });

        // Cette URL est celle qui sera utilisée par le frontend pour afficher l'image.
        // Elle pointe vers notre API route `app/api/images/[fileId]/route.ts`
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
