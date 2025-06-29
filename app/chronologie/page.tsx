"use client"

import { useState, useEffect } from "react"
import { TimelineBlock } from "@/components/TimelineBlock"
import { Loader2 } from "lucide-react"

const periods = [
  {
    name: "Moyen-Age",
    start: 1000,
    end: 1499,
    defaultDescription:
      "Période médiévale caractérisée par l'artisanat monastique et les premières innovations en éclairage avec les chandelles et lampes à huile ornementées.",
    image: "/placeholder.svg?height=400&width=600&text=Moyen-Age",
  },
  {
    name: "XVIe siècle",
    start: 1500,
    end: 1599,
    defaultDescription:
      "Renaissance européenne marquée par le raffinement des arts décoratifs et l'émergence de nouveaux styles d'éclairage palatial.",
    image: "/placeholder.svg?height=400&width=600&text=Renaissance",
  },
  {
    name: "XVIIe siècle",
    start: 1600,
    end: 1699,
    defaultDescription:
      "Siècle du baroque et du classicisme français, avec le développement des lustres en cristal et des luminaires de cour.",
    image: "/placeholder.svg?height=400&width=600&text=Baroque",
  },
  {
    name: "XVIIIe siècle",
    start: 1700,
    end: 1799,
    defaultDescription:
      "Siècle des Lumières et du rococo, âge d'or de l'ébénisterie française et des luminaires précieux en bronze doré.",
    image: "/placeholder.svg?height=400&width=600&text=Siècle+des+Lumières",
  },
  {
    name: "XIXe siècle",
    start: 1800,
    end: 1899,
    defaultDescription:
      "Révolution industrielle et éclectisme stylistique, avec l'avènement du gaz puis de l'électricité transformant l'art de l'éclairage.",
    image: "/placeholder.svg?height=400&width=600&text=Révolution+Industrielle",
  },
  {
    name: "Art Nouveau",
    start: 1890,
    end: 1910,
    defaultDescription:
      "Mouvement artistique privilégiant les formes organiques et la nature, avec des créateurs comme Gallé, Daum et Tiffany révolutionnant l'art verrier.",
    image: "/placeholder.svg?height=400&width=600&text=Art+Nouveau",
  },
  {
    name: "Art Déco",
    start: 1920,
    end: 1940,
    defaultDescription:
      "Style géométrique et luxueux des années folles, caractérisé par l'utilisation de matériaux nobles et de formes stylisées.",
    image: "/placeholder.svg?height=400&width=600&text=Art+Déco",
  },
  {
    name: "1940 - 1949",
    start: 1940,
    end: 1949,
    defaultDescription:
      "Période de guerre et de reconstruction, marquée par la sobriété et l'innovation dans l'utilisation de nouveaux matériaux.",
    image: "/placeholder.svg?height=400&width=600&text=Années+1940",
  },
  {
    name: "1950 - 1959",
    start: 1950,
    end: 1959,
    defaultDescription:
      "Renouveau créatif d'après-guerre avec l'émergence du design moderne et l'exploration de nouvelles formes fonctionnalistes.",
    image: "/placeholder.svg?height=400&width=600&text=Années+1950",
  },
  {
    name: "1960 - 1969",
    start: 1960,
    end: 1969,
    defaultDescription:
      "Révolution culturelle et design pop, avec l'introduction du plastique et de couleurs vives dans le mobilier d'éclairage.",
    image: "/placeholder.svg?height=400&width=600&text=Années+1960",
  },
  {
    name: "1970 - 1979",
    start: 1970,
    end: 1979,
    defaultDescription:
      "Décennie de l'expérimentation avec de nouveaux matériaux et l'influence du design scandinave et italien.",
    image: "/placeholder.svg?height=400&width=600&text=Années+1970",
  },
  {
    name: "1980 - 1989",
    start: 1980,
    end: 1989,
    defaultDescription:
      "Postmodernisme et retour aux références historiques, avec des créateurs comme Philippe Starck révolutionnant le design français.",
    image: "/placeholder.svg?height=400&width=600&text=Années+1980",
  },
  {
    name: "1990 - 1999",
    start: 1990,
    end: 1999,
    defaultDescription:
      "Minimalisme et high-tech, intégration des nouvelles technologies et recherche de simplicité dans les formes.",
    image: "/placeholder.svg?height=400&width=600&text=Années+1990",
  },
  {
    name: "Contemporain",
    start: 2000,
    end: 2025,
    defaultDescription:
      "Ère numérique et développement durable, avec l'LED révolutionnant l'éclairage et l'émergence de l'éco-design.",
    image: "/placeholder.svg?height=400&width=600&text=Contemporain",
  },
]

