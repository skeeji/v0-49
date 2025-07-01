"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { DeleteLuminaireButton } from "@/components/DeleteLuminaireButton"

interface Luminaire {
  _id: string
  nom: string
  name: string
  description: string
  image: string
  categorie: string
  prix: number
}

interface UserData {
  role: string
}

const LuminairesPage = () => {
  const [luminaires, setLuminaires] = useState<Luminaire[]>([])
  const { data: session } = useSession()
  const [userData, setUserData] = useState<UserData | null>(null)

  useEffect(() => {
    const fetchLuminaires = async () => {
      try {
        const response = await fetch("/api/luminaires")
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        const data = await response.json()
        setLuminaires(data)
      } catch (error) {
        console.error("Could not fetch luminaires:", error)
      }
    }

    fetchLuminaires()
  }, [])

  useEffect(() => {
    const fetchUserData = async () => {
      if (session?.user?.email) {
        try {
          const response = await fetch(`/api/users?email=${session.user.email}`)
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
          }
          const data = await response.json()
          setUserData(data)
        } catch (error) {
          console.error("Could not fetch user data:", error)
          setUserData(null)
        }
      } else {
        setUserData(null)
      }
    }

    fetchUserData()
  }, [session])

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-4">Liste des Luminaires</h1>
      {session && userData?.role === "admin" && (
        <Link
          href="/app/luminaires/new"
          className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded mb-4 inline-block"
        >
          Ajouter un Luminaire
        </Link>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {luminaires.map((luminaire) => (
          <div key={luminaire._id} className="border rounded-md p-4">
            <img
              src={luminaire.image || "/placeholder.svg"}
              alt={luminaire.nom || luminaire.name || "Luminaire"}
              className="w-full h-48 object-cover mb-2"
            />
            <h2 className="text-lg font-semibold">{luminaire.nom || luminaire.name}</h2>
            <p className="text-gray-600">Prix: {luminaire.prix} €</p>
            <div className="mt-2">
              <Link
                href={`/app/luminaires/${luminaire._id}`}
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mr-2 inline-block"
              >
                Voir détails
              </Link>
              {userData?.role === "admin" && (
                <DeleteLuminaireButton
                  luminaireId={luminaire._id}
                  luminaireName={luminaire.nom || luminaire.name || "Luminaire"}
                  onDelete={() => {
                    // Recharger la liste des luminaires
                    window.location.reload()
                  }}
                />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default LuminairesPage
