import { notFound } from "next/navigation"

async function getLuminaire(id: string) {
  try {
    const res = await fetch(`http://localhost:3000/api/luminaires/${id}`, {
      cache: "no-store",
    })

    if (!res.ok) {
      return notFound()
    }

    return res.json()
  } catch (error) {
    console.error("Error fetching luminaire:", error)
    return notFound()
  }
}

export default async function LuminairePage({ params }: { params: { id: string } }) {
  const { id } = params
  const luminaire = await getLuminaire(id)

  if (!luminaire) {
    return notFound()
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">{luminaire.Nom}</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <img src={luminaire.Image || "/placeholder.svg"} alt={luminaire.Nom} className="w-full h-auto rounded-md" />
        </div>

        <div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <p className="text-gray-600">{luminaire.Description || "Non renseigné"}</p>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Matériaux</label>
            <p className="text-gray-600">{luminaire.Matériaux || "Non renseigné"}</p>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Dimensions</label>
            <p className="text-gray-600">{luminaire.Dimensions || "Non renseigné"}</p>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Spécialité</label>
            <p className="text-gray-600">{luminaire.periode || luminaire.Spécialité || "Non renseigné"}</p>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Collaboration / Œuvre</label>
            <p className="text-gray-600">
              {luminaire.collaboration || luminaire["Collaboration / Œuvre"] || "Non renseigné"}
            </p>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Année</label>
            <p className="text-gray-600">{luminaire.Année || "Non renseigné"}</p>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Artiste</label>
            <p className="text-gray-600">{luminaire.Artiste || "Non renseigné"}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
