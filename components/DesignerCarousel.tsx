"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

interface DesignerCarouselProps {
  designers: any[]
}

const CREAM     = "#f5f1e8"
const BROWN     = "#8b7355"
const TEXT_DARK = "#3d2b1f"
const TEXT_MID  = "#7a6654"

export function DesignerCarousel({ designers }: DesignerCarouselProps) {
  const router   = useRouter()
  const [paused, setPaused] = useState(false)

  if (designers.length === 0) return null

  const tripled = [...designers, ...designers, ...designers]

  return (
    <>
      <style>{`
        @keyframes dsg-scroll {
          from { transform: translateX(0); }
          to   { transform: translateX(-33.3334%); }
        }
        .dsg-track {
          display: flex;
          width: max-content;
          animation: dsg-scroll 40s linear infinite;
          align-items: flex-end;
        }
        .dsg-track.paused { animation-play-state: paused; }

        .dsg-card {
          flex-shrink: 0;
          margin: 0 8px;
          cursor: pointer;
          position: relative;
          overflow: hidden;
        }
        .dsg-card:hover .dsg-overlay { opacity: 1; }
        .dsg-card:hover .dsg-photo   { transform: scale(1.04); }

        .dsg-photo {
          display: block;
          width: 100%; height: 100%;
          object-fit: cover;
          transition: transform 0.4s ease;
        }
        .dsg-empty {
          width: 100%; height: 100%;
          background: #ddd5c5;
          display: flex; align-items: center; justify-content: center;
          font-family: "Playfair Display", Georgia, serif;
          font-size: 1.6rem; color: ${BROWN};
        }
        .dsg-overlay {
          position: absolute; inset: 0;
          background: linear-gradient(to top, rgba(20,12,5,0.68) 0%, transparent 55%);
          opacity: 0;
          transition: opacity 0.3s ease;
          pointer-events: none;
        }
        .dsg-name {
          position: absolute;
          bottom: 0.7rem; left: 0.75rem; right: 0.75rem;
          font-family: "Playfair Display", Georgia, serif;
          font-size: 0.88rem; font-weight: 600;
          color: #fff;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
          text-shadow: 0 1px 4px rgba(0,0,0,0.5);
          opacity: 0;
          transition: opacity 0.3s ease;
        }
        .dsg-card:hover .dsg-name { opacity: 1; }

        .dsg-fade-l {
          position: absolute; left: 0; top: 0; bottom: 0; width: 12%;
          background: linear-gradient(to right, ${CREAM}, transparent);
          pointer-events: none; z-index: 2;
        }
        .dsg-fade-r {
          position: absolute; right: 0; top: 0; bottom: 0; width: 12%;
          background: linear-gradient(to left, ${CREAM}, transparent);
          pointer-events: none; z-index: 2;
        }
      `}</style>

      <section style={{ background: CREAM, padding: "3rem 0" }}>
        <div style={{ position: "relative", overflow: "hidden" }}>
          <div className="dsg-fade-l" />
          <div className="dsg-fade-r" />
          <div
            className={`dsg-track${paused ? " paused" : ""}`}
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
          >
            {tripled.map((d, i) => {
              const name  = d.nom || d.Nom || d.name || "Designer"
              const initials = name.split(" ").map((w: string) => w[0] ?? "").join("").substring(0, 2).toUpperCase()
              // Varier légèrement les hauteurs pour rythme visuel
              const heights = [200, 240, 210, 260, 195, 230]
              const h = heights[i % heights.length]
              const w = Math.round(h * 0.72)   // ratio portrait harmonieux

              return (
                <div
                  key={`${d.id || d._id}_${i}`}
                  className="dsg-card"
                  style={{ width: w, height: h }}
                  onClick={() => router.push(`/designers/${encodeURIComponent(name)}`)}
                >
                  {d.image
                    ? <img src={d.image} alt={name} className="dsg-photo" loading="lazy" />
                    : <div className="dsg-empty">{initials}</div>
                  }
                  <div className="dsg-overlay" />
                  <div className="dsg-name">{name}</div>
                </div>
              )
            })}
          </div>
        </div>
      </section>
    </>
  )
}
