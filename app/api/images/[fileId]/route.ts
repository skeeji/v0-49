// Fichier : app/api/images/[fileId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getBucket } from "@/lib/gridfs";
import { ObjectId } from "mongodb";

export async function GET(
  request: NextRequest,
  { params }: { params: { fileId: string } }
) {
  try {
    const bucket = await getBucket();
    
    if (!ObjectId.isValid(params.fileId)) {
      return NextResponse.json({ error: "ID de fichier invalide" }, { status: 400 });
    }
    
    const fileId = new ObjectId(params.fileId);
    const downloadStream = bucket.openDownloadStream(fileId);
    
    return new NextResponse(downloadStream as any, {
      headers: {
        'Content-Type': 'image/jpeg', // Vous pouvez rendre ceci dynamique si besoin
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });

  } catch (error) {
    console.error("Impossible de récupérer l'image:", error);
    return NextResponse.json({ error: "Image non trouvée" }, { status: 404 });
  }
}
