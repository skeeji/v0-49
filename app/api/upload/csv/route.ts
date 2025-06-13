import { type NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"
import { saveUploadedFile } from "@/lib/upload"
import { parse } from "csv-parse/sync"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "Aucun fichier fourni" }, { status: 400 })
    }

    // Sauvegarder le fichier
    const filePath = await saveUploadedFile(file, "csv")

    // Lire et parser le CSV
    const fileContent = await file.text()
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      delimiter: ";",
    })

    const db = await getDatabase()
    const results = {
      success: 0,
      errors: [] as string[],
    }

    // Traiter chaque ligne
    for (let i = 0; i < records.length; i++) {
      const record = records[i]

      try {
        const luminaire = {
          nom: record.nom || "",
          designer: record.designer || "",
          annee: Number.parseInt(record.annee) || new Date().getFullYear(),
          periode: record.periode || "",
          description: record.description || "",
          materiaux: record.materiaux ? record.materiaux.split(",").map((m: string) => m.trim()) : [],
          couleurs: record.couleurs ? record.couleurs.split(",").map((c: string) => c.trim()) : [],
          dimensions: {
            hauteur: record.hauteur ? Number.parseFloat(record.hauteur) : undefined,
            largeur: record.largeur ? Number.parseFloat(record.largeur) : undefined,
            profondeur: record.profondeur ? Number.parseFloat(record.profondeur) : undefined,
          },
          images: record.images ? record.images.split(",").map((img: string) => img.trim()) : [],
          isFavorite: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        }

        await db.collection("luminaires").insertOne(luminaire)
        results.success++
      } catch (error) {
        results.errors.push(`Ligne ${i + 2}: ${error}`)
      }
    }

    return NextResponse.json({
      message: `Import terminé: ${results.success} luminaires importés`,
      filePath,
      results,
    })
  } catch (error) {
    console.error("Erreur lors de l'import CSV:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
