// app/api/video/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getBucket } from "@/lib/gridfs";
import { ObjectId } from "mongodb";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    if (!ObjectId.isValid(id)) {
      return new NextResponse("ID de vidéo invalide.", { status: 400 });
    }
    
    const bucket = await getBucket();
    const objectId = new ObjectId(id);

    const file = await bucket.find({ _id: objectId }).next();
    if (!file) {
      return new NextResponse("Vidéo non trouvée.", { status: 404 });
    }

    // On utilise les headers pour permettre le streaming (lecture partielle)
    const videoSize = file.length;
    const range = req.headers.get("range");

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : videoSize - 1;
      const chunksize = (end - start) + 1;
      
      const downloadStream = bucket.openDownloadStream(objectId, { start, end: end + 1 });
      
      const headers = new Headers();
      headers.set("Content-Range", `bytes ${start}-${end}/${videoSize}`);
      headers.set("Accept-Ranges", "bytes");
      headers.set("Content-Length", chunksize.toString());
      headers.set("Content-Type", file.contentType || "video/mp4");

      return new Response(downloadStream as any, { status: 206, headers });
    } else {
      const downloadStream = bucket.openDownloadStream(objectId);
      const headers = new Headers();
      headers.set("Content-Length", videoSize.toString());
      headers.set("Content-Type", file.contentType || "video/mp4");
      return new Response(downloadStream as any, { status: 200, headers });
    }

  } catch (error) {
    console.error(`Erreur pour récupérer la vidéo ${params.id} de GridFS:`, error);
    return new NextResponse("Erreur serveur.", { status: 500 });
  }
}
