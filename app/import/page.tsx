"use client"

import { useState } from "react"
import { UploadForm } from "@/components/UploadForm" // Assurez-vous que ce composant existe
import { Button } from "@/components/ui/button"
import { Trash2 } from "lucide-react"
import { toast } from "sonner"
import { RoleGuard } from "@/components/RoleGuard" // Assurez-vous que ce composant existe

export default function ImportPage() {
  const [isUploading, setIsUploading] = useState(false)
  const [lastImportStats, setLastImportStats] = useState<any>(null)

  // Gère l'upload du CSV et l'insertion des données de base des luminaires
  const handleCsvUpload = async (data: any[]) => {
    setIsUploading(true);
    toast.info(`Début de l'import de ${data.length} luminaires...`);
    let successCount = 0, errorCount = 0;

    for (const [index, item] of data.entries()) {
      try {
        const anneeNum = Number.parseInt(item["Année"], 10);
        const luminaireData = {
          nom: item["Nom luminaire"] || "",
          designer: item["Artiste / Dates"] || "",
          annee: !isNaN(anneeNum) ? anneeNum : 0,
          filename: item["Nom du fichier"] || "", // Clé pour l'association d'image
          // ... autres champs du CSV
        };

        const response = await fetch("/api/luminaires", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(luminaireData),
        });

        if (response.ok) successCount++;
        else errorCount++;
      } catch (error) {
        errorCount++;
        console.error(`Erreur ligne ${index + 1}:`, error);
      }
    }
    
    toast.success(`Import CSV terminé: ${successCount} succès, ${errorCount} échecs.`);
    setLastImportStats({ type: 'Luminaires', success: successCount, total: data.length });
    setIsUploading(false);
  };

  // Gère l'upload des images et leur association
  const handleImagesUpload = async (files: File[]) => {
    setIsUploading(true);
    toast.info(`Upload de ${files.length} images...`);
    try {
      const formData = new FormData();
      files.forEach((file) => formData.append("files", file));

      const response = await fetch("/api/upload/images", { method: "POST", body: formData });
      const result = await response.json();

      if (!response.ok) throw new Error(result.error || "Échec de l'upload.");
      toast.success(`${result.uploadedFiles.length} images uploadées. Association en cours...`);

      // Associer chaque image uploadée
      let associatedCount = 0;
      for (const uploadedFile of result.uploadedFiles) {
        const keyName = uploadedFile.originalName.replace(/\.[^/.]+$/, ""); // Nom sans extension
        const imageId = uploadedFile.fileId; // ID de GridFS

        const assocResponse = await fetch('/api/luminaires/associate-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename: keyName, imageId: imageId })
        });
        if (assocResponse.ok) associatedCount++;
      }
      
      toast.success(`Association terminée: ${associatedCount} images associées.`);
      setLastImportStats({ type: 'Images Luminaires', success: associatedCount, total: files.length });

    } catch (error: any) {
      toast.error(error.message || "Une erreur est survenue.");
    } finally {
      setIsUploading(false);
    }
  };

  // Les autres fonctions (designers, video) suivraient une logique similaire.

  return (
    <RoleGuard requiredRole="admin">
      <div className="container-responsive py-8">
        <h1 className="text-4xl font-playfair text-dark mb-8">Import des données</h1>
        {isUploading && <p>Chargement en cours...</p>}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <h2 className="text-2xl font-playfair text-dark mb-4">Étape 1: Import CSV Luminaires</h2>
            <UploadForm onUpload={handleCsvUpload} type="csv" disabled={isUploading} />
          </div>
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <h2 className="text-2xl font-playfair text-dark mb-4">Étape 2: Import Images Luminaires</h2>
            <UploadForm onUpload={handleImagesUpload} type="images" multiple disabled={isUploading} />
          </div>
          {/* ... Ajoutez ici les autres formulaires d'upload pour designers, etc. */}
        </div>
      </div>
    </RoleGuard>
  )
}
