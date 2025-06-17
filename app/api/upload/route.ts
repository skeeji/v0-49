import { type NextRequest, NextResponse } from "next/server";
import { GridFSBucket } from "mongodb";
import clientPromise from "@/lib/mongodb";
import { v4 as uuidv4 } from "uuid";

const DBNAME = process.env.MONGO_INITDB_DATABASE!;

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const files = formData.getAll("files") as File[];
  if (!files.length) return NextResponse.json({ error: "Aucun fichier" }, { status: 400 });

  try {
    const client = await clientPromise;
    const db = client.db(DBNAME);
    const bucket = new GridFSBucket(db, { bucketName: "uploads" });
    const uploadedFiles = [];

    for (const file of files) {
      const fileBuffer = Buffer.from(await file.arrayBuffer());
      const uniqueFileName = `<span class="math-inline">\{uuidv4\(\)\}\-</span>{file.name}`;
      const uploadStream = bucket.openUploadStream(uniqueFileName, {
        metadata: { contentType: file.type, originalName: file.name }
      });
      await new Promise<void>((resolve, reject) => {
        uploadStream.end(fileBuffer, (error) => error ? reject(error) : resolve());
      });
      uploadedFiles.push({ fileId: uploadStream.id.toString(), originalName: file.name });
    }
    return NextResponse.json({ uploadedFiles });
  } catch (error) {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
