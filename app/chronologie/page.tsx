"use client"

import { useState, useEffect } from "react"
import { TimelineBlock } from "@/components/TimelineBlock"

const periods = [ /* ... Votre liste de périodes complète ici ... */ ];

export default function ChronologiePage() {
  const [timelineData, setTimelineData] = useState<any[]>([])
  const [descriptions, setDescriptions] = useState<{ [key: string]: string }>({})
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const savedDescriptions = JSON.parse(localStorage.getItem("timeline-descriptions") || "{}");
    setDescriptions(savedDescriptions);

    async function fetchAndProcessData() {
      setIsLoading(true);
      try {
        const response = await fetch("/api/luminaires");
        const data = await response.json();

        if (data.success && data.luminaires) {
          // CORRECTION : On adapte les données reçues pour correspondre à ce que les composants attendent
          const adaptedLuminaires = data.luminaires.map((lum: any) => ({
            ...lum,
            id: lum._id, // Le composant attend 'id'
            image: lum.images?.[0] // Le composant attend 'image' (la première du tableau)
          }));

          const grouped = periods.map((period) => {
            const periodLuminaires = adaptedLuminaires.filter((luminaire: any) => {
              const year = Number.parseInt(luminaire.annee) || 0;
              return year >= period.start && year <= period.end;
            });
            const sortedLuminaires = [...periodLuminaires].sort((a: any, b: any) => (Number.parseInt(b.annee) || 0) - (Number.parseInt(a.annee) || 0));
            return {
              ...period,
              description: savedDescriptions[period.name] || period.defaultDescription,
              luminaires: sortedLuminaires,
            };
          });

          const sortedTimelineData = [...grouped].sort((a, b) => a.start - b.start);
          setTimelineData(sortedTimelineData);
        }
      } catch (error) { console.error("Impossible de charger la chronologie", error); } 
      finally { setIsLoading(false); }
    }
    fetchAndProcessData();
  }, []);

  // ... Le reste de votre code (useEffect pour l'animation, updateDescription, JSX) reste identique ...
  // CONSERVÉ : Le useEffect pour l'animation est identique
  useEffect(() => {
    if (isLoading) return; // On attend que les données soient chargées
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => { if (entry.isIntersecting) { entry.target.classList.add("revealed") } })
      }, { threshold: 0.1 } );
    const elements = document.querySelectorAll(".scroll-reveal")
    elements.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [timelineData, isLoading]);

  // CONSERVÉ : La fonction pour éditer les descriptions est identique
  const updateDescription = (periodName: string, newDescription: string) => {
    const updatedDescriptions = { ...descriptions, [periodName]: newDescription };
    setDescriptions(updatedDescriptions);
    localStorage.setItem("timeline-descriptions", JSON.stringify(updatedDescriptions));
    setTimelineData((prev) => prev.map((period) => (period.name === periodName ? { ...period, description: newDescription } : period)));
  }

  if (isLoading) { return ( <div className="flex justify-center items-center h-screen"><p>Chargement de la chronologie...</p></div> ); }

  return (
    <div className="container-responsive py-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-playfair text-dark mb-12 text-center">Chronologie des Périodes Artistiques</h1>
        <div className="space-y-16">
          {timelineData.map((period, index) => (
            <TimelineBlock key={period.name} period={period} isLeft={index % 2 === 0} className="scroll-reveal" onDescriptionUpdate={updateDescription} />
          ))}
        </div>
      </div>
    </div>
  )
}
