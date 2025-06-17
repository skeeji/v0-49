// Fichier : app/import/page.tsx
"use client"

import { useState } from "react"
import { UploadForm } from "@/components/UploadForm"
import { Button } from "@/components/ui/button"
import { Trash2 } from "lucide-react"
import { useToast } from "@/hooks/useToast"
import { RoleGuard } from "@/components/RoleGuard"

export default function ImportPage() {
  const [csvData, setCsvData] = useState([])
  const [images, setImages] = useState([])
  const [designers, setDesigners] = useState([])
  const [designerImages, setDesignerImages] = useState([])
  const [video, setVideo] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const { showToast } = useToast()

  const handleCsvUpload = async (data: any[]) => {
    setIsUploading(true)
    try {
      const processedData = data.map((item) => {
        const filename = item["Nom du fichier"] || "";
        const nomLuminaire = item["Nom luminaire"] || "";
        // CHANGEMENT : Si le nom est vide, on utilise le nom du fichier comme nom de secours
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
        // CHANGEMENT : On vérifie qu'il y a au moins un nom de fichier pour continuer
        if (!luminaire.filename) {
          console.log("Ligne ignorée car le 'Nom du fichier' est manquant.", luminaire);
          continue;
        }
        
        try {
          const response = await fetch("/api/luminaires", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(luminaire),
          })

          if (response.ok) {
            successCount++;
          } else {
            console.error("Erreur lors de l'ajout du luminaire:", await response.text());
          }
        } catch (error) {
          console.error("Erreur réseau:", error);
        }
      }

      setCsvData((prev) => [...prev, ...processedData]);
      showToast(`${successCount}/${data.length} luminaires importés en base`, "success");
    } catch (error) {
      console.error("Erreur lors de l'import CSV:", error);
      showToast("Erreur lors de l'import CSV", "error");
    } finally {
      setIsUploading(false);
    }
  }

  // Les autres fonctions (handleImagesUpload, etc.) restent identiques à votre version
  const handleImagesUpload = async (files: File[]) => {
    setIsUploading(true)
    try {
      const formData = new FormData()
      files.forEach((file) => formData.append("files", file))

      const response = await fetch("/api/upload/images", {
        method: "POST",
        body: formData,
      })

      if (response.ok) {
        const result = await response.json()
        for (const uploadedFile of result.uploadedFiles) {
          const fileName = uploadedFile.name.replace(/\.[^/.]+$/, "")
          try {
            const luminairesResponse = await fetch(`/api/luminaires?search=${encodeURIComponent(fileName)}`)
            if (luminairesResponse.ok) {
              const luminairesData = await luminairesResponse.json()
              const matchingLuminaire = luminairesData.luminaires.find(
                (l: any) =>
                  l.filename === fileName ||
                  l.filename === uploadedFile.name ||
                  l.nom.toLowerCase().includes(fileName.toLowerCase()),
              )

              if (matchingLuminaire) {
                const updateResponse = await fetch(`/api/luminaires/${matchingLuminaire._id}`, {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    ...matchingLuminaire,
                    images: [...(matchingLuminaire.images || []), uploadedFile.path],
                  }),
                })

                if (!updateResponse.ok) {
                  console.error("Erreur lors de la mise à jour du luminaire:", await updateResponse.text())
                }
              }
            }
          } catch (error) {
            console.error("Erreur lors de l'association de l'image:", error)
          }
        }

        setImages((prev) => [...prev, ...files])
        showToast(`${result.uploadedFiles.length} images uploadées et associées`, "success")

        if (result.errors.length > 0) {
          console.warn("Erreurs lors de l'upload:", result.errors)
        }
      } else {
        throw new Error("Erreur lors de l'upload des images")
      }
    } catch (error) {
      console.error("Erreur lors de l'upload d'images:", error)
      showToast("Erreur lors de l'upload des images", "error")
    } finally {
      setIsUploading(false)
    }
  }

  const handleDesignersUpload = async (data: any[]) => {
    // ... votre code existant pour cette fonction
  }

  const handleDesignerImagesUpload = async (files: File[]) => {
    // ... votre code existant pour cette fonction
  }

  const handleVideoUpload = async (file: File) => {
    // ... votre code existant pour cette fonction
  }

  const resetImports = async () => {
    // ... votre code existant pour cette fonction
  }

  return (
    <RoleGuard requiredRole="admin">
      <div className="container-responsive py-8">
        <div className="max-w-6xl mx-auto">
          {/* ... votre JSX existant ... */}
        </div>
      </div>
    </RoleGuard>
  )
}
