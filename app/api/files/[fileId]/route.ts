import { NextResponse } from "next/server";
import { GridFSBucket, ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";
import { Readable } from "stream";

const DBNAME = process.env.MONGO_INITDB_DATABASE!;

export async function GET(request: Request, { params }: { params: { fileId: string } }) {
  try {
    const client = await clientPromise;
    const db = client.db(DBNAME);
    const bucket = new GridFSBucket(db, { bucketName: 'uploads' });
    
    if (!ObjectId.isValid(params.fileId)) {
        return new NextResponse("ID de fichier invalide", { status: 400 });
    }

    const fileId = new ObjectId(params.fileId);

    const files = await bucket.find({ _id: fileId }).toArray();
    if (!files.length) {
        return new NextResponse("Fichier non trouvé", { status: 404 });
    }
    const file = files[0];
    
    const downloadStream = bucket.openDownloadStream(fileId);
    const webStream = Readable.toWeb(downloadStream) as ReadableStream<Uint8Array>;

    return new NextResponse(webStream, {
      status: 200,
      headers: { "Content-Type": file.contentType || "application/octet-stream" },
    });

  } catch (error) {
    console.error(`Erreur API [GET /api/files/${params.fileId}]:`, error);
    return new NextResponse("Erreur serveur", { status: 500 });
  }
}
