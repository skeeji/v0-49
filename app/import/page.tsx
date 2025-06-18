"use client"

import { useState } from "react"
import { UploadForm } from "@/components/UploadForm"
import { Button } from "@/components/ui/button"
import { Trash2 } from "lucide-react"
import { useToast } from "@/hooks/useToast"
import { RoleGuard } from "@/components/RoleGuard"
import { createSlug } from "@/lib/utils" // <-- On importe notre fonction

export default function ImportPage() {
  const [csvData, setCsvData] = useState<any[]>([]);
  const [images, setImages] = useState<File[]>([]);
  const [designers, setDesigners] = useState<any[]>([]);
  const [designerImages, setDesignerImages] = useState<File[]>([]);
  const [video, setVideo] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const { showToast } = useToast();

  const handleCsvUpload = async (data: any[]) => { /* ... Votre fonction est correcte, pas de changement ... */ };

  const handleImagesUpload = async (files: File[]) => { /* ... Votre fonction est correcte, pas de changement ... */ };

  const handleDesignersUpload = async (data: any[]) => {
    setIsUploading(true);
    try {
      const processedDesigners = data.map((item) => {
        const nom = item["Nom"] || "";
        return {
          nom: nom,
          imageFile: item["imagedesigner"] || "",
          slug: createSlug(nom), // CORRECTION : On crée et sauvegarde le slug
          images: [],
        };
      });

      let successCount = 0;
      for (const designer of processedDesigners) {
        if (!designer.nom) continue;
        try {
          await fetch("/api/designers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(designer) });
          successCount++;
        } catch (error) { console.error("Erreur ajout designer:", error); }
      }
      showToast(`${successCount}/${processedDesigners.length} designers importés`, "success");
    } catch (e) { showToast("Erreur import designers", "error"); }
    finally { setIsUploading(false); }
  };

  const handleDesignerImagesUpload = async (files: File[]) => {
    setIsUploading(true);
    try {
      const uploadFormData = new FormData();
      files.forEach((file) => uploadFormData.append("files", file));
      const uploadResponse = await fetch("/api/upload/images", { method: "POST", body: uploadFormData });
      if (!uploadResponse.ok) throw new Error("Échec upload images");

      const result = await uploadResponse.json();
      const allDesignersResponse = await fetch('/api/designers');
      const allDesignersData = await allDesignersResponse.json();
      if (!allDesignersData.success) throw new Error("Impossible de récupérer les designers");

      const allDesigners = allDesignersData.designers;
      let successCount = 0;

      for (const uploadedFile of result.uploadedFiles) {
        const fileNameWithExt = uploadedFile.name;
        // CORRECTION : On trouve le designer par le nom de fichier image qu'il attend
        const matchingDesigner = allDesigners.find((d: any) => d.imageFile === fileNameWithExt);
        
        if (matchingDesigner && matchingDesigner.slug) {
          try {
            const updatedImages = [...(matchingDesigner.images || []), uploadedFile.path];
            // On utilise le slug pour la mise à jour, c'est 100% fiable
            const updateResponse = await fetch(`/api/designers/${matchingDesigner.slug}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ images: updatedImages }),
            });
            if (updateResponse.ok) successCount++;
          } catch(e) { console.error("Erreur association:", e); }
        } else {
          console.warn(`Aucun designer trouvé pour l'image ${fileNameWithExt}`);
        }
      }
      showToast(`${successCount} images de designers associées.`, "success");
    } catch (error: any) { showToast(error.message, "error"); } 
    finally { setIsUploading(false); }
  };

  const handleVideoUpload = async (file: File) => { /* ... Votre code ... */ };
  const resetImports = async () => { /* ... Votre code ... */ };

  return (
    <RoleGuard requiredRole="admin">
        {/* ... Votre JSX complet ici ... */}
    </RoleGuard>
  )
}
