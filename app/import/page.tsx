"use client"

import { useState } from "react"
import { UploadForm } from "@/components/UploadForm"
import { Button } from "@/components/ui/button"
import { Trash2 } from "lucide-react"
import { useToast } from "@/hooks/useToast"
import { RoleGuard } from "@/components/RoleGuard"
import { createSlug } from "@/lib/utils"

export default function ImportPage() {
  const [csvData, setCsvData] = useState<any[]>([]);
  const [images, setImages] = useState<File[]>([]);
  const [designers, setDesigners] = useState<any[]>([]);
  const [designerImages, setDesignerImages] = useState<File[]>([]);
  const [video, setVideo] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const { showToast } = useToast();

  const handleCsvUpload = async (data: any[]) => { /* Votre code existant */ };
  const handleImagesUpload = async (files: File[]) => { /* Votre code existant */ };
  const handleDesignersUpload = async (data: any[]) => {
    setIsUploading(true);
    try {
      const processedDesigners = data.map((item) => {
        const nom = item["Nom"] || "";
        return { nom: nom, imageFile: item["imagedesigner"] || "", slug: createSlug(nom), images: [] };
      });
      let successCount = 0;
      for (const designer of processedDesigners) {
        if (!designer.nom) continue;
        try {
          const response = await fetch("/api/designers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(designer) });
          if (response.ok) successCount++;
        } catch (error) { console.error("Erreur ajout designer:", error); }
      }
      showToast(`${successCount}/${processedDesigners.length} designers importés`, "success");
    } catch (e) { showToast("Erreur import designers", "error"); }
    finally { setIsUploading(false); }
  };

  const handleDesignerImagesUpload = async (files: File[]) => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      files.forEach((file) => formData.append("files", file));
      const response = await fetch("/api/upload/images", { method: "POST", body: formData });
      if (!response.ok) throw new Error("Upload des images a échoué");

      const result = await response.json();
      const designersResponse = await fetch("/api/designers");
      const designersData = await designersResponse.json();
      if (!designersData.success) throw new Error("Impossible de récupérer les designers");

      let successCount = 0;
      for (const uploadedFile of result.uploadedFiles) {
        const matchingDesigner = designersData.designers.find((d: any) => d.imageFile === uploadedFile.name);
        if (matchingDesigner?.slug) {
          const updateResponse = await fetch(`/api/designers/${matchingDesigner.slug}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ images: [...(matchingDesigner.images || []), uploadedFile.path] }),
          });
          if(updateResponse.ok) successCount++;
        }
      }
      showToast(`${successCount} images de designers associées.`, "success");
    } catch (error: any) { showToast(error.message, "error"); }
    finally { setIsUploading(false); }
  };

  const handleVideoUpload = async (file: File) => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("video", file);
      const response = await fetch("/api/upload/video", { method: "POST", body: formData });
      if (response.ok) {
        setVideo(file);
        showToast("Vidéo d'accueil sauvegardée.", "success");
      } else {
        throw new Error("L'upload de la vidéo a échoué");
      }
    } catch (error: any) {
      showToast(error.message, "error");
    } finally { setIsUploading(false); }
  };

  const resetImports = async () => {
    const isConfirmed = window.confirm("Êtes-vous certain de vouloir vider les collections LUMINAIRES et DESIGNERS ? Cette action est irréversible.");
    if (isConfirmed) {
      setIsUploading(true);
      try {
        const response = await fetch("/api/reset", { method: "DELETE" });
        if (response.ok) {
          showToast("Base de données réinitialisée.", "success");
          setCsvData([]); setImages([]); setDesigners([]); setDesignerImages([]);
        } else {
          throw new Error("La réinitialisation a échoué.");
        }
      } catch (error: any) {
        showToast(error.message, "error");
      } finally {
        setIsUploading(false);
      }
    }
  };

  return (
    <RoleGuard requiredRole="admin">
        {/* ... Votre JSX complet ici ... */}
    </RoleGuard>
  )
}
