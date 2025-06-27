// Fichier : app/api/images/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getBucket } from "@/lib/gridfs";
import { ObjectId } from "mongodb";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const bucket = await getBucket();

    if (!ObjectId.isValid(params.id)) {
      return new NextResponse(null, { status: 400, statusText: "Invalid Image ID" });
    }

    const fileId = new ObjectId(params.id);

    const files = await bucket.find({ _id: fileId }).toArray();
    if (!files || files.length === 0) {
      return new NextResponse(null, { status: 404, statusText: "Image not found" });
    }
    const file = files[0];

    const downloadStream = bucket.openDownloadStream(fileId);

    return new NextResponse(downloadStream as any, {
      headers: { 
        'Content-Type': file.contentType || 'application/octet-stream',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });

  } catch (error) {
    console.error(`Error streaming image ${params.id}:`, error);
    return new NextResponse(null, { status: 500, statusText: "Internal Server Error" });
  }
}

// Renommer le paramètre pour correspondre au nom du fichier [id]
export async function revalidate(req: NextRequest, { params }: { params: { id: string } }) {}
