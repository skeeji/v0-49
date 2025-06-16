"use client"

import { useState } from "react"
import { UploadForm } from "@/components/UploadForm"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { RoleGuard } from "@/components/RoleGuard"

export default function ImportPage() {
  const [isUploading, setIsUploading] = useState(false);
  const [lastImportStats, setLastImportStats] = useState<any>(null);

  // Gère l'import du CSV Luminaires
  const handleCsvUpload = async (data: any[]) => {
    setIsUploading(true);
    toast.info(`Import de ${data.length} luminaires...`);
    let successCount = 0, errorCount = 0;

    for (const item of data) {
      try {
        const luminaireData = {
          nom: item["Nom luminaire"] || "",
          designer: item["Artiste / Dates"] || "",
          annee: Number.parseInt(item["Année"], 10) || null,
          filename: item["Nom du fichier"] || "", // Clé pour l'association d'image
          // Ajoutez ici les autres champs que vous voulez importer du CSV
        };
        const response = await fetch("/api/luminaires", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(luminaireData),
        });
        if (response.ok) successCount++; else errorCount++;
      } catch { errorCount++; }
    }
    
    toast.success(`Import CSV terminé: ${successCount} succès, ${errorCount} échecs.`);
    setLastImportStats({ type: 'Luminaires', success: successCount, total: data.length });
    setIsUploading(false);
  };

  // Gère l'upload des images et leur association
  const handleImagesUpload = async (files: File[]) => {
    setIsUploading(true);
    toast.info(`Étape 1/2: Upload de ${files.length} images...`);
    try {
      const formData = new FormData();
      files.forEach(file => formData.append("files", file));
      
      const response = await fetch("/api/upload", { method: "POST", body: formData });
      const result = await response.json();

      if (!response.ok) throw new Error(result.error || "Échec de l'upload.");
      toast.info(`Étape 2/2: Association de ${result.uploadedFiles.length} images...`);

      let associatedCount = 0;
      for (const uploadedFile of result.uploadedFiles) {
        const filename = uploadedFile.originalName.replace(/\.[^/.]+$/, "");
        const imageId = uploadedFile.fileId;
        
        const assocResponse = await fetch('/api/luminaires/associate-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename, imageId })
        });
        if (assocResponse.ok) associatedCount++;
      }
      
      toast.success(`Opération terminée: ${associatedCount} images associées aux luminaires.`);
      setLastImportStats({ type: 'Images Luminaires', success: associatedCount, total: files.length });

    } catch (error: any) {
      toast.error(error.message || "Une erreur est survenue.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <RoleGuard requiredRole="admin">
      <div className="container mx-auto py-8">
        <h1 className="text-4xl font-bold mb-8">Import des Données</h1>
        {isUploading && <p className="text-blue-500">Chargement en cours, veuillez patienter...</p>}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="p-6 border rounded-lg">
            <h2 className="text-2xl font-bold mb-4">Luminaires</h2>
            <p className="text-sm text-gray-600 mb-2">1. Importez le fichier CSV des luminaires.</p>
            <UploadForm onUpload={handleCsvUpload} type="csv" disabled={isUploading} />
            <p className="text-sm text-gray-600 mt-4 mb-2">2. Importez les images correspondantes.</p>
            <UploadForm onUpload={handleImagesUpload} type="images" multiple disabled={isUploading} />
          </div>
          {/* Vous pouvez ajouter un bloc similaire pour les Designers ici */}
        </div>
        {lastImportStats && <div className="mt-4 p-4 bg-gray-100 rounded">Dernier import ({lastImportStats.type}): {lastImportStats.success}/{lastImportStats.total} succès.</div>}
      </div>
    </RoleGuard>
  )
}
