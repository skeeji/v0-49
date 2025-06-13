import { writeFile, mkdir } from "fs/promises"
import { join } from "path"
import { existsSync } from "fs"

export async function saveUploadedFile(file: File, folder: "images" | "videos" | "csv"): Promise<string> {
  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  // Créer le dossier s'il n'existe pas
  const uploadDir = join(process.cwd(), "uploads", folder)
  if (!existsSync(uploadDir)) {
    await mkdir(uploadDir, { recursive: true })
  }

  // Générer un nom de fichier unique
  const timestamp = Date.now()
  const filename = `${timestamp}-${file.name}`
  const filepath = join(uploadDir, filename)

  // Sauvegarder le fichier
  await writeFile(filepath, buffer)

  // Retourner le chemin relatif
  return `/uploads/${folder}/${filename}`
}

export function getFileExtension(filename: string): string {
  return filename.split(".").pop()?.toLowerCase() || ""
}

export function isValidImageType(filename: string): boolean {
  const validTypes = ["jpg", "jpeg", "png", "gif", "webp"]
  return validTypes.includes(getFileExtension(filename))
}

export function isValidVideoType(filename: string): boolean {
  const validTypes = ["mp4", "webm", "ogg", "mov"]
  return validTypes.includes(getFileExtension(filename))
}
