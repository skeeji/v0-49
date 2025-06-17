"use client"

import { useState } from "react"
import { UploadForm } from "@/components/UploadForm"
import { toast } from "sonner"
import { RoleGuard } from "@/components/RoleGuard"

export default function ImportPage() {
  const [isUploading, setIsUploading] = useState(false);

  // Étape 1: Importer les données textuelles du CSV
  const handleCsvUpload = async (data: any[]) => {
    setIsUploading(true);
    toast.info(`Import de ${data.length} luminaires...`);
    let successCount = 0;
    
    // Utiliser Promise.all pour envoyer les requêtes en parallèle (plus rapide)
    const allPromises = data.map(item => {
        const luminaireData = {
          nom: item["Nom luminaire"] || "",
          designer: item["Artiste / Dates"] || "",
          annee: Number.parseInt(item["Année"], 10) || null,
          filename: item["Nom du fichier"] || "",
        };
        return fetch("/api/luminaires", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(luminaireData),
        });
    });

    const results = await Promise.allSettled(allPromises);
    successCount = results.filter(r => r.status === 'fulfilled' && r.value.ok).length;
    
    toast.success(`Import CSV terminé: ${successCount}/${data.length} luminaires créés.`);
    setIsUploading(false);
  };

  // Étape 2: Importer les images et les associer
  const handleImagesUpload = async (files: File[]) => {
    setIsUploading(true);
    toast.info(`1/2: Upload de ${files.length} images...`);
    
    const formData = new FormData();
    files.forEach(file => formData.append("files", file));
    
    try {
      // Envoi des fichiers à l'API d'upload
      const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
      const result = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(result.error || "Échec de l'upload.");
      
      toast.info(`2/2: Association de ${result.uploadedFiles.length} images...`);
      let associatedCount = 0;
      
      // Pour chaque image uploadée, on appelle l'API d'association
      for (const uploadedFile of result.uploadedFiles) {
        const filename = uploadedFile.originalName.replace(/\.[^/.]+$/, ""); // Nom sans extension
        const imageId = uploadedFile.fileId;
        
        const assocResponse = await fetch('/api/associate-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            entity: 'luminaires',
            matchField: 'filename',
            matchValue: filename,
            imageId: imageId
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
        {isUploading && <p className="text-blue-600 font-semibold my-4">Opération en cours...</p>}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="p-6 border rounded-lg shadow-sm">
            <h2 className="text-2xl font-bold mb-4">Luminaires</h2>
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold text-lg">Étape 1: Importer Fichier CSV</h3>
                <p className="text-sm text-gray-500 mb-2">Crée les fiches pour chaque luminaire.</p>
                <UploadForm onUpload={handleCsvUpload} type="csv" disabled={isUploading} />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Étape 2: Importer Images</h3>
                <p className="text-sm text-gray-500 mb-2">Associe les images aux luminaires via la colonne "Nom du fichier".</p>
                <UploadForm onUpload={handleImagesUpload} type="images" multiple disabled={isUploading} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </RoleGuard>
  );
}
