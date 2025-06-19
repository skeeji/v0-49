"use client"

import { useState } from "react"
import { UploadForm } from "@/components/UploadForm"
import { Button } from "@/components/ui/button"
import { Trash2 } from "lucide-react"
import { useToast } from "@/hooks/useToast"
import { RoleGuard } from "@/components/RoleGuard"
import { createSlug } from "@/lib/utils"

export default function ImportPage() {
  const [csvData, setCsvData] = useState<any[]>([])
  const [images, setImages] = useState<File[]>([])
  const [designers, setDesigners] = useState<any[]>([])
  const [designerImages, setDesignerImages] = useState<File[]>([])
  const [video, setVideo] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const { showToast } = useToast()

  const handleCsvUpload = async (data: any[]) => {
    setIsUploading(true);
    try {
      const processedData = data.map((item) => ({
        nom: item["Nom luminaire"] || item["Nom du fichier"]?.replace(/\.[^/.]+$/, "") || "",
        designer: item["Artiste / Dates"] || "",
        specialite: item["Spécialité"] || "",
        collaboration: item["Collaboration / Œuvre"] || "",
        annee: Number.parseInt(item["Année"]) || new Date().getFullYear(),
        signe: item["Signé"] || "",
        filename: item["Nom du fichier"] || "",
        dimensions: item["Dimensions"] || "",
        estimation: item["Estimation"] || "",
        materiaux: item["Matériaux"] ? item["Matériaux"].split(",").map((m: string) => m.trim()) : [],
        images: [],
        periode: item["Spécialité"] || "",
        description: `${item["Collaboration / Œuvre"] || ""} ${item["Spécialité"] || ""}`.trim(),
        couleurs: [],
      }));
      let successCount = 0;
      for (const luminaire of processedData) {
        if (!luminaire.filename) continue;
        try {
          const response = await fetch("/api/luminaires", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(luminaire) });
          if (response.ok) successCount++;
        } catch (e) { console.error(e); }
      }
      setCsvData(processedData);
      showToast(`${successCount}/${processedData.length} luminaires traités.`, "success");
    } catch (e: any) { showToast(e.message, "error"); }
    finally { setIsUploading(false); }
  };

  const handleImagesUpload = async (files: File[]) => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      files.forEach((file) => formData.append("files", file));
      const uploadResponse = await fetch("/api/upload/images", { method: "POST", body: formData });
      if (!uploadResponse.ok) throw new Error("Upload des images a échoué");
      const result = await uploadResponse.json();
      showToast(`${result.uploadedFiles?.length || 0} images uploadées.`, "info");
      
      const luminairesResponse = await fetch('/api/luminaires');
      const luminairesData = await luminairesResponse.json();
      if (!luminairesData.success) throw new Error("Impossible de lister les luminaires");
      
      let successCount = 0;
      for (const uploadedFile of result.uploadedFiles) {
        const fileNameWithoutExt = uploadedFile.name.replace(/\.[^/.]+$/, "");
        const matchingLuminaire = luminairesData.luminaires.find((l: any) => l.filename === uploadedFile.name || l.filename === fileNameWithoutExt);
        if (matchingLuminaire) {
          const updatedImages = [...(matchingLuminaire.images || []), uploadedFile.path];
          const updateResponse = await fetch(`/api/luminaires/${matchingLuminaire._id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ images: updatedImages }) });
          if(updateResponse.ok) successCount++;
        }
      }
      setImages(files);
      showToast(`${successCount} images associées.`, "success");
    } catch (e: any) { showToast(e.message, "error"); }
    finally { setIsUploading(false); }
  };

  // --- DÉBUT DES MODIFICATIONS ---
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
          if(response.ok) successCount++;
        } catch (e) { console.error(e) }
      }
      setDesigners(processedDesigners);
      showToast(`${successCount} designers importés.`, "success");
    } catch (e: any) { showToast(e.message, "error") }
    finally { setIsUploading(false); }
  };

  const handleDesignerImagesUpload = async (files: File[]) => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      files.forEach((file) => formData.append("files", file));
      const response = await fetch("/api/upload/images", { method: "POST", body: formData });
      if (!response.ok) throw new Error("Upload des portraits a échoué");
      const result = await response.json();
      
      const designersResponse = await fetch("/api/designers");
      const designersData = await designersResponse.json();
      if (!designersData.success) throw new Error("Impossible de lister les designers");
      
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
      setDesignerImages(files);
      showToast(`${successCount} portraits associés.`, "success");
    } catch (e: any) { showToast(e.message, "error"); }
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
      } else { throw new Error("L'upload de la vidéo a échoué"); }
    } catch (e: any) { showToast(e.message, "error"); }
    finally { setIsUploading(false); }
  };

  const resetImports = async () => {
    const isConfirmed = window.confirm("Vider les collections LUMINAIRES et DESIGNERS ? Action irréversible.");
    if (isConfirmed) {
      setIsUploading(true);
      try {
        const response = await fetch("/api/reset", { method: "DELETE" });
        if (response.ok) {
          showToast("Base de données réinitialisée.", "success");
          setCsvData([]); setImages([]); setDesigners([]); setDesignerImages([]); setVideo(null);
        } else { throw new Error("La réinitialisation a échoué."); }
      } catch (e: any) { showToast(e.message, "error"); }
      finally { setIsUploading(false); }
    }
  };
  // --- FIN DES MODIFICATIONS ---

  return (
    <RoleGuard requiredRole="admin">
        {/* ... VOTRE JSX COMPLET ET INTACt ... */}
    </RoleGuard>
  )
}
