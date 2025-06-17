"use client"

import { useState } from "react";
import { UploadForm } from "@/components/UploadForm";
import { toast } from "sonner";
import { RoleGuard } from "@/components/RoleGuard";

export default function ImportPage() {
  const [isUploading, setIsUploading] = useState(false);

  // Gère l'import du CSV Luminaires
  const handleCsvUpload = async (data: any[]) => {
    setIsUploading(true);
    toast.info(`Import de ${data.length} luminaires...`);
    let successCount = 0;

    for (const item of data) {
      const luminaireData = {
        nom: item["Nom luminaire"] || "",
        designer: item["Artiste / Dates"] || "",
        annee: Number.parseInt(item["Année"], 10) || null,
        filename: item["Nom du fichier"] || "",
        // Ajoutez tous les autres champs du CSV ici
      };
      const response = await fetch("/api/luminaires", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(luminaireData),
      });
      if (response.ok) successCount++;
    }
    toast.success(`Import CSV terminé: ${successCount}/${data.length} luminaires créés.`);
    setIsUploading(false);
  };

  // Gère l'upload des images et les associe
  const handleImagesUpload = async (files: File[]) => {
    setIsUploading(true);
    toast.info(`Étape 1/2: Upload de ${files.length} images...`);
    
    const formData = new FormData();
    files.forEach(file => formData.append("files", file));
    
    try {
      const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
      const result = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(result.error || "Échec de l'upload.");

      toast.info(`Étape 2/2: Association de ${result.uploadedFiles.length} images...`);
      let associatedCount = 0;
      for (const uploadedFile of result.uploadedFiles) {
        const filename = uploadedFile.originalName.replace(/\.[^/.]+$/, "");
        const assocResponse = await fetch('/api/associate-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            entity: 'luminaires',
            matchField: 'filename',
            matchValue: filename,
            imageId: uploadedFile.fileId
          })
        });
        if (assocResponse.ok) associatedCount++;
      }
      toast.success(`Opération terminée: ${associatedCount} images associées.`);
    } catch (e: any) {
      toast.error(e.message || "Une erreur est survenue.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <RoleGuard requiredRole="admin">
      <div className="container mx-auto py-8">
        <h1 className="text-4xl font-bold mb-8">Système d'Import de Données</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="p-6 border rounded-lg shadow-sm">
            <h2 className="text-2xl font-bold mb-4">Luminaires</h2>
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold text-lg">1. Importer Fichier CSV</h3>
                <p className="text-sm text-gray-500 mb-2">Crée les fiches pour chaque luminaire.</p>
                <UploadForm onUpload={handleCsvUpload} type="csv" disabled={isUploading} />
              </div>
              <div>
                <h3 className="font-semibold text-lg">2. Importer Images</h3>
                <p className="text-sm text-gray-500 mb-2">Le nom des images doit correspondre au "Nom du fichier" du CSV.</p>
                <UploadForm onUpload={handleImagesUpload} type="images" multiple disabled={isUploading} />
              </div>
            </div>
          </div>
          {/* Les autres imports (Designers, Vidéo) peuvent être ajoutés ici sur le même modèle */}
        </div>
      </div>
    </RoleGuard>
  );
}
