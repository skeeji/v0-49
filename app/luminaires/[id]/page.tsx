"use client"

import React from "react"
import { useParams } from "next/navigation"
import type { Luminaire } from "@/types/luminaire"
import { getLuminaireById } from "@/api/luminaires"

const LuminairePage: React.FC = () => {
  const { id } = useParams()
  const [luminaire, setLuminaire] = React.useState<Luminaire | null>(null)

  React.useEffect(() => {
    const fetchLuminaire = async () => {
      const luminaireData = await getLuminaireById(id as string)
      setLuminaire(luminaireData)
    }

    fetchLuminaire()
  }, [id])

  if (!luminaire) {
    return <div>Loading...</div>
  }

  return (
    <div className="p-4">
      {/* Estimation */}
      {luminaire.estimation && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Estimation</h3>
          <p className="text-gray-600">{luminaire.estimation}</p>
        </div>
      )}

      {/* Lien site marchand */}
      {luminaire.lienSiteMarchand && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Lien site marchand</h3>
          <a
            href={luminaire.lienSiteMarchand}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline break-all"
          >
            {luminaire.lienSiteMarchand}
          </a>
        </div>
      )}

      {/* Étiquette */}
      {luminaire.etiquette && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Étiquette</h3>
          <p className="text-gray-600">{luminaire.etiquette}</p>
        </div>
      )}

      {/* Bibliographie */}
      {luminaire.bibliographie && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Bibliographie</h3>
          <p className="text-gray-600 whitespace-pre-line">{luminaire.bibliographie}</p>
        </div>
      )}

      {/* rest of code here */}
    </div>
  )
}

export default LuminairePage
