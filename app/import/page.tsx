"use client"

import { useState } from "react"
import * as XLSX from "xlsx"

async function exportAllLuminaires() {
  try {
    const response = await fetch("/api/getAllLuminaires", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    const luminaires = data.luminaires

    // Préparer les données pour l'export Excel
    const excelData = luminaires.map((luminaire, index) => {
      const designer = luminaire.designer ? luminaire.designer : null

      // Debug détaillé pour chaque luminaire
      console.log(`🔍 Luminaire ${index + 1}:`, luminaire.nom || luminaire.name || "Sans nom")
      console.log("📋 Toutes les clés disponibles:", Object.keys(luminaire))
      console.log("🎯 Spécialité - periode:", luminaire.periode)
      console.log("🎯 Spécialité - Spécialité:", luminaire.Spécialité)
      console.log("🎯 Collaboration - collaboration:", luminaire.collaboration)
      console.log("🎯 Collaboration - Collaboration / Œuvre:", luminaire["Collaboration / Œuvre"])

      const mappedRow = {
        "Nom du luminaire": luminaire.nom || luminaire.name || luminaire["Nom du luminaire"] || "",
        Artiste: luminaire.designer || luminaire.artist || luminaire["Artiste"] || "",
        Année: luminaire.annee || luminaire.year || luminaire["Année"] || "",
        Spécialité: luminaire.periode || luminaire.Spécialité || luminaire.specialite || luminaire["Période"] || "",
        Description: luminaire.description || luminaire["Description"] || "",
        "Collaboration / Œuvre":
          luminaire.collaboration || luminaire["Collaboration / Œuvre"] || luminaire.oeuvre || "",
        Signé: luminaire.signe || luminaire["Signé"] || "",
        Éditeur: luminaire.editeur || luminaire["Éditeur"] || "",
        Dimensions: luminaire.dimensions || luminaire["Dimensions"] || "",
        Matériaux: Array.isArray(luminaire.materiaux)
          ? luminaire.materiaux.join(", ")
          : luminaire.materiaux || luminaire["Matériaux"] || "",
        "Prix / Estimation": luminaire.estimation || luminaire["Prix / Estimation"] || "",
        Couleurs: Array.isArray(luminaire.couleurs)
          ? luminaire.couleurs.join(", ")
          : luminaire.couleurs || luminaire["Couleurs"] || "",
        "Image designer (imagedesigner)": luminaire.designerImageFilename || (designer && designer.imagedesigner) || "",
        "Nom du fichier": luminaire.filename || luminaire["Nom du fichier"] || "",
      }

      // Log des valeurs finales pour debug
      console.log("✅ Valeurs finales:")
      console.log("   Spécialité:", mappedRow["Spécialité"])
      console.log("   Collaboration / Œuvre:", mappedRow["Collaboration / Œuvre"])

      return mappedRow
    })

    // Créer un nouveau livre Excel
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(excelData)

    // Ajouter la feuille de données au livre
    XLSX.utils.book_append_sheet(wb, ws, "Luminaires")

    // Générer le fichier Excel
    XLSX.writeFile(wb, "luminaires.xlsx")
  } catch (error) {
    console.error("Erreur lors de l'exportation Excel:", error)
  }
}

const ImportPage = () => {
  const [selectedFile, setSelectedFile] = useState(null)
  const [uploadStatus, setUploadStatus] = useState("")

  const handleFileChange = (event) => {
    setSelectedFile(event.target.files[0])
  }

  const handleUpload = async () => {
    if (!selectedFile) {
      setUploadStatus("Veuillez sélectionner un fichier.")
      return
    }

    const formData = new FormData()
    formData.append("file", selectedFile)

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })

      const data = await response.json()

      if (response.ok) {
        setUploadStatus(data.message)
      } else {
        setUploadStatus(`Erreur lors de l'upload: ${data.message}`)
      }
    } catch (error) {
      console.error("Erreur lors de l'upload:", error)
      setUploadStatus("Erreur lors de l'upload du fichier.")
    }
  }

  return (
    <div style={{ padding: "20px" }}>
      <h1>Importation de données</h1>

      <input type="file" onChange={handleFileChange} style={{ marginBottom: "10px" }} />
      <button
        onClick={handleUpload}
        disabled={!selectedFile}
        style={{ padding: "10px", cursor: selectedFile ? "pointer" : "not-allowed" }}
      >
        Importer
      </button>
      {uploadStatus && <p>{uploadStatus}</p>}

      <hr style={{ margin: "20px 0" }} />

      <h2>Exporter toutes les données</h2>
      <button onClick={exportAllLuminaires} style={{ padding: "10px", cursor: "pointer" }}>
        Exporter vers Excel
      </button>
    </div>
  )
}

export default ImportPage
