"use client"

import { useState, useEffect } from "react"
import { TimelineBlock } from "@/components/TimelineBlock"
import { useAuth } from "@/contexts/AuthContext"

const periods = [
  {
    name: "Moyen-Age",
    start: 1000,
    end: 1499,
    defaultDescription:
      "Période médiévale caractérisée par l'artisanat monastique et les premières innovations en éclairage avec les chandelles et lampes à huile ornementées.",
  },
  {
    name: "XVIe siècle",
    start: 1500,
    end: 1599,
    defaultDescription:
      "Renaissance européenne marquée par le raffinement des arts décoratifs et l'émergence de nouveaux styles d'éclairage palatial.",
  },
  {
    name: "XVIIe siècle",
    start: 1600,
    end: 1699,
    defaultDescription:
      "Siècle du baroque et du classicisme français, avec le développement des lustres en cristal et des luminaires de cour.",
  },
  {
    name: "XVIIIe siècle",
    start: 1700,
    end: 1799,
    defaultDescription:
      "Siècle des Lumières et du rococo, âge d'or de l'ébénisterie française et des luminaires précieux en bronze doré.",
  },
  {
    name: "XIXe siècle",
    start: 1800,
    end: 1899,
    defaultDescription:
      "Révolution industrielle et éclectisme stylistique, avec l'avènement du gaz puis de l'électricité transformant l'art de l'éclairage.",
  },
  {
    name: "Art Nouveau",
    start: 1890,
    end: 1910,
    defaultDescription:
      "Mouvement artistique privilégiant les formes organiques et la nature, avec des créateurs comme Gallé, Daum et Tiffany révolutionnant l'art verrier.",
  },
  {
    name: "Art Déco",
    start: 1920,
    end: 1940,
    defaultDescription:
      "Style géométrique et luxueux des années folles, caractérisé par l'utilisation de matériaux nobles et de formes stylisées.",
  },
  {
    name: "1940 - 1949",
    start: 1940,
    end: 1949,
    defaultDescription:
      "Période de guerre et de reconstruction, marquée par la sobriété et l'innovation dans l'utilisation de nouveaux matériaux.",
  },
  {
    name: "1950 - 1959",
    start: 1950,
    end: 1959,
    defaultDescription:
      "Renouveau créatif d'après-guerre avec l'émergence du design moderne et l'exploration de nouvelles formes fonctionnalistes.",
  },
  {
    name: "1960 - 1969",
    start: 1960,
    end: 1969,
    defaultDescription:
      "Révolution culturelle et design pop, avec l'introduction du plastique et de couleurs vives dans le mobilier d'éclairage.",
  },
  {
    name: "1970 - 1979",
    start: 1970,
    end: 1979,
    defaultDescription:
      "Décennie de l'expérimentation avec de nouveaux matériaux et l'influence du design scandinave et italien.",
  },
  {
    name: "1980 - 1989",
    start: 1980,
    end: 1989,
    defaultDescription:
      "Postmodernisme et retour aux références historiques, avec des créateurs comme Philippe Starck révolutionnant le design français.",
  },
  {
    name: "1990 - 1999",
    start: 1990,
    end: 1999,
    defaultDescription:
      "Minimalisme et high-tech, intégration des nouvelles technologies et recherche de simplicité dans les formes.",
  },
  {
    name: "Contemporain",
    start: 2000,
    end: 2025,
    defaultDescription:
      "Ère numérique et développement durable, avec l'LED révolutionnant l'éclairage et l'émergence de l'éco-design.",
  },
]

export default function ChronologiePage() {
  const [timelineData, setTimelineData] = useState<any[]>([])
  const [descriptions, setDescriptions] = useState<{ [key: string]: string }>({})
  const [periodImages, setPeriodImages] = useState<{ [key: string]: string }>({})
  const [isLoading, setIsLoading] = useState(true)
  const { userData } = useAuth()

  const canEdit = userData?.role === "admin"

  useEffect(() => {
    const savedDescriptions = JSON.parse(localStorage.getItem("timeline-descriptions") || "{}")
    setDescriptions(savedDescriptions)

    async function fetchAndProcessData() {
      setIsLoading(true)
      try {
        // Charger les luminaires
        const response = await fetch("/api/luminaires?limit=10000")
        const data = await response.json()

        // Charger les images de périodes
        const imagesResponse = await fetch("/api/period-images")
        const imagesData = await imagesResponse.json()

        if (imagesData.success) {
          setPeriodImages(imagesData.images)
        }

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
              imageUrl: imagesData.success ? imagesData.images[period.name] : null,
            }
          })

          setTimelineData(grouped.sort((a, b) => a.start - b.start))
        }
      } catch (error) {
        console.error("Impossible de charger la chronologie", error)
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
    if (!canEdit) return

    const updatedDescriptions = { ...descriptions, [periodName]: newDescription }
    setDescriptions(updatedDescriptions)
    localStorage.setItem("timeline-descriptions", JSON.stringify(updatedDescriptions))

    setTimelineData((prev) =>
      prev.map((period) => (period.name === periodName ? { ...period, description: newDescription } : period)),
    )
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="font-serif">Chargement de la chronologie...</p>
        </div>
      </div>
    )
  }

  const totalLuminaires = timelineData.reduce((sum, period) => sum + period.luminaires.length, 0)

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-serif text-gray-900 mb-4 text-center">Chronologie des Périodes Artistiques</h1>
        <p className="text-center text-gray-600 mb-12 font-serif">
          {totalLuminaires} luminaires classés par période historique
        </p>

        <div className="space-y-16">
          {timelineData.map((period, index) => (
            <TimelineBlock
              key={period.name}
              period={period}
              isLeft={index % 2 === 0}
              className="scroll-reveal"
              onDescriptionUpdate={updateDescription}
              canEdit={canEdit}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
