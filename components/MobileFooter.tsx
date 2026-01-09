"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Search, Lightbulb, Users, Clock, DollarSign } from "lucide-react"

export function MobileFooter() {
  const pathname = usePathname()

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-gray-200 shadow-[0_-4px_12px_rgba(0,0,0,0.08)] z-50">
      <div className="grid grid-cols-6 gap-0.5 px-1 py-1.5">
        <Link
          href="/"
          className={`flex flex-col items-center justify-center py-2.5 rounded-xl transition-all ${
            pathname === "/"
              ? "bg-gradient-to-br from-[#8b7355] to-[#6d5a44] text-white shadow-lg scale-105"
              : "text-gray-600 hover:bg-gray-50 active:scale-95"
          }`}
        >
          <Home className="w-5 h-5 mb-0.5" strokeWidth={pathname === "/" ? 2.5 : 2} />
          <span className={`text-[10px] font-medium ${pathname === "/" ? "font-semibold" : ""}`}>Accueil</span>
        </Link>

        <Link
          href="/recherche"
          className={`flex flex-col items-center justify-center py-2.5 rounded-xl transition-all ${
            pathname === "/recherche"
              ? "bg-gradient-to-br from-[#8b7355] to-[#6d5a44] text-white shadow-lg scale-105"
              : "text-gray-600 hover:bg-gray-50 active:scale-95"
          }`}
        >
          <Search className="w-5 h-5 mb-0.5" strokeWidth={pathname === "/recherche" ? 2.5 : 2} />
          <span className={`text-[10px] font-medium ${pathname === "/recherche" ? "font-semibold" : ""}`}>
            Recherche
          </span>
        </Link>

        <Link
          href="/luminaires"
          className={`flex flex-col items-center justify-center py-2.5 rounded-xl transition-all ${
            pathname.startsWith("/luminaires")
              ? "bg-gradient-to-br from-[#8b7355] to-[#6d5a44] text-white shadow-lg scale-105"
              : "text-gray-600 hover:bg-gray-50 active:scale-95"
          }`}
        >
          <Lightbulb className="w-5 h-5 mb-0.5" strokeWidth={pathname.startsWith("/luminaires") ? 2.5 : 2} />
          <span className={`text-[10px] font-medium ${pathname.startsWith("/luminaires") ? "font-semibold" : ""}`}>
            Luminaires
          </span>
        </Link>

        <Link
          href="/designers"
          className={`flex flex-col items-center justify-center py-2.5 rounded-xl transition-all ${
            pathname.startsWith("/designers")
              ? "bg-gradient-to-br from-[#8b7355] to-[#6d5a44] text-white shadow-lg scale-105"
              : "text-gray-600 hover:bg-gray-50 active:scale-95"
          }`}
        >
          <Users className="w-5 h-5 mb-0.5" strokeWidth={pathname.startsWith("/designers") ? 2.5 : 2} />
          <span className={`text-[10px] font-medium ${pathname.startsWith("/designers") ? "font-semibold" : ""}`}>
            Designers
          </span>
        </Link>

        <Link
          href="/chronologie"
          className={`flex flex-col items-center justify-center py-2.5 rounded-xl transition-all ${
            pathname === "/chronologie"
              ? "bg-gradient-to-br from-[#8b7355] to-[#6d5a44] text-white shadow-lg scale-105"
              : "text-gray-600 hover:bg-gray-50 active:scale-95"
          }`}
        >
          <Clock className="w-5 h-5 mb-0.5" strokeWidth={pathname === "/chronologie" ? 2.5 : 2} />
          <span className={`text-[10px] font-medium ${pathname === "/chronologie" ? "font-semibold" : ""}`}>
            Chrono
          </span>
        </Link>

        <Link
          href="/pricing"
          className={`flex flex-col items-center justify-center py-2.5 rounded-xl transition-all ${
            pathname === "/pricing"
              ? "bg-gradient-to-br from-[#8b7355] to-[#6d5a44] text-white shadow-lg scale-105"
              : "text-gray-600 hover:bg-gray-50 active:scale-95"
          }`}
        >
          <DollarSign className="w-5 h-5 mb-0.5" strokeWidth={pathname === "/pricing" ? 2.5 : 2} />
          <span className={`text-[10px] font-medium ${pathname === "/pricing" ? "font-semibold" : ""}`}>Prix</span>
        </Link>
      </div>
    </nav>
  )
}

export default MobileFooter
