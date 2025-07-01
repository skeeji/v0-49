import type React from "react"
import type { Luminaire } from "@/types/Luminaire"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { DeleteLuminaireButton } from "@/components/DeleteLuminaireButton"

interface GalleryGridProps {
  luminaires: Luminaire[]
}

const GalleryGrid: React.FC<GalleryGridProps> = ({ luminaires }) => {
  const { data: session } = useSession()
  const userData = session?.user as { role?: string } | undefined

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {luminaires.map((item) => (
        <div key={item._id} className="border rounded-md p-4 shadow-md">
          <h3 className="text-lg font-semibold">{item.nom || item.name || "Luminaire"}</h3>
          <p className="text-gray-600">{item.description}</p>
          <div className="mt-2">
            <Link href={`/luminaires/${item._id}`} className="text-blue-500 hover:underline mr-2">
              Voir détails
            </Link>
            {userData?.role === "admin" && (
              <DeleteLuminaireButton
                luminaireId={item._id}
                luminaireName={item.nom || item.name || "Luminaire"}
                onDelete={() => {
                  // Recharger la page ou mettre à jour la liste
                  window.location.reload()
                }}
              />
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

export default GalleryGrid
