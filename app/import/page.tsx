"use client";

import { useState } from "react";
import { UploadForm } from "@/components/UploadForm";
import { toast } from "sonner";
import { RoleGuard } from "@/components/RoleGuard";

export default function ImportPage() {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  // Étape 1: Importer les données textuelles du CSV
  const handleCsvUpload = async (data: any[]) => {
    setIsUploading(true);
    toast.info(`Import de ${data.length} luminaires en cours...`);
    setProgress({ current: 0, total: data.length });
    
    let successCount = 0;
    
    for (const [index, item] of data.entries()) {
      try {
        const luminaireData = {
          nom: item["Nom luminaire"] || "",
          designer: item["Artiste / Dates"] || "",
          annee: Number.parseInt(item["Année"], 10) || null,
          filename: item["Nom du fichier"] || "", // Clé pour l'association future
          // Ajoutez ici tous les autres champs pertinents du CSV
        };
        const response = await fetch("/api/luminaires", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(luminaireData),
        });
        if (response.ok) {
          successCount++;
        }
        setProgress({ current: index + 1, total: data.length });
      } catch (e) {
        console.error("Erreur sur une ligne du CSV:", item, e);
      }
    }
    
    toast.success(`Import CSV terminé: ${successCount}/${data.length} luminaires créés.`);
    setIsUploading(false);
  };

  // Étape 2: Importer les images UNE PAR UNE et les associer
  const handleImagesUpload = async (files: File[]) => {
    setIsUploading(true);
    toast.info(`Préparation de l'upload de ${files.length} images...`);
    setProgress({ current: 0, total: files.length });

    let successCount = 0;
    let associationCount = 0;
    
    for (const [index, file] of files.entries()) {
      try {
        toast.info(`Upload de l'image ${index + 1}/${files.length}: ${file.name}`);
        
        // 1. Uploader UN SEUL fichier
        const formData = new FormData();
        formData.append("files", file);
        
        const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
        const result = await uploadRes.json();
        
        if (!uploadRes.ok || !result.uploadedFiles?.[0]) {
          throw new Error(`Échec de l'upload pour ${file.name}`);
        }
        successCount++;
        
        // 2. Associer ce fichier
        const uploadedFile = result.uploadedFiles[0];
        const filename = uploadedFile.originalName.replace(/\.[^/.]+$/, "");
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
        if (assocResponse.ok) associationCount++;

        setProgress({ current: index + 1, total: files.length });

      } catch (e: any) {
        toast.error(e.message || `Une erreur est survenue avec ${file.name}`);
        console.error(e);
      }
    }
    
    toast.success(`Opération terminée: ${successCount} images uploadées, ${associationCount} associées.`);
    setIsUploading(false);
  };

  return (
    <RoleGuard requiredRole="admin">
      <div className="container mx-auto py-8">
        <h1 className="text-4xl font-bold mb-8">Système d'Import de Données</h1>
        {isUploading && (
          <div className="my-4">
            <p className="text-blue-600 font-semibold">Opération en cours... ({progress.current}/{progress.total})</p>
            <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${(progress.current/progress.total)*100}%` }}></div>
            </div>
          </div>
        )}
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
                <h3 className="font-semibold text-lg">Étape 2: Importer Images des Luminaires</h3>
                <p className="text-sm text-gray-500 mb-2">Le nom des images doit correspondre à la colonne "Nom du fichier" du CSV.</p>
                <UploadForm onUpload={handleImagesUpload} type="images" multiple disabled={isUploading} />
              </div>
            </div>
          </div>
          {/* Le bloc pour les designers/vidéo peut être ajouté ici sur le même modèle */}
        </div>
      </div>
    </RoleGuard>
  );
}
