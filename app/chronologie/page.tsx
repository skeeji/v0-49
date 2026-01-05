"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/AuthContext"
import Image from "next/image"
import Link from "next/link"
import { EditableField } from "@/components/EditableField"
import { MobileFooter } from "@/components/MobileFooter"

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
        const response = await fetch("/api/luminaires?limit=10000")
        const data = await response.json()

        const imagesResponse = await fetch("/api/period-images")
        const imagesData = await imagesResponse.json()

        if (imagesData.success) {
          setPeriodImages(imagesData.images)
        }

        if (data.success && data.luminaires) {
          const adaptedLuminaires = data.luminaires.map((lum: any) => {
            let year = null
            const anneeValue = lum.annee || lum.Année || lum.year

            if (anneeValue) {
              const numYear = typeof anneeValue === "number" ? anneeValue : Number.parseInt(anneeValue)
              if (!isNaN(numYear) && numYear > 1000 && numYear < 2100) {
                year = numYear
              }
            }

            let imageUrl = null
            if (lum.fileId) {
              imageUrl = `/api/images/${lum.fileId}`
            } else if (lum.filename || lum["Nom du fichier"]) {
              const filename = lum.filename || lum["Nom du fichier"]
              imageUrl = `/api/images/filename/${encodeURIComponent(filename)}`
            }

            return {
              ...lum,
              id: lum._id,
              image: imageUrl,
              year: year,
              artist: lum["Artiste / Dates"] || lum.designer || "",
              name: lum["Nom luminaire"] || lum.nom || "Sans nom",
            }
          })

          const grouped = periods.map((period) => {
            const periodLuminaires = adaptedLuminaires.filter((luminaire: any) => {
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
      <div className="min-h-screen bg-[#f5f1e8] pb-20">
        <div className="container mx-auto px-4 py-16">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-serif text-gray-900 mb-4">Chronologie des Périodes Artistiques</h1>
            <p className="text-gray-600 mb-8">Explorez les luminaires à travers le temps</p>
          </div>

          <div className="max-w-6xl mx-auto mb-12">
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute top-1/2 left-0 right-0 h-1 bg-gray-300 transform -translate-y-1/2" />

              {/* Period markers */}
              <div className="relative flex justify-between items-center">
                {[
                  { name: "Moyen-âge", start: 1000 },
                  { name: "Renaissance", start: 1500 },
                  { name: "Baroque", start: 1600 },
                  { name: "Classique", start: 1700 },
                  { name: "Romantique", start: 1800 },
                  { name: "Art Nouveau", start: 1890 },
                  { name: "Art Déco", start: 1920 },
                  { name: "Moderne", start: 1950 },
                  { name: "Contemporain", start: 2000 },
                ].map((period, index) => (
                  <div key={index} className="flex flex-col items-center group cursor-pointer">
                    <div className="w-4 h-4 rounded-full bg-[#8b7355] mb-2 group-hover:scale-125 transition-transform relative z-10" />
                    <span className="text-xs text-gray-600 text-center max-w-[80px] group-hover:text-[#8b7355] transition-colors">
                      {period.name}
                    </span>
                    <span className="text-xs text-gray-400 mt-1">{period.start}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#8b7355] mx-auto mb-4" />
            <p className="font-serif text-gray-700">Chargement de la chronologie...</p>
          </div>
        </div>
        <MobileFooter />
      </div>
    )
  }

  const totalLuminaires = timelineData.reduce((sum, period) => sum + period.luminaires.length, 0)

  return (
    <div className="min-h-screen bg-[#f5f1e8] pb-20">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-serif text-gray-900 mb-2 text-center">
            Chronologie des Périodes Artistiques
          </h1>
          <p className="text-center text-gray-600 mb-12 font-serif">
            {totalLuminaires} luminaires classés par période historique
          </p>

          <div className="mb-16 relative">
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-sm border border-gray-200 p-8 overflow-x-auto">
              <div className="min-w-max">
                <div className="relative">
                  {/* Decorative gradient line */}
                  <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-[#8b7355]/30 via-[#8b7355] to-[#8b7355]/30 transform -translate-y-1/2" />

                  {/* Period markers with elegant styling */}
                  <div className="relative flex gap-12 items-center px-4">
                    {timelineData.map((period, index) => (
                      <a
                        key={index}
                        href={`#${period.name}`}
                        className="flex flex-col items-center group cursor-pointer transition-all duration-300"
                      >
                        {/* Animated dot */}
                        <div className="relative mb-3">
                          <div className="w-3 h-3 rounded-full bg-[#8b7355] group-hover:scale-150 transition-all duration-300 relative z-10" />
                          <div className="absolute inset-0 w-3 h-3 rounded-full bg-[#8b7355] opacity-0 group-hover:opacity-30 group-hover:scale-[2] transition-all duration-300" />
                        </div>

                        {/* Period name with elegant typography */}
                        <span className="text-xs font-serif text-gray-700 text-center max-w-[100px] whitespace-nowrap group-hover:text-[#8b7355] group-hover:font-medium transition-all duration-200">
                          {period.name}
                        </span>

                        {/* Years with subtle styling */}
                        <span className="text-[10px] text-gray-400 mt-1.5 font-light tracking-wide">
                          {period.start}–{period.end}
                        </span>
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {timelineData.map((period, index) => (
              <div
                key={period.name}
                id={period.name}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden scroll-reveal"
              >
                <div className="md:flex">
                  {/* Image de la période */}
                  <div className="md:w-2/5 aspect-[4/3] md:aspect-auto relative bg-gray-100 overflow-hidden">
                    {period.imageUrl ? (
                      <Image
                        src={period.imageUrl || "/placeholder.svg"}
                        alt={period.name}
                        fill
                        className="object-cover rounded-l-2xl"
                        unoptimized
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <div className="text-6xl">🎨</div>
                      </div>
                    )}
                    {/* Badge de la période */}
                    <div
                      className="absolute bottom-4 left-4 px-4 py-2 rounded-lg text-sm font-medium uppercase tracking-wide text-white"
                      style={{ backgroundColor: "#8b7355" }}
                    >
                      {period.name}
                    </div>
                  </div>

                  {/* Contenu de la carte */}
                  <div className="md:w-3/5 p-6">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-sm text-gray-600">
                        {period.start} - {period.end}
                      </span>
                      <span className="text-sm font-medium text-gray-900">{period.luminaires.length} luminaires</span>
                    </div>

                    <h2 className="text-2xl font-serif text-gray-900 mb-3">{period.name}</h2>

                    <EditableField
                      value={period.description}
                      onSave={(newDesc) => updateDescription(period.name, newDesc)}
                      multiline
                      disabled={!canEdit}
                      className="text-sm text-gray-700 leading-relaxed mb-4"
                    />

                    {period.luminaires.length > 0 && (
                      <div className="flex gap-2 mb-4">
                        {period.luminaires.slice(0, 3).map((luminaire: any, idx: number) => (
                          <Link
                            key={idx}
                            href={`/luminaires/${luminaire.id}`}
                            className="w-16 h-16 relative bg-gray-100 rounded-lg overflow-hidden hover:ring-2 hover:ring-[#f2d895] transition-all"
                          >
                            {luminaire.image && (
                              <Image
                                src={luminaire.image || "/placeholder.svg"}
                                alt={luminaire.name}
                                fill
                                className="object-cover rounded-lg"
                                unoptimized
                              />
                            )}
                          </Link>
                        ))}
                      </div>
                    )}

                    <Link href={`/luminaires?yearMin=${period.start}&yearMax=${period.end}`}>
                      <button className="w-full py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition-colors">
                        Voir les {period.luminaires.length} luminaires
                      </button>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <MobileFooter />
    </div>
  )
}
