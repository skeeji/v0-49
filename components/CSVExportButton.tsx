"use client"

import { Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/useToast"

interface CSVExportButtonProps {
  data: any[]
}

export function CSVExportButton({ data }: CSVExportButtonProps) {
  const { showToast } = useToast()

  const exportToCSV = () => {
    if (data.length === 0) {
      showToast("Aucune donnée à exporter", "error")
      return
    }

    // Définir tous les champs possibles pour s'assurer que tous les luminaires ont les mêmes colonnes
    const allFields = [
      "id",
      "name",
      "artist",
      "year",
      "specialty",
      "collaboration",
      "signed",
      "image",
      "filename",
      "dimensions",
      "estimation",
      "materials",
      "description",
      "url",
    ]

    // Créer les en-têtes avec des noms plus lisibles
    const headers = {
      id: "ID",
      name: "Nom du luminaire",
      artist: "Artiste / Dates",
      year: "Année",
      specialty: "Spécialité",
      collaboration: "Collaboration / Œuvre",
      signed: "Signé",
      image: "URL Image",
      filename: "Nom du fichier",
      dimensions: "Dimensions",
      estimation: "Estimation",
      materials: "Matériaux",
      description: "Description",
      url: "Lien internet",
    }

    // Créer la ligne d'en-tête
    const headerRow = allFields.map((field) => headers[field] || field).join(",")

    // Créer les lignes de données
    const rows = data.map((item) => {
      return allFields
        .map((field) => {
          const value = item[field] || ""
          // Échapper les virgules et les guillemets pour le format CSV
          const escapedValue = String(value).replace(/"/g, '""')
          return `"${escapedValue}"`
        })
        .join(",")
    })

    // Assembler le contenu CSV
    const csvContent = [headerRow, ...rows].join("\n")

    // Créer et télécharger le fichier
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)

    link.setAttribute("href", url)
    link.setAttribute("download", `luminaires_${new Date().toISOString().split("T")[0]}.csv`)
    link.style.visibility = "hidden"

    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    showToast("Export CSV réussi", "success")
  }

  return (
    <Button onClick={exportToCSV} disabled={data.length === 0} className="bg-orange hover:bg-orange/90">
      <Download className="w-4 h-4 mr-2" />📤 Exporter (.csv)
    </Button>
  )
}
