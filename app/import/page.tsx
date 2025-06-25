// app/import/page.tsx
"use client"

import { useState } from "react"
import { UploadForm } from "@/components/UploadForm"
import { Button } from "@/components/ui/button"
import { Trash2 } from "lucide-react"
import { useToast } from "@/hooks/useToast"
import { RoleGuard } from "@/components/RoleGuard"

export default function ImportPage() {
  const [csvData, setCsvData] = useState<any[]>([])
  const [images, setImages] = useState<File[]>([])
  const [designers, setDesigners] = useState<any[]>([])
  const [designerImages, setDesignerImages] = useState<File[]>([])
  const [video, setVideo] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const { showToast } = useToast()

  const handleCsvUpload = async (data: any[]) => {
    // ... (votre code est correct, pas de changement ici)
    setIsUploading(true)
    try {
      const processedData = data.map((item) => {
        const filename = item["Nom du fichier"] || "";
        const nomLuminaire = item["Nom luminaire"] || "";
        const finalNom = nomLuminaire || filename.replace(/\.[^/.]+$/, "");
        return {
          nom: finalNom,
          designer: item["Artiste / Dates"] || "",
          specialite: item["Spécialité"] || "",
          collaboration: item["Collaboration / Œuvre"] || "",
          annee: Number.parseInt(item["Année"]) || new Date().getFullYear(),
          signe: item["Signé"] || "",
          filename: filename,
          dimensions: item["Dimensions"] || "",
          estimation: item["Estimation"] || "",
          materiaux: item["Matériaux"] ? item["Matériaux"].split(",").map((m: string) => m.trim()) : [],
          images: [],
          periode: item["Spécialité"] || "",
          description: `${item["Collaboration / Œuvre"] || ""} ${item["Spécialité"] || ""}`.trim(),
          couleurs: [],
        }
      });
      let successCount = 0;
      for (const luminaire of processedData) {
        if (!luminaire.filename) {
          console.warn("Ligne CSV ignorée car le 'Nom du fichier' est manquant.", luminaire);
          continue;
        }
        try {
          const response = await fetch("/api/luminaires", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(luminaire) });
          if (response.ok) successCount++;
          else console.error("Erreur ajout luminaire:", await response.text());
        } catch (error) { console.error("Erreur réseau:", error); }
      }
      setCsvData(processedData);
      showToast(`${successCount} sur ${processedData.length} luminaires traités.`, "success");
    } catch (error: any) {
      console.error("Erreur import CSV:", error.message);
      showToast("Erreur lors de l'import CSV", "error");
    } finally {
      setIsUploading(false);
    }
  }

  const handleImagesUpload = async (files: File[]) => {
    setIsUploading(true);
    try {
      const uploadFormData = new FormData();
      files.forEach((file) => uploadFormData.append("files", file));
      const uploadResponse = await fetch("/api/upload/images", { method: "POST", body: uploadFormData });

      if (!uploadResponse.ok) { throw new Error(`L'upload des fichiers images a échoué: ${await uploadResponse.text()}`); }
      
      const result = await uploadResponse.json();
      if (result.errors && result.errors.length > 0) {
        showToast(`Erreurs d'upload: ${result.errors.join(', ')}`, "error");
      }
      showToast(`${result.uploadedFiles?.length || 0} images uploadées. Association en cours...`, "info");
      
      // OPTIMISATION: Récupérer les luminaires UNE SEULE FOIS avant la boucle
      const luminairesResponse = await fetch('/api/luminaires');
      const luminairesData = await luminairesResponse.json();
      if (!luminairesData.success) { throw new Error("Impossible de récupérer la liste des luminaires pour l'association."); }
      
      const allLuminaires = luminairesData.luminaires;
      let successCount = 0;

      for (const uploadedFile of result.uploadedFiles) {
        const fileNameWithoutExt = uploadedFile.name.replace(/\.[^/.]+$/, "");
        const matchingLuminaire = allLuminaires.find((l: any) => l.filename === uploadedFile.name || l.filename === fileNameWithoutExt);

        if (matchingLuminaire) {
          try {
            // On s'assure que le tableau `images` existe
            const updatedImages = [...(matchingLuminaire.images || []), uploadedFile.path];
            
            // L'appel à la route PUT qui doit exister
            const updateResponse = await fetch(`/api/luminaires/${matchingLuminaire._id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ images: updatedImages }),
            });

            if (updateResponse.ok) {
              successCount++;
            } else {
              console.error(`Échec de la mise à jour pour ${matchingLuminaire.nom}`, await updateResponse.text());
            }
          } catch(e: any) {
             console.error(`Erreur d'association pour ${matchingLuminaire.nom}`, e.message)
          }
        } else {
          console.warn(`Aucun luminaire trouvé pour le fichier image : ${uploadedFile.name}`);
        }
      }
      setImages((prev) => [...prev, ...files]);
      showToast(`${successCount} images associées avec succès.`, "success");

    } catch (error: any) {
      console.error("Erreur grave lors de l'upload d'images:", error.message);
      showToast(error.message, "error");
    } finally {
      setIsUploading(false);
    }
  }

  const handleDesignersUpload = async (data: any[]) => {
    // ... (votre code est correct, pas de changement ici)
    setIsUploading(true)
    try {
      const processedDesigners = data.map((item) => ({
        nom: item["Nom"] || "",
        imageFile: item["imagedesigner"] || "",
        slug: (item["Nom"] || "").toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
        biographie: "", specialites: [], periodes: [], images: [],
      }))
      let successCount = 0
      for (const designer of processedDesigners) {
        try {
          const response = await fetch("/api/designers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(designer) })
          if (response.ok) {
            successCount++
          } else {
            console.error("Erreur lors de l'ajout du designer:", await response.text())
          }
        } catch (error) { console.error("Erreur réseau:", error) }
      }
      setDesigners((prev) => [...prev, ...processedDesigners])
      showToast(`${successCount}/${data.length} designers importés en base`, "success")
    } catch (error) {
      console.error("Erreur lors de l'import des designers:", error)
      showToast("Erreur lors de l'import des designers", "error")
    } finally { setIsUploading(false) }
  }

  const handleDesignerImagesUpload = async (files: File[]) => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      files.forEach((file) => formData.append("files", file));
      const uploadResponse = await fetch("/api/upload/images", { method: "POST", body: formData });

      if (!uploadResponse.ok) {
        throw new Error("Erreur lors de l'upload des images de designers");
      }
      
      const result = await uploadResponse.json();

      // OPTIMISATION: Récupérer les designers UNE SEULE FOIS
      const designersResponse = await fetch("/api/designers");
      if (!designersResponse.ok) {
        throw new Error("Impossible de récupérer la liste des designers pour l'association.");
      }
      const designersData = await designersResponse.json();
      
      // CORRECTION: Utiliser `designersData.data` au lieu de `designersData.designers`
      const allDesigners = designersData.data; 
      let successCount = 0;

      for (const uploadedFile of result.uploadedFiles) {
        const fileNameWithoutExt = uploadedFile.name.replace(/\.[^/.]+$/, "");
        
        const matchingDesigner = allDesigners.find((d: any) => 
            d.imageFile === uploadedFile.name || 
            d.imageFile === fileNameWithoutExt
        );

        if (matchingDesigner) {
            try {
                const updatedImages = [...(matchingDesigner.images || []), uploadedFile.path];
                // L'appel à la route PUT qui doit exister
                const updateResponse = await fetch(`/api/designers/${matchingDesigner.slug}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ images: updatedImages }),
                });

                if (updateResponse.ok) {
                    successCount++;
                } else {
                    console.error("Erreur lors de la mise à jour du designer:", await updateResponse.text());
                }
            } catch (error) {
                console.error("Erreur lors de l'association de l'image:", error);
            }
        } else {
            console.warn(`Aucun designer trouvé pour l'image: ${uploadedFile.name}`);
        }
      }

      setDesignerImages((prev) => [...prev, ...files]);
      showToast(`${successCount} images de designers associées.`, "success");

    } catch (error: any) {
      console.error("Erreur lors de l'upload d'images de designers:", error.message);
      showToast(error.message, "error");
    } finally {
      setIsUploading(false);
    }
  }

  const handleVideoUpload = async (file: File) => {
    // ... (votre code est correct, pas de changement ici)
     setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append("video", file)
      const response = await fetch("/api/upload/video", { method: "POST", body: formData })
      if (response.ok) {
        setVideo(file)
        showToast("Vidéo d'accueil uploadée en base", "success")
      } else {
        throw new Error("Erreur lors de l'upload de la vidéo")
      }
    } catch (error) {
      console.error("Erreur lors de l'upload de la vidéo:", error)
      showToast("Erreur lors de l'upload de la vidéo", "error")
    } finally { setIsUploading(false) }
  }

  const resetImports = async () => {
    // ... (votre code est correct, pas de changement ici)
    try {
      setCsvData([]); setImages([]); setDesigners([]); setDesignerImages([]); setVideo(null);
      showToast("État local réinitialisé", "success")
    } catch (error: any) {
      console.error("Erreur lors de la réinitialisation:", error)
      showToast("Erreur lors de la réinitialisation", "error")
    }
  }

  return (
    // ... (votre JSX est correct, pas de changement ici)
     <RoleGuard requiredRole="admin">
      <div className="container-responsive py-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-4xl font-playfair text-dark mb-8">Import des données</h1>
          {isUploading && (<div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg"><div className="flex items-center"><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div><span className="text-blue-800">Upload en cours...</span></div></div>)}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <h2 className="text-2xl font-playfair text-dark mb-4">📥 Import CSV Luminaires</h2>
              <UploadForm accept=".csv" onUpload={handleCsvUpload} type="csv" disabled={isUploading} expectedColumns={["Artiste / Dates", "Spécialité", "Collaboration / Œuvre", "Nom luminaire", "Année", "Signé", "Image", "Nom du fichier", "Dimensions", "Estimation", "Matériaux",]}/>
              {csvData.length > 0 && (<div className="mt-4 p-4 bg-cream rounded-lg"><p className="text-sm text-dark">{csvData.length} luminaires traités</p><p className="text-xs text-gray-600 mt-1">Données sauvegardées en base MongoDB</p></div>)}
            </div>
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <h2 className="text-2xl font-playfair text-dark mb-4">🖼️ Import Images Luminaires</h2>
              <UploadForm accept="image/*" multiple onUpload={handleImagesUpload} type="images" disabled={isUploading} />
              {images.length > 0 && (<div className="mt-4 p-4 bg-cream rounded-lg"><p className="text-sm text-dark">{images.length} images uploadées</p><div className="mt-2 text-xs text-gray-600">Images sauvegardées et associées automatiquement aux luminaires</div></div>)}
            </div>
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <h2 className="text-2xl font-playfair text-dark mb-4">🧑‍🎨 Import CSV Designers</h2>
              <UploadForm accept=".csv" onUpload={handleDesignersUpload} type="csv" disabled={isUploading} expectedColumns={["Nom", "imagedesigner"]}/>
              {designers.length > 0 && (<div className="mt-4 p-4 bg-cream rounded-lg"><p className="text-sm text-dark">{designers.length} designers traités</p><p className="text-xs text-gray-600 mt-1">Données sauvegardées en base MongoDB</p></div>)}
            </div>
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <h2 className="text-2xl font-playfair text-dark mb-4">👤 Import Images Designers</h2>
              <UploadForm accept="image/*" multiple onUpload={handleDesignerImagesUpload} type="images" disabled={isUploading} />
              {designerImages.length > 0 && (<div className="mt-4 p-4 bg-cream rounded-lg"><p className="text-sm text-dark">{designerImages.length} portraits uploadés</p><div className="mt-2 text-xs text-gray-600">Images associées aux designers en base</div></div>)}
            </div>
            <div className="bg-white rounded-xl p-6 shadow-lg lg:col-span-2">
              <h2 className="text-2xl font-playfair text-dark mb-4">🎥 Vidéo d'accueil</h2>
              <UploadForm accept="video/mp4" onUpload={handleVideoUpload} type="video" disabled={isUploading} />
              {video && (<div className="mt-4 p-4 bg-cream rounded-lg"><p className="text-sm text-dark">Vidéo: {video.name}</p><div className="mt-2 text-xs text-gray-600">Vidéo sauvegardée en base et sera affichée sur la page d'accueil</div></div>)}
            </div>
          </div>
          <div className="mt-8 text-center">
            <Button onClick={resetImports} variant="destructive" className="bg-red-500 hover:bg-red-600" disabled={isUploading}><Trash2 className="w-4 h-4 mr-2" />Réinitialiser l'état local</Button>
          </div>
        </div>
      </div>
    </RoleGuard>
  )
}
