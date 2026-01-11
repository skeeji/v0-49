"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

export function MobileFooter() {
  const pathname = usePathname()

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/98 backdrop-blur-md border-t border-gray-200/50 shadow-[0_-8px_24px_rgba(0,0,0,0.06)] z-50">
      <div className="grid grid-cols-6 gap-1 px-2 py-3">
        <Link
          href="/"
          className={`flex items-center justify-center py-3.5 rounded-2xl transition-all duration-300 ${
            pathname === "/"
              ? "bg-gradient-to-br from-[#8b7355] via-[#7a6449] to-[#6d5a44] text-white shadow-lg shadow-[#8b7355]/30 scale-105"
              : "text-gray-600 hover:bg-gray-50/80 active:scale-95"
          }`}
        >
          <span className={`text-[11px] font-semibold tracking-wide ${pathname === "/" ? "text-white" : ""}`}>
            Accueil
          </span>
        </Link>

        <Link
          href="/recherche"
          className={`flex items-center justify-center py-3.5 rounded-2xl transition-all duration-300 ${
            pathname === "/recherche"
              ? "bg-gradient-to-br from-[#8b7355] via-[#7a6449] to-[#6d5a44] text-white shadow-lg shadow-[#8b7355]/30 scale-105"
              : "text-gray-600 hover:bg-gray-50/80 active:scale-95"
          }`}
        >
          <span className={`text-[11px] font-semibold tracking-wide ${pathname === "/recherche" ? "text-white" : ""}`}>
            Recherche
          </span>
        </Link>

        <Link
          href="/luminaires"
          className={`flex items-center justify-center py-3.5 rounded-2xl transition-all duration-300 ${
            pathname.startsWith("/luminaires")
              ? "bg-gradient-to-br from-[#8b7355] via-[#7a6449] to-[#6d5a44] text-white shadow-lg shadow-[#8b7355]/30 scale-105"
              : "text-gray-600 hover:bg-gray-50/80 active:scale-95"
          }`}
        >
          <span
            className={`text-[11px] font-semibold tracking-wide ${pathname.startsWith("/luminaires") ? "text-white" : ""}`}
          >
            Luminaires
          </span>
        </Link>

        <Link
          href="/designers"
          className={`flex items-center justify-center py-3.5 rounded-2xl transition-all duration-300 ${
            pathname.startsWith("/designers")
              ? "bg-gradient-to-br from-[#8b7355] via-[#7a6449] to-[#6d5a44] text-white shadow-lg shadow-[#8b7355]/30 scale-105"
              : "text-gray-600 hover:bg-gray-50/80 active:scale-95"
          }`}
        >
          <span
            className={`text-[11px] font-semibold tracking-wide ${pathname.startsWith("/designers") ? "text-white" : ""}`}
          >
            Designers
          </span>
        </Link>

        <Link
          href="/chronologie"
          className={`flex items-center justify-center py-3.5 rounded-2xl transition-all duration-300 ${
            pathname === "/chronologie"
              ? "bg-gradient-to-br from-[#8b7355] via-[#7a6449] to-[#6d5a44] text-white shadow-lg shadow-[#8b7355]/30 scale-105"
              : "text-gray-600 hover:bg-gray-50/80 active:scale-95"
          }`}
        >
          <span
            className={`text-[11px] font-semibold tracking-wide ${pathname === "/chronologie" ? "text-white" : ""}`}
          >
            Chrono
          </span>
        </Link>

        <Link
          href="/pricing"
          className={`flex items-center justify-center py-3.5 rounded-2xl transition-all duration-300 ${
            pathname === "/pricing"
              ? "bg-gradient-to-br from-[#8b7355] via-[#7a6449] to-[#6d5a44] text-white shadow-lg shadow-[#8b7355]/30 scale-105"
              : "text-gray-600 hover:bg-gray-50/80 active:scale-95"
          }`}
        >
          <span className={`text-[11px] font-semibold tracking-wide ${pathname === "/pricing" ? "text-white" : ""}`}>
            Prix
          </span>
        </Link>
      </div>
    </nav>
  )
}

export default MobileFooter
