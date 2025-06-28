"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Upload, FileText, ImageIcon, RotateCcw, AlertCircle } from "lucide-react"
import { useToast } from "@/hooks/useToast"

interface ImportStats {
  luminaires: number
  images: number
  errors: number
}

export default function ImportPage() {
  const [isImporting, setIsImporting] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  const [importStats, setImportStats] = useState<ImportStats>({ luminaires: 0, images: 0, errors: 0 })
  const [logs, setLogs] = useState<string[]>([])
  const { showToast } = useToast()

  const addLog = (message: string) => {
    console.log(message)
    setLogs((prev) => [...prev.slice(-9), `${new Date().toLocaleTimeString()} - ${message}`])
  }

  const handleCSVUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    addLog(`📁 Fichier CSV sélectionné: ${file.name}`)
    setIsImporting(true)
    setImportStats({ luminaires: 0, images: 0, errors: 0 })

    try {
      const formData = new FormData()
      formData.append("file", file)

      addLog("📤 Upload du fichier CSV en cours...")
      const response = await fetch("/api/upload/csv", {
        method: "POST",
        body: formData,
      })

      const result = await response.json()
      addLog(`📊 Réponse serveur: ${JSON.stringify(result)}`)

      if (result.success) {
        setImportStats((prev) => ({ ...prev, luminaires: result.imported || 0 }))
        addLog(`✅ ${result.imported} luminaires importés avec succès`)
        showToast(`${result.imported} luminaires importés avec succès`, "success")
      } else {
        addLog(`❌ Erreur: ${result.error}`)
        setImportStats((prev) => ({ ...prev, errors: prev.errors + 1 }))
        showToast(`Erreur: ${result.error}`, "error")
      }
    } catch (error: any) {
      addLog(`❌ Erreur réseau: ${error.message}`)
      setImportStats((prev) => ({ ...prev, errors: prev.errors + 1 }))
      showToast("Erreur lors de l'import du CSV", "error")
    } finally {
      setIsImporting(false)
      // Reset input
      event.target.value = ""
    }
  }

  const handleImagesUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    addLog(`🖼️ ${files.length} images sélectionnées`)
    setIsImporting(true)

    try {
      const formData = new FormData()
      Array.from(files).forEach((file) => {
        formData.append("images", file)
      })

      addLog("📤 Upload des images en cours...")
      const response = await fetch("/api/upload/images", {
        method: "POST",
        body: formData,
      })

      const result = await response.json()
      addLog(`📊 Réponse serveur: ${JSON.stringify(result)}`)

      if (result.success) {
        const uploaded = result.uploaded || files.length
        setImportStats((prev) => ({ ...prev, images: prev.images + uploaded }))
        addLog(`✅ ${uploaded} images uploadées avec succès`)
        showToast(`${uploaded} images uploadées avec succès`, "success")
      } else {
        addLog(`❌ Erreur: ${result.error}`)
        setImportStats((prev) => ({ ...prev, errors: prev.errors + 1 }))
        showToast(`Erreur: ${result.error}`, "error")
      }
    } catch (error: any) {
      addLog(`❌ Erreur réseau: ${error.message}`)
      setImportStats((prev) => ({ ...prev, errors: prev.errors + 1 }))
      showToast("Erreur lors de l'upload des images", "error")
    } finally {
      setIsImporting(false)
      // Reset input
      event.target.value = ""
    }
  }

  const handleReset = async () => {
    if (
      !confirm("⚠️ Êtes-vous sûr de vouloir supprimer TOUTES les données et images ? Cette action est irréversible !")
    ) {
      return
    }

    addLog("🗑️ Début de la réinitialisation...")
    setIsResetting(true)

    try {
      const response = await fetch("/api/reset", {
        method: "POST",
      })

      const result = await response.json()
      addLog(`📊 Réponse serveur: ${JSON.stringify(result)}`)

      if (result.success) {
        setImportStats({ luminaires: 0, images: 0, errors: 0 })
        addLog("✅ Base de données et fichiers réinitialisés avec succès")
        showToast("Réinitialisation terminée avec succès", "success")
      } else {
        addLog(`❌ Erreur: ${result.error}`)
        showToast(`Erreur: ${result.error}`, "error")
      }
    } catch (error: any) {
      addLog(`❌ Erreur réseau: ${error.message}`)
      showToast("Erreur lors de la réinitialisation", "error")
    } finally {
      setIsResetting(false)
    }
  }

  return (
    <div className="container-responsive py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-playfair text-dark mb-8">Import de données</h1>

        {/* Statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Luminaires</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{importStats.luminaires}</div>
              <p className="text-xs text-muted-foreground">importés</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Images</CardTitle>
              <ImageIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{importStats.images}</div>
              <p className="text-xs text-muted-foreground">uploadées</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Erreurs</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{importStats.errors}</div>
              <p className="text-xs text-muted-foreground">rencontrées</p>
            </CardContent>
          </Card>
        </div>

        {/* Actions d'import */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Import CSV
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">Importez un fichier CSV contenant les données des luminaires</p>
              <div className="relative">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleCSVUpload}
                  disabled={isImporting}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                />
                <Button disabled={isImporting} className="w-full">
                  <Upload className="w-4 h-4 mr-2" />
                  {isImporting ? "Import en cours..." : "Sélectionner un fichier CSV"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5" />
                Import Images
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">Uploadez les images des luminaires (JPG, PNG)</p>
              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImagesUpload}
                  disabled={isImporting}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                />
                <Button disabled={isImporting} className="w-full">
                  <Upload className="w-4 h-4 mr-2" />
                  {isImporting ? "Upload en cours..." : "Sélectionner des images"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Réinitialisation */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <RotateCcw className="w-5 h-5" />
              Réinitialisation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              ⚠️ Supprime TOUTES les données et images de la base de données. Cette action est irréversible !
            </p>
            <Button onClick={handleReset} disabled={isResetting} variant="destructive" className="w-full">
              <RotateCcw className="w-4 h-4 mr-2" />
              {isResetting ? "Réinitialisation en cours..." : "Réinitialiser la base de données"}
            </Button>
          </CardContent>
        </Card>

        {/* Logs */}
        <Card>
          <CardHeader>
            <CardTitle>Logs d'activité</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-50 rounded-lg p-4 h-64 overflow-y-auto">
              {logs.length === 0 ? (
                <p className="text-gray-500 text-sm">Aucune activité pour le moment...</p>
              ) : (
                logs.map((log, index) => (
                  <div key={index} className="text-sm font-mono mb-1">
                    {log}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
