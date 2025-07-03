"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"
import { toast } from "sonner"

export function CSVExportButton() {
  const [exporting, setExporting] = useState(false)

  const handleExport = async () => {
    setExporting(true)
    try {
      console.log("📤 Début de l'export CSV...")

      // MODIFICATION 3: Utiliser l'endpoint qui génère le CSV avec toutes les données
      const response = await fetch("/api/export/csv-data", {
        method: "GET",
      })

      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`)
      }

      // Récupérer le contenu CSV
      const csvContent = await response.text()
      console.log("✅ CSV reçu, taille:", csvContent.length, "caractères")

      // Créer un blob et télécharger
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
      const url = URL.createObjectURL(blob)

      const link = document.createElement("a")
      link.href = url
      link.download = `luminaires-export-${new Date().toISOString().split("T")[0]}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      URL.revokeObjectURL(url)

      toast.success("Export CSV terminé avec succès")
      console.log("✅ Export CSV terminé")
    } catch (error: any) {
      console.error("❌ Erreur export CSV:", error)
      toast.error("Erreur lors de l'export CSV: " + error.message)
    } finally {
      setExporting(false)
    }
  }

  return (
    <Button
      onClick={handleExport}
      disabled={exporting}
      style={{ backgroundColor: "#f2d895", color: "#000" }}
      className="hover:opacity-90"
    >
      <Download className="w-4 h-4 mr-2" />
      {exporting ? "Export en cours..." : "Exporter CSV"}
    </Button>
  )
}
