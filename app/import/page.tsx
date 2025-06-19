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

  // CONSERVÉ : Votre fonction originale, qui est correcte
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
        if (!luminaire.filename) { console.warn("Ligne CSV ignorée car 'Nom du fichier' est manquant.", luminaire); continue; }
        try {
          const response = await fetch("/api/luminaires", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(luminaire) });
          if (response.ok) successCount++; else console.error("Erreur ajout luminaire:", await response.text());
        } catch (error) { console.error("Erreur réseau:", error); }
      }
      setCsvData(processedData);
      showToast(`${successCount} sur ${processedData.length} luminaires traités.`, "success");
    } catch (error: any) { console.error("Erreur import CSV:", error.message); showToast("Erreur lors de l'import CSV", "error"); } 
    finally { setIsUploading(false); }
  };

  // CONSERVÉ : Votre fonction originale, qui est correcte
  const handleImagesUpload = async (files: File[]) => {
    setIsUploading(true);
    try {
      const uploadFormData = new FormData();
      files.forEach((file) => uploadFormData.append("files", file));
      const uploadResponse = await fetch("/api/upload/images", { method: "POST", body: uploadFormData });
      if (!uploadResponse.ok) throw new Error("L'upload des images a échoué");
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
    } catch (error: any) { console.error(error.message); showToast(error.message, "error"); } 
    finally { setIsUploading(false); }
  };

  // CONSERVÉ : Votre fonction originale, avec la création de slug
  const handleDesignersUpload = async (data: any[]) => {
    setIsUploading(true);
    try {
      const processedDesigners = data.map((item) => ({
        nom: item["Nom"] || "",
        imageFile: item["imagedesigner"] || "",
        slug: createSlug(item["Nom"] || ""),
        images: [],
        biographie: "", specialites: [], periodes: [],
      }));
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
    } catch (e: any) { showToast("Erreur import designers", "error") }
    finally { setIsUploading(false); }
  };

  // CONSERVÉ : Votre fonction originale, avec l'appel à l'API par slug
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
      setDesignerImages(files);
      showToast(`${successCount} portraits associés.`, "success");
    } catch (error: any) { showToast(error.message, "error"); }
    finally { setIsUploading(false); }
  };

  // --- DÉBUT DE LA MODIFICATION ---
  const handleVideoUpload = async (file: File) => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("video", file);
      // On appelle la nouvelle API pour la vidéo
      const response = await fetch("/api/upload/video", { method: "POST", body: formData });
      if (response.ok) {
        setVideo(file);
        showToast("Vidéo d'accueil sauvegardée dans la base de données.", "success");
      } else {
        throw new Error("L'upload de la vidéo a échoué.");
      }
    } catch (error: any) {
      console.error("Erreur upload vidéo:", error);
      showToast(error.message, "error");
    } finally {
      setIsUploading(false);
    }
  };

  const resetImports = async () => {
    // On ajoute une confirmation pour cette action dangereuse
    const isConfirmed = window.confirm("Êtes-vous certain de vouloir vider les collections LUMINAIRES et DESIGNERS ? Cette action est irréversible.");
    if (isConfirmed) {
      setIsUploading(true);
      try {
        // On appelle la nouvelle API de réinitialisation
        const response = await fetch("/api/reset", { method: "DELETE" });
        if (response.ok) {
          showToast("Base de données réinitialisée avec succès.", "success");
          setCsvData([]);
          setImages([]);
          setDesigners([]);
          setDesignerImages([]);
          setVideo(null);
        } else {
          throw new Error("La réinitialisation de la base de données a échoué.");
        }
      } catch (error: any) {
        console.error("Erreur lors de la réinitialisation:", error);
        showToast(error.message, "error");
      } finally {
        setIsUploading(false);
      }
    }
  };
  // --- FIN DE LA MODIFICATION ---

  return (
    <RoleGuard requiredRole="admin">
        <div className="container-responsive py-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-4xl font-playfair text-dark mb-8">Import des données</h1>
          {isUploading && (<div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg"><div className="flex items-center"><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div><span className="text-blue-800">Upload en cours...</span></div></div>)}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <h2 className="text-2xl font-playfair text-dark mb-4">📥 Import CSV Luminaires</h2>
              <UploadForm accept=".csv" onUpload={handleCsvUpload} type="csv" disabled={isUploading} expectedColumns={["Artiste / Dates
