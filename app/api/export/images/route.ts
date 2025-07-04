import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { GridFSBucket } from "mongodb";

const DBNAME = process.env.MONGO_INITDB_DATABASE || "luminaires";

export async function GET() {
  try {
    console.log("📦 Début de l'export d'images avec logique de priorité...");

    const client = await clientPromise;
    const db = client.db(DBNAME);
    const bucket = new GridFSBucket(db, { bucketName: "uploads" });

    // --- ÉTAPE 1: Créer les deux listes de référence ---
    console.log("📖 Lecture de la collection 'luminaires'...");
    const luminairesCollection = db.collection("luminaires");
    const allLuminaires = await luminairesCollection.find({}).toArray();

    const designerImageFilenames = new Set<string>();
    const luminaireImageFilenames = new Set<string>();

    allLuminaires.forEach(luminaire => {
      // Liste de tous les champs possibles pour une image de DESIGNER
      const possibleDesignerFields = [
        luminaire.designerImageFilename,
        luminaire.designerImage,
        luminaire["Image Designer"],
        luminaire["designer.jpg"],
      ];
      possibleDesignerFields.forEach(fieldValue => {
        if (fieldValue && typeof fieldValue === "string") {
          designerImageFilenames.add(fieldValue);
        }
      });

      // Liste de tous les champs possibles pour les images de LUMINAIRE
      const possibleLuminaireFields = [
        luminaire.filename,
        ...(Array.isArray(luminaire.images) ? luminaire.images : [])
      ];
      possibleLuminaireFields.forEach(fieldValue => {
        if (fieldValue && typeof fieldValue === 'string') {
          luminaireImageFilenames.add(fieldValue);
        }
      });
    });

    // --- ÉTAPE 2: Appliquer la règle de priorité ---
    // Si une image est dans les deux listes, on la retire de la liste des luminaires.
    // La classification "designer" est prioritaire.
    designerImageFilenames.forEach(designerImage => {
      if (luminaireImageFilenames.has(designerImage)) {
        luminaireImageFilenames.delete(designerImage);
        console.log(`- Priorité appliquée: L'image '${designerImage}' est confirmée comme designer.`);
      }
    });

    console.log(`✅ Références finales: ${designerImageFilenames.size} images de designers, ${luminaireImageFilenames.size} images de luminaires.`);

    // --- ÉTAPE 3: Traiter tous les fichiers du stockage ---
    const allFiles = await bucket.find({}).toArray();
    if (allFiles.length === 0) {
      return NextResponse.json({ error: "Aucune image trouvée dans le stockage" }, { status: 404 });
    }

    const fileData: Array<{ name: string; data: Buffer; crc32: number }> = [];

    for (const file of allFiles) {
      const originalFilename = file.filename || '';
      if (!originalFilename.toLowerCase().endsWith(".jpg")) {
        continue;
      }

      try {
        let folder: string;
        
        // La classification est maintenant fiable grâce à la priorisation
        if (designerImageFilenames.has(originalFilename)) {
          folder = 'designers';
        } else if (luminaireImageFilenames.has(originalFilename)) {
          folder = 'luminaires';
        } else {
          // Si une image n'est référencée nulle part, on l'ignore pour éviter les erreurs.
          console.log(`⚠️ Image ignorée (non référencée): ${originalFilename}`);
          continue;
        }
        
        const zipPath = `${folder}/${originalFilename}`;
        
        const downloadStream = bucket.openDownloadStream(file._id);
        const chunks: Buffer[] = [];
        for await (const chunk of downloadStream) {
          chunks.push(chunk);
        }
        const buffer = Buffer.concat(chunks);

        if (buffer.length > 0) {
          fileData.push({
            name: zipPath,
            data: buffer,
            crc32: calculateCRC32(buffer),
          });
          console.log(`➕ Ajouté au ZIP: ${zipPath}`);
        }
      } catch (fileError) {
        console.error(`❌ Erreur lors du traitement du fichier ${file.filename}:`, fileError);
      }
    }
    
    // --- ÉTAPE 4: CRÉER LE ZIP ---
    const zipBuffer = createZipBuffer(fileData);
    const today = new Date().toISOString().split("T")[0];
    const zipFilename = `export_images_tries_${today}.zip`;

    console.log(`🎉 ZIP final généré avec ${fileData.length} images triées.`);

    return new NextResponse(zipBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${zipFilename}"`,
      },
    });

  } catch (error) {
    console.error("❌ Erreur serveur durant l'export des images:", error);
    return NextResponse.json({ error: "Erreur serveur lors de l'exportation" }, { status: 500 });
  }
}

