"use client"

import { useState } from "react"
import { UploadForm } from "@/components/UploadForm"
import { toast } from "sonner"
import { RoleGuard } from "@/components/RoleGuard"
import { Button } from "@/components/ui/button"

export default function ImportPage() {
  const [isUploading, setIsUploading] = useState(false);

  // Fonction générique pour associer une image
  const associateImage = async (entity: 'luminaires' | 'designers', matchField: string, matchValue: string, imageId: string) => {
    try {
      await fetch('/api/associate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entity, matchField, matchValue, imageId })
      });
    } catch (e) {
      // Gérer l'erreur d'association si nécessaire
    }
  };

  // Traite le CSV des luminaires
  const handleCsvUpload = async (data: any[]) => {
    setIsUploading(true);
    toast.info(`Import de ${data.length} luminaires...`);
    let successCount = 0;
    for (const item of data) {
      const response = await fetch("/api/luminaires", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nom: item["Nom luminaire"] || "",
          designer: item["Artiste / Dates"] || "",
          annee: Number.parseInt(item["Année"], 10) || null,
          filename: item["Nom du fichier"] || "",
        }),
      });
      if (response.ok) successCount++;
    }
    toast.success(`Import CSV terminé: ${successCount}/${data.length} luminaires insérés.`);
    setIsUploading(false);
  };

  // Gère l'upload des images et les associe
  const handleImagesUpload = async (files: File[]) => {
    setIsUploading(true);
    toast.info(`1/2: Upload de ${files.length} images...`);
    const formData = new FormData();
    files.forEach(file => formData.append("files", file));
    
    try {
      const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
      const result = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(result.error);

      toast.info(`2/2: Association de ${result.uploadedFiles.length} images...`);
      let associatedCount = 0;
      for (const uploadedFile of result.uploadedFiles) {
        const filename = uploadedFile.originalName.replace(/\.[^/.]+$/, "");
        await associateImage('luminaires', 'filename', filename, uploadedFile.fileId);
        associatedCount++;
      }
      toast.success(`Opération terminée: ${associatedCount} images associées.`);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setIsUploading(false);
    }
  };

  // Logique pour les designers (à faire fonctionner sur le même modèle)
  const handleDesignersUpload = async (data: any[]) => toast.info("Fonctionnalité à câbler.");
  const handleDesignerImagesUpload = async (files: File[]) => toast.info("Fonctionnalité à câbler.");
  const handleVideoUpload = async (file: File) => toast.info("Fonctionnalité à câbler.");

  return (
    <RoleGuard requiredRole="admin">
      <div className="container mx-auto py-8">
        <h1 className="text-4xl font-bold mb-8">Import des Données</h1>
        {isUploading && <p className="text-blue-500 my-4">Opération en cours...</p>}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="p-6 border rounded-lg">
            <h2 className="text-2xl font-bold mb-4">Luminaires</h2>
            <p className="text-sm text-gray-600 mb-2">1. Importez le fichier CSV.</p>
            <UploadForm onUpload={handleCsvUpload} type="csv" disabled={isUploading} />
            <p className="text-sm text-gray-600 mt-4 mb-2">2. Importez les images correspondantes.</p>
            <UploadForm onUpload={handleImagesUpload} type="images" multiple disabled={isUploading} />
          </div>
          <div className="p-6 border rounded-lg bg-gray-50">
             <h2 className="text-2xl font-bold mb-4">Designers & Vidéo</h2>
             <p className="text-sm text-gray-600 mb-2">Logique à implémenter sur le même modèle que les luminaires.</p>
          </div>
        </div>
      </div>
    </RoleGuard>
  );
}
