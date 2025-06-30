"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Download, Loader2 } from "lucide-react"

interface CSVExportButtonProps {
  data: any[]
  filename: string
  className?: string
}

export function CSVExportButton({ data, filename, className }: CSVExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false)

  const exportToCSV = async () => {
    if (data.length === 0) return

    setIsExporting(true)

    try {
      // Préparer les données pour l'export
      const csvData = data.map((item) => ({
        Nom: item.name || item["Nom luminaire"] || "",
        Artiste: item.artist || item["Artiste / Dates"] || "",
        Année: item.year || item["Année"] || "",
        Période: item.period || item["Période"] || "",
        Type: item.type || item["Type"] || "",
        Spécialité: item.specialty || item["Spécialité"] || "",
        Collaboration: item.collaboration || item["Collaboration / Œuvre"] || "",
        Description: item.description || item["Description"] || "",
      }))

      // Créer le contenu CSV
      const headers = Object.keys(csvData[0])
      const csvContent = [
        headers.join(","),
        ...csvData.map((row) =>
          headers.map((header) => `"${(row[header] || "").toString().replace(/"/g, '""')}"`).join(","),
        ),
      ].join("\n")

      // Créer et télécharger le fichier
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
      const link = document.createElement("a")
      const url = URL.createObjectURL(blob)
      link.setAttribute("href", url)
      link.setAttribute("download", `${filename}_${new Date().toISOString().split("T")[0]}.csv`)
      link.style.visibility = "hidden"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      console.error("Erreur lors de l'export CSV:", error)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <Button onClick={exportToCSV} disabled={isExporting || data.length === 0} className={className} variant="outline">
      {isExporting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Download className="w-4 h-4 mr-2" />}
      Export CSV
    </Button>
  )
}