export default function ChronologiePage() {
  const [timelineData, setTimelineData] = useState<any[]>([])
  const [descriptions, setDescriptions] = useState<{ [key: string]: string }>({})
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const savedDescriptions = JSON.parse(localStorage.getItem("timeline-descriptions") || "{}")
    setDescriptions(savedDescriptions)

    async function fetchAndProcessData() {
      setIsLoading(true)
      try {
        console.log("📅 Chargement des données chronologie...")
        const response = await fetch("/api/luminaires?limit=10000")
        const data = await response.json()

        if (data.success && data.luminaires) {
          console.log(`📊 Chronologie: ${data.luminaires.length} luminaires chargés`)

          // Adapter les données SANS MODIFIER les années
          const adaptedLuminaires = data.luminaires.map((lum: any) => {
            // Utiliser seulement l'année si elle existe et est valide
            let year = null
            if (lum.annee && typeof lum.annee === "number" && lum.annee > 1000 && lum.annee < 2100) {
              year = lum.annee
            }

            return {
              ...lum,
              id: lum._id,
              image: lum["Nom du fichier"] ? `/api/images/filename/${lum["Nom du fichier"]}` : null,
              year: year, // Garder null si pas d'année valide
              artist: lum["Artiste / Dates"] || "",
              name: lum["Nom luminaire"] || "Sans nom",
            }
          })

          console.log(`📅 Luminaires avec année valide: ${adaptedLuminaires.filter((l) => l.year !== null).length}`)

          const grouped = periods.map((period) => {
            const periodLuminaires = adaptedLuminaires.filter((luminaire: any) => {
              // Filtrer seulement les luminaires avec une année valide dans la période
              return luminaire.year !== null && luminaire.year >= period.start && luminaire.year <= period.end
            })

            const sortedLuminaires = [...periodLuminaires].sort((a: any, b: any) => (a.year || 0) - (b.year || 0))

            return {
              ...period,
              description: savedDescriptions[period.name] || period.defaultDescription,
              luminaires: sortedLuminaires,
            }
          })

          setTimelineData(grouped.sort((a, b) => a.start - b.start))
        }
      } catch (error) {
        console.error("❌ Impossible de charger la chronologie", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchAndProcessData()
  }, [])

  useEffect(() => {
    if (isLoading) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("revealed")
          }
        })
      },
      { threshold: 0.1 },
    )

    const elements = document.querySelectorAll(".scroll-reveal")
    elements.forEach((el) => observer.observe(el))

    return () => observer.disconnect()
  }, [timelineData, isLoading])

  const updateDescription = (periodName: string, newDescription: string) => {
    const updatedDescriptions = { ...descriptions, [periodName]: newDescription }
    setDescriptions(updatedDescriptions)
    localStorage.setItem("timeline-descriptions", JSON.stringify(updatedDescriptions))

    setTimelineData((prev) =>
      prev.map((period) => (period.name === periodName ? { ...period, description: newDescription } : period)),
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50">
        <div className="flex justify-center items-center h-screen">
          <div className="text-center">
            <Loader2 className="w-16 h-16 mx-auto animate-spin text-orange-500 mb-6" />
            <h2 className="text-2xl font-serif text-gray-800 mb-2">Chargement de la chronologie</h2>
            <p className="text-gray-600">Préparation des périodes artistiques...</p>
          </div>
        </div>
      </div>
    )
  }

  const totalLuminaires = timelineData.reduce((sum, period) => sum + period.luminaires.length, 0)

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-7xl mx-auto">
          {/* En-tête élégant */}
          <div className="text-center mb-20">
            <h1 className="text-6xl font-serif text-gray-900 mb-6 leading-tight">
              Chronologie des
              <br />
              <span className="text-orange-600">Périodes Artistiques</span>
            </h1>
            <div className="w-24 h-1 bg-gradient-to-r from-orange-400 to-amber-500 mx-auto mb-8"></div>
            <p className="text-xl text-gray-700 max-w-3xl mx-auto leading-relaxed">
              Découvrez l'évolution de l'art de l'éclairage à travers les siècles, depuis les créations médiévales
              jusqu'aux innovations contemporaines.
            </p>
            <div className="mt-8 inline-flex items-center px-6 py-3 bg-white/80 backdrop-blur-sm rounded-full shadow-lg">
              <span className="text-lg font-medium text-gray-800">
                {totalLuminaires} luminaires • {timelineData.filter((p) => p.luminaires.length > 0).length} périodes
              </span>
            </div>
          </div>

          {/* Timeline */}
          <div className="relative">
            {/* Ligne de temps principale */}
            <div className="absolute left-1/2 transform -translate-x-1/2 w-1 h-full bg-gradient-to-b from-orange-300 via-amber-400 to-orange-500 opacity-60"></div>

            <div className="space-y-32">
              {timelineData.map((period, index) => (
                <TimelineBlock
                  key={period.name}
                  period={period}
                  isLeft={index % 2 === 0}
                  className="scroll-reveal opacity-0 translate-y-8 transition-all duration-1000 ease-out"
                  onDescriptionUpdate={updateDescription}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .scroll-reveal.revealed {
          opacity: 1;
          transform: translateY(0);
        }
      `}</style>
    </div>
  )
}
