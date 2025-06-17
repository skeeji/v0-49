"use client";

import { useState } from "react";
import { UploadForm } from "@/components/UploadForm";
import { toast } from "sonner";
import { RoleGuard } from "@/components/RoleGuard";

export default function ImportPage() {
  const [isUploading, setIsUploading] = useState(false);
  const [lastImportStats, setLastImportStats] = useState<any>(null);

  // Fonction pour associer une image à une entité (luminaire ou designer)
  const associateFile = async (entity: string, matchField: string, matchValue: string, fileId: string) => {
    // Cette fonction est un placeholder. L'association se fait maintenant via une API dédiée
    // pour plus de robustesse.
  };

  // Gère l'import du CSV des luminaires
  const handleCsvUpload = async (data: any[]) => {
    setIsUploading(true);
    toast.info(`Import de ${data.length} luminaires en cours...`);
    let successCount = 0;
    let errorCount = 0;

    for (const item of data) {
      try {
        const luminaireData = {
          nom: item["Nom luminaire"] || "",
          designer: item["Artiste / Dates"] || "",
          annee: Number.parseInt(item["Année"], 10) || null,
          filename: item["Nom du fichier"] || "", // Clé pour l'association future
          // Ajoutez ici tous les autres champs de votre CSV
        };
        const response = await fetch("/api/luminaires", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(luminaireData),
        });
        if (response.ok) {
          successCount++;
        } else {
          errorCount++;
        }
      } catch (e) {
        errorCount++;
      }
    }
    toast.success(`Import CSV terminé: ${successCount} succès, ${errorCount} échecs.`);
    setLastImportStats({ type: 'Luminaires CSV', success: successCount, total: data.length });
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
        const imageId = uploadedFile.fileId;
  
        // Nous créons une nouvelle API juste pour ça
        const assocResponse = await fetch('/api/luminaires/associate-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename, imageId })
        });
        if (assocResponse.ok) associatedCount++;
      }
      
      toast.success(`Opération terminée: ${associatedCount} images associées.`);
      setLastImportStats({ type: 'Images Luminaires', success: associatedCount, total: files.length });

    } catch (e: any) {
      toast.error(e.message || "Une erreur est survenue.");
    } finally {
      setIsUploading(false);
    }
  };


  return (
    <RoleGuard requiredRole="admin">
      <div className="container mx-auto py-8">
        <h1 className="text-4xl font-bold mb-8">Système d'Import</h1>
        {isUploading && <div className="text-blue-600 font-semibold my-4">Opération en cours, veuillez patienter...</div>}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="p-6 border rounded-lg shadow-md">
            <h2 className="text-2xl font-bold mb-4">Luminaires</h2>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold">1. Importer le Fichier CSV</h3>
                <p className="text-sm text-gray-500 mb-2">Crée les entrées de base pour chaque luminaire.</p>
                <UploadForm onUpload={handleCsvUpload} type="csv" disabled={isUploading} />
              </div>
              <div>
                <h3 className="font-semibold">2. Importer les Images</h3>
                <p className="text-sm text-gray-500 mb-2">Associe les images aux luminaires via le "Nom du fichier".</p>
                <UploadForm onUpload={handleImagesUpload} type="images" multiple disabled={isUploading} />
              </div>
            </div>
          </div>
          {/* Ajoutez un bloc similaire pour les Designers et la Vidéo */}
          <div className="p-6 border rounded-lg bg-gray-50">
            <h2 className="text-2xl font-bold mb-4">Designers & Vidéo</h2>
            <p className="text-gray-600">La logique pour les designers et la vidéo d'accueil suivra exactement le même modèle que pour les luminaires.</p>
          </div>
        </div>
        {lastImportStats && <div className="mt-6 p-4 bg-green-100 text-green-800 rounded">Dernier import ({lastImportStats.type}): {lastImportStats.success}/{lastImportStats.total} succès.</div>}
      </div>
    </RoleGuard>
  );
}