function createZipBuffer(fileData: Array<{ name: string; data: Buffer; crc32: number }>): Buffer {
  const zipEntries: Buffer[] = [];
  const centralDirectory: Buffer[] = [];
  let offset = 0;

  fileData.forEach(({ name, data, crc32 }) => {
    const nameBuffer = Buffer.from(name.replace(/\\/g, '/'), "utf8");
    const localHeader = Buffer.alloc(30 + nameBuffer.length);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0, 6);
    localHeader.writeUInt16LE(0, 8);
    const now = new Date();
    const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
    const dosDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
    localHeader.writeUInt16LE(dosTime, 10);
    localHeader.writeUInt16LE(dosDate, 12);
    localHeader.writeUInt32LE(crc32, 14);
    localHeader.writeUInt32LE(data.length, 18);
    localHeader.writeUInt32LE(data.length, 22);
    localHeader.writeUInt16LE(nameBuffer.length, 26);
    localHeader.writeUInt16LE(0, 28);
    nameBuffer.copy(localHeader, 30);
    zipEntries.push(localHeader);
    zipEntries.push(data);
    const centralEntry = Buffer.alloc(46 + nameBuffer.length);
    centralEntry.writeUInt32LE(0x02014b50, 0);
    centralEntry.writeUInt16LE(20, 4);
    centralEntry.writeUInt16LE(20, 6);
    centralEntry.writeUInt16LE(0, 8);
    centralEntry.writeUInt16LE(0, 10);
    centralEntry.writeUInt16LE(dosTime, 12);
    centralEntry.writeUInt16LE(dosDate, 14);
    centralEntry.writeUInt32LE(crc32, 16);
    centralEntry.writeUInt32LE(data.length, 20);
    centralEntry.writeUInt32LE(data.length, 24);
    centralEntry.writeUInt16LE(nameBuffer.length, 28);
    centralEntry.writeUInt16LE(0, 30);
    centralEntry.writeUInt16LE(0, 32);
    centralEntry.writeUInt16LE(0, 34);
    centralEntry.writeUInt16LE(0, 36);
    centralEntry.writeUInt32LE(0, 38);
    centralEntry.writeUInt32LE(offset, 42);
    nameBuffer.copy(centralEntry, 46);
    centralDirectory.push(centralEntry);
    offset += localHeader.length + data.length;
  });
  const centralDirSize = centralDirectory.reduce((sum, entry) => sum + entry.length, 0);
  const endOfCentralDir = Buffer.alloc(22);
  endOfCentralDir.writeUInt32LE(0x06054b50, 0);
  endOfCentralDir.writeUInt16LE(0, 4);
  endOfCentralDir.writeUInt16LE(0, 6);
  endOfCentralDir.writeUInt16LE(fileData.length, 8);
  endOfCentralDir.writeUInt16LE(fileData.length, 10);
  endOfCentralDir.writeUInt32LE(centralDirSize, 12);
  endOfCentralDir.writeUInt32LE(offset, 16);
  endOfCentralDir.writeUInt16LE(0, 20);
  return Buffer.concat([...zipEntries, ...centralDirectory, endOfCentralDir]);
}

function calculateCRC32(buffer: Buffer): number {
  const crcTable = new Int32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    crcTable[i] = c;
  }
  let crc = -1;
  for (let i = 0; i < buffer.length; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ buffer[i]) & 0xFF];
  }
  return (crc ^ -1) >>> 0;
}
