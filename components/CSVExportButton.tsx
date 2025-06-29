"use client"

import { Download } from "lucide-react"
import { Button } from "@/components/ui/button"

interface CSVExportButtonProps {
  data: any[]
  filename: string
}

export function CSVExportButton({ data, filename }: CSVExportButtonProps) {
  const exportToCSV = () => {
    if (data.length === 0) {
      alert("Aucune donnée à exporter")
      return
    }

    // Créer les en-têtes
    const headers = Object.keys(data[0])

    // Créer les lignes CSV
    const csvContent = [
      headers.join(","),
      ...data.map((row) =>
        headers
          .map((header) => {
            const value = row[header] || ""
            // Échapper les guillemets et virgules
            return `"${String(value).replace(/"/g, '""')}"`
          })
          .join(","),
      ),
    ].join("\n")

    // Créer et télécharger le fichier
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)

    link.setAttribute("href", url)
    link.setAttribute("download", `${filename}.csv`)
    link.style.visibility = "hidden"

    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <Button onClick={exportToCSV} variant="outline">
      <Download className="w-4 h-4 mr-2" />
      Export CSV
    </Button>
  )
}
