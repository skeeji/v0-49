"use client"

import type React from "react"
import { useState } from "react"
import Papa from "papaparse"
import { saveAs } from "file-saver"

const ImportPage = () => {
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [jsonData, setJsonData] = useState<any[]>([])

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    setCsvFile(file)
  }

  const handleImport = () => {
    if (!csvFile) {
      alert("Please select a CSV file.")
      return
    }

    Papa.parse(csvFile, {
      header: true,
      complete: (results) => {
        setJsonData(results.data)
      },
      error: (error) => {
        console.error("Error parsing CSV:", error)
        alert("Error parsing CSV. Check the console for details.")
      },
    })
  }

  const exportAllLuminaires = () => {
    if (jsonData.length === 0) {
      alert("No data to export. Please import a CSV file first.")
      return
    }

    const luminaires = jsonData

    const csvData = luminaires.map((luminaire: any) => ({
      Nom: luminaire.nom || "",
      Designer: luminaire.designer || "",
      Année: luminaire.annee || luminaire.year || "",
      Éditeur: luminaire.editeur || "",
      Spécialité: luminaire.periode || luminaire.specialite || "",
      "Collaboration / Œuvre": luminaire.collaboration || luminaire.oeuvre || "",
      Description: luminaire.description || "",
      Matériaux: Array.isArray(luminaire.materiaux) ? luminaire.materiaux.join("; ") : luminaire.materiaux || "",
      Dimensions: luminaire.dimensions || "",
      Estimation: luminaire.estimation || "",
      "Image principale": luminaire.filename || "",
      "Images secondaires": Array.isArray(luminaire.images) ? luminaire.images.join("; ") : "",
      "Image designer": luminaire.designerImageFilename || "",
    }))

    const csv = Papa.unparse(csvData, {
      header: true,
    })

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
    saveAs(blob, "all_luminaires.csv")
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Import CSV</h1>
      <div className="mb-4">
        <input type="file" accept=".csv" onChange={handleFileChange} className="mb-2" />
        <button onClick={handleImport} className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
          Import
        </button>
      </div>

      {jsonData.length > 0 && (
        <div>
          <h2 className="text-xl font-bold mb-2">Data Preview</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-300">
              <thead>
                <tr>
                  {Object.keys(jsonData[0]).map((key) => (
                    <th key={key} className="py-2 px-4 border-b">
                      {key}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {jsonData.map((row, index) => (
                  <tr key={index}>
                    {Object.values(row).map((value, index) => (
                      <td key={index} className="py-2 px-4 border-b">
                        {String(value)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <button
        onClick={exportAllLuminaires}
        className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded mt-4"
      >
        Export All Luminaires
      </button>
    </div>
  )
}

export default ImportPage
