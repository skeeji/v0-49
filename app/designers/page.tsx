"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { SearchBar } from "@/components/SearchBar"
import { SortSelector } from "@/components/SortSelector"
import { useAuth } from "@/contexts/AuthContext"

// Fonction pour "nettoyer" un nom et le rendre comparable
const normalizeName = (name: string): string => {
  if (!name) return ""
  // Met en minuscule, supprime les espaces, parenthèses, points, virgules et tous les types de tirets
  return name.toLowerCase().replace(/[\s\(\)\.,—–-]/g, "")
}

export default function DesignersPage() {
  const [designers, setDesigners] = useState<any[]>([])
  const [filteredDesigners, setFilteredDesigners] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState("name-asc")
  const [isLoading, setIsLoading] = useState(true)
  const { userData } = useAuth()

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true)
      try {
        // --- MODIFICATION 1 : On demande jusqu'à 5000 luminaires pour tous les voir ---
        const luminairesResponse = await fetch("/api/luminaires?limit=5000")
        const luminairesData = await luminairesResponse.json()
        console.log(`Données reçues: ${luminairesData.luminaires.length} luminaires chargés.`)

        if (luminairesData.success) {
          const designerGroups = luminairesData.luminaires.reduce((acc: any, luminaire: any) => {
            const designerName = luminaire.designer
            if (!designerName) return acc

            if (!acc[designerName]) {
              acc[designerName] = { name: designerName, count: 0, luminaires: [], image: "", slug: encodeURIComponent(designerName) }
            }
            acc[designerName].count++
            acc[designerName].luminaires.push({
              ...luminaire,
              image: luminaire["Nom du fichier"] ? `/api/images/filename/${luminaire["Nom du fichier"]}` : "/placeholder.svg",
              name: luminaire.nom,
            })
            return acc
          }, {})

         console.log(`${Object.keys(designerGroups).length} designers uniques trouvés dans les luminaires.`);

          try {
            const designersResponse = await fetch("/api/designers-data")
            const designersResult = await designersResponse.json()

            if (designersResult.success && designersResult.designers) {
              console.log("--- Début de la comparaison TOLÉRANTE ---");
              Object.keys(designerGroups).forEach((designerName) => {
                // --- MODIFICATION 2 : On utilise la comparaison "tolérante" ---
                const normalizedLuminaireName = normalizeName(designerName)
                const designerInfo = designersResult.designers.find(
                  (d: any) => normalizeName(d.Nom) === normalizedLuminaireName
                );

                if (designerInfo) {
                  designerGroups[designerName].image = `/api/images/filename/${designerInfo.imagedesigner}`;
                } else {
                    // Ce log apparaitra s'il y a des erreurs que même la normalisation ne peut corriger (grosses fautes de frappe)
                    console.warn(`AVERTISSEMENT: Toujours pas trouvé pour "${designerName}" même en normalisant.`);
                }
              });
              console.log("--- Fin de la comparaison ---");
            }
          } catch (error) {
            console.error("❌ Erreur chargement données designers:", error)
          }

          const designersArray = Object.values(designerGroups).sort((a: any, b: any) => a.name.localeCompare(b.name))

          if (userData?.role === "free") {
            const limitedDesigners = designersArray.slice(0, Math.max(Math.floor(designersArray.length * 0.1), 5))
            setDesigners(limitedDesigners)
            setFilteredDesigners(limitedDesigners)
          } else {
            setDesigners(designersArray)
            setFilteredDesigners(designersArray)
          }
        }
      } catch (error) {
        console.error("❌ Erreur chargement données:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [userData])

  useEffect(() => {
    let filtered = [...designers]
    if (searchTerm) {
      filtered = filtered.filter((designer) => designer.name.toLowerCase().includes(searchTerm.toLowerCase()))
    }
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "name-asc": return a.name.localeCompare(b.name)
        case "name-desc": return b.name.localeCompare(a.name)
        case "count-desc": return b.count - a.count
        default: return 0
      }
    })
    setFilteredDesigners(filtered)
  }, [designers, searchTerm, sortBy])

  if (isLoading) {
    return <div className="text-center py-8">Chargement des designers...</div>
  }

  return (
    // Le reste de votre code JSX est correct et n'a pas besoin de changer
    <div className="container-responsive py-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-playfair text-dark mb-8">Designers ({filteredDesigners.length})</h1>
        {/* ... etc ... */}
      </div>
    </div>
  )
}
