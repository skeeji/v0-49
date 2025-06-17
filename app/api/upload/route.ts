import { type NextRequest, NextResponse } from "next/server";
import { GridFSBucket } from "mongodb";
import clientPromise from "@/lib/mongodb";
import { v4 as uuidv4 } from "uuid";

const DBNAME = process.env.MONGO_INITDB_DATABASE!;

export async function POST(request: NextRequest) {
  try {
    const client = await clientPromise;
    const db = client.db(DBNAME);
    const bucket = new GridFSBucket(db, { bucketName: "uploads" });

    const formData = await request.formData();
    const files = formData.getAll("files") as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "Aucun fichier fourni" }, { status: 400 });
    }

    const uploadedFiles = [];
    const errors = [];

    for (const file of files) {
      try {
        const fileBuffer = Buffer.from(await file.arrayBuffer());
        const uniqueFileName = `${uuidv4()}-${file.name}`;
        
        const uploadStream = bucket.openUploadStream(uniqueFileName, {
          metadata: { contentType: file.type, originalName: file.name }
        });

        await new Promise<void>((resolve, reject) => {
          uploadStream.end(fileBuffer, (error) => {
            if (error) reject(error);
            else resolve();
          });
        });

        uploadedFiles.push({
          fileId: uploadStream.id.toString(),
          originalName: file.name,
        });
      } catch (error: any) {
        errors.push({ name: file.name, error: error.message });
      }
    }
    return NextResponse.json({ uploadedFiles, errors });
  } catch (error) {
    return NextResponse.json({ error: "Erreur serveur lors de l'upload" }, { status: 500 });
  }
}
