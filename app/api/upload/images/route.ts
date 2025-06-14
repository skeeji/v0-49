import { type NextRequest, NextResponse } from "next/server";
import { bucket } from "@/lib/firebase-admin";
import { v4 as uuidv4 } from 'uuid';

// Helper pour ne pas uploader de fichiers non-images
const isValidImageType = (file: File) => {
    return file.type.startsWith('image/');
};

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll("files") as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "Aucun fichier fourni" }, { status: 400 });
    }

    const uploadedFiles = [];
    const errors = [];

    for (const file of files) {
      try {
        if (!isValidImageType(file)) {
          errors.push({ name: file.name, error: 'Type de fichier non supporté' });
          continue;
        }

        const fileBuffer = Buffer.from(await file.arrayBuffer());
        const uniqueFileName = `${uuidv4()}-${file.name}`;
        const filePath = `luminaires/${uniqueFileName}`; // Dossier dans Firebase Storage

        const blob = bucket.file(filePath);
        const blobStream = blob.createWriteStream({
            metadata: { contentType: file.type },
        });

        await new Promise<void>((resolve, reject) => {
            blobStream.on('error', reject);
            blobStream.on('finish', resolve);
            blobStream.end(fileBuffer);
        });
        
        // IMPORTANT: On génère une URL publique et permanente pour l'image
        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;
        
        uploadedFiles.push({
          name: file.name,
          path: publicUrl, // On retourne cette URL publique
          size: file.size,
        });

      } catch (error: any) {
        console.error(`Erreur upload pour ${file.name}:`, error);
        errors.push({ name: file.name, error: error.message || 'Erreur inconnue' });
      }
    }

    return NextResponse.json({
      uploadedFiles,
      errors,
      message: `${uploadedFiles.length} fichiers uploadés avec succès sur Firebase Storage`,
    });

  } catch (error) {
    console.error("Erreur générale lors de l'upload:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
