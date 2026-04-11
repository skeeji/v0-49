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

  // Tripler pour boucle infinie (33.3334% = 1 section)
  const tripled = [...designers, ...designers, ...designers]

  return (
    <>
      <style>{`
        @keyframes designer-scroll {
          from { transform: translateX(0); }
          to   { transform: translateX(-33.3334%); }
        }
        .dsg-track {
          display: flex;
          width: max-content;
          animation: designer-scroll 35s linear infinite;
        }
        .dsg-track.paused { animation-play-state: paused; }

        .dsg-card {
          width: 200px;
          flex-shrink: 0;
          margin: 0 10px;
          border-radius: 14px;
          overflow: hidden;
          background: #fff;
          box-shadow: 0 2px 12px rgba(0,0,0,0.07);
          cursor: pointer;
          transition: transform 0.25s ease, box-shadow 0.25s ease;
        }
        .dsg-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 24px rgba(0,0,0,0.14);
        }
        .dsg-photo {
          width: 200px; height: 240px;
          object-fit: cover; display: block;
        }
        .dsg-empty {
          width: 200px; height: 240px;
          background: #e8e0d0;
          display: flex; align-items: center; justify-content: center;
          font-family: "Playfair Display", Georgia, serif;
          font-size: 2rem; color: ${BROWN};
        }
        .dsg-info {
          padding: 0.75rem 0.5rem 0.6rem;
        }
        .dsg-name {
          font-family: "Playfair Display", Georgia, serif;
          font-size: 1rem; font-weight: 600;
          color: ${TEXT_DARK};
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .dsg-bio {
          font-size: 0.75rem; color: ${TEXT_MID};
          margin-top: 0.2rem;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .dsg-fade-l {
          position: absolute; left: 0; top: 0; bottom: 0; width: 15%;
          background: linear-gradient(to right, ${CREAM} 0%, transparent 100%);
          pointer-events: none; z-index: 2;
        }
        .dsg-fade-r {
          position: absolute; right: 0; top: 0; bottom: 0; width: 15%;
          background: linear-gradient(to left, ${CREAM} 0%, transparent 100%);
          pointer-events: none; z-index: 2;
        }
        .dsg-cta {
          display: inline-flex; align-items: center; gap: 0.5rem;
          padding: 0.75rem 2rem;
          background: ${BROWN}; color: #fff;
          border-radius: 12px; font-weight: 500; font-size: 0.95rem;
          text-decoration: none; transition: background 0.2s;
        }
        .dsg-cta:hover { background: #75614a; }
      `}</style>

      <section style={{ background: CREAM, padding: "5rem 0" }}>


        {/* Bande défilante */}
        <div style={{ position: "relative", overflow: "hidden", padding: "0.5rem 0" }}>
          <div className="dsg-fade-l" />
          <div className="dsg-fade-r" />
          <div
            className={`dsg-track${paused ? " paused" : ""}`}
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
          >
            {tripled.map((d, i) => {
              const name     = d.nom || d.Nom || d.name || "Designer"
              const bio      = (d.description || d.biographie || "").substring(0, 60)
              const initials = name.split(" ").map((w: string) => w[0] ?? "").join("").substring(0, 2).toUpperCase()

              return (
                <div
                  key={`${d.id || d._id}_${i}`}
                  className="dsg-card"
                  onClick={() => router.push(`/designers/${encodeURIComponent(name)}`)}
                >
                  {d.image
                    ? <img src={d.image} alt={name} className="dsg-photo" loading="lazy" />
                    : <div className="dsg-empty">{initials}</div>
                  }
                  <div className="dsg-info">
                    <div className="dsg-name">{name}</div>
                    {bio && <div className="dsg-bio">{bio}</div>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>


      </section>

      {/* Séparateur */}
      <div style={{ maxWidth: "80rem", margin: "0 auto", padding: "0 2rem" }}>
        <div style={{ height: "1px",
                      background: "linear-gradient(to right, transparent, rgba(139,115,85,0.2), transparent)" }} />
      </div>
    </>
  )
}
