"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { UploadForm } from "@/components/UploadForm"

export default function ImportPage() {
  const [isImporting, setIsImporting] = useState(false)
  const [importResult, setImportResult] = useState<any>(null)
  const [importType, setImportType] = useState<"luminaires" | "designers" | "general">("general")

  const handleImport = async (file: File, type: "luminaires" | "designers" | "general" = "general") => {
    setIsImporting(true)
    setImportResult(null)

    try {
      const formData = new FormData()
      formData.append("file", file)

      // Choisir l'endpoint selon le type
      let endpoint = "/api/upload/csv"
      if (type === "luminaires") {
        endpoint = "/api/upload/csv-luminaires"
      } else if (type === "designers") {
        endpoint = "/api/upload/csv-designers"
      }

      console.log(`📤 Import ${type} vers ${endpoint}`)

      const response = await fetch(endpoint, {
        method: "POST",
        body: formData,
      })

      const result = await response.json()
      console.log("📊 Résultat import:", result)

      setImportResult(result)
    } catch (error) {
      console.error("❌ Erreur import:", error)
      setImportResult({
        success: false,
        error: "Erreur lors de l'import",
        details: error instanceof Error ? error.message : "Erreur inconnue",
      })
    } finally {
      setIsImporting(false)
    }
  }

  const resetDatabase = async () => {
    if (!confirm("⚠️ Êtes-vous sûr de vouloir vider la base de données ? Cette action est irréversible.")) {
      return
    }

    try {
      const response = await fetch("/api/reset", {
        method: "POST",
      })

      const result = await response.json()
      console.log("🗑️ Résultat reset:", result)

      if (result.success) {
        alert("✅ Base de données vidée avec succès")
        setImportResult(null)
      } else {
        alert(`❌ Erreur: ${result.error}`)
      }
    } catch (error) {
      console.error("❌ Erreur reset:", error)
      alert("❌ Erreur lors du reset de la base de données")
    }
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Import de données</h1>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Import Luminaires */}
          <Card>
            <CardHeader>
              <CardTitle>Import Luminaires</CardTitle>
              <CardDescription>
                Importer le fichier CSV des luminaires
                <br />
                <strong>Format attendu:</strong> Artiste/Dates, Spécialité, Collaboration/Œuvre, Nom luminaire, Année,
                Signé, Nom du fichier
              </CardDescription>
            </CardHeader>
            <CardContent>
              <UploadForm
                onUpload={(file) => handleImport(file, "luminaires")}
                isUploading={isImporting && importType === "luminaires"}
                accept=".csv"
                buttonText="Importer les luminaires"
                onUploadStart={() => setImportType("luminaires")}
              />
            </CardContent>
          </Card>

          {/* Import Designers */}
          <Card>
            <CardHeader>
              <CardTitle>Import Designers</CardTitle>
              <CardDescription>
                Importer le fichier CSV des designers
                <br />
                <strong>Format attendu:</strong> Nom, imagedesigner
              </CardDescription>
            </CardHeader>
            <CardContent>
              <UploadForm
                onUpload={(file) => handleImport(file, "designers")}
                isUploading={isImporting && importType === "designers"}
                accept=".csv"
                buttonText="Importer les designers"
                onUploadStart={() => setImportType("designers")}
              />
            </CardContent>
          </Card>

          {/* Import Général */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Import Général (Legacy)</CardTitle>
              <CardDescription>Import général pour les anciens formats CSV</CardDescription>
            </CardHeader>
            <CardContent>
              <UploadForm
                onUpload={(file) => handleImport(file, "general")}
                isUploading={isImporting && importType === "general"}
                accept=".csv"
                buttonText="Import général"
                onUploadStart={() => setImportType("general")}
              />
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="mt-8 flex gap-4">
          <Button variant="destructive" onClick={resetDatabase}>
            🗑️ Vider la base de données
          </Button>
        </div>

        {/* Résultats */}
        {importResult && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle className={importResult.success ? "text-green-600" : "text-red-600"}>
                {importResult.success ? "✅ Import réussi" : "❌ Erreur d'import"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p>
                  <strong>Message:</strong> {importResult.message || importResult.error}
                </p>
                {importResult.imported && (
                  <p>
                    <strong>Éléments importés:</strong> {importResult.imported}
                  </p>
                )}
                {importResult.processed && (
                  <p>
                    <strong>Lignes traitées:</strong> {importResult.processed}
                  </p>
                )}
                {importResult.totalErrors > 0 && (
                  <div>
                    <p>
                      <strong>Erreurs:</strong> {importResult.totalErrors}
                    </p>
                    {importResult.errors && importResult.errors.length > 0 && (
                      <div className="mt-2">
                        <p className="font-medium">Premières erreurs:</p>
                        <ul className="list-disc list-inside text-sm text-gray-600">
                          {importResult.errors.map((error: string, index: number) => (
                            <li key={index}>{error}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
                {importResult.details && (
                  <p>
                    <strong>Détails:</strong> {importResult.details}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
