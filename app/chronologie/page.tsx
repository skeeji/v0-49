"use client"

import { useState, useEffect } from "react"
import { TimelineBlock } from "@/components/TimelineBlock"

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
  const [luminaires, setLuminaires] = useState([])
  const [timelineData, setTimelineData] = useState([])
  const [descriptions, setDescriptions] = useState<{ [key: string]: string }>({})

  useEffect(() => {
    const storedLuminaires = localStorage.getItem("luminaires")
    const storedDescriptions = localStorage.getItem("timeline-descriptions")

    if (storedDescriptions) {
      setDescriptions(JSON.parse(storedDescriptions))
    }

    if (storedLuminaires) {
      const data = JSON.parse(storedLuminaires)
      setLuminaires(data)

      // Grouper par période
      const grouped = periods.map((period) => {
        // Filtrer les luminaires par année
        const periodLuminaires = data.filter((luminaire: any) => {
          const year = Number.parseInt(luminaire.year) || 0
          return year >= period.start && year <= period.end
        })

        // Trier les luminaires par année (du plus récent au plus ancien)
        const sortedLuminaires = [...periodLuminaires].sort((a, b) => {
          const yearA = Number.parseInt(a.year) || 0
          const yearB = Number.parseInt(b.year) || 0
          return yearB - yearA
        })

        return {
          ...period,
          description: descriptions[period.name] || period.defaultDescription,
          luminaires: sortedLuminaires,
        }
      })

      // Trier les périodes par ordre chronologique (du plus ancien au plus récent)
      const sortedTimelineData = [...grouped].sort((a, b) => a.start - b.start)
      setTimelineData(sortedTimelineData)
    }
  }, [descriptions])

  useEffect(() => {
    // Animation scroll reveal
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
  }, [timelineData])

  const updateDescription = (periodName: string, newDescription: string) => {
    const updatedDescriptions = { ...descriptions, [periodName]: newDescription }
    setDescriptions(updatedDescriptions)
    localStorage.setItem("timeline-descriptions", JSON.stringify(updatedDescriptions))

    // Mettre à jour timelineData
    setTimelineData((prev) =>
      prev.map((period) => (period.name === periodName ? { ...period, description: newDescription } : period)),
    )
  }

  return (
    <div className="container-responsive py-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-playfair text-dark mb-12 text-center">Chronologie des Périodes Artistiques</h1>

        <div className="space-y-16">
          {timelineData.map((period, index) => (
            <TimelineBlock
              key={period.name}
              period={period}
              isLeft={index % 2 === 0}
              className="scroll-reveal"
              onDescriptionUpdate={updateDescription}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
